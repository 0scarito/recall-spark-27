import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/components/Auth";

const ExtensionAuth = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if this page was opened by the extension
    const urlParams = new URLSearchParams(window.location.search);
    const isExtension = urlParams.get('extension') === 'true';

    if (!isExtension) {
      // Redirect to home if not opened by extension
      window.location.href = '/';
      return;
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // If user is logged in, send token to extension
      if (session?.access_token) {
        // Small delay to ensure content script is loaded
        setTimeout(() => {
          sendTokenToExtension(session.access_token);
        }, 1000);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        // Small delay to ensure content script is loaded
        setTimeout(() => {
          sendTokenToExtension(session.access_token);
        }, 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendTokenToExtension = (token: string) => {
    try {
      console.log('[ExtensionAuth] Sending token to extension');
      
      // Method 1: Store token in window for content script to pick up
      (window as any).__RECAP_AUTH_TOKEN__ = token;

      // Method 2: Send token to extension via postMessage
      // The content script will forward this to the extension
      window.postMessage(
        {
          type: 'RECAP_EXTENSION_AUTH',
          token: token,
          success: true
        },
        window.location.origin
      );

      // Method 3: Also try to send to opener window if available
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'RECAP_EXTENSION_AUTH',
            token: token,
            success: true
          },
          window.location.origin
        );
      }

      // Method 4: Try to send via chrome.runtime if available (for extension context)
      if (typeof chrome !== 'undefined' && chrome.runtime && (chrome.runtime as any).id) {
        chrome.runtime.sendMessage((chrome.runtime as any).id, {
          type: 'RECAP_EXTENSION_AUTH',
          token: token,
          success: true
        }).catch(() => {
          // Extension might not be listening, that's okay
        });
      }

      // Show success message
      setError(null);
      
      // Give time for message to be received, then close window
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {
          // Window might not be closable (user opened it manually)
          console.log('Window cannot be closed automatically');
        }
      }, 2000);
    } catch (err: any) {
      console.error('Error sending token to extension:', err);
      setError('Failed to send token to extension. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {user ? (
          <div className="text-center space-y-4">
            <div className="text-2xl font-bold text-green-500">✅ Authenticated!</div>
            <p className="text-muted-foreground">
              Your extension is now connected. This window will close automatically.
            </p>
            <p className="text-sm text-muted-foreground">
              You can now use the extension to save content to your library.
            </p>
            <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
              <p className="text-sm text-green-400">
                Token sent to extension successfully!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Connect Extension</h2>
              <p className="text-muted-foreground">
                Sign in to connect your Chrome extension
              </p>
            </div>
            <Auth />
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtensionAuth;

