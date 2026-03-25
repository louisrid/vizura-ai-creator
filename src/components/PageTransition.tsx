import { motion } from "framer-motion";
import { ReactNode } from "react";

const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.28, ease: "easeInOut" }}
    style={{ willChange: "opacity" }}
  >
    {children}
  </motion.div>
);

export default PageTransition;
