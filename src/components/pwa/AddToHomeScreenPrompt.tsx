import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { X, Share2, Safari } from "lucide-react";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}

const STORAGE_KEY = "a2hs-dismissed";

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (window.navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

const AddToHomeScreenPrompt = () => {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const ios = isIOS();
  const standalone = isInStandaloneMode();

  useEffect(() => {
    if (standalone) return;
    const dismissed = localStorage.getItem(STORAGE_KEY) === "true";
    if (dismissed) return;

    if (ios) {
      const timer = setTimeout(() => setOpen(true), 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [ios, standalone]);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "dismissed") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setOpen(false);
  };

  if (standalone) return null;

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    await Notification.requestPermission();
    if (Notification.permission === "granted") {
      // Register push subscription via service worker
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined, // VAPID key not configured yet
        });
        console.log("[PWA] Push subscribed:", sub);
      } catch (e) {
        console.warn("[PWA] Push subscription failed:", e);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) localStorage.setItem(STORAGE_KEY, "true");
    }}>
      <SheetContent side="bottom" className="pb-[max(env(safe-area-inset-bottom),16px)]">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>
            {ios ? "Ajouter sur l’écran d’accueil" : "Installer BeWide"}
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fermer">
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {ios ? (
          <>
            <SheetDescription className="mt-2 text-sm leading-relaxed">
              Pour une expérience complète avec <strong>vraies notifications push</strong> et plein écran :
            </SheetDescription>
            <ol className="mt-3 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#007AFF] text-white text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Tape sur le bouton <strong>Partager</strong> <Share2 className="inline h-4 w-4" /> dans Safari</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#007AFF] text-white text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Fais défiler vers le bas et tape <strong>"Sur l'écran d'accueil"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#007AFF] text-white text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Tape <strong>"Ajouter"</strong> en haut à droite</span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              iOS demandera l'autorisation de notification au moment de l'ajout.
            </p>
            <div className="mt-4 flex gap-3">
              <Button className="flex-1" onClick={() => {
                setOpen(false);
                localStorage.setItem(STORAGE_KEY, "true");
              }}>
                J'ai compris
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Plus tard</Button>
            </div>
          </>
        ) : (
          <>
            <SheetDescription className="mt-2">
              Installe l'appli pour une expérience plein écran, sans barre d'adresse, avec notifs push.
            </SheetDescription>
            <div className="mt-4 flex gap-3">
              <Button className="flex-1" onClick={install}>Installer</Button>
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Plus tard</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AddToHomeScreenPrompt;
