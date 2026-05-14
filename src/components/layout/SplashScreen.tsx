import { useCallback, useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { LOGO_SRC } from "@/assets/logoBase64";

// LOGO_SRC = base64 du logo (généré par scripts/use-logo.js)
// Si vide, fallback sur /myclerk-logo.png
const LOGO = LOGO_SRC || "/myclerk-logo.png";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props { onDone?: () => void; }

// ─── SplashScreen ─────────────────────────────────────────────────────────────
// Le logo utilise l'IMAGE RÉELLE /myclerk-logo.png via <motion.img>
// Aucune reproduction — juste l'image animée avec Framer Motion spring
const SplashScreen = ({ onDone }: Props) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const bgRef       = useRef<HTMLDivElement>(null);
  const controls    = useAnimationControls();
  const doneRef     = useRef(false);

  const dismiss = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    controls.start({ opacity: 0, y: 30, scale: 0.96,
      transition: { duration: 0.38, ease: "easeIn" } });
    if (bgRef.current) {
      bgRef.current.style.transition = "opacity 380ms ease";
      bgRef.current.style.opacity = "0";
    }
    setTimeout(() => onDone?.(), 400);
  }, [controls, onDone]);

  // ── Canvas : fond + yeux lumineux + particules ───────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width  = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d")!;

    const ptcls: { x:number;y:number;vx:number;vy:number;r:number;life:number;dec:number }[] = [];
    let burst = false;

    function emit(n: number) {
      const cx = W / 2, cy = H / 2 + 60;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 3 + Math.random() * 6;
        ptcls.push({ x: cx, y: cy, vx: Math.cos(a)*v, vy: Math.sin(a)*v - 2.5,
                     r: 2 + Math.random() * 4, life: 1, dec: .011 + Math.random()*.016 });
      }
    }

    let rafId: number;
    let t0: number | null = null;

    function loop(ts: number) {
      if (!t0) t0 = ts;
      const t = (ts - t0) / 1000;

      for (let i = ptcls.length - 1; i >= 0; i--) {
        const p = ptcls[i];
        p.x += p.vx; p.y += p.vy; p.vy += .09; p.vx *= .97; p.life -= p.dec;
        if (p.life <= 0) ptcls.splice(i, 1);
      }

      // Fond : noir → blanc
      const bgP = t < 0.7 ? 0 : Math.min((t - 0.7) / 0.25, 1);
      const bv  = Math.round(bgP * 250);
      ctx.fillStyle = `rgb(${bv},${bv},${bv})`;
      ctx.fillRect(0, 0, W, H);

      // Deux points lumineux qui s'ouvrent (0.15 → 0.75s) — abstrait, pas de dessin
      if (t > 0.15 && t < 0.78) {
        const p  = Math.min((t - 0.15) / 0.5, 1);
        const r  = p * 16;
        const sp = 6 + p * 18; // espacement croissant
        ctx.save();
        ctx.globalAlpha = p * 0.95;
        ctx.shadowColor = "#fff";
        ctx.shadowBlur  = r * 4;
        ctx.fillStyle   = "#fff";
        for (const dx of [-sp, sp]) {
          ctx.beginPath();
          ctx.arc(W/2 + dx, H/2, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Burst de particules au moment de l'impact du logo (~1.15s)
      if (t > 1.12 && t < 1.2 && !burst) { burst = true; emit(35); }

      for (const p of ptcls) {
        ctx.save();
        ctx.globalAlpha = p.life * 0.42;
        ctx.fillStyle   = "#1a1a2e";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Vignette subtile quand fond blanc
      if (bgP > 0.5) {
        const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H) * 0.65);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, `rgba(0,0,0,${0.07 * bgP})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Séquence animation logo (Framer Motion spring réel) ─────────────────
  useEffect(() => {
    let cancelled = false;
    async function run() {
      // 0.85s : logo spring depuis le haut — stiffness + damping = BOUNCE
      await new Promise(r => setTimeout(r, 850));
      if (cancelled) return;
      await controls.start({
        y: 0, scale: 1, opacity: 1,
        transition: {
          type: "spring",
          stiffness: 120,   // raideur → vitesse
          damping: 9,       // amorti faible → beaucoup de rebond
          mass: 1.1,
          velocity: 5,      // vitesse initiale vers le bas → impact
        },
      });
      if (cancelled) return;

      // Flottement idle perpétuel
      controls.start({
        y: [-4, -14, -4],
        transition: {
          repeat: Infinity,
          duration: 3.4,
          ease: [0.45, 0, 0.55, 1],
        },
      });

      // Auto-dismiss après 6.8s
      await new Promise(r => setTimeout(r, 5000));
      if (!cancelled && !doneRef.current) dismiss();
    }
    run();
    return () => { cancelled = true; };
  }, [controls, dismiss]);

  return (
    <div
      ref={bgRef}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#000", cursor: "pointer",
      }}
      onClick={dismiss}
    >
      {/* Canvas : ouverture + particules + vignette */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />

      {/* ─── IMAGE RÉELLE DU LOGO — aucune reproduction ─────────────────── */}
      {/* Sauvegarder le fichier PNG dans : public/myclerk-logo.png           */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}>
        <motion.img
          src={LOGO}
          alt="myclerk"
          initial={{ y: -220, scale: 0.25, opacity: 0 }}
          animate={controls}
          style={{
            width: "min(560px, 84vw)",
            height: "auto",
            display: "block",
            userSelect: "none",
            WebkitUserDrag: "none",
          } as React.CSSProperties}
          onError={(e) => {
            // Si l'image est manquante : masquer silencieusement
            const img = e.currentTarget;
            img.style.display = "none";
            // Afficher une version de secours minimale
            const parent = img.parentElement!;
            const fallback = document.createElement("div");
            fallback.style.cssText =
              "font:900 52px 'Nunito',sans-serif;color:#1a1a2e;letter-spacing:-1px;opacity:.9";
            fallback.textContent = "myclerk";
            parent.appendChild(fallback);
          }}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
