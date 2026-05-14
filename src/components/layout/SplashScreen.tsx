import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { LOGO_SRC } from "@/assets/logoBase64";

// Logo : base64 (embarqué dans le code) ou fichier public
const LOGO = LOGO_SRC || "/myclerk-logo.png";

interface Props { onDone?: () => void; }

export default function SplashScreen({ onDone }: Props) {
  const controls = useAnimationControls();
  const doneRef  = useRef(false);
  const [exiting, setExiting] = useState(false);
  const [hint,    setHint]    = useState(false);

  // ─── Dismiss ────────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    setTimeout(() => onDone?.(), 500);
  }, [onDone]);

  // ─── Séquence animation ──────────────────────────────────────────────────────
  useEffect(() => {
    let dead = false;

    (async () => {
      // ① Spring d'entrée — tombe depuis le haut avec bounce
      await controls.start({
        y:       0,
        scale:   1,
        opacity: 1,
        transition: {
          type:      "spring",
          stiffness: 240,   // raide → snappy
          damping:   14,    // sous-amorti → beau rebond
          mass:      0.7,
          delay:     0.08,
        },
      });
      if (dead) return;

      // ② Flottement doux infini après atterrissage
      controls.start({
        y: [0, -12, 0],
        transition: {
          repeat:     Infinity,
          duration:   3.6,
          ease:       [0.45, 0, 0.55, 1],
        },
      });

      // Hint "appuyer" discret après 2s
      setTimeout(() => { if (!dead) setHint(true); }, 2000);

      // Auto-dismiss après ~6.5s
      await new Promise<void>(r => setTimeout(r, 6000));
      if (!dead && !doneRef.current) dismiss();
    })();

    return () => { dead = true; };
  }, [controls, dismiss]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <motion.div
      onClick={dismiss}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         9999,
        // Fond blanc — le logo (PNG fond blanc) se fond naturellement
        background:     "#F8F8FA",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        cursor:         "pointer",
        overflow:       "hidden",
      }}
    >
      {/* Halo ambiant très subtil — profondeur sans bruit */}
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

      {/* ── VRAI LOGO — image PNG, aucune reproduction ────────────────────────── */}
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
          // Image introuvable → masquer sans crash
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
