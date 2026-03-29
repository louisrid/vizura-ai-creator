import { useState } from "react";
import { motion } from "framer-motion";
import CharacterCreatorOverlay from "@/components/CharacterCreatorOverlay";

const Home = () => {
  const [showCreator, setShowCreator] = useState(false);

  return (
    <div
      className="flex flex-col bg-background overflow-y-auto"
      style={{ height: "calc(100dvh - 73px)" }}
    >
      <CharacterCreatorOverlay open={showCreator} onClose={() => setShowCreator(false)} />

      <div className="flex flex-col gap-4 px-5 pt-6">
        {/* Preview box */}
        <motion.div
          className="border-[5px] border-foreground bg-card rounded-2xl"
          style={{ width: "65%", aspectRatio: "1/1" }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 25 }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <motion.span
              className="text-4xl"
              animate={{ scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              ✨
            </motion.span>
          </div>
        </motion.div>

        {/* Create+ button */}
        <motion.button
          onClick={() => setShowCreator(true)}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-foreground text-base font-extrabold lowercase tracking-tight text-background"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3, type: "spring", stiffness: 250, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <circle cx="12" cy="9" r="4.5" />
            <path d="M4 22a8 8 0 0 1 16 0c0 .6-.4 1-1 1H5a1 1 0 0 1-1-1Z" />
          </svg>
          create+
        </motion.button>
      </div>
    </div>
  );
};

export default Home;
