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

  const headerContainerClass = "mx-auto flex h-[66px] w-full max-w-lg items-center justify-between px-[20px] md:h-[85px] md:max-w-3xl md:px-[36px]";

  return (
    <header className="sticky top-0" style={{ zIndex: 9990, backgroundColor: "#000000", paddingTop: "13px" }}>
      
      <div className="relative">
        <div className="mx-auto flex h-[79px] w-full max-w-lg items-center justify-between px-[20px] md:h-[98px] md:max-w-3xl md:px-[36px]">
          <div className="flex items-center gap-[12px] md:gap-[14px]">
            <button onClick={handleLogoClick} className="flex items-center transition-opacity duration-150">
              <span
                className="text-[25px] md:text-[32px] text-white tracking-[-0.5px] leading-none lowercase"
                style={{ fontWeight: 900 }}
              >
                facebox
              </span>
            </button>
            {isLoggedIn && (
              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center shrink-0 transition-transform duration-150 w-[31px] h-[31px] md:w-[35px] md:h-[35px]"
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
            <div className="flex items-center gap-[16px] md:gap-[18px]">


              <button
                onClick={() => goOrAuth("/top-ups")}
                className="flex items-center gap-1.5 md:gap-2 px-3.5 md:px-4 select-none h-[37px] md:h-[43px]"
                style={{
                  backgroundColor: "#050a10",
                  border: "2px solid #00e0ff",
                  borderRadius: 10,
                }}
                aria-label="buy gems"
              >
                <Gem size={13} strokeWidth={3} className="md:!w-[16px] md:!h-[16px]" style={{ color: "#00e0ff" }} />
                <span className="text-[15px] md:text-[17px] font-[900] lowercase text-white leading-none">{gems}</span>
              </button>

              <button
                onClick={() => goOrAuth("/account")}
                className="flex items-center justify-center"
                style={{ backgroundColor: "transparent", border: "none", padding: 0, marginLeft: "-4px" }}
                aria-label="settings"
              >
                <Settings size={23} strokeWidth={3} className="md:!w-[28px] md:!h-[28px]" style={{ color: "#ffffff" }} />
              </button>
            </div>
          )}
          {!isAuthPage && !isLoggedIn && (
            <button
              onClick={() => { markLateralNav(); navigate("/auth"); }}
              className="flex items-center justify-center px-3.5 h-[37px] md:h-[43px]"
              style={{
                backgroundColor: "#ffffff",
                border: "2px solid #ffffff",
                borderRadius: 10,
              }}
              aria-label="log in"
            >
              <span className="text-[15px] md:text-[17px] font-[900] lowercase text-black leading-none">log in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
