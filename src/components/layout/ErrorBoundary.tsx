import { Component, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: undefined };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("UI ErrorBoundary", error, info);
    toast.error("Une erreur est survenue");
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/40 p-6" role="alert">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold">{this.props.fallbackTitle ?? "Erreur inattendue"}</p>
            {this.state.message && <p className="text-sm text-muted-foreground">{this.state.message}</p>}
          </div>
          <Button variant="outline" onClick={this.handleRetry} aria-label="Réessayer">
            Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
