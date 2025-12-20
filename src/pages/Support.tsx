import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageCircle, LifeBuoy } from "lucide-react";

const Support = () => {
  const navigate = useNavigate();

  const handleChatClick = () => {
    // Ouvre le chat dans un nouvel onglet; à remplacer par le widget officiel si disponible
    window.open("https://app.bewide.ai/support/chat", "_blank", "noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fbff] via-[#eef3ff] to-[#e4eaff] dark:from-[#070b1c] dark:via-[#0a1020] dark:to-[#0c1226] flex items-center justify-center">
      <div className="page-shell w-full max-w-3xl py-6">
        <Card className="border-none bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_-30px_rgba(30,41,59,0.65)] rounded-[24px]">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl font-semibold">Contacter l’assistance Bewide</CardTitle>
            <p className="text-sm text-muted-foreground">Décrivez votre problème ou votre demande, nous revenons vers vous rapidement.</p>
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-sm">
                Revenir en arrière
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                <Input placeholder="Prénom Nom" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <Input type="email" placeholder="vous@bewide.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Sujet</label>
              <Input placeholder="Ex: Problème de connexion, question facturation..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <Textarea rows={4} placeholder="Détaillez votre demande pour que l’équipe puisse vous aider plus vite." />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Button className="w-full gap-2">
                <Mail className="h-4 w-4" /> Envoyer par email
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={handleChatClick}>
                <MessageCircle className="h-4 w-4" /> Ouvrir un chat
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Astuce : ajoutez une capture d’écran ou l’heure du problème pour accélérer la résolution.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Support;
