/**
 * Authentication Popup Utilities
 * Reusable utilities for handling OAuth/authentication flows in popup windows
 */

export interface AuthPopupOptions {
  url: string;
  width?: number;
  height?: number;
  windowName?: string;
}

export interface AuthPopupResult {
  sessionId: string;
  serverName?: string;
  serverId?: string;
  serverUrl?: string;
}

/**
 * Open OAuth authorization URL in a popup window and wait for callback
 * @param options - Popup configuration
 * @returns Promise that resolves with session data when auth succeeds
 */
export function openAuthPopup(options: AuthPopupOptions): Promise<AuthPopupResult> {
  const { url, width = 600, height = 700, windowName = 'auth-popup' } = options;

  // Calculate center position relative to parent window
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);

  // Open popup window
  const popup = window.open(
    url,
    windowName,
    `width=${width},height=${height},left=${left},top=${top},popup=yes,toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=yes`
  );

  if (!popup) {
    return Promise.reject(new Error('Failed to open popup window. Please allow popups for this site.'));
  }

  // Focus the popup
  popup.focus();

  // Return promise that resolves when we receive the postMessage
  return new Promise((resolve, reject) => {
    let messageReceived = false;

    // Listen for postMessage from popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        console.warn('[Auth Popup] Ignoring message from unknown origin:', event.origin);
        return;
      }

      const { type, sessionId, serverName, serverId, serverUrl, error } = event.data;

      if (type === 'mcp-auth-success') {
        console.log('[Auth Popup] Authentication successful');
        messageReceived = true;
        cleanup();
        resolve({ sessionId, serverName, serverId, serverUrl });
      } else if (type === 'mcp-auth-error') {
        console.error('[Auth Popup] Authentication error:', error);
        messageReceived = true;
        cleanup();
        reject(new Error(error || 'Authentication failed'));
      }
    };

    // Check if popup was closed without completing auth
    const popupCheckInterval = setInterval(() => {
      if (popup.closed) {
        cleanup();
        if (!messageReceived) {
          reject(new Error('Authentication was cancelled'));
        }
      }
    }, 500);

    // Cleanup function
    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(popupCheckInterval);
      if (!popup.closed) {
        popup.close();
      }
    };

    // Add event listener
    window.addEventListener('message', handleMessage);

    // Timeout after 10 minutes
    setTimeout(() => {
      if (!messageReceived) {
        cleanup();
        reject(new Error('Authentication timeout - please try again'));
      }
    }, 10 * 60 * 1000);
  });
}
