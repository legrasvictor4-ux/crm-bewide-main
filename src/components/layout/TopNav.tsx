import { Bell, Menu, Search, Sparkles, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopNavProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  onToggleSidebar?: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
}

const TopNav = ({
  title,
  breadcrumbs = [],
  onToggleSidebar,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onNotificationsClick,
  onProfileClick,
}: TopNavProps) => {
  return (
    <>
      <style>
        {`
          @keyframes bewidePulse {
            0% { transform: scale(0.65); opacity: 0.85; }
            50% { transform: scale(1.1); opacity: 0.35; }
            100% { transform: scale(1.35); opacity: 0; }
          }
          @keyframes bewideSweep {
            0% { transform: translateX(-120%); opacity: 0; }
            20% { opacity: 0.35; }
            50% { transform: translateX(0%); opacity: 0.25; }
            80% { opacity: 0.1; }
            100% { transform: translateX(120%); opacity: 0; }
          }
        `}
      </style>
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-2 lg:px-6 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Basculer le menu latéral"
            onClick={onToggleMobileMenu}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            aria-label="Afficher/masquer la barre latérale"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center gap-4 flex-wrap min-w-0">
            <div className="hidden sm:flex items-center gap-3 rounded-xl border border-border/60 bg-card/90 px-4 py-2 shadow-sm">
              <span
                className="text-lg font-semibold leading-none bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #8a8a8a 0%, #1b1b1b 100%)" }}
              >
                BeWide CRM
              </span>
              <span className="text-xs text-muted-foreground">Prospection intelligente</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground" aria-label="Fil d'ariane">
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.label} className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{crumb.label}</span>
                  {idx < breadcrumbs.length - 1 && <span aria-hidden="true">/</span>}
                </div>
              ))}
            </div>
            <div className="relative w-full min-w-0 md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10 w-full"
                placeholder="Recherche globale..."
                aria-label="Recherche globale"
                role="searchbox"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
            <Button
              asChild
              size="sm"
              className="group relative inline-flex gap-2 rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-lg border border-white/30 transition-all duration-200 ease-out overflow-hidden hover:-translate-y-[2px] hover:shadow-[0_14px_34px_-18px_rgba(59,130,246,0.9)] active:translate-y-0.5 active:shadow-[0_10px_24px_-18px_rgba(59,130,246,0.8)] dark:from-neutral-900 dark:via-black dark:to-slate-900 dark:border-white/20 w-full sm:w-auto justify-center px-4"
              aria-label="Accéder à l'app Bewide"
            >
              <a href="https://app.bewide.ai/" target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <span className="pointer-events-none absolute inset-0 bg-white/30 opacity-0 transition-opacity duration-150 group-hover:opacity-20" />
                <span className="pointer-events-none absolute inset-0 rounded-full border border-white/50 opacity-0 group-active:opacity-100 group-active:animate-[bewidePulse_0.6s_ease-out]" />
                <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-white/20 blur-[8px] opacity-0 group-hover:opacity-60 group-hover:animate-[bewideSweep_0.9s_ease-out]" />
                <span className="rounded-full bg-white/15 px-2 py-[2px] text-[11px] font-semibold uppercase tracking-wide">
                  App
                </span>
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold">Bewide</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Centre de notifications"
              onClick={onNotificationsClick}
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              aria-label="Profil utilisateur"
              onClick={onProfileClick}
            >
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Profil</span>
            </Button>
          </div>
        </div>
        {title && (
          <div className="px-4 pb-3 lg:px-6">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>
        )}
      </header>
    </>
  );
};

export default TopNav;
