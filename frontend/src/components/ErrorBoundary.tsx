import { Component, ErrorInfo, ReactNode } from "react";
import { ServerCrash, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 p-8 rounded-xl max-w-md w-full text-center shadow-2xl shadow-red-900/20">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ServerCrash className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Erreur Critique</h1>
            <p className="text-slate-400 mb-6 text-sm">
              Une erreur inattendue est survenue dans l'interface de commande. Nos ingénieurs galactiques ont été informés.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-widest uppercase flex items-center gap-2 justify-center"
            >
              <RotateCcw size={16} />
              Redémarrer l'interface
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
