import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CalendarClock, BarChart3, Map } from "lucide-react";

interface NativeShellProps {
  tabs?: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const defaultTabs: NativeShellProps["tabs"] = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/prospection", label: "Prospects", icon: Users },
  { to: "/timeline", label: "Timeline", icon: CalendarClock },
  { to: "/agenda", label: "Agenda", icon: BarChart3 },
  { to: "/map", label: "Carte", icon: Map },
];

/**
 * Bottom tabs with a native-like appearance (blurred, touch-friendly).
 * Visible on mobile; uses React Router NavLink for active state.
 */
const NativeShell = ({ tabs = defaultTabs }: NativeShellProps) => {
  return (
    <nav className="native-tabs md:hidden">
      <div className="native-tabs-inner">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `native-tab ${isActive ? "native-tab-active" : ""}`
            }
            aria-label={label}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default NativeShell;
