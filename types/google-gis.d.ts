// Ambient type declarations for Google Identity Services (loaded via script tag).
// These are intentionally global — no import needed in files that use window.google.

interface GISTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GISTokenResponse) => void;
  error_callback?: (error: GISTokenError) => void;
}

interface GISTokenClient {
  requestAccessToken(config?: { prompt?: string }): void;
}

interface GISTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GISTokenError {
  type: string;
  message?: string;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: GISTokenClientConfig): GISTokenClient;
        revoke(token: string, callback?: () => void): void;
      };
    };
  };
}
