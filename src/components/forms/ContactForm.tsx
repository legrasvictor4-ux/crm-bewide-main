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
import { useEffect, useMemo, useRef, useState } from "react";
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

  // Track previous defaultValues reference → only reset form when defaults actually change
  const prevDefaultsRef = useRef(defaultValues);
  useEffect(() => {
    if (prevDefaultsRef.current !== defaultValues) {
      prevDefaultsRef.current = defaultValues;
      form.reset(baseDefaults);
    }
  }, [defaultValues, baseDefaults, form]);

  useEffect(() => {
    if (baseDefaults.appointment?.date) {
      void validateScheduling(baseDefaults as ContactRecord);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDefaults.appointment?.date, baseDefaults.address]);

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
      start: data.appointment.date ?? "",
      end: data.appointment.nextDate ?? data.appointment.date ?? "",
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
            <Label htmlFor="status" className="block mb-1">
              Statut
            </Label>
            <select
              id="status"
              {...form.register("status")}
              className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm transition focus:border-primary focus:ring-2 focus:ring-primary/30 hover:border-primary/60"
              data-testid="status"
            >
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
          <div className="space-y-2">
            <Label htmlFor="secondaryContact.name">Nom</Label>
            <Input id="secondaryContact.name" placeholder="Nom" {...form.register("secondaryContact.name")} data-testid="secondaryContact.name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryContact.role">Rôle</Label>
            <Input id="secondaryContact.role" placeholder="Rôle" {...form.register("secondaryContact.role")} data-testid="secondaryContact.role" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryContact.phone">Téléphone</Label>
            <Input id="secondaryContact.phone" placeholder="Téléphone" {...form.register("secondaryContact.phone")} data-testid="secondaryContact.phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryContact.email">Email</Label>
            <Input id="secondaryContact.email" placeholder="Email" {...form.register("secondaryContact.email")} data-testid="secondaryContact.email" />
          </div>
          {form.formState.errors.secondaryContact && (
            <p className="text-destructive text-sm col-span-2">{form.formState.errors.secondaryContact.message}</p>
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
              <div className="space-y-2">
                <Label htmlFor={`additionalContacts.${idx}.name`}>Nom</Label>
                <Input id={`additionalContacts.${idx}.name`} placeholder="Nom" {...form.register(`additionalContacts.${idx}.name` as const)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`additionalContacts.${idx}.role`}>Rôle</Label>
                <Input id={`additionalContacts.${idx}.role`} placeholder="Rôle" {...form.register(`additionalContacts.${idx}.role` as const)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`additionalContacts.${idx}.phone`}>Téléphone</Label>
                <Input id={`additionalContacts.${idx}.phone`} placeholder="Téléphone" {...form.register(`additionalContacts.${idx}.phone` as const)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`additionalContacts.${idx}.email`}>Email</Label>
                <Input id={`additionalContacts.${idx}.email`} placeholder="Email" {...form.register(`additionalContacts.${idx}.email` as const)} />
              </div>
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
          <div className="space-y-2">
            <Label htmlFor="social.instagramHandle">Instagram</Label>
            <Input id="social.instagramHandle" placeholder="Instagram" {...form.register("social.instagramHandle")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social.instagramFollowers">Followers IG</Label>
            <Input id="social.instagramFollowers" type="number" placeholder="Followers IG" {...form.register("social.instagramFollowers", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social.tikTokHandle">TikTok</Label>
            <Input id="social.tikTokHandle" placeholder="TikTok" {...form.register("social.tikTokHandle")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social.tikTokFollowers">Followers TikTok</Label>
            <Input id="social.tikTokFollowers" type="number" placeholder="Followers TikTok" {...form.register("social.tikTokFollowers", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social.linkedInProfile">LinkedIn URL</Label>
            <Input id="social.linkedInProfile" placeholder="LinkedIn URL" {...form.register("social.linkedInProfile")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social.linkedInConnections">Connexions LinkedIn</Label>
            <Input id="social.linkedInConnections" type="number" placeholder="Connexions LinkedIn" {...form.register("social.linkedInConnections", { valueAsNumber: true })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Rendez-vous</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="appointment.date">Date</Label>
            <Input id="appointment.date" placeholder="Date" type="datetime-local" {...form.register("appointment.date")} data-testid="appointment.date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appointment.summary">Résumé</Label>
            <Textarea id="appointment.summary" placeholder="Résumé" {...form.register("appointment.summary")} data-testid="appointment.summary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appointment.nextDate">Prochain rdv</Label>
            <Input id="appointment.nextDate" placeholder="Prochain rdv" type="datetime-local" {...form.register("appointment.nextDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appointment.nextObjective">Objectif prochain rdv</Label>
            <Input id="appointment.nextObjective" placeholder="Objectif prochain rdv" {...form.register("appointment.nextObjective")} />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" {...form.register("appointment.whatsappFollowUp")} data-testid="appointment.whatsappFollowUp" />
              Relancer via WhatsApp
            </label>
          </div>
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
        </CardContent>
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
              <div className="space-y-2">
                <Label htmlFor={`additionalAppointments.${idx}.date`}>Date</Label>
                <Input id={`additionalAppointments.${idx}.date`} placeholder="Date" type="datetime-local" {...form.register(`additionalAppointments.${idx}.date` as const)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`additionalAppointments.${idx}.summary`}>Résumé</Label>
                <Input id={`additionalAppointments.${idx}.summary`} placeholder="Résumé" {...form.register(`additionalAppointments.${idx}.summary` as const)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`additionalAppointments.${idx}.objective`}>Objectif</Label>
                <Input id={`additionalAppointments.${idx}.objective`} placeholder="Objectif" {...form.register(`additionalAppointments.${idx}.objective` as const)} />
              </div>
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
