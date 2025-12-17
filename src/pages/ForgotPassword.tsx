import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendPasswordReset } from "@/services/auth";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Merci d'indiquer votre email professionnel.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Impossible d'envoyer le lien pour le moment.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7fbff] via-[#eef3ff] to-[#e4eaff] dark:from-[#070b1c] dark:via-[#0a1020] dark:to-[#0c1226] p-6">
      <div className="w-full max-w-xl">
        <div className="relative rounded-[32px] border border-white/50 dark:border-white/10 bg-white/35 dark:bg-white/5 backdrop-blur-[26px] shadow-[0_20px_80px_-30px_rgba(30,41,59,0.65)] overflow-hidden">
          <div className="absolute inset-x-12 top-6 h-2 rounded-full bg-white/80 dark:bg-white/10 blur-[0.5px]" />
          <div className="px-10 pt-12 pb-10 space-y-8">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => navigate("/login")}
              >
                <ArrowLeft className="h-4 w-4" /> Retour connexion
              </button>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#5f6afc] to-[#7b8bff] shadow-lg shadow-[#5f6afc33]">
                <span className="text-white text-sm font-semibold">BW</span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Mot de passe oublié</h1>
              <p className="text-sm text-muted-foreground">
                Saisissez l'email utilisé pour votre compte Bewide. Nous vous enverrons un lien de réinitialisation.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    type="email"
                    placeholder="email@bewide.com"
                    className="pl-10 h-11 rounded-xl bg-white/45 border border-white/50 shadow-inner shadow-white/30 dark:bg-white/5 dark:border-slate-800"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-label="Email"
                    data-testid="forgot-email"
                  />
                </div>
              </div>

              {sent ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Lien envoyé</p>
                    <p className="text-xs text-emerald-900/80 dark:text-emerald-100/80">
                      Vérifiez votre boîte mail et vos spams. Le lien de réinitialisation est valable pendant 30 minutes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/50 dark:border-slate-800 bg-white/50 dark:bg-white/5 px-4 py-3 text-xs text-muted-foreground">
                  Vous n'avez pas accès à votre boîte mail ? Contactez le support ou essayez avec une autre adresse
                  associée à votre compte.
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="space-y-3">
                <Button
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#5f6afc] to-[#7b8bff] text-white shadow-lg shadow-[#5f6afc44] backdrop-blur"
                  onClick={handleSubmit}
                  disabled={loading}
                  data-testid="forgot-submit"
                >
                  {sent ? "Renvoyer le lien" : "Envoyer le lien de réinitialisation"}
                  {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl justify-center bg-white/80 border border-white/50 dark:bg-white/5 dark:border-slate-800 backdrop-blur"
                  onClick={() => navigate("/support")}
                  type="button"
                >
                  Besoin d'aide ? Contacter le support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
