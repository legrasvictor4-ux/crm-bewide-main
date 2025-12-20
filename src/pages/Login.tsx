import { useMemo, useState, useEffect, useRef } from "react";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { login, sendOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showParallax, setShowParallax] = useState(false);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const parallaxRaf = useRef<number | null>(null);
  const parallaxTarget = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const googleLogo = useMemo(
    () =>
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 533.5 544.3'%3E%3Cpath fill='%234285F4' d='M533.5 278.4c0-17.4-1.6-34.1-4.7-50.2H272v95.1h147.2c-6.4 34.5-25.8 63.7-55 83.2v68h88.7c52-47.8 80.6-118.1 80.6-196.1z'/%3E%3Cpath fill='%2334A853' d='M272 544.3c74.7 0 137.4-24.7 183.1-66.9l-88.7-68c-24.6 16.5-56.1 26-94.4 26-72.6 0-134.1-49-156.1-115.1H23.9v72.3C69.3 480.6 162.7 544.3 272 544.3z'/%3E%3Cpath fill='%23FBBC04' d='M115.9 320.3c-5.5-16.5-8.7-34-8.7-52.3s3.2-35.8 8.7-52.3V143.4H23.9C8.7 176.2 0 212.7 0 260c0 47.3 8.7 83.8 23.9 116.6l92-72.3z'/%3E%3Cpath fill='%23EA4335' d='M272 107.7c40.6 0 76.7 14 105.2 41.4l78.9-78.9C409.3 26.8 346.6 0 272 0 162.7 0 69.3 63.7 23.9 143.4l92 72.3C137.9 156.7 199.4 107.7 272 107.7z'/%3E%3C/svg%3E",
    []
  );

  const handleLogin = async (payload: { email?: string; password?: string; provider?: "google" | "apple" }) => {
    try {
      setLoading(true);
      setError(null);
      await login(payload);
      navigate("/");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Echec de la connexion";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError("Merci de renseigner votre email pour recevoir un code OTP.");
      return;
    }
    try {
      setOtpSending(true);
      setError(null);
      await sendOtp(email);
      setOtpSent(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Impossible d'envoyer le code OTP.";
      setError(message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpLogin = async () => {
    if (!email.trim()) {
      setError("Email requis pour valider le code OTP.");
      return;
    }
    if (!otpCode.trim()) {
      setError("Merci de saisir le code OTP reçu par email.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await login({ email, otpToken: otpCode });
      navigate("/");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Echec de la connexion OTP.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem("bewide_parallax_seen");
      if (!seen) setShowParallax(true);
    } catch {
      // Si le stockage est bloqué, ne pas afficher le parallax pour éviter un crash
      setShowParallax(false);
    }
  }, []);

  useEffect(() => {
    const node = parallaxRef.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const apply = () => {
      const currentX = parseFloat(node.style.getPropertyValue("--parallax-x") || "0");
      const currentY = parseFloat(node.style.getPropertyValue("--parallax-y") || "0");
      const nextX = currentX + (parallaxTarget.current.x - currentX) * 0.12;
      const nextY = currentY + (parallaxTarget.current.y - currentY) * 0.12;
      node.style.setProperty("--parallax-x", `${nextX}px`);
      node.style.setProperty("--parallax-y", `${nextY}px`);
      parallaxRaf.current = requestAnimationFrame(apply);
    };

    const handleMove = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      parallaxTarget.current = { x: x * 18, y: y * 18 };
      if (!parallaxRaf.current) parallaxRaf.current = requestAnimationFrame(apply);
    };

    node.addEventListener("mousemove", handleMove);
    return () => {
      node.removeEventListener("mousemove", handleMove);
      if (parallaxRaf.current) cancelAnimationFrame(parallaxRaf.current);
      parallaxRaf.current = null;
    };
  }, [showParallax]);

  const closeParallax = () => {
    try {
      window.localStorage.setItem("bewide_parallax_seen", "1");
    } catch {
      // ignore si stockage indisponible
    }
    setShowParallax(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7fbff] via-[#eef3ff] to-[#e4eaff] dark:from-[#070b1c] dark:via-[#0a1020] dark:to-[#0c1226] p-6">
      {showParallax && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center px-6">
          <div
            ref={parallaxRef}
            className="relative max-w-5xl w-full rounded-3xl border border-white/10 bg-gradient-to-br from-[#060c18] via-[#0b1224] to-[#050811] p-10 shadow-[0_30px_140px_-50px_rgba(59,130,246,0.7)] overflow-hidden"
            style={{
              transform: "translate3d(var(--parallax-x,0px), var(--parallax-y,0px), 0)",
              transition: "transform 180ms ease-out",
            }}
          >
            <div className="absolute -left-20 -top-28 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute -right-24 -bottom-36 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
            <button
              onClick={closeParallax}
              className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-blue-100 hover:bg-white/10 border border-white/10 transition"
              aria-label="Fermer l’intro"
            >
              Passer
            </button>
            <div className="flex flex-col md:flex-row md:items-center gap-9 relative">
              <div className="space-y-4 md:w-1/2">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-blue-100/90">
                  <Eye className="h-3.5 w-3.5" /> Garder un œil sur tout
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  BeWide : le cockpit CRM qui voit ce que les autres ne voient pas.
                </h2>
                <p className="text-sm text-blue-100/80 leading-relaxed max-w-xl">
                  Vue unifiée, IA vocale et scoring dynamique pour aligner prospection, carte terrain et actions rapides.
                  Moins d’onglets, plus de décisions claires.
                </p>
                <div className="grid gap-2 text-sm text-blue-100/85">
                  {[
                    "Scoring en temps réel + scripts IA pour l’outreach.",
                    "Carte terrain intégrée : planifier un parcours en 1 clic.",
                    "Actions rapides : Importer, Prospection vocale, Parcours.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 pt-3">
                  <Button onClick={closeParallax} className="gap-2 shadow-lg shadow-blue-600/30">
                    Entrer dans BeWide <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={closeParallax} className="border-white/20 text-blue-100 hover:bg-white/10">
                    Voir le login
                  </Button>
                </div>
              </div>
              <div className="md:w-1/2 grid grid-cols-1 gap-4">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-600/40 via-blue-500/25 to-indigo-600/30 p-5 shadow-[0_20px_80px_-35px_rgba(59,130,246,0.9)]">
                  <div className="flex items-center justify-between text-white/90 text-sm font-semibold mb-3">
                    <span>BeWide CRM</span>
                    <span className="text-emerald-200 text-xs">+26% productivité</span>
                  </div>
                  <div className="h-32 rounded-xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent relative overflow-hidden">
                    <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18), transparent 35%), radial-gradient(circle at 80% 70%, rgba(59,130,246,0.25), transparent 35%)" }} />
                    <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2 text-[11px] text-blue-50/90">
                      <div className="rounded-lg bg-white/15 border border-white/15 p-2">
                        <p className="font-semibold">Prospection</p>
                        <p className="text-blue-100/80">Scripts IA, vocal</p>
                      </div>
                      <div className="rounded-lg bg-white/15 border border-white/15 p-2">
                        <p className="font-semibold">Carte</p>
                        <p className="text-blue-100/80">Parcours terrain</p>
                      </div>
                      <div className="rounded-lg bg-white/15 border border-white/15 p-2">
                        <p className="font-semibold">Scoring</p>
                        <p className="text-blue-100/80">Dynamique</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#0f1220] p-5 opacity-85">
                  <div className="flex items-center justify-between text-white/80 text-sm font-semibold mb-3">
                    <span>Autre CRM</span>
                    <span className="text-amber-200 text-xs">Flux éclaté</span>
                  </div>
                  <div className="h-32 rounded-xl border border-white/5 bg-gradient-to-r from-white/5 via-transparent to-[#0f1220] relative overflow-hidden">
                    <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.08), transparent 30%), radial-gradient(circle at 70% 60%, rgba(148,163,184,0.08), transparent 30%)" }} />
                    <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2 text-[11px] text-slate-200/75">
                      <div className="rounded-lg bg-white/5 border border-white/5 p-2">
                        <p className="font-semibold">Tableurs</p>
                        <p className="text-slate-300/70">Imports lents</p>
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/5 p-2">
                        <p className="font-semibold">Appels</p>
                        <p className="text-slate-300/70">Pas de vocal</p>
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/5 p-2">
                        <p className="font-semibold">Suivi</p>
                        <p className="text-slate-300/70">Cartes séparées</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-md">
        <div className="relative rounded-[32px] border border-white/50 dark:border-white/10 bg-white/35 dark:bg-white/5 backdrop-blur-[26px] shadow-[0_20px_80px_-30px_rgba(30,41,59,0.65)] overflow-hidden">
          <div className="absolute inset-x-12 top-6 h-2 rounded-full bg-white/80 dark:bg-white/10 blur-[0.5px]" />
          <div className="px-9 pt-14 pb-12 space-y-7">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#5f6afc] to-[#7b8bff] shadow-lg shadow-[#5f6afc33]">
                <span className="text-white text-lg font-semibold">BW</span>
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Welcome Back!</h1>
              <p className="text-sm text-muted-foreground">Connectez-vous à votre espace Bewide.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    type="email"
                    placeholder="email@bewide.com"
                    className="pl-10 h-11 rounded-xl bg-white/45 border border-white/50 shadow-inner shadow-white/30 dark:bg-white/5 dark:border-slate-800"
                    data-testid="login-email"
                    aria-label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 rounded-xl bg-white/45 border border-white/50 shadow-inner shadow-white/30 dark:bg-white/5 dark:border-slate-800"
                    data-testid="login-password"
                    aria-label="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 p-1 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
              {otpSent && (
                <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Code OTP reçu par email</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                    className="h-11 rounded-xl bg-white/45 border border-white/50 shadow-inner shadow-white/30 dark:bg-white/5 dark:border-slate-800"
                    data-testid="login-otp"
                    aria-label="Code OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Entrez le code à 6 chiffres reçu pour valider la connexion.</p>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#5f6afc] to-[#7b8bff] text-white shadow-lg shadow-[#5f6afc44] backdrop-blur"
                disabled={loading}
                data-testid="login-submit"
                aria-label="Connexion"
                onClick={() => handleLogin({ email, password })}
              >
                Login <ArrowRight className="h-4 w-4" />
              </Button>
              {otpSent && (
                <Button
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#5f6afc] to-[#7b8bff] text-white shadow-lg shadow-[#5f6afc44] backdrop-blur"
                  disabled={loading}
                  data-testid="login-otp-submit"
                  aria-label="Connexion OTP"
                  onClick={handleOtpLogin}
                >
                  Continuer avec le code OTP <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/50 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-white/70 dark:bg-white/5 px-2 rounded-full">Or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-11 rounded-xl justify-start gap-2 bg-white/60 border border-white/50 dark:bg-white/5 dark:border-slate-800 backdrop-blur"
              disabled={otpSending}
              onClick={handleSendOtp}
            >
              <Mail className="h-4 w-4 text-primary" /> {otpSent ? "Renvoyer un code OTP" : "Recevoir un code OTP"}
            </Button>

            <Button
              variant="outline"
              className="w-full h-11 rounded-xl justify-start gap-2 bg-white/80 border border-white/50 dark:bg-white/5 dark:border-slate-800 backdrop-blur"
              disabled={loading}
              onClick={() => handleLogin({ provider: "google" })}
            >
              <img src={googleLogo} alt="Google" className="h-4 w-4" /> Se connecter avec Google
            </Button>

            <div className="text-center text-xs text-muted-foreground space-y-1">
              <div>
                Don't have an account?{" "}
                <button className="text-primary hover:underline" onClick={() => navigate("/signup")}>
                  Sign Up
                </button>
              </div>
              <div>
                Trouble logging in?{" "}
                <button className="text-primary hover:underline" onClick={() => navigate("/support")}>
                  Click Here
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
