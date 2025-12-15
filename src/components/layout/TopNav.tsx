import { Bell, Menu, Search, User } from "lucide-react";
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
}

const TopNav = ({ title, breadcrumbs = [], onToggleSidebar, onToggleMobileMenu, isMobileMenuOpen }: TopNavProps) => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="flex items-center gap-3 px-4 py-2 lg:px-6">
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
        <div className="flex flex-1 items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground" aria-label="Fil d'ariane">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.label} className="flex items-center gap-2">
                <span className="font-medium text-foreground">{crumb.label}</span>
                {idx < breadcrumbs.length - 1 && <span aria-hidden="true">/</span>}
              </div>
            ))}
          </div>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Recherche globale..."
              aria-label="Recherche globale"
              role="searchbox"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Centre de notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" aria-label="Profil utilisateur">
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
  );
};

export default TopNav;
