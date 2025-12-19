import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, Loader2, RefreshCw, CalendarClock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ingestVoiceEvent,
  fetchAccountEvents,
  fetchAccountState,
  type TimelineEvent,
  type TimelineAccountState,
} from "@/services/timeline";

const EventRow = ({ event }: { event: TimelineEvent }) => {
  const structured = event.structured_data || {};
  const nextAction = structured.next_action?.date_suggestion;
  const interest = structured.interest_level;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="secondary" className="uppercase">
          {event.event_type}
        </Badge>
        {interest && <Badge variant="outline">Intérêt: {interest}</Badge>}
        <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
      </div>
      <p className="text-sm text-foreground line-clamp-2">{event.raw_input_text}</p>
      {nextAction && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarClock className="h-3 w-3" />
          Prochaine action: {nextAction}
        </div>
      )}
    </div>
  );
};

const StateCard = ({ account }: { account: TimelineAccountState }) => {
  const fields = [
    { label: "Lead score", value: account.lead_score },
    { label: "Probabilité de closing", value: `${account.closing_probability}%` },
    { label: "Statut", value: account.current_status },
    { label: "Dernière interaction", value: account.last_interaction_at ? new Date(account.last_interaction_at).toLocaleString() : "N/A" },
    { label: "Prochaine action", value: account.next_action_at ? new Date(account.next_action_at).toLocaleString() : "Aucune" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>État du compte</CardTitle>
        <CardDescription>Calculé à partir des événements (immutable timeline).</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="font-medium">{f.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const TimelinePage = () => {
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [transcript, setTranscript] = useState("");
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["timeline-events", accountId],
    queryFn: () => fetchAccountEvents(accountId),
    enabled: !!accountId,
  });

  const stateQuery = useQuery({
    queryKey: ["timeline-state", accountId],
    queryFn: () => fetchAccountState(accountId),
    enabled: !!accountId,
  });

  const voiceMutation = useMutation({
    mutationFn: ingestVoiceEvent,
    onSuccess: (data) => {
      const newAccountId = data.account.id;
      setAccountId(newAccountId);
      toast.success("Événement vocal enregistré");
      queryClient.invalidateQueries({ queryKey: ["timeline-events", newAccountId] });
      queryClient.invalidateQueries({ queryKey: ["timeline-state", newAccountId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erreur lors de l'envoi vocal");
    },
  });

  const hasAccount = !!accountId;
  const events = useMemo(() => eventsQuery.data?.events ?? [], [eventsQuery.data]);
  const accountState = stateQuery.data?.account;

  const submitVoice = () => {
    if (!transcript.trim()) {
      toast.error("Ajoute la transcription avant d'envoyer.");
      return;
    }
    voiceMutation.mutate({
      accountId: accountId || undefined,
      accountName: accountName || undefined,
      raw_input_text: transcript,
      created_by: createdBy || undefined,
    });
  };

  useEffect(() => {
    if (accountId) {
      queryClient.invalidateQueries({ queryKey: ["timeline-events", accountId] });
      queryClient.invalidateQueries({ queryKey: ["timeline-state", accountId] });
    }
  }, [accountId, queryClient]);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Capture vocale → Timeline
            </CardTitle>
            <CardDescription>
              Colle une transcription (mobile/voix). L'IA structure, crée l'événement immutable et met à jour le compte.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                placeholder="ID compte (optionnel si nouveau)"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                aria-label="Identifiant de compte"
              />
              <Input
                placeholder="Nom compte (si création)"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                aria-label="Nom de compte"
              />
            </div>
            <Input
              placeholder="Votre identifiant (created_by)"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              aria-label="Créé par"
            />
            <Textarea
              placeholder="Ex: Passé chez Coffee Lab, Julie (manager) veut une démo. Budget 150€. Rappel 23/12."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[140px]"
            />
            <div className="flex items-center gap-2">
              <Button onClick={submitVoice} disabled={voiceMutation.isPending}>
                {voiceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="ml-2">Envoyer (IA)</span>
              </Button>
              {hasAccount && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["timeline-events", accountId] });
                    queryClient.invalidateQueries({ queryKey: ["timeline-state", accountId] });
                  }}
                  disabled={eventsQuery.isFetching || stateQuery.isFetching}
                >
                  <RefreshCw className={`h-4 w-4 ${eventsQuery.isFetching ? "animate-spin" : ""}`} />
                  <span className="ml-2">Rafraîchir</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Événements immutables triés du plus récent au plus ancien.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hasAccount && <p className="text-sm text-muted-foreground">Renseigne un compte ou crée-en un via la capture vocale.</p>}
            {eventsQuery.isFetching && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Chargement...</p>}
            {hasAccount && !eventsQuery.isFetching && events.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun événement pour ce compte.</p>
            )}
            <div className="space-y-2">
              {events.map((evt) => (
                <EventRow key={evt.id} event={evt} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {accountState ? (
          <StateCard account={accountState} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>État du compte</CardTitle>
              <CardDescription>Choisis un compte pour voir le score, statut et prochaine action.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Envoie un événement vocal pour démarrer.</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Mode d'emploi rapide</CardTitle>
            <CardDescription>30s pour mettre à jour un compte au téléphone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1) Colle ou dicte la transcription.</p>
            <p>2) Si le compte existe, saisis l'ID. Sinon donne un nom.</p>
            <p>3) Clique “Envoyer (IA)”. L'événement est créé, le compte se met à jour automatiquement.</p>
            <Separator />
            <p>Le statut, le lead score, la probabilité de closing et la prochaine action sont dérivés des derniers événements.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TimelinePage;
