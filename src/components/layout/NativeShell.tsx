import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Zap, Calendar, MoreHorizontal,
  Clock, MapPin, BarChart2, Upload, Settings, Shield, Sparkles,
} from "lucide-react";

const MAIN_TABS = [
  { to: "/",         icon: LayoutDashboard, label: "Accueil",  end: true  },
  { to: "/contacts", icon: Users,           label: "Contacts", end: false },
  { to: "/scout",    icon: Zap,             label: "Scout",    center: true },
  { to: "/agenda",   icon: Calendar,        label: "Agenda",   end: false },
] as const;

const MORE_ITEMS = [
  { to: "/timeline",    icon: Clock,     label: "Timeline"    },
  { to: "/map",         icon: MapPin,    label: "Carte"       },
  { to: "/analytics",   icon: BarChart2, label: "Analytics"   },
  { to: "/ai-features", icon: Sparkles,  label: "IA & Outils" },
  { to: "/imports",     icon: Upload,    label: "Imports"     },
  { to: "/settings",    icon: Settings,  label: "Paramètres"  },
  { to: "/users",       icon: Shield,    label: "Utilisateurs"},
] as const;

export default function NativeShell() {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* ── Barre de navigation fixe (mobile uniquement) ────────────── */}
      <nav
        aria-label="Navigation principale"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="bg-white/95 backdrop-blur-xl border-t border-black/[0.07]">
          <div className="flex items-stretch h-[56px]">

            {MAIN_TABS.map(({ to, icon: Icon, label, end, center }) =>
              center ? (
                /* Scout — bouton central élevé */
                <NavLink
                  key={to}
                  to={to}
                  aria-label={label}
                  className="flex-1 flex items-center justify-center"
                >
                  {({ isActive }) => (
                    <div
                      className={`w-[46px] h-[38px] rounded-[14px] flex items-center justify-center
                        shadow-[0_4px_14px_rgba(26,26,46,0.22)] transition-all active:scale-95
                        ${isActive ? "bg-[#1a1a2e] scale-100" : "bg-[#1a1a2e]/90"}`}
                      style={{ marginBottom: "8px" }}
                    >
                      <Icon className="h-[19px] w-[19px] text-white" />
                    </div>
                  )}
                </NavLink>
              ) : (
                /* Onglet standard */
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  aria-label={label}
                  className="flex-1 flex flex-col items-center justify-center gap-[3px] py-1"
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-[21px] w-[21px] transition-colors duration-150 ${
                          isActive ? "text-[#1a1a2e]" : "text-gray-400"
                        }`}
                      />
                      <span
                        className={`text-[10px] transition-colors duration-150 ${
                          isActive ? "font-semibold text-[#1a1a2e]" : "font-medium text-gray-400"
                        }`}
                      >
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              )
            )}

            {/* Plus */}
            <button
              onClick={() => setShowMore(true)}
              aria-label="Plus"
              className="flex-1 flex flex-col items-center justify-center gap-[3px] py-1 active:bg-black/[0.03] transition"
            >
              <MoreHorizontal className="h-[21px] w-[21px] text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400">Plus</span>
            </button>

          </div>
        </div>
      </nav>

      {/* ── Sheet "Plus" ────────────────────────────────────────────── */}
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
            onClick={() => setShowMore(false)}
          />
          <div
            className="relative bg-white rounded-t-[28px] px-5 pt-3"
            style={{ paddingBottom: "max(1.5rem, calc(var(--safe-bottom) + 1.25rem))" }}
          >
            {/* Handle */}
            <div className="w-9 h-[3px] bg-black/12 rounded-full mx-auto mb-5" />

            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
              Navigation
            </p>

            <div className="grid grid-cols-4 gap-2">
              {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-[7px] py-3 px-2 rounded-2xl
                     transition-all active:scale-95 ${
                       isActive
                         ? "bg-[#1a1a2e] text-white"
                         : "bg-[#F4F5F8] text-[#1a1a2e]/55"
                     }`
                  }
                >
                  <Icon className="h-[19px] w-[19px]" />
                  <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
