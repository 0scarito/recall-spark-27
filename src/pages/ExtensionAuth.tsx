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
        sendTokenToExtension(session.access_token);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        sendTokenToExtension(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendTokenToExtension = (token: string) => {
    try {
      // Send token to extension via postMessage
      // The extension will be listening for this message
      window.postMessage(
        {
          type: 'RECAP_EXTENSION_AUTH',
          token: token,
          success: true
        },
        window.location.origin
      );

      // Also try to send to opener window if available
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

      // Try to send via chrome.runtime if available (for extension context)
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          type: 'RECAP_EXTENSION_AUTH',
          token: token,
          success: true
        }).catch(() => {
          // Extension might not be listening, that's okay
        });
      }

      // Show success message
      setError(null);
      
      // Close window after a short delay
      setTimeout(() => {
        if (window.opener) {
          window.close();
        }
      }, 1500);
    } catch (err: any) {
      console.error('Error sending token to extension:', err);
      setError('Failed to send token to extension');
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
            <div className="text-2xl font-bold">✅ Authenticated!</div>
            <p className="text-muted-foreground">
              Your extension is now connected. You can close this window.
            </p>
            <p className="text-sm text-muted-foreground">
              If the window doesn't close automatically, you can close it manually.
            </p>
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

