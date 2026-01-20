import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
    OAuthClientInformation,
    OAuthClientInformationFull,
    OAuthClientMetadata,
    OAuthTokens
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { nanoid } from "nanoid";
import { redis } from "./redis";

const STATE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL = 43200; // 12 hours

interface StoredState {
    nonce: string;
    serverId: string;
    createdAt: number;
}

// A slight extension to the standard OAuthClientProvider interface because `redirectToAuthorization` doesn't give us the interface we need
// This allows us to track authentication for a specific server and associated dynamic client registration
export interface AgentsOAuthProvider extends OAuthClientProvider {
    authUrl: string | undefined;
    clientId: string | undefined;
    serverId: string | undefined;
    checkState(
        state: string
    ): Promise<{ valid: boolean; serverId?: string; error?: string }>;
    consumeState(state: string): Promise<void>;
    deleteCodeVerifier(): Promise<void>;
    isTokenExpired(): boolean;
    setTokenExpiresAt(expiresAt: number): void;
}

export class RedisOAuthClientProvider implements AgentsOAuthProvider {
    private _authUrl_: string | undefined;
    private _clientId_: string | undefined;
    private _onRedirect?: (url: string) => void;
    private _tokenExpiresAt?: number;

    constructor(
        public userId: string,
        public serverId: string,
        public sessionId: string,
        public clientName: string,
        public baseRedirectUrl: string,
        onRedirect?: (url: string) => void
    ) {
        this._onRedirect = onRedirect;
    }

    get clientMetadata(): OAuthClientMetadata {
        return {
            client_name: this.clientName,
            client_uri: this.clientUri,
            grant_types: ["authorization_code", "refresh_token"],
            redirect_uris: [this.redirectUrl],
            response_types: ["code"],
            token_endpoint_auth_method: "none",
            ...(this._clientId_ ? { client_id: this._clientId_ } : {})
        };
    }

    get clientUri() {
        return new URL(this.redirectUrl).origin;
    }

    get redirectUrl() {
        return this.baseRedirectUrl;
    }

    get clientId() {
        return this._clientId_;
    }

    set clientId(clientId_: string | undefined) {
        this._clientId_ = clientId_;
    }

    // Get Redis key for this session - MUST match SessionStore key structure
    private getSessionKey(): string {
        return `mcp:session:${this.userId}:${this.sessionId}`;
    }

    // Load session data from Redis including OAuth tokens and client info
    private async getSessionData(): Promise<{
        clientInformation?: OAuthClientInformationFull;
        tokens?: OAuthTokens;
        codeVerifier?: string;
        clientId?: string;
        tokenExpiresAt?: number;
    }> {
        const data = await redis.get(this.getSessionKey());
        if (!data) return {};
        try {
            return JSON.parse(data);
        } catch {
            return {};
        }
    }

    // Save session data to Redis (merges with existing session metadata)
    private async saveSessionData(data: {
        clientInformation?: OAuthClientInformationFull;
        tokens?: OAuthTokens;
        codeVerifier?: string;
        clientId?: string;
        tokenExpiresAt?: number;
    }): Promise<void> {
        // Load existing data first to preserve session metadata
        const existingData = await redis.get(this.getSessionKey());
        const existingSession = existingData ? JSON.parse(existingData) : {};

        // Merge OAuth data with existing session data
        const mergedData = {
            ...existingSession,
            ...data,
        };

        // Use setex with the standard session TTL to ensure consistency
        await redis.setex(this.getSessionKey(), SESSION_TTL, JSON.stringify(mergedData));
        console.log(`[OAuth Provider] Session data saved for ${this.serverId}`);
    }

    async clientInformation(): Promise<OAuthClientInformation | undefined> {
        const data = await this.getSessionData();

        // Also restore clientId from data if we don't have it
        if (data.clientId && !this._clientId_) {
            this._clientId_ = data.clientId;
        }

        if (data.clientInformation) {
            console.log(`[OAuth Provider] Loaded client information from Redis for ${this.serverId}`);
        } else {
            console.log(`[OAuth Provider] No client information found in Redis for ${this.serverId}`);
        }

        return data.clientInformation;
    }

    async saveClientInformation(
        clientInformation: OAuthClientInformationFull
    ): Promise<void> {
        console.log(`[OAuth Provider] Saving client information for ${this.serverId}:`, clientInformation.client_id);
        const data = await this.getSessionData();
        data.clientInformation = clientInformation;
        data.clientId = clientInformation.client_id;
        await this.saveSessionData(data);
        this.clientId = clientInformation.client_id;
    }

