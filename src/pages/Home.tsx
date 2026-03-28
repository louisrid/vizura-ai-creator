import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Camera, LayoutGrid, FolderOpen, Zap, Settings, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";

const quickLinks = [
  { label: "my characters", icon: LayoutGrid, path: "/characters" },
  { label: "create photo", icon: Camera, path: "/create" },
  { label: "storage", icon: FolderOpen, path: "/storage" },
  { label: "history", icon: Clock, path: "/history" },
  { label: "top-ups", icon: Zap, path: "/top-ups" },
  { label: "account", icon: Settings, path: "/account" },
];

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { credits } = useCredits();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-lg flex-col px-5 pt-14 pb-16">
        {/* Logo + credits */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-[900] lowercase tracking-tight text-foreground">
            vizura
          </h1>

          {user && (
            <div className="flex items-center gap-1.5 rounded-2xl border-[4px] border-neon-yellow px-3 py-1.5">
              <Zap size={12} strokeWidth={2.5} className="text-neon-yellow" />
              <span className="text-[11px] font-extrabold lowercase text-foreground">
                {credits}
              </span>
            </div>
          )}
        </motion.div>

        {/* Hero CTA */}
        <motion.section
          className="mt-14 flex flex-col items-center gap-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Sparkles size={36} strokeWidth={2} className="text-neon-yellow" />

          <h2 className="text-center text-[1.75rem] font-[900] lowercase leading-[1.1] tracking-tight text-foreground">
            create your
            <br />
            character
          </h2>

          <p className="max-w-[16rem] text-center text-sm font-bold lowercase leading-snug text-foreground/60">
            build a character, choose a face, then generate photos
          </p>

          <button
            onClick={() => {
              if (!user) {
                navigate("/auth?redirect=/create-character");
              } else {
                navigate("/create-character");
              }
            }}
            className="mt-2 flex h-16 w-full max-w-[18rem] items-center justify-center gap-2 rounded-2xl border-[4px] border-neon-yellow bg-neon-yellow text-base font-[900] lowercase tracking-tight text-neon-yellow-foreground transition-transform active:scale-[0.96]"
          >
            <Sparkles size={18} strokeWidth={2.5} />
            let's go
          </button>

          {!user && (
            <button
              onClick={() => navigate("/auth")}
              className="text-xs font-extrabold lowercase text-foreground/40 underline underline-offset-4 transition-colors hover:text-foreground/60"
            >
              sign in
            </button>
          )}
        </motion.section>

        {/* Quick links grid */}
        <motion.section
          className="mt-16"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
        >
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (!user && item.path === "/account") {
                    navigate("/auth?redirect=/account");
                  } else {
                    navigate(item.path);
                  }
                }}
                className="flex h-16 items-center gap-3 rounded-2xl border-[4px] border-border bg-card px-4 text-xs font-extrabold lowercase text-foreground transition-colors hover:border-foreground/40 active:scale-[0.97]"
                style={{ transition: "transform 0.05s, border-color 0.15s" }}
              >
                <item.icon size={16} strokeWidth={2.5} className="shrink-0 text-foreground/50" />
                {item.label}
              </button>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Home;
