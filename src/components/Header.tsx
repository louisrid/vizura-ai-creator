import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { useLocation } from "react-router-dom";
import { Gem, Settings, User } from "lucide-react";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import TopGradientBar from "@/components/TopGradientBar";

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

  const handleLogoClick = () => navigate("/");

  const headerContainerClass = isHomeRoute
    ? "mx-auto flex w-full max-w-lg items-center justify-between px-[32px] pt-[50px] pb-3 md:max-w-3xl md:px-[56px] md:pt-[56px]"
    : "mx-auto flex w-full max-w-lg items-center justify-between px-[32px] pt-[50px] pb-3 md:max-w-6xl md:px-[56px] md:pt-[56px]";

  return (
    <header className="relative" style={{ zIndex: 9990, backgroundColor: "#000000" }}>
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
                onClick={() => navigate("/account")}
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
              <div
                className="flex items-center gap-1 md:gap-2 px-2.5 md:px-4 select-none h-[38px] md:h-[46px]"
                style={{
                  backgroundColor: "#050a10",
                  border: "2px solid #00e0ff",
                  borderRadius: 6,
                }}
                aria-label="gem balance"
              >
                <Gem size={13} strokeWidth={2.5} className="md:!w-[17px] md:!h-[17px]" style={{ color: "#00e0ff" }} />
                <span className="text-[13px] md:text-[16px] font-[900] lowercase text-white">{gems}</span>
              </div>

              <button
                onClick={() => navigate("/account")}
                className="flex items-center justify-center w-[38px] h-[38px] md:w-[46px] md:h-[46px]"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  border: "2px solid hsl(var(--border-mid))",
                  borderRadius: 6,
                }}
                aria-label="settings"
              >
                <Settings size={16} strokeWidth={2.5} className="md:!w-[20px] md:!h-[20px]" style={{ color: "#ffffff" }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
