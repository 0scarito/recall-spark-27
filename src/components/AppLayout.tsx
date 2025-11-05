import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Brain, Home, Sparkles, Network, GraduationCap, Settings } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  onSignOut?: () => void;
}

const AppLayout = ({ children, onSignOut }: AppLayoutProps) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <SidebarProvider>
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/95 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="mr-1" />
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Recall</h1>
          </div>
          {onSignOut && (
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              Sign Out
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4">
        <div className="flex gap-4">
          <Sidebar className="bg-background/40 border-border/50" collapsible="icon">
            <SidebarHeader className="px-3 py-2">
              <div className="text-sm text-muted-foreground">Navigation</div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>App</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/home")}>
                        <Link to="/home" className="w-full text-left flex items-center gap-2">
                          <Home className="w-4 h-4" /> Home
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/chat")}>
                        <Link to="/chat" className="w-full text-left flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> Chat
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/graph")}>
                        <Link to="/graph" className="w-full text-left flex items-center gap-2">
                          <Network className="w-4 h-4" /> Graph
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/review")}>
                        <Link to="/review" className="w-full text-left flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" /> Review
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/settings")}>
                        <Link to="/settings" className="w-full text-left flex items-center gap-2">
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="px-3 py-2" />
          </Sidebar>

          <SidebarInset className="flex-1 py-6">
            {children}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;


