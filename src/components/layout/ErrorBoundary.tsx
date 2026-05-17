import { Component, ReactNode, createElement } from "react";
import { AlertCircle, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  message?: string;
  source?: "supabase" | "react" | "unknown";
}

function classifyError(error: Error): "supabase" | "react" | "unknown" {
  const msg = error.message.toLowerCase();
  const code = (error as any)?.code ?? "";
  if (code.toString().toUpperCase().startsWith("PGRST") || msg.includes("postgrest") || msg.includes("supabase")) {
    return "supabase";
  }
  if (msg.includes("removechild") || msg.includes("notfounderror") || msg.includes("domexception")) {
    return "react";
  }
  return "unknown";
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: undefined, source: undefined };
  autoRecoveryTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
      source: classifyError(error),
    };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
    if (classifyError(error) === "react") {
      this.autoRecoveryTimer = setTimeout(() => {
        this.handleRetry();
      }, 1500);
    }
  }

  componentWillUnmount() {
    if (this.autoRecoveryTimer) {
      clearTimeout(this.autoRecoveryTimer);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: undefined, source: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { source, message } = this.state;
      const isSupabaseError = source === "supabase";
      const isReactError = source === "react";

      return (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/40 p-8" role="alert">
          {isSupabaseError ? (
            <Database className="h-10 w-10 text-amber-500" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
          )}
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">
              {isSupabaseError
                ? "Erreur de base de données"
                : this.props.fallbackTitle ?? "Erreur inattendue"}
            </p>
            {isSupabaseError && (
              <p className="text-sm text-muted-foreground">
                Les données n'ont pas pu être chargées. Vérifie la connexion à Supabase.
              </p>
            )}
            {message && !isReactError && (
              <p className="text-xs text-muted-foreground max-w-md mx-auto font-mono">{message}</p>
            )}
            {isReactError && (
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Conflit d'affichage détecté — l'interface a été réinitialisée.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleRetry} aria-label="Réessayer">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Réessayer
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
