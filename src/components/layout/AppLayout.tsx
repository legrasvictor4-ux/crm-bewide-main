import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "./TopNav";
import SidebarNav from "./SidebarNav";
import RightPanel from "./RightPanel";

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
  detail: string;
  at: Date;
}

const AppLayout = ({ title, breadcrumbs = [], rightPanel, children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const navigate = useNavigate();

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

      const since = subDays(new Date(), 14).toISOString();

      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, company, first_name, last_name, status, next_action, date_created, lead_score")
          .gte("date_created", since)
          .order("date_created", { ascending: false })
          .limit(50);

        if (error) throw error;

        const mapped = (data || []).map((client) => {
          const name =
            client.company ||
            `${client.first_name || ""} ${client.last_name || ""}`.trim() ||
            "Client";

          const statusLabel: Record<string, string> = {
            new: "Nouveau client",
            success: "Client confirme",
            pending: "Client en attente",
            lost: "Client perdu",
            to_recontact: "A relancer",
          };

          const detailParts = [name];
          if (client.next_action) {
            detailParts.push(client.next_action);
          }
          if (client.lead_score !== null && client.lead_score !== undefined) {
            detailParts.push(`Score ${client.lead_score}`);
          }

          return {
            id: client.id,
            title: statusLabel[client.status] || "Client",
            detail: detailParts.join(" - "),
            at: new Date(client.date_created),
          };
        });

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
          className="flex-1 overflow-y-auto"
          role="main"
          aria-label={title || "Contenu principal"}
          tabIndex={0}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
            {children}
            {showNotificationPanel && (
              <div className="fixed right-6 top-20 z-40 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-border/70 bg-card/95 shadow-lg backdrop-blur-md">
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
                      <div key={notif.id} className="rounded-lg border border-border/60 px-3 py-2 bg-card/80">
                        <p className="font-medium text-foreground">{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.detail}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{formatRelative(notif.at)}</p>
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
  );
};

export default AppLayout;
