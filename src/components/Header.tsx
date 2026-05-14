import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { useLocation } from "react-router-dom";
import { Gem, Settings, User } from "@/lib/icons";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

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
  const handleLogoClick = () => { markLateralNav(); navigate("/"); };
  const goOrAuth = (path: string) => {
    markLateralNav();
    if (!isLoggedIn) { navigate(`/auth?redirect=${encodeURIComponent(path)}`); return; }
    navigate(path);
  };

  const headerContainerClass = "mx-auto flex h-[56px] w-full max-w-lg items-center justify-between px-[28px] md:h-[73px] md:max-w-3xl md:px-[44px]";

  return (
    <header className="sticky top-0" style={{ zIndex: 9990, backgroundColor: "#000000", borderBottom: "4px solid #000000", paddingTop: "23px" }}>
      
      <div className="relative">
        <div className={headerContainerClass}>
          <div className="flex items-center gap-[10px] md:gap-[12px]">
            <button onClick={handleLogoClick} className="flex items-center transition-opacity duration-150">
              <span
                className="text-[18px] md:text-[24px] text-white tracking-[-0.5px] leading-none lowercase"
                style={{ fontWeight: 900 }}
              >
                facebox
              </span>
            </button>
            {isLoggedIn && (
              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center shrink-0 transition-transform duration-150 w-[27px] h-[27px] md:w-[29px] md:h-[29px]"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "#000000",
                  border: `2px solid ${subscribed ? "hsl(var(--neon-green))" : "#ffffff"}`,
                  transform: "translateX(0px)",
                }}
                aria-label="my account"
              >
                <User size={13} strokeWidth={3.5} className="md:!w-[16px] md:!h-[16px]" style={{ color: "#ffffff" }} />
              </button>
            )}
          </div>

          {!isAuthPage && isLoggedIn && (
            <div className="flex items-center gap-[14px] md:gap-[16px]" style={{ marginLeft: "5px" }}>


              <button
                onClick={() => goOrAuth("/top-ups")}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 select-none h-[33px] md:h-[38px]"
                style={{
                  backgroundColor: "#050a10",
                  border: "2px solid #00e0ff",
                  borderRadius: 9.6,
                }}
                aria-label="buy gems"
              >
                <Gem size={12} strokeWidth={3} className="md:!w-[14px] md:!h-[14px]" style={{ color: "#00e0ff" }} />
                <span className="text-[12px] md:text-[14px] font-[900] lowercase text-white leading-none">{gems}</span>
              </button>

              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center"
                style={{ backgroundColor: "transparent", border: "none", padding: 0, marginLeft: "-2px" }}
                aria-label="settings"
              >
                <Settings size={28} strokeWidth={3} className="md:!w-[31px] md:!h-[31px]" style={{ color: "#ffffff" }} />
              </button>
            </div>
          )}
          {!isAuthPage && !isLoggedIn && (
            <button
              onClick={() => { markLateralNav(); navigate("/auth"); }}
              className="flex items-center justify-center px-3 h-[27px] md:h-[32px]"
              style={{
                backgroundColor: "#ffffff",
                border: "2px solid #ffffff",
                borderRadius: 9.6,
              }}
              aria-label="log in"
            >
              <span className="text-[11px] md:text-[13px] font-[900] lowercase text-black leading-none">log in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
