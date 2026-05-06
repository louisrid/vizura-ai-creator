import { Home, Camera, Video, LayoutGrid } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { useAuth } from "@/contexts/AuthContext";

const TABS = [
  { label: "home", path: "/", icon: Home },
  { label: "photo", path: "/create", icon: Camera },
  { label: "video", path: "/video", icon: Video },
  { label: "storage", path: "/storage", icon: LayoutGrid },
];

const BottomTabBar = () => {
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  if (authLoading || !user) return null;
  if (location.pathname === "/auth" || location.pathname === "/reset-password") return null;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9000] flex md:hidden"
      style={{
        backgroundColor: "#000000",
        borderTop: "2px solid hsl(var(--border-mid))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="primary navigation"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 transition-opacity"
            style={{ color: active ? "#ffe603" : "#ffffff" }}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={26} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <span className="text-[10px] font-[900] lowercase tracking-wide">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;
