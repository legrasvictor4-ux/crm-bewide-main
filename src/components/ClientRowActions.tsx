import { useEffect, useState } from "react";
import { Mail, Phone, MoreHorizontal, Eye, Edit, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { useDeleteClient } from "@/hooks/use-clients";
import { toast } from "sonner";

interface ClientRowActionsProps {
  clientId: string;
  clientName?: string;
  onDeleted?: () => void;
}

const ClientRowActions = ({ clientId, clientName, onDeleted }: ClientRowActionsProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { mutateAsync: deleteClient, isPending } = useDeleteClient();

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleDelete = async () => {
    await deleteClient(clientId);
    toast.success("Client supprimé");
    onDeleted?.();
    setSheetOpen(false);
  };

  const actionButtons = (
    <>
      <Button size="icon" variant="ghost" aria-label="Voir le client" className="rounded-[12px]">
        <Eye className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" aria-label="Éditer le client" className="rounded-[12px]">
        <Edit className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" aria-label="Envoyer un email" className="rounded-[12px]">
        <Mail className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" aria-label="Appeler" className="rounded-[12px]">
        <Phone className="h-4 w-4" />
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <div className="relative flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {actionButtons}
        <Button
          size="icon"
          variant="ghost"
          aria-label="Plus d’actions"
          className="rounded-[12px]"
          onClick={() => setSheetOpen(true)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        <Drawer open={sheetOpen} onOpenChange={setSheetOpen} shouldScaleBackground={false}>
          <DrawerContent className="pb-[max(var(--safe-bottom),16px)]">
            <DrawerHeader>
              <DrawerTitle>Actions client</DrawerTitle>
              {clientName && <p className="text-sm text-muted-foreground">{clientName}</p>}
            </DrawerHeader>
            <div className="px-4 space-y-2">
              <Button
                variant="destructive"
                className="w-full h-[48px]"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer le client
              </Button>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="ghost" className="h-[44px] w-full">
                  <X className="h-4 w-4" />
                  Annuler
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      {actionButtons}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Plus d’actions" className="rounded-[12px]">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <DropdownMenuItem className="text-destructive" onSelect={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Supprimer le client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ClientRowActions;
