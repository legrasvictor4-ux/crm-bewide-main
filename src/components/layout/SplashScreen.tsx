import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { LOGO_SRC } from "@/assets/logoBase64";

//
// Logo : base64 (embarqu├® dans le code) ou fichier public
const LOGO = LOGO_SRC || "/myclerk-logo.png";

interface Props { onDone?: () => void; }

export default function SplashScreen({ onDone }: Props) {
  const controls    = useAnimationControls();
  const doneRef     = useRef(false);
  const dismissRef  = useRef<() => void>(() => {});
  const [exiting, setExiting] = useState(false);
  const [hint,    setHint]    = useState(false);
  const isMounted   = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ÔöÇÔöÇÔöÇ Dismiss ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const dismiss = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    if (isMounted.current) {
      setTimeout(() => { if (isMounted.current) onDone?.(); }, 500);
    }
  }, [onDone, isMounted]);

  // Toujours la version la plus r├®cente, sans ├¬tre dans les deps de l'effet
  dismissRef.current = dismiss;

  // ÔöÇÔöÇÔöÇ S├®quence animation ÔÇö ne tourne qu'UNE seule fois ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  useEffect(() => {
    let dead = false;

    (async () => {
      await controls.start({
        y: 0, scale: 1, opacity: 1,
        transition: { type: "spring", stiffness: 240, damping: 14, mass: 0.7, delay: 0.08 },
      });
      if (dead) return;

      controls.start({
        y: [0, -12, 0],
        transition: { repeat: Infinity, duration: 3.6, ease: [0.45, 0, 0.55, 1] },
      });

      setTimeout(() => {       if (!dead && isMounted.current) setHint(true); }, 2000);

      const isTestEnv =
        typeof process !== "undefined" && process.env && process.env.NODE_ENV === "test";
      await new Promise<void>(r => setTimeout(r, isTestEnv ? 50 : 6000));
      if (!dead && !doneRef.current) dismissRef.current();
    })();

    return () => { dead = true; };
  }, [controls]); // controls seul ÔÇö dismiss via ref, jamais red├®marr├®

  // ÔöÇÔöÇÔöÇ Render ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  return (
    <motion.div
      onClick={dismiss}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         9999,
        // Fond blanc ÔÇö le logo (PNG fond blanc) se fond naturellement
        background:     "#F8F8FA",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        cursor:         "pointer",
        overflow:       "hidden",
      }}
    >
      {/* Halo ambiant tr├¿s subtil ÔÇö profondeur sans bruit */}
      <div
        aria-hidden
        style={{
          position:     "absolute",
          width:        "65vw",
          height:       "40vh",
          background:   "radial-gradient(ellipse, rgba(26,26,46,0.055) 0%, transparent 70%)",
          filter:       "blur(64px)",
          pointerEvents:"none",
          borderRadius: "50%",
        }}
      />

      {/* ÔöÇÔöÇ VRAI LOGO ÔÇö image PNG, aucune reproduction ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
      <motion.img
        src={LOGO}
        alt="myclerk"
        draggable={false}
        initial={{ y: -110, scale: 0.75, opacity: 0 }}
        animate={controls}
        style={{
          position:      "relative",
          // Taille responsive : grand sur desktop, s'adapte sur mobile
          width:         "clamp(240px, 46vw, 500px)",
          height:        "auto",
          display:       "block",
          userSelect:    "none",
          pointerEvents: "none",
        }}
        onError={(e) => {
          // Image introuvable ÔåÆ masquer sans crash
          e.currentTarget.style.display = "none";
        }}
      />

      {/* Hint discret en bas */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: hint ? 0.28 : 0 }}
        transition={{ duration: 1 }}
        style={{
          position:     "absolute",
          bottom:       28,
          fontSize:     11,
          letterSpacing:"0.12em",
          textTransform:"uppercase",
          color:        "#1a1a2e",
          fontFamily:   "system-ui, -apple-system, sans-serif",
          pointerEvents:"none",
          userSelect:   "none",
        }}
      >
        Appuyer pour continuer
      </motion.span>
    </motion.div>
  );
}
