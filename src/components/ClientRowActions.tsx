import { Mail, Phone, MoreHorizontal, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientRowActions = () => (
  <div className="flex items-center gap-1">
    <Button size="icon" variant="ghost" aria-label="Voir le client"><Eye className="h-4 w-4" /></Button>
    <Button size="icon" variant="ghost" aria-label="Éditer le client"><Edit className="h-4 w-4" /></Button>
    <Button size="icon" variant="ghost" aria-label="Envoyer un email"><Mail className="h-4 w-4" /></Button>
    <Button size="icon" variant="ghost" aria-label="Appeler"><Phone className="h-4 w-4" /></Button>
    <Button size="icon" variant="ghost" aria-label="Plus d’actions"><MoreHorizontal className="h-4 w-4" /></Button>
  </div>
);

export default ClientRowActions;
