import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import TopNav from "./TopNav";
import SidebarNav from "./SidebarNav";
import SafeAreaLayout from "./SafeAreaLayout";
import NativeShell from "./NativeShell";
import { useKeyboardInsets } from "@/hooks/useKeyboardInsets";
import AddToHomeScreenPrompt from "../pwa/AddToHomeScreenPrompt";
import { Bell } from "lucide-react";

interface AppLayoutProps {
  title?: string;
  children: React.ReactNode;
}

interface NotificationItem {
  id:      string;
  title:   string;
  detail?: string;
  action?: string;
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [notifs,       setNotifs]       = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError,   setNotifError]   = useState<string | null>(null);
  const navigate = useNavigate();
  useKeyboardInsets();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const notificationsEnabled = () => localStorage.getItem("notifications_enabled") !== "false";
  const summaryEnabled       = () => localStorage.getItem("notifications_summary_enabled") !== "false";

  useEffect(() => {
    if (!notifOpen) return;
    setNotifLoading(true);
    setNotifError(null);
    fetch("/api/notifications/daily")
      .then(r => r.json())
      .then(p => {
        if (!mountedRef.current) return;
        if (!p.success) throw new Error(p.error ?? "Erreur notifications");
        setNotifs((p.notifications ?? []).map((n: any, i: number) => ({
          id:     `${n.lead_id ?? "x"}-${i}`,
          title:  n.title,
          detail: n.body,
          action: n.action,
        })));
      })
      .catch(e => { if (mountedRef.current) setNotifError(e.message); })
      .finally(() => { if (mountedRef.current) setNotifLoading(false); });
  }, [notifOpen]);

  const handleNotif = () => {
    if (!notificationsEnabled()) {
      toast.message("Activez vos notifications", { description: "Paramètres > Notifications." });
      navigate("/settings#notifications");
      return;
    }
    if (!summaryEnabled()) {
      toast.message("Activez le résumé quotidien", { description: "Paramètres > Notifications." });
      navigate("/settings#notifications");
      return;
    }
    setNotifOpen(v => !v);
  };

  return (
    <SafeAreaLayout>

      {/* ── Sidebar desktop uniquement ─────────────────────────────── */}
      <SidebarNav isOpen={false} onClose={() => {}} />

      {/* ── Layout principal ───────────────────────────────────────── */}
      <div className="min-h-screen bg-background flex flex-col lg:ml-[252px]">

        <TopNav title={title} onNotificationsClick={handleNotif} />

        <main
          className="flex-1 overflow-y-auto pb-[calc(var(--tabbar-height)+var(--safe-bottom)+16px)] lg:pb-8"
          role="main"
          aria-label={title ?? "Contenu principal"}
        >
          <div className="max-w-[1280px] mx-auto px-4 lg:px-6 py-5 space-y-5">
            {children}
          </div>

          {/* Panneau notifications */}
          {notifOpen && (
            <div
              className="fixed right-4 top-[60px] lg:top-[64px] z-40
                         w-[min(92vw,340px)] max-h-[70vh] overflow-y-auto
                         rounded-2xl border border-black/[0.07] bg-white
                         shadow-[0_8px_32px_-4px_rgba(26,26,46,0.14)]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
                  <Bell className="h-4 w-4" />
                  Notifications
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="text-xs text-[#1a1a2e]/40 hover:text-[#1a1a2e] transition"
                >
                  Fermer
                </button>
              </div>
              <div className="p-4 space-y-3 text-sm">
                {notifLoading && <p className="text-[#1a1a2e]/40">Chargement…</p>}
                {notifError && !notifLoading && <p className="text-red-500">{notifError}</p>}
                {!notifLoading && !notifError && notifs.length === 0 && (
                  <p className="text-[#1a1a2e]/40 text-sm">Aucune notification récente.</p>
                )}
                {!notifLoading && !notifError && notifs.map(n => (
                  <div key={n.id} className="rounded-xl border border-black/[0.06] px-3 py-2.5 bg-[#1a1a2e]/[0.02] space-y-0.5">
                    <p className="font-medium text-[#1a1a2e]">{n.title}</p>
                    {n.detail && <p className="text-xs text-[#1a1a2e]/50">{n.detail}</p>}
                    {n.action && <p className="text-[11px] text-[#1a1a2e] font-medium">→ {n.action}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <NativeShell />
      <AddToHomeScreenPrompt />

    </SafeAreaLayout>
  );
}
