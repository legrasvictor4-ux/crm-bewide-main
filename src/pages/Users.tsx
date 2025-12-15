import { useMemo, useState } from "react";
import { Shield, UserPlus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type UserRole = "admin" | "manager" | "commercial";
type UserStatus = "active" | "invited" | "suspended";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  region?: string;
};

const initialUsers: UserRow[] = [
  { id: "u-001", name: "Alice Martin", email: "alice@bewide.io", role: "admin", status: "active", region: "Île-de-France" },
  { id: "u-002", name: "Bruno Lefèvre", email: "bruno@bewide.io", role: "manager", status: "active", region: "Auvergne-Rhône-Alpes" },
  { id: "u-003", name: "Camille Dupont", email: "camille@bewide.io", role: "commercial", status: "invited", region: "Nouvelle-Aquitaine" },
];

const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  commercial: "Commercial",
};

const statusTone: Record<UserStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Actif", variant: "default" },
  invited: { label: "Invité", variant: "secondary" },
  suspended: { label: "Suspendu", variant: "destructive" },
};

const UsersPage = () => {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<UserRow, "id">>({
    name: "",
    email: "",
    role: "commercial",
    status: "active",
    region: "",
  });

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const invited = users.filter((u) => u.status === "invited").length;
    const suspended = users.filter((u) => u.status === "suspended").length;
    return { total, active, invited, suspended };
  }, [users]);

  const resetForm = () =>
    setForm({
      name: "",
      email: "",
      role: "commercial",
      status: "active",
      region: "",
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    const newUser: UserRow = { id: `u-${Date.now()}`, ...form };
    setUsers((prev) => [...prev, newUser]);
    setSaving(false);
    setOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Invitez vos équipes, ajustez les rôles et suivez les accès.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUsers(initialUsers)} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Inviter un utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Inviter un utilisateur</DialogTitle>
                <DialogDescription>Saisissez les informations principales. Un email d&apos;invitation sera envoyé.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Prénom Nom"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="prenom.nom@bewide.io"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rôle</Label>
                    <Select
                      value={form.role}
                      onValueChange={(value: UserRole) => setForm((f) => ({ ...f, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value: UserStatus) => setForm((f) => ({ ...f, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="invited">Invité</SelectItem>
                        <SelectItem value="suspended">Suspendu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Zone géographique</Label>
                  <Input
                    id="region"
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                    placeholder="Île-de-France, Lyon, Marseille..."
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving} className="w-full md:w-auto">
                    {saving ? "Envoi..." : "Envoyer l'invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Total utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actifs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.active}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invités</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.invited}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suspendus</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.suspended}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Zone</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{roleLabel[user.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusTone[user.status].variant}>{statusTone[user.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.region || "—"}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                    Aucun utilisateur pour le moment. Invitez votre première personne.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