    async saveTokens(tokens: OAuthTokens): Promise<void> {
        console.log(`[OAuth Provider] saveTokens called for ${this.serverId}`);
        const data = await this.getSessionData();
        data.tokens = tokens;

        // Calculate and store token expiration
        if (tokens.expires_in) {
            const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
            this._tokenExpiresAt = Date.now() + (tokens.expires_in * 1000) - bufferMs;
            data.tokenExpiresAt = this._tokenExpiresAt; // Persist to Redis
            console.log(`[OAuth Provider] Token expires at: ${new Date(this._tokenExpiresAt).toISOString()} (in ${tokens.expires_in}s)`);
        }

        await this.saveSessionData(data);
    }

    get authUrl() {
        return this._authUrl_;
    }

    async state(): Promise<string> {
        // Use sessionId as the state - it's already unique and random
        return this.sessionId;
    }

    async checkState(
        state: string
    ): Promise<{ valid: boolean; serverId?: string; error?: string }> {
        // State is the sessionId - validation happens by checking if session exists in Redis
        const sessionKey = this.getSessionKey();
        const data = await redis.get(sessionKey);

        if (!data) {
            return { valid: false, error: "Session not found" };
        }

        return { valid: true, serverId: this.serverId };
    }

    async consumeState(state: string): Promise<void> {
        // No-op since we're using sessionId directly and don't need separate state tracking
        // Session will be cleaned up when it expires or is explicitly removed
    }

    async redirectToAuthorization(authUrl: URL): Promise<void> {
        this._authUrl_ = authUrl.toString();
        if (this._onRedirect) {
            this._onRedirect(authUrl.toString());
        }
    }

    async invalidateCredentials(
        scope: "all" | "client" | "tokens" | "verifier"
    ): Promise<void> {
        if (scope === "all") {
            await redis.del(this.getSessionKey());
        } else {
            const data = await this.getSessionData();
            if (scope === "client") {
                delete data.clientInformation;
                delete data.clientId;
            } else if (scope === "tokens") {
                delete data.tokens;
            } else if (scope === "verifier") {
                delete data.codeVerifier;
            }
            await this.saveSessionData(data);
        }
    }

    async saveCodeVerifier(verifier: string): Promise<void> {
        const data = await this.getSessionData();
        // Always overwrite verifier to ensure the latest one is used for the current flow
        console.log(`[OAuth] Saving code verifier for server ${this.serverId}`);
        data.codeVerifier = verifier;
        await this.saveSessionData(data);
    }

    async codeVerifier(): Promise<string> {
        const data = await this.getSessionData();

        // Lazy-load clientId if we don't have it
        if (data.clientId && !this._clientId_) {
            this._clientId_ = data.clientId;
        }

        if (!data.codeVerifier) {
            throw new Error("No code verifier found");
        }
        return data.codeVerifier;
    }

    async deleteCodeVerifier(): Promise<void> {
        const data = await this.getSessionData();
        delete data.codeVerifier;
        await this.saveSessionData(data);
    }

    async tokens(): Promise<OAuthTokens | undefined> {
        const data = await this.getSessionData();

        // Lazy-load clientId if we don't have it
        if (data.clientId && !this._clientId_) {
            this._clientId_ = data.clientId;
        }

        // Restore tokenExpiresAt from Redis if not in memory
        if (data.tokenExpiresAt && !this._tokenExpiresAt) {
            this._tokenExpiresAt = data.tokenExpiresAt;
            console.log(`[OAuth Provider] Restored token expiration from Redis: ${new Date(this._tokenExpiresAt).toISOString()}`);
        }

        return data.tokens;
    }

    /**
     * Check if the current access token is expired or about to expire
     * Note: This is synchronous, so it relies on tokenExpiresAt being loaded earlier
     * Call tokens() first to ensure tokenExpiresAt is restored from Redis
     */
    isTokenExpired(): boolean {
        if (!this._tokenExpiresAt) {
            console.log('[OAuth Provider] No token expiration timestamp - cannot determine if expired');
            return false; // No expiration tracking
        }
        const now = Date.now();
        const isExpired = now >= this._tokenExpiresAt;
        if (isExpired) {
            const expiredAgo = Math.floor((now - this._tokenExpiresAt) / 1000);
            console.log(`[OAuth Provider] Token expired ${expiredAgo}s ago`);
        } else {
            const expiresIn = Math.floor((this._tokenExpiresAt - now) / 1000);
            console.log(`[OAuth Provider] Token expires in ${expiresIn}s`);
        }
        return isExpired;
    }

    /**
     * Set token expiration timestamp
     */
    setTokenExpiresAt(expiresAt: number): void {
        this._tokenExpiresAt = expiresAt;
    }
}
