import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactRecordSchema, type ContactRecord } from "@/types/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { validateAppointment, type AppointmentPayload } from "@/services/scheduling";

interface ContactFormProps {
  defaultValues?: Partial<ContactRecord>;
  onSubmit: (data: ContactRecord) => void;
  isSubmitting?: boolean;
  existingAppointments?: AppointmentPayload[];
  validateAppointmentFn?: (apt: AppointmentPayload, existing: AppointmentPayload[]) => Promise<{
    success: boolean;
    conflicts: { code: string; message: string; blocking?: boolean }[];
    travelCheck: number;
  }>;
}

const ContactForm = ({
  defaultValues,
  onSubmit,
  isSubmitting,
  existingAppointments = [],
  validateAppointmentFn = validateAppointment,
}: ContactFormProps) => {
  const baseDefaults = useMemo(
    () => ({
      company: "",
      address: "",
      postalCode: "",
      city: "",
      status: "prospect" as const,
      opportunityScore: 5,
      primaryContact: { name: "", role: "", phone: "", email: "" },
      secondaryContact: undefined,
      additionalContacts: [],
      social: {},
      appointment: undefined,
      additionalAppointments: [],
      ...defaultValues,
    }),
    [defaultValues]
  );

  const form = useForm<ContactRecord>({
    resolver: zodResolver(contactRecordSchema),
    defaultValues: baseDefaults,
  });

  useEffect(() => {
    form.reset(baseDefaults);
  }, [baseDefaults, form]);

  useEffect(() => {
    if (baseDefaults.appointment?.date) {
      void validateScheduling(baseDefaults as ContactRecord);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDefaults.appointment?.date, baseDefaults.address, baseDefaults.city]);

  const {
    fields: additionalContacts,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({ control: form.control, name: "additionalContacts" });

  const {
    fields: extraAppointments,
    append: appendAppointment,
    remove: removeAppointment,
  } = useFieldArray({ control: form.control, name: "additionalAppointments" });

  const [conflicts, setConflicts] = useState<{ code: string; message: string; blocking?: boolean }[]>([]);
  const [warningPending, setWarningPending] = useState<ContactRecord | null>(null);

  const sanitize = (data: ContactRecord): ContactRecord => {
    const cleanedSecondary =
      data.secondaryContact && Object.values(data.secondaryContact).some((v) => !!(v ?? "").toString().trim())
        ? data.secondaryContact
        : undefined;

    const cleanedAdditionalContacts =
      data.additionalContacts?.filter((c) => Object.values(c ?? {}).some((v) => !!(v ?? "").toString().trim())) ?? [];

    const cleanedAppointment =
      data.appointment && Object.values(data.appointment).some((v) => !!(v ?? "").toString().trim())
        ? data.appointment
        : undefined;

    const cleanedAdditionalAppointments =
      data.additionalAppointments?.filter((a) => Object.values(a ?? {}).some((v) => !!(v ?? "").toString().trim())) ?? [];

    return {
      ...data,
      secondaryContact: cleanedSecondary,
      additionalContacts: cleanedAdditionalContacts.length > 0 ? cleanedAdditionalContacts : undefined,
      appointment: cleanedAppointment,
      additionalAppointments: cleanedAdditionalAppointments.length > 0 ? cleanedAdditionalAppointments : undefined,
    };
  };

  const validateScheduling = async (data: ContactRecord) => {
    if (!data.appointment) {
      setConflicts([]);
      return { ok: true, warnings: [] };
    }
    const payload: AppointmentPayload = {
      title: data.company,
      start: data.appointment.date,
      end: data.appointment.nextDate || data.appointment.date,
      address: data.address,
      latitude: undefined,
      longitude: undefined,
      bufferMinutes: 10,
    };
    const resp = await validateAppointmentFn(payload, existingAppointments);
    setConflicts(resp.conflicts);
    const blocking = resp.conflicts.filter((c) => c.code === "TIME_OVERLAP" || c.code === "INVALID_TIME");
    const warnings = resp.conflicts.filter((c) => c.code === "TRAVEL_TOO_TIGHT" || c.blocking === false);
    if (blocking.length > 0) return { ok: false, warnings };
    if (warnings.length > 0) {
      setWarningPending(data);
      return { ok: false, warnings };
    }
    return { ok: true, warnings: [] };
  };

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const cleaned = sanitize(form.getValues());
        const parsed = contactRecordSchema.safeParse(cleaned);
        if (!parsed.success) {
          await form.trigger();
          return;
        }
        const scheduling = await validateScheduling(parsed.data as ContactRecord);
        if (scheduling.ok) {
          onSubmit(parsed.data);
        } else if (scheduling.warnings.length > 0) {
          setWarningPending(parsed.data);
        }
      }}
      data-testid="contact-form"
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle>Entreprise</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company">Entreprise</Label>
            <Input id="company" {...form.register("company")} data-testid="company" />
            {form.formState.errors.company && (
              <p className="text-destructive text-sm">{form.formState.errors.company.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <select id="status" {...form.register("status")} className="rounded-md border px-3 py-2" data-testid="status">
              <option value="client">Client</option>
              <option value="prospect">Prospect</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" {...form.register("address")} data-testid="address" />
            {form.formState.errors.address && (
              <p className="text-destructive text-sm">{form.formState.errors.address.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Code postal</Label>
            <Input id="postalCode" {...form.register("postalCode")} data-testid="postalCode" />
            {form.formState.errors.postalCode && (
              <p className="text-destructive text-sm">{form.formState.errors.postalCode.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" {...form.register("city")} data-testid="city" />
            {form.formState.errors.city && (
              <p className="text-destructive text-sm">{form.formState.errors.city.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="opportunityScore">Score opportunité (1-10)</Label>
            <Input
              id="opportunityScore"
              type="number"
              min={1}
              max={10}
              {...form.register("opportunityScore", { valueAsNumber: true })}
              data-testid="opportunityScore"
            />
            {form.formState.errors.opportunityScore && (
              <p className="text-destructive text-sm">{form.formState.errors.opportunityScore.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact principal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primaryContact.name">Nom</Label>
            <Input id="primaryContact.name" {...form.register("primaryContact.name")} data-testid="primaryContact.name" />
            {form.formState.errors.primaryContact?.name && (
              <p className="text-destructive text-sm">{form.formState.errors.primaryContact.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryContact.role">Rôle</Label>
            <Input id="primaryContact.role" {...form.register("primaryContact.role")} data-testid="primaryContact.role" />
            {form.formState.errors.primaryContact?.role && (
              <p className="text-destructive text-sm">{form.formState.errors.primaryContact.role.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryContact.phone">Téléphone</Label>
            <Input id="primaryContact.phone" {...form.register("primaryContact.phone")} data-testid="primaryContact.phone" />
            {form.formState.errors.primaryContact?.phone && (
              <p className="text-destructive text-sm">{form.formState.errors.primaryContact.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryContact.email">Email</Label>
            <Input id="primaryContact.email" {...form.register("primaryContact.email")} data-testid="primaryContact.email" />
            {form.formState.errors.primaryContact?.email && (
              <p className="text-destructive text-sm">{form.formState.errors.primaryContact.email.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact secondaire (optionnel)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Nom" {...form.register("secondaryContact.name")} data-testid="secondaryContact.name" />
          <Input placeholder="Rôle" {...form.register("secondaryContact.role")} data-testid="secondaryContact.role" />
          <Input placeholder="Téléphone" {...form.register("secondaryContact.phone")} data-testid="secondaryContact.phone" />
          <Input placeholder="Email" {...form.register("secondaryContact.email")} data-testid="secondaryContact.email" />
          {form.formState.errors.secondaryContact && (
            <p className="text-destructive text-sm">{form.formState.errors.secondaryContact.message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Contacts additionnels</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => appendContact({})} data-testid="add-additional-contact">
            Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {additionalContacts.map((field, idx) => (
            <div key={field.id} className="grid gap-2 md:grid-cols-4 items-end">
              <Input placeholder="Nom" {...form.register(`additionalContacts.${idx}.name` as const)} />
              <Input placeholder="Rôle" {...form.register(`additionalContacts.${idx}.role` as const)} />
              <Input placeholder="Téléphone" {...form.register(`additionalContacts.${idx}.phone` as const)} />
              <Input placeholder="Email" {...form.register(`additionalContacts.${idx}.email` as const)} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeContact(idx)}
                className="md:col-span-4 justify-start"
              >
                Supprimer
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Réseaux sociaux</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input placeholder="Instagram" {...form.register("social.instagramHandle")} />
          <Input placeholder="Followers IG" type="number" {...form.register("social.instagramFollowers", { valueAsNumber: true })} />
          <Input placeholder="TikTok" {...form.register("social.tikTokHandle")} />
          <Input placeholder="Followers TikTok" type="number" {...form.register("social.tikTokFollowers", { valueAsNumber: true })} />
          <Input placeholder="LinkedIn URL" {...form.register("social.linkedInProfile")} />
          <Input placeholder="Connexions LinkedIn" type="number" {...form.register("social.linkedInConnections", { valueAsNumber: true })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Rendez-vous</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Date" type="datetime-local" {...form.register("appointment.date")} data-testid="appointment.date" />
          <Textarea placeholder="Résumé" {...form.register("appointment.summary")} data-testid="appointment.summary" />
          <Input placeholder="Prochain rdv" type="datetime-local" {...form.register("appointment.nextDate")} />
          <Input placeholder="Objectif prochain rdv" {...form.register("appointment.nextObjective")} />
        </CardContent>
        {conflicts.length > 0 && (
          <div className="px-6 pb-4 space-y-2">
            {conflicts.map((c) => (
              <Alert key={`${c.code}-${c.message}`} variant={c.code === "TIME_OVERLAP" ? "destructive" : "default"}>
                {c.code === "TIME_OVERLAP" ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertTitle>{c.code === "TIME_OVERLAP" ? "Conflit bloquant" : "Avertissement"}</AlertTitle>
                <AlertDescription>{c.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Rendez-vous additionnels</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => appendAppointment({ date: "", summary: "" })} data-testid="add-appointment">
            Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {extraAppointments.map((field, idx) => (
            <div key={field.id} className="grid gap-2 md:grid-cols-3 items-end">
              <Input placeholder="Date" type="datetime-local" {...form.register(`additionalAppointments.${idx}.date` as const)} />
              <Input placeholder="Résumé" {...form.register(`additionalAppointments.${idx}.summary` as const)} />
              <Input placeholder="Objectif" {...form.register(`additionalAppointments.${idx}.objective` as const)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeAppointment(idx)} className="md:col-span-3 justify-start">
                Supprimer
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting} data-testid="submit-contact">
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {warningPending && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3" data-testid="travel-warning">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="font-semibold text-amber-700">Trajet serré</p>
          </div>
          <p className="text-sm text-amber-700">
            Le temps de trajet semble serré. Voulez-vous confirmer quand même ou ajuster l&apos;horaire ?
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setWarningPending(null)}>
              Ajuster
            </Button>
            <Button
              onClick={() => {
                onSubmit(warningPending);
                setWarningPending(null);
              }}
            >
              Confirmer quand même
            </Button>
          </div>
        </div>
      )}
    </form>
  );
};

export default ContactForm;
