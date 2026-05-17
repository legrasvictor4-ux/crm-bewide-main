import { Bell } from "lucide-react";

interface Props {
  title?: string;
  onNotificationsClick?: () => void;
}

export default function TopNav({ title, onNotificationsClick }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-black/[0.06] shrink-0">

      {/* ── Mobile : logo centré + cloche ────────────────────────────── */}
      <div className="lg:hidden flex items-center justify-between h-[52px] px-4">
        <div className="w-10" />
        <img src="/myclerk-logo.png" alt="myclerk" className="h-[28px] w-auto max-w-[160px] shrink-0" />
        <button
          onClick={onNotificationsClick}
          className="w-10 h-10 flex items-center justify-center rounded-xl
                     text-[#1a1a2e]/45 hover:text-[#1a1a2e] hover:bg-black/[0.04] transition"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* ── Desktop : titre + cloche ──────────────────────────────────── */}
      <div className="hidden lg:flex items-center h-[56px] px-6 gap-3">
        <h1 className="flex-1 text-[15px] font-semibold text-[#1a1a2e] truncate">
          {title ?? "myclerk"}
        </h1>
        <button
          onClick={onNotificationsClick}
          className="p-2 rounded-xl text-[#1a1a2e]/45 hover:text-[#1a1a2e] hover:bg-black/[0.04] transition"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
      </div>

    </header>
  );
}
