import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Hero from "@/components/Hero";
import Auth from "@/components/Auth";
import { Navigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthDialogOpen(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  if (user) return <Navigate to="/home" replace />;

  return (
    <>
      <Hero onGetStarted={() => setAuthDialogOpen(true)} />
      
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <Auth />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Index;