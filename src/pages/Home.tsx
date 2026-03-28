import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div
      className="flex flex-col bg-background"
      style={{ height: "calc(100dvh - 73px)" }}
    >
      {/* Photo preview box — takes up remaining space */}
      <div className="flex-1 px-4 pt-4 pb-3">
        <div
          className="flex h-full w-full items-center justify-center rounded-2xl border-[4px] border-border bg-card"
        >
          <Wand2 size={32} className="text-foreground/20" />
        </div>
      </div>

      {/* Create+ pill button */}
      <div className="shrink-0 px-4 pb-5">
        <button
          onClick={() => {
            if (!user) {
              navigate("/auth?redirect=/create-character");
            } else {
              navigate("/create-character");
            }
          }}
          className="flex h-[58px] w-full items-center justify-center rounded-full bg-foreground text-[1.25rem] font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
          style={{ transition: "transform 0.05s" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <rect x="0" y="0" width="24" height="24" rx="6" fill="none" />
            <circle cx="12" cy="9" r="4.5" />
            <path d="M4 22a8 8 0 0 1 16 0c0 .6-.4 1-1 1H5a1 1 0 0 1-1-1Z" />
          </svg>
          create+
        </button>
      </div>
    </div>
  );
};

export default Home;
