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
  const isHomeRoute = pathname === "/";

  const handleLogoClick = () => { markLateralNav(); navigate("/"); };
  const goOrAuth = (path: string) => {
    markLateralNav();
    if (!isLoggedIn) { navigate(`/auth?redirect=${encodeURIComponent(path)}`); return; }
    navigate(path);
  };

  const headerContainerClass = "mx-auto flex h-[78px] w-full max-w-lg items-center justify-between px-[20px] md:h-[100px] md:max-w-3xl md:px-[36px]";

  return (
    <header className="sticky top-0" style={{ zIndex: 9990, background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)", paddingTop: "6px" }}>
      
      <div className="relative">
        <div className={headerContainerClass}>
          <div className="flex items-center gap-[10px] md:gap-[12px]">
            <button onClick={handleLogoClick} className="flex items-center transition-opacity duration-150">
              <span
                className="text-[22px] md:text-[27px] text-white tracking-[-0.5px] leading-none"
                style={{ fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif", fontWeight: 900, transform: "translateY(0)" }}
              >
                facebox
              </span>
            </button>
            {isLoggedIn && (
              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center shrink-0 transition-transform duration-150 w-[31px] h-[31px] md:w-[36px] md:h-[36px]"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "#000000",
                  border: `2px solid ${subscribed ? "hsl(var(--neon-green))" : "#ffffff"}`,
                  transform: "translateX(2px)",
                }}
                aria-label="my account"
              >
                <User size={14} strokeWidth={3.5} className="md:!w-[18px] md:!h-[18px]" style={{ color: "#ffffff" }} />
              </button>
            )}
          </div>

          {!isAuthPage && isLoggedIn && (
            <div className="flex items-center gap-3 md:gap-5">
              <button
                onClick={() => goOrAuth("/top-ups")}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 select-none h-[38px] md:h-[44px]"
                style={{
                  backgroundColor: "#050a10",
                  border: "2px solid #00e0ff",
                  borderRadius: 8,
                }}
                aria-label="buy gems"
              >
                <Gem size={13} strokeWidth={3} className="md:!w-[16px] md:!h-[16px]" style={{ color: "#00e0ff" }} />
                <span className="text-[13px] md:text-[15px] font-[900] lowercase text-white leading-none mt-[-2px]">{isLoggedIn ? gems : 0}</span>
              </button>

              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center w-[38px] h-[38px] md:w-[44px] md:h-[44px]"
                style={{
                  backgroundColor: "#000000",
                  border: "2px solid #ffe603",
                  borderRadius: 8,
                }}
                aria-label="settings"
              >
                <Settings size={16} strokeWidth={3} className="md:!w-[20px] md:!h-[20px]" style={{ color: "#ffffff" }} />
              </button>
            </div>
          )}
          {!isAuthPage && !isLoggedIn && (
            <button
              onClick={() => { markLateralNav(); navigate("/auth"); }}
              className="flex items-center justify-center px-4 h-[34px] md:h-[40px]"
              style={{
                backgroundColor: "#ffffff",
                border: "2px solid #ffffff",
                borderRadius: 8,
              }}
              aria-label="log in"
            >
              <span className="text-[13px] md:text-[15px] font-[900] lowercase text-black">log in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
