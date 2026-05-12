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

  const headerContainerClass = "mx-auto flex h-[72px] w-full max-w-lg items-center justify-between px-[20px] md:h-[92px] md:max-w-3xl md:px-[36px]";

  return (
    <header className="sticky top-0" style={{ zIndex: 9990, backgroundColor: "#000000", borderBottom: "4px solid #ffe603", paddingTop: "12px" }}>
      
      <div className="relative">
        <div className={headerContainerClass}>
          <div className="flex items-center gap-[10px] md:gap-[12px]">
            <button onClick={handleLogoClick} className="flex items-center transition-opacity duration-150">
              <span
                className="text-[20px] md:text-[25px] text-white tracking-[-0.5px] leading-none"
                style={{ fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif", fontWeight: 900, transform: "translateY(0)" }}
              >
                facebox
              </span>
            </button>
            {isLoggedIn && (
              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center shrink-0 transition-transform duration-150 w-[29px] h-[29px] md:w-[33px] md:h-[33px]"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "#000000",
                  border: `2px solid ${subscribed ? "hsl(var(--neon-green))" : "#ffffff"}`,
                  transform: "translateX(2px)",
                }}
                aria-label="my account"
              >
                <User size={13} strokeWidth={3.5} className="md:!w-[17px] md:!h-[17px]" style={{ color: "#ffffff" }} />
              </button>
            )}
          </div>

          {!isAuthPage && isLoggedIn && (
            <div className="flex items-center gap-3 md:gap-5">
              <button
                onClick={() => goOrAuth("/top-ups")}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 select-none h-[35px] md:h-[40px]"
                style={{
                  backgroundColor: "#050a10",
                  border: "2px solid #00e0ff",
                  borderRadius: 8,
                }}
                aria-label="buy gems"
              >
                <Gem size={12} strokeWidth={3} className="md:!w-[15px] md:!h-[15px]" style={{ color: "#00e0ff" }} />
                <span className="text-[13px] md:text-[15px] font-[900] lowercase text-white leading-none mt-[-2px]">{gems}</span>
              </button>

              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center w-[38px] h-[38px] md:w-[44px] md:h-[44px]"
                style={{ backgroundColor: "transparent", border: "none" }}
                aria-label="settings"
              >
                <Settings size={22} strokeWidth={3} className="md:!w-[26px] md:!h-[26px]" style={{ color: "#ffffff" }} />
              </button>
            </div>
          )}
          {!isAuthPage && !isLoggedIn && (
            <button
              onClick={() => { markLateralNav(); navigate("/auth"); }}
              className="flex items-center justify-center px-4 h-[31px] md:h-[37px]"
              style={{
                backgroundColor: "#ffe603",
                border: "2px solid #ffe603",
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
