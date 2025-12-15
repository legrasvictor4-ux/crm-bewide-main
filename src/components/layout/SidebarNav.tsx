import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, BarChart, Upload, Settings, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarNavProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/prospection", label: "Prospection", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart },
  { to: "/imports", label: "Imports", icon: Upload },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/users", label: "User management", icon: Shield },
  { to: "/logout", label: "Logout", icon: LogOut },
];

const SidebarNav = ({ isOpen, isMobileOpen, onCloseMobile }: SidebarNavProps) => {
  return (
    <>
      <aside
        className={`hidden lg:flex flex-col bg-card border-r border-border transition-all duration-200 ${
          isOpen ? "w-64" : "w-16"
        }`}
        aria-label="Navigation principale"
      >
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-muted ${
                    isActive ? "bg-muted text-foreground font-semibold" : "text-muted-foreground"
                  }`
                }
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
                {isOpen && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={onCloseMobile} aria-hidden="true">
          <div
            className="absolute inset-y-0 left-0 w-72 bg-card border-r border-border shadow-lg p-4"
            role="dialog"
            aria-label="Navigation mobile"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold">Menu</span>
              <Button variant="ghost" size="sm" onClick={onCloseMobile} aria-label="Fermer le menu">
                Fermer
              </Button>
            </div>
            <nav className="space-y-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-muted ${
                      isActive ? "bg-muted text-foreground font-semibold" : "text-muted-foreground"
                    }`
                  }
                  aria-label={label}
                  onClick={onCloseMobile}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default SidebarNav;
