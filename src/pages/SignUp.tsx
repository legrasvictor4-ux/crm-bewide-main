import { useState } from "react";
import { Mail, Lock, ArrowRight, User, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError(null);
      // Placeholder: reuse login for demo; replace with real sign-up API.
      await login({ email, password });
      navigate("/");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Echec de l'inscription";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7fbff] via-[#eef3ff] to-[#e4eaff] dark:from-[#070b1c] dark:via-[#0a1020] dark:to-[#0c1226] p-6">
      <div className="w-full max-w-md">
        <div className="relative rounded-[32px] border border-white/50 dark:border-white/10 bg-white/35 dark:bg-white/5 backdrop-blur-[26px] shadow-[0_20px_80px_-30px_rgba(30,41,59,0.65)] overflow-hidden">
          <div className="absolute inset-x-12 top-6 h-2 rounded-full bg-white/80 dark:bg-white/10 blur-[0.5px]" />
          <div className="px-9 pt-14 pb-12 space-y-7">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#9333ea] shadow-lg shadow-purple-500/30">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white">
                  <path d="M50 6L57 13L66 9L71 18L81 17L83 27L93 31L91 42L99 50L91 58L93 69L83 73L81 83L71 82L66 91L57 87L50 94L43 87L34 91L29 82L19 83L17 73L7 69L9 58L1 50L9 42L7 31L17 27L19 17L29 18L34 9L43 13Z" fill="currentColor"/>
                  <circle cx="36" cy="48" r="9" fill="white" fillOpacity="0.25"/>
                  <circle cx="64" cy="48" r="9" fill="white" fillOpacity="0.25"/>
                  <circle cx="38" cy="46" r="4" fill="white"/>
                  <circle cx="66" cy="46" r="4" fill="white"/>
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
              <p className="text-sm text-muted-foreground">Rejoignez MyClerck pour votre prospection.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Full name</label>
                <div className="relative">
                  <User className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    type="text"
                    placeholder="Prénom Nom"
                    className="pl-10 h-11 rounded-xl bg-white/45 border border-white/50 shadow-inner shadow-white/30 dark:bg-white/5 dark:border-slate-800"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    type="email"
                    placeholder="email@myclerk.app"
                    className="pl-10 h-11 rounded-xl bg-white/45 border border-white/50 shadow-inner shadow-white/30 dark:bg-white/5 dark:border-slate-800"
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
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 rounded-xl bg-white/45 border border-white/50 shadow-inner shadow-white/30 dark:bg-white/5 dark:border-slate-800"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#5f6afc] to-[#7b8bff] text-white shadow-lg shadow-[#5f6afc44] backdrop-blur"
                disabled={loading}
                onClick={handleSignUp}
              >
                Sign Up <ArrowRight className="h-4 w-4" />
              </Button>
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
              className="w-full h-11 rounded-xl justify-start gap-2 bg-white/80 border border-white/50 dark:bg-white/5 dark:border-slate-800 backdrop-blur"
              disabled={loading}
              onClick={() => login({ provider: "google" })}
            >
              <Chrome className="h-4 w-4 text-primary" /> Sign up with Google
            </Button>

            <div className="text-center text-xs text-muted-foreground space-y-1">
              <div>
                Already have an account?{" "}
                <button className="text-primary hover:underline" onClick={() => navigate("/login")}>
                  Login
                </button>
              </div>
              <div>
                Trouble signing up?{" "}
                <button className="text-primary hover:underline" onClick={() => navigate("/support")}>
                  Contact support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
