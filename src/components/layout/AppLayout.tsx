import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import TopNav from "./TopNav";
import SidebarNav from "./SidebarNav";
import RightPanel from "./RightPanel";
import SafeAreaLayout from "./SafeAreaLayout";
import NativeShell from "./NativeShell";
import { useKeyboardInsets } from "@/hooks/useKeyboardInsets";
import AddToHomeScreenPrompt from "../pwa/AddToHomeScreenPrompt";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AppLayoutProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
}

interface NotificationItem {
  id: string;
  title: string;
  detail?: string;
  action?: string;
  at?: Date | null;
}

const AppLayout = ({ title, breadcrumbs = [], rightPanel, children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const navigate = useNavigate();
  useKeyboardInsets();

  const formatRelative = (date: Date) =>
    formatDistanceToNow(date, { addSuffix: true, locale: fr });

  const areNotificationsEnabled = () => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("notifications_enabled");
    // Seuls les "false" explicites bloquent l'ouverture
    return stored === null || stored.trim().toLowerCase() !== "false";
  };

  const isDailySummaryEnabled = () => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("notifications_summary_enabled");
    // Seuls les "false" explicites bloquent l'ouverture
    return stored === null || stored.trim().toLowerCase() !== "false";
  };

  useEffect(() => {
    const loadNotifications = async () => {
      setLoadingNotifications(true);
      setNotificationsError(null);
      try {
        const res = await fetch("/api/notifications/daily");
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.error || "Erreur notifications");
        const mapped = (payload.notifications || []).map((n: any, idx: number) => ({
          id: `${n.lead_id || "none"}-${n.category}-${idx}`,
          title: n.title,
          detail: n.body,
          action: n.action,
          at: null,
        }));
        setNotifications(mapped);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Impossible de charger les notifications";
        setNotificationsError(message);
      } finally {
        setLoadingNotifications(false);
      }
    };

    if (showNotificationPanel) {
      void loadNotifications();
    }
  }, [showNotificationPanel]);

  return (
    <SafeAreaLayout>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNav
        title={title}
        breadcrumbs={breadcrumbs}
        onToggleSidebar={() => setIsSidebarOpen((s) => !s)}
        onToggleMobileMenu={() => setIsMobileMenuOpen((s) => !s)}
        isMobileMenuOpen={isMobileMenuOpen}
        onNotificationsClick={() => {
          const enabled = areNotificationsEnabled();
          const summaryEnabled = isDailySummaryEnabled();

          if (!enabled) {
            toast.message("Activez vos notifications", {
              description: "Activez les notifications dans Paramètres > Notifications.",
            });
            navigate("/settings#notifications");
            return;
          }

          if (!summaryEnabled) {
            toast.message("Activez le résumé quotidien", {
              description: "Activez le résumé pour afficher vos dernières notifications.",
            });
            navigate("/settings#notifications");
            return;
          }

          setShowNotificationPanel((isOpen) => !isOpen);
        }}
        onProfileClick={() => navigate("/settings")}
      />
      <div className="flex flex-1 overflow-hidden">
        <SidebarNav
          isOpen={isSidebarOpen}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main
          className="flex-1 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          role="main"
          aria-label={title || "Contenu principal"}
          tabIndex={0}
        >
          <div className="page-shell py-6 space-y-6">
            {children}
            {showNotificationPanel && (
              <div className="fixed right-4 top-20 z-40 w-[min(90vw,320px)] max-h-[70vh] overflow-y-auto rounded-2xl border border-border/70 bg-card/95 shadow-lg backdrop-blur-md">
                <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
                  <span className="text-sm font-semibold">Notifications récentes</span>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNotificationPanel(false)}
                  >
                    Fermer
                  </button>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  {loadingNotifications && (
                    <div className="text-muted-foreground text-sm">Chargement des notifications...</div>
                  )}
                  {notificationsError && !loadingNotifications && (
                    <div className="text-destructive text-sm">{notificationsError}</div>
                  )}
                  {!loadingNotifications && !notificationsError && notifications.length === 0 && (
                    <div className="text-muted-foreground text-sm">
                      Aucune notification recente sur les 14 derniers jours.
                    </div>
                  )}
                    {!loadingNotifications &&
                      !notificationsError &&
                      notifications.map((notif) => (
                        <div key={notif.id} className="rounded-lg border border-border/60 px-3 py-2 bg-card/80 space-y-1">
                          <p className="font-medium text-foreground">{notif.title}</p>
                          {notif.detail && <p className="text-xs text-muted-foreground">{notif.detail}</p>}
                          {notif.action && (
                            <p className="text-[11px] text-primary font-medium">
                              Action : {notif.action}
                            </p>
                          )}
                        </div>
                      ))}
                </div>
              </div>
            )}
          </div>
        </main>
        {rightPanel && <RightPanel>{rightPanel}</RightPanel>}
      </div>
      </div>
      <NativeShell />
      <AddToHomeScreenPrompt />
    </SafeAreaLayout>
  );
};

export default AppLayout;
