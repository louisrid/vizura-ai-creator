import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { useLocation } from "react-router-dom";
import { Gem, Settings, User } from "lucide-react";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import TopGradientBar from "@/components/TopGradientBar";
import { markLateralNav } from "@/lib/navigation";

const Header = () => {
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = useAuth();
  const { gems } = useGems();
  const { subscribed } = useSubscription();

  const isLoggedIn = !!user?.id;
  const isAuthPage = pathname === "/auth" || pathname === "/reset-password";
  const isHomeRoute = pathname === "/";

  const handleLogoClick = () => { markLateralNav(); navigate("/"); };

  const headerContainerClass = isHomeRoute
    ? "mx-auto flex w-full max-w-lg items-center justify-between px-[24px] pt-[26px] pb-4 md:max-w-3xl md:px-[40px] md:pt-[30px] md:pb-5"
    : "mx-auto flex w-full max-w-lg items-center justify-between px-[24px] pt-[26px] pb-4 md:max-w-3xl md:px-[40px] md:pt-[30px] md:pb-5";

  return (
    <header className="sticky top-0" style={{ zIndex: 9990, backgroundColor: "#000000", borderBottom: "2px solid hsl(var(--border-mid))" }}>
      <TopGradientBar />
      <div className="relative">
        <div className={headerContainerClass}>
          <div className="flex items-center gap-[10px] md:gap-[12px]">
            <button onClick={handleLogoClick} className="flex items-center transition-opacity duration-150">
              <span
                className="text-[22px] md:text-[28px] text-white tracking-tight leading-none"
                style={{ fontFamily: "'Roundo', sans-serif", fontWeight: 400 }}
              >
                facebox
              </span>
            </button>
            {isLoggedIn && (
              <button
                onClick={() => { markLateralNav(); navigate("/account"); }}
                className="flex items-center justify-center shrink-0 transition-transform duration-150 w-[34px] h-[34px] md:w-[40px] md:h-[40px]"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "hsl(var(--card))",
                  border: `2px solid ${subscribed ? "hsl(var(--neon-green))" : "hsl(var(--border-mid))"}`,
                  transform: "translateX(-1px)",
                }}
                aria-label="my account"
              >
                <User size={14} strokeWidth={3} className="md:!w-[18px] md:!h-[18px]" style={{ color: "#ffffff" }} />
              </button>
            )}
          </div>

          {isLoggedIn && !isAuthPage && (
            <div className="flex items-center gap-3 md:gap-5">
              <button
                onClick={() => { markLateralNav(); navigate("/top-ups"); }}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 select-none h-[38px] md:h-[44px]"
                style={{
                  backgroundColor: "#050a10",
                  border: "2px solid #00e0ff",
                  borderRadius: 6,
                }}
                aria-label="buy gems"
              >
                <Gem size={14} strokeWidth={3} className="md:!w-[18px] md:!h-[18px]" style={{ color: "#00e0ff" }} />
                <span className="text-[14px] md:text-[16px] font-[900] lowercase text-white">{gems}</span>
              </button>

              <button
                onClick={() => { markLateralNav(); navigate("/account"); }}
                className="flex items-center justify-center w-[42px] h-[42px] md:w-[48px] md:h-[48px]"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  border: "2px solid hsl(var(--border-mid))",
                  borderRadius: 6,
                }}
                aria-label="settings"
              >
                <Settings size={18} strokeWidth={3} className="md:!w-[22px] md:!h-[22px]" style={{ color: "#ffffff" }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
