import { useState } from "react";
import { Mail, Lock, ArrowRight, Apple, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (payload: { email?: string; password?: string; provider?: "google" | "apple" }) => {
    try {
      setLoading(true);
      setError(null);
      await login(payload);
      navigate("/");
    } catch (e: any) {
      setError(e.message || "Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-card/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20">
              <Mail className="h-6 w-6 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Connexion CRM</h1>
            <p className="text-sm text-muted-foreground">Accédez à votre espace de prospection sécurisé.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  type="email"
                  placeholder="vous@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  type="password"
                  placeholder="********"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full gap-2"
              disabled={loading}
              onClick={() => handleLogin({ email, password })}
            >
              Continuer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card/80 px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={loading}
              onClick={() => handleLogin({ provider: "google" })}
            >
              <Chrome className="h-4 w-4" /> Continuer avec Google
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={loading}
              onClick={() => handleLogin({ provider: "apple" })}
            >
              <Apple className="h-4 w-4" /> Continuer avec Apple
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
