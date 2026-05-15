import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, BarChart2, Upload, Settings,
  LogOut, Shield, Clock, Calendar, MapPin, Zap, Contact, X, ScanLine,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Props { isOpen: boolean; onClose: () => void; }

const NAV = [
  { to: "/",           label: "Accueil",       icon: LayoutDashboard, end: true },
  { to: "/contacts",   label: "Contacts",      icon: Contact },
  { to: "/prospection",label: "Prospection",   icon: Users },
  { to: "/scout",      label: "Scout IA",      icon: ScanLine, badge: "NEW" },
  { to: "/timeline",   label: "Timeline",      icon: Clock },
  { to: "/agenda",     label: "Agenda",        icon: Calendar },
  { to: "/map",        label: "Carte",         icon: MapPin },
  { to: "/analytics",  label: "Analytics",     icon: BarChart2 },
  { to: "/ai-features",label: "IA & Outils",   icon: Zap },
  { to: "/imports",    label: "Imports",       icon: Upload },
  { to: "/settings",   label: "Paramètres",    icon: Settings },
  { to: "/users",      label: "Utilisateurs",  icon: Shield },
];

// Contenu partagé desktop + mobile
function SidebarContent({ onClose }: { onClose: () => void }) {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const initials = email
    ? email.split("@")[0].split(/[._-]/).map(s => s[0]?.toUpperCase() ?? "").slice(0, 2).join("")
    : "?";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    onClose();
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-5 shrink-0">
        <img src="/myclerk-logo.png" alt="myclerk" className="h-7 w-auto" />
        {/* Croix visible uniquement sur mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-lg text-[#1a1a2e]/40 hover:text-[#1a1a2e] hover:bg-black/5 transition"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-4 border-b border-black/[0.06] mb-1" />

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#1a1a2e] text-white shadow-sm"
                  : "text-[#1a1a2e]/65 hover:bg-[#1a1a2e]/6 hover:text-[#1a1a2e]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-[17px] w-[17px] shrink-0 ${isActive ? "text-white" : "text-[#1a1a2e]/50"}`} />
                <span className="flex-1">{label}</span>
                {badge && !isActive && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#1a1a2e] text-white">
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Profil utilisateur ────────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2 shrink-0 border-t border-black/[0.06] mt-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1a1a2e]/5">
          <div className="w-8 h-8 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#1a1a2e] truncate">{email ?? "Utilisateur"}</p>
            <p className="text-[11px] text-[#1a1a2e]/50">Compte actif</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#1a1a2e]/50 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

export default function SidebarNav({ isOpen, onClose }: Props) {
  return (
    <>
      {/* ── Desktop : sidebar fixe toujours visible (lg+) ──────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[252px] bg-white border-r border-black/[0.07] z-30">
        <SidebarContent onClose={onClose} />
      </aside>

      {/* ── Mobile : overlay slide-in ──────────────────────────────────── */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          <aside className="relative flex flex-col w-72 max-w-[85vw] bg-white shadow-2xl">
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
