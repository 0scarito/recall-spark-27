import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Brain, Home, Sparkles, Network, GraduationCap, Settings } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/chat", icon: Sparkles, label: "Chat" },
  { path: "/graph", icon: Network, label: "Graph" },
  { path: "/review", icon: GraduationCap, label: "Review" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background">
      {/* Left sidebar */}
      <div className="w-20 bg-muted/30 border-r border-border flex flex-col items-center py-6 gap-6">
        {/* Logo */}
        <Link to="/home" className="mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
        </Link>

        {/* Navigation items */}
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg transition-all ${
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;


