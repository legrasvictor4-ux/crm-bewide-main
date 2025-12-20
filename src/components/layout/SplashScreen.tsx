import { useEffect, useRef, useState } from "react";

const SplashScreen = () => {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 1600);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const step = () => {
      setProgress((p) => {
        const next = Math.min(100, p + 3.5);
        return next;
      });
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#090f1d] via-[#0a1221] to-[#050810] text-white">
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(120%); }
          }
          @keyframes floaty {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
        `}
      </style>
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.25), transparent 35%), radial-gradient(circle at 80% 10%, rgba(99,102,241,0.25), transparent 30%), radial-gradient(circle at 10% 90%, rgba(16,185,129,0.2), transparent 30%)" }} />
      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <div className="relative inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/8 border border-white/10 backdrop-blur-lg shadow-[0_30px_120px_-50px_rgba(59,130,246,0.9)] animate-[floaty_3s_ease-in-out_infinite]">
          <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-white to-slate-200">BeWide CRM</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-blue-100/80">Launch</span>
        </div>
        <h2 className="text-2xl font-bold">Garder un œil sur tout</h2>
        <p className="text-sm text-blue-100/85 max-w-md">
          Scoring, prospection vocale, cartes terrain et IA alignées pour que tout reste clair dès l’ouverture.
        </p>
        <div className="w-64 h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-300 shadow-[0_0_12px_rgba(59,130,246,0.7)]"
            style={{ width: `${progress}%`, transition: "width 120ms ease-out" }}
          >
            <div className="h-full w-1/3 bg-white/50 blur-[8px] animate-[shimmer_1.4s_infinite_linear]" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-blue-200/70">
          <span className="inline-flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          Démarrage de votre espace sécurisé…
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
