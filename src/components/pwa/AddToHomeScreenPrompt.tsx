import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { X } from "lucide-react";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}

const STORAGE_KEY = "a2hs-dismissed";

const AddToHomeScreenPrompt = () => {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === "true";
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "dismissed") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setOpen(false);
  };

  if (!event) return null;

  return (
    <Sheet open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) localStorage.setItem(STORAGE_KEY, "true");
    }}>
      <SheetContent side="bottom" className="pb-[max(env(safe-area-inset-bottom),16px)]">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Ajouter BeWide sur l’écran d’accueil</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fermer">
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>
        <SheetDescription className="mt-2">
          Installe la PWA pour une expérience plein écran, sans barre d’adresse.
        </SheetDescription>
        <div className="mt-4 flex gap-3">
          <Button className="flex-1" onClick={install}>Installer</Button>
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Plus tard</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddToHomeScreenPrompt;
