import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Routes } from "react-router-dom";
import type { PropsWithChildren } from "react";

const variants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const MotionRoutes = ({ children }: PropsWithChildren) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="enter"
        animate="center"
        exit="exit"
        variants={variants}
        transition={{ duration: 0.22, ease: [0.25, 0.8, 0.25, 1] }}
        className="min-h-screen"
      >
        <Routes location={location}>{children}</Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export default MotionRoutes;
