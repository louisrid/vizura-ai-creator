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

  const headerContainerClass = "mx-auto flex h-[66px] w-full max-w-lg items-center justify-between px-[15px] md:h-[75px] md:max-w-3xl md:px-[27px]";

  return (
    <header className="sticky top-0" style={{ zIndex: 9990, backgroundColor: "#000000", borderBottom: "3px solid #ffe603" }}>
      
      <div className="relative">
        <div className={headerContainerClass}>
          <div className="flex items-center gap-[8px] md:gap-[9px]">
            <button onClick={handleLogoClick} className="flex items-center transition-opacity duration-150">
              <span
                className="text-[16px] md:text-[20px] text-white tracking-[-0.5px] leading-none"
                style={{ fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif", fontWeight: 900, transform: "translateY(0)" }}
              >
                facebox
              </span>
            </button>
            {isLoggedIn && (
              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center shrink-0 transition-transform duration-150 w-[23px] h-[23px] md:w-[27px] md:h-[27px]"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "#000000",
                  border: `2px solid ${subscribed ? "hsl(var(--neon-green))" : "#ffffff"}`,
                  transform: "translateX(2px)",
                }}
                aria-label="my account"
              >
                <User size={11} strokeWidth={3.5} className="md:!w-[14px] md:!h-[14px]" style={{ color: "#ffffff" }} />
              </button>
            )}
          </div>

          {!isAuthPage && isLoggedIn && (
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => goOrAuth("/top-ups")}
                className="flex items-center gap-[3px] md:gap-[6px] px-[9px] md:px-3 select-none h-[29px] md:h-[33px]"
                style={{
                  backgroundColor: "#050a10",
                  border: "2px solid #00e0ff",
                  borderRadius: 8,
                }}
                aria-label="buy gems"
              >
                <Gem size={10} strokeWidth={3} className="md:!w-[12px] md:!h-[12px]" style={{ color: "#00e0ff" }} />
                <span className="text-[10px] md:text-[11px] font-[900] lowercase text-white leading-none mt-[-2px]">{isLoggedIn ? gems : 0}</span>
              </button>

              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center w-[29px] h-[29px] md:w-[33px] md:h-[33px]"
                style={{
                  backgroundColor: "#000000",
                  border: "2px solid #ffe603",
                  borderRadius: 8,
                }}
                aria-label="settings"
              >
                <Settings size={12} strokeWidth={3} className="md:!w-[15px] md:!h-[15px]" style={{ color: "#ffffff" }} />
              </button>
            </div>
          )}
          {!isAuthPage && !isLoggedIn && (
            <button
              onClick={() => { markLateralNav(); navigate("/auth"); }}
              className="flex items-center justify-center px-3 h-[26px] md:h-[30px]"
              style={{
                backgroundColor: "#ffffff",
                border: "2px solid #ffffff",
                borderRadius: 8,
              }}
              aria-label="log in"
            >
              <span className="text-[10px] md:text-[11px] font-[900] lowercase text-black">log in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
