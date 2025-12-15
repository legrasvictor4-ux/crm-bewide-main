import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Paramètres</h1>
          <p className="text-sm text-muted-foreground">Personnalisez votre profil, vos préférences et l’automatisation.</p>
        </div>
        <Button variant="default">Enregistrer</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil utilisateur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Nom / Prénom</Label>
              <Input placeholder="Prénom Nom" data-testid="profile-name" />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@exemple.com" data-testid="profile-email" />
            </div>
            <div className="grid gap-2">
              <Label>Téléphone</Label>
              <Input type="tel" placeholder="+33 6 12 34 56 78" data-testid="profile-phone" />
            </div>
            <div className="grid gap-2">
              <Label>Rôle</Label>
              <Select defaultValue="commercial">
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Zone géographique principale</Label>
              <Input placeholder="Ville / Région" data-testid="profile-region" />
            </div>
            <div className="grid gap-2">
              <Label>Langue</Label>
              <Select defaultValue="fr">
                <SelectTrigger>
                  <SelectValue placeholder="Langue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Fuseau horaire</Label>
              <Input placeholder="Europe/Paris" data-testid="profile-timezone" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Préférences de l’application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="pref-theme">Mode clair / sombre</Label>
              <Switch
                id="pref-theme"
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
            <div className="grid gap-2">
              <Label>Format date / heure</Label>
              <Select defaultValue="ddmmyy">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ddmmyy">JJ/MM/AAAA 24h</SelectItem>
                  <SelectItem value="mmddyy">MM/DD/YYYY 12h</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Unités de distance</Label>
              <Select defaultValue="km">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">Kilomètres</SelectItem>
                  <SelectItem value="miles">Miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Ordre d’affichage des prospects</Label>
              <Select defaultValue="score">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Par score</SelectItem>
                  <SelectItem value="date">Par date</SelectItem>
                  <SelectItem value="proximity">Par proximité</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Affichage carte activé</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Confirmation avant actions critiques</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres CRM (prospects / RDV)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Statuts prospects personnalisables</Label>
              <Textarea placeholder="Froid, Tiède, Chaud, Perdu, Client" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Seuil “chaud” (score)</Label>
              <Input type="number" min={1} max={10} defaultValue={7} data-testid="hot-threshold" />
            </div>
            <div className="grid gap-2">
              <Label>Champs obligatoires</Label>
              <Textarea placeholder="email, téléphone, adresse…" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Modèle de fiche client (champs actifs)</Label>
              <Textarea placeholder="Activer/désactiver certains champs" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Durée par défaut d’un RDV (minutes)</Label>
              <Input type="number" min={10} max={240} defaultValue={60} />
            </div>
            <div className="grid gap-2">
              <Label>Temps de déplacement minimum (minutes)</Label>
              <Input type="number" min={0} max={120} defaultValue={15} />
            </div>
            <div className="grid gap-2">
              <Label>Heures de travail</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="09:00" />
                <Input placeholder="18:00" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Jours non travaillés</Label>
              <Textarea placeholder="Samedi, Dimanche" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Tolérance conflit (bloquant / warning)</Label>
              <Select defaultValue="warning">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blocking">Bloquant</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agenda & planification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Synchronisation agenda</Label>
              <Select defaultValue="google">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google Calendar</SelectItem>
                  <SelectItem value="outlook">Outlook</SelectItem>
                  <SelectItem value="none">Aucune</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Mode de planification</Label>
              <Select defaultValue="manual">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (optimisé)</SelectItem>
                  <SelectItem value="manual">Manuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Distance max entre 2 RDV consécutifs (km)</Label>
              <Input type="number" min={1} max={500} defaultValue={30} />
            </div>
            <div className="grid gap-2">
              <Label>Priorisation</Label>
              <Textarea placeholder="Score opportunité, Proximité géographique" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Pause minimum entre RDV (minutes)</Label>
              <Input type="number" min={0} max={120} defaultValue={10} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vocal & IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Langue de dictée</Label>
              <Select defaultValue="fr">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Mode vocal</Label>
              <Select defaultValue="preview">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Création auto</SelectItem>
                  <SelectItem value="preview">Prévisualisation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Champs auto-remplis par IA</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Recherche web automatique</Label>
              <Switch />
            </div>
            <div className="grid gap-2">
              <Label>Niveau d’enrichissement</Label>
              <Select defaultValue="standard">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="advanced">Avancé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Historique des actions IA</Label>
              <Textarea placeholder="Log des actions récentes" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages & automatisations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Numéro / compte WhatsApp</Label>
              <Input placeholder="+33 6 12 34 56 78" />
            </div>
            <div className="grid gap-2">
              <Label>Modèles de messages (confirmation, remerciement, relance)</Label>
              <Textarea placeholder="Définissez vos templates de messages" rows={3} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Envoi auto après RDV</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label>Envoi auto après vocal</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label>Validation avant envoi</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Données & sécurité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Export Excel / CSV</Label>
              <Button variant="outline" size="sm">Exporter</Button>
            </div>
            <div className="flex items-center justify-between">
              <Label>Import Excel / CSV</Label>
              <Button variant="outline" size="sm">Importer</Button>
            </div>
            <div className="flex items-center justify-between">
              <Label>Sauvegarde automatique</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Historique des modifications</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Sessions actives / déconnexion globale</Label>
              <Button variant="outline" size="sm">Gérer</Button>
            </div>
            <div className="flex items-center justify-between">
              <Label>Suppression compte / données (RGPD)</Label>
              <Button variant="destructive" size="sm">Supprimer</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Équipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Gestion des utilisateurs / rôles</Label>
              <Button variant="outline" size="sm">Ouvrir</Button>
            </div>
            <div className="grid gap-2">
              <Label>Attribution des prospects</Label>
              <Textarea placeholder="Règles d’attribution" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Visibilité</Label>
              <Select defaultValue="perso">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perso">Perso</SelectItem>
                  <SelectItem value="equipe">Équipe</SelectItem>
                  <SelectItem value="globale">Globale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Objectifs commerciaux</Label>
              <Input placeholder="Ex: CA mensuel, nombre de RDV" />
            </div>
            <div className="grid gap-2">
              <Label>Droits par rôle</Label>
              <Textarea placeholder="Liste des permissions par rôle" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Rappels RDV</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Conflits agenda</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Relances à faire</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Résumé quotidien</Label>
              <Switch />
            </div>
            <div className="grid gap-2">
              <Label>Canaux</Label>
              <Textarea placeholder="Push / Email / WhatsApp" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aide & système</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Version de l’app</Label>
              <Input placeholder="v1.0.0" />
            </div>
            <div className="grid gap-2">
              <Label>Changelog</Label>
              <Textarea placeholder="Notes de version" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Support / contact</Label>
              <Input placeholder="support@exemple.com" />
            </div>
            <div className="grid gap-2">
              <Label>FAQ</Label>
              <Textarea placeholder="Lien ou contenu FAQ" rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mode debug</Label>
              <Switch />
            </div>
            <div className="grid gap-2">
              <Label>Politique de confidentialité</Label>
              <Textarea placeholder="Lien ou résumé" rows={2} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
