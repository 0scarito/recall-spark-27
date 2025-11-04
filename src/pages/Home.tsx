import AppLayout from "@/components/AppLayout";
import Dashboard from "@/components/Dashboard";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  return (
    <AppLayout onSignOut={handleSignOut}>
      <Dashboard />
    </AppLayout>
  );
};

export default Home;


