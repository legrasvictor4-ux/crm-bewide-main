import { Bell, Menu, Search } from "lucide-react";

interface Props {
  title?: string;
  onToggleSidebar?: () => void;
  onNotificationsClick?: () => void;
}

export default function TopNav({ title, onToggleSidebar, onNotificationsClick }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-black/[0.07] shrink-0">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-[58px]">

        {/* Hamburger — mobile uniquement */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-1 rounded-xl text-[#1a1a2e]/60 hover:text-[#1a1a2e] hover:bg-black/5 transition"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo centré — mobile uniquement */}
        <div className="flex-1 flex justify-center lg:hidden">
          <img src="/myclerk-logo.png" alt="myclerk" className="h-6 w-auto" />
        </div>

        {/* Titre de page — desktop uniquement */}
        <h1 className="hidden lg:block text-[15px] font-semibold text-[#1a1a2e] flex-1 truncate">
          {title ?? "myclerk"}
        </h1>

        {/* Actions à droite */}
        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded-xl text-[#1a1a2e]/50 hover:text-[#1a1a2e] hover:bg-black/5 transition"
            aria-label="Rechercher"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={onNotificationsClick}
            className="relative p-2 rounded-xl text-[#1a1a2e]/50 hover:text-[#1a1a2e] hover:bg-black/5 transition"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
        </div>

      </div>
    </header>
  );
}
