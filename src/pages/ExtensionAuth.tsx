import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/components/Auth";

const ExtensionAuth = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [tokenSent, setTokenSent] = useState(false);

  useEffect(() => {
    // Check if this page was opened by the extension
    const urlParams = new URLSearchParams(window.location.search);
    const isExtension = urlParams.get('extension') === 'true';

    if (!isExtension) {
      window.location.href = '/';
      return;
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.access_token) {
        sendTokenToExtension(session.access_token, session.refresh_token);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.access_token && !tokenSent) {
        sendTokenToExtension(session.access_token, session.refresh_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [tokenSent]);

  const sendTokenToExtension = (accessToken: string, refreshToken: string | undefined) => {
    setTokenSent(true);
    
    // Method 1: Send via postMessage to content script
    window.postMessage(
      {
        type: 'RECAP_EXTENSION_AUTH',
        token: accessToken,
        refreshToken: refreshToken,
        success: true
      },
      window.location.origin
    );

    // Method 2: Update URL with token for extension to detect via tab monitoring
    // This is a backup method if postMessage fails
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('auth_success', 'true');
    newUrl.searchParams.set('token', accessToken);
    if (refreshToken) {
      newUrl.searchParams.set('refresh_token', refreshToken);
    }
    window.history.replaceState({}, '', newUrl.toString());
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
        {user ? (
          <div className="text-center space-y-4">
            <div className="text-2xl font-bold text-foreground">✅ Authenticated!</div>
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
              <h2 className="text-2xl font-bold mb-2 text-foreground">Connect Extension</h2>
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
