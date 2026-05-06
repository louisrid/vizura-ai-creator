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
    ? "mx-auto flex w-full max-w-lg items-center justify-between px-[24px] pt-[44px] pb-7 md:max-w-3xl md:px-[40px] md:pt-[52px] md:pb-8"
    : "mx-auto flex w-full max-w-lg items-center justify-between px-[24px] pt-[44px] pb-7 md:max-w-3xl md:px-[40px] md:pt-[52px] md:pb-8";

  return (
    <header className="sticky top-0" style={{ zIndex: 9990, backgroundColor: "#000000", borderBottom: "2px solid hsl(var(--border-mid))" }}>
      <TopGradientBar />
      <div className="relative">
        <div className={headerContainerClass}>
          <div className="flex items-center gap-[10px] md:gap-[12px]">
            <button onClick={handleLogoClick} className="flex items-center transition-opacity duration-150">
              <span
                className="text-[26px] md:text-[34px] text-white tracking-tight leading-none"
                style={{ fontFamily: "'Roundo', sans-serif", fontWeight: 400 }}
              >
                facebox
              </span>
            </button>
            {isLoggedIn && (
              <button
                onClick={() => { markLateralNav(); navigate("/account"); }}
                className="flex items-center justify-center shrink-0 transition-transform duration-150 w-[38px] h-[38px] md:w-[46px] md:h-[46px]"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "hsl(var(--card))",
                  border: `2px solid ${subscribed ? "hsl(var(--neon-green))" : "hsl(var(--border-mid))"}`,
                  transform: "translateX(-1px)",
                }}
                aria-label="my account"
              >
                <User size={16} strokeWidth={3} className="md:!w-[20px] md:!h-[20px]" style={{ color: "#ffffff" }} />
              </button>
            )}
          </div>

          {isLoggedIn && !isAuthPage && (
            <div className="flex items-center gap-3 md:gap-5">
              <button
                onClick={() => { markLateralNav(); navigate("/top-ups"); }}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 select-none h-[42px] md:h-[50px]"
                style={{
                  backgroundColor: "#050a10",
                  border: "2px solid #00e0ff",
                  borderRadius: 6,
                }}
                aria-label="buy gems"
              >
                <Gem size={16} strokeWidth={3} className="md:!w-[20px] md:!h-[20px]" style={{ color: "#00e0ff" }} />
                <span className="text-[15px] md:text-[18px] font-[900] lowercase text-white">{gems}</span>
              </button>

              <button
                onClick={() => { markLateralNav(); navigate("/account"); }}
                className="flex items-center justify-center w-[46px] h-[46px] md:w-[54px] md:h-[54px]"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  border: "2px solid hsl(var(--border-mid))",
                  borderRadius: 6,
                }}
                aria-label="settings"
              >
                <Settings size={20} strokeWidth={3} className="md:!w-[24px] md:!h-[24px]" style={{ color: "#ffffff" }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
