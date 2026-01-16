"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useRef, useState, useCallback } from "react";
import { StoredConnection } from "@/hooks/useMcpConnection";

interface ConnectionContextValue {
    connections: Record<string, StoredConnection>;
    activeCount: number;
    isValidating: boolean;
    progress: { validated: number; total: number } | null;
    refresh: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);

interface ConnectionProviderProps {
    children: ReactNode;
    /** Optional filter function to filter connections */
    filter?: (serverId: string) => boolean;
}

export function ConnectionProvider({ children, filter }: ConnectionProviderProps) {
    const hasValidated = useRef(false);
    const [isValidating, setIsValidating] = useState(true);
    const [progress, setProgress] = useState<{ validated: number; total: number } | null>(null);
    const [allConnections, setAllConnections] = useState<Record<string, StoredConnection>>({});

    // Fetch connections from API (singleton)
    const fetchConnections = useCallback(async () => {
        try {
            const response = await fetch('/api/mcp/connections');
            if (!response.ok) {
                throw new Error(`Failed to fetch connections: ${response.statusText}`);
            }
            const data = await response.json();

            const connectionsMap = data.connections.reduce((acc: Record<string, StoredConnection>, conn: StoredConnection) => {
                const key = conn.serverId || conn.sessionId;
                acc[key] = conn;
                return acc;
            }, {});

            setAllConnections(connectionsMap);
        } catch (err) {
            console.error('[ConnectionProvider] Error:', err);
        }
    }, []);

    const totalActiveCount = Object.values(allConnections).filter(conn => conn.connectionStatus === 'CONNECTED').length;

    // Apply filter to connections and count
    // Only show connections after validation completes
    const { connections, activeCount } = useMemo(() => {
        // While validating, show empty state
        // REMOVED: Do not hide connections while validating (Issue #1 fixed)
        // We want to show them immediately, potentially with "Validating..." status


        if (!filter) {
            return {
                connections: allConnections,
                activeCount: totalActiveCount,
            };
        }

        const filteredConnections = Object.entries(allConnections)
            .filter(([serverId]) => filter(serverId))
            .reduce((acc, [id, conn]) => {
                acc[id] = conn;
                return acc;
            }, {} as Record<string, StoredConnection>);

        const filteredActiveCount = Object.values(filteredConnections)
            .filter(conn => conn.connectionStatus === 'CONNECTED')
            .length;

        return {
            connections: filteredConnections,
            activeCount: filteredActiveCount,
        };
    }, [allConnections, totalActiveCount, filter, isValidating]);

    // Fetch connections on mount
    useEffect(() => {
        if (hasValidated.current) return;

        const load = async () => {
            hasValidated.current = true;
            setIsValidating(true);

            try {
                await fetchConnections();
            } finally {
                setIsValidating(false);
            }
        };

        load();
    }, [fetchConnections]);

    const contextValue = useMemo<ConnectionContextValue>(() => ({
        connections,
        activeCount,
        isValidating,
        progress,
        refresh: fetchConnections,
    }), [connections, activeCount, isValidating, progress, fetchConnections]);

    return (
        <ConnectionContext.Provider value={contextValue}>
            {children}
        </ConnectionContext.Provider>
    );
}

export function useConnectionContext() {
    const context = useContext(ConnectionContext);
    if (!context) {
        throw new Error("useConnectionContext must be used within ConnectionProvider");
    }
    return context;
}
