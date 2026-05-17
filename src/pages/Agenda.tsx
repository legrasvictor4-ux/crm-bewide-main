import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Calendar as CalendarIcon, RefreshCw, Cloud, CloudOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useAgenda } from '@/hooks/useAgenda';
import { createAgendaEvent } from '@/services/agenda';
import { useProximitySuggestions } from '@/hooks/useProximitySuggestions';
import { useGoogleSync } from '@/hooks/useGoogleSync';
import { ProximityBanner } from '@/components/agenda/ProximityBanner';
import { EventCard } from '@/components/agenda/EventCard';
import { NewAppointmentModal } from '@/components/agenda/NewAppointmentModal';
import type { AgendaEvent, CreateAgendaEvent, UpdateAgendaEvent } from '@/types/agenda';

const Agenda = () => {
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);

  // Hooks
  const weekStartDate = currentWeekStart.toISOString();
  const weekEndDate = addDays(currentWeekStart, 7).toISOString();

  const {
    events,
    loading,
    error,
    refresh,
    update,
    remove,
    getEventsForDay,
  } = useAgenda({
    timeMin: subWeeks(currentWeekStart, 1).toISOString(),
    timeMax: addWeeks(currentWeekStart, 3).toISOString(),
    autoRefresh: true,
    refreshIntervalMs: 60000,
  });

  const {
    suggestions,
    visible: bannerVisible,
    showBanner,
    accept: acceptSuggestion,
    decline: declineSuggestion,
    dismiss: dismissSuggestion,
    hideBanner,
  } = useProximitySuggestions({ autoRefresh: true, pollIntervalMs: 30000 });

  const {
    connected: gcalConnected,
    provider,
    connect: connectGcal,
    disconnect: disconnectGcal,
    manualSync: manualGcalSync,
    loading: syncLoading,
  } = useGoogleSync(true);

  // Week header
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart],
  );

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const dayEvents = useMemo(() => getEventsForDay(selectedDate), [getEventsForDay, selectedDate]);

  const goNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1));
  const goPrevWeek = () => setCurrentWeekStart((prev) => subWeeks(prev, 1));
  const goToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  };

  const handleToggleComplete = async (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    await update(id, {
      status: event.status === 'completed' ? 'scheduled' : 'completed',
    } as UpdateAgendaEvent);
  };

  const handleSaveNew = async (data: CreateAgendaEvent) => {
    const event = await createAgendaEvent(data);
    if (event) {
      refresh();
      setShowNewModal(false);
    }
  };

  const handleEditSave = async (id: string, data: UpdateAgendaEvent) => {
    await update(id, data);
    setEditingEvent(null);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  };

  const hasEventsOnDay = (day: Date) => getEventsForDay(day).length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ───────────────────────────────── */}
      <header className="border-b border-border bg-card/85 backdrop-blur-xl sticky top-0 z-10">
        <div className="page-shell py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-secondary rounded-[12px] transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                Aujourd'hui
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground hover:opacity-90 transition-opacity text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Nouveau RDV
              </button>
            </div>
          </div>

          {/* Sync status bar */}
          {gcalConnected && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cloud className="w-3.5 h-3.5 text-success" />
                Google Calendar synchronisé
              </div>
              <button
                onClick={manualGcalSync}
                disabled={syncLoading}
                className="text-xs text-accent hover:underline disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Sync now
              </button>
              <button
                onClick={disconnectGcal}
                className="text-xs text-destructive hover:underline"
              >
                Déconnecter
              </button>
            </div>
          )}

          {!gcalConnected && provider !== 'none' && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <CloudOff className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Google Calendar non connecté</span>
              <button
                onClick={connectGcal}
                className="text-xs text-accent hover:underline font-medium"
              >
                Connecter
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="page-shell py-6 space-y-5">
        {/* ── Proximity suggestion banner ─────────────────── */}
        {bannerVisible && showBanner && suggestions[0] && (
          <ProximityBanner
            suggestion={suggestions[0]}
            onAccept={acceptSuggestion}
            onDecline={(id) => declineSuggestion(id, false)}
            onDismiss={(id) => dismissSuggestion(id)}
            onHide={hideBanner}
          />
        )}

        {/* ── Week day selector ──────────────────────────── */}
        <div className="-mx-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 px-2 min-w-full">
            <button
              onClick={goPrevWeek}
              className="p-2 hover:bg-secondary rounded-xl transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-2 flex-1 justify-center">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const hasEvents = hasEventsOnDay(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center justify-center rounded-[16px] px-4 py-2.5 text-center transition-all flex-1 max-w-[80px] ${
                      isSelected
                        ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20'
                        : isToday
                          ? 'bg-secondary border border-accent/20 text-foreground'
                          : 'bg-card border border-border text-foreground hover:border-accent/30'
                    }`}
                  >
                    <div className="text-[11px] font-medium opacity-70 mb-0.5 uppercase tracking-wider">
                      {format(day, 'EEE', { locale: fr })}
                    </div>
                    <div className="text-lg font-bold leading-none">{format(day, 'd')}</div>
                    {hasEvents && (
                      <div
                        className={`w-1 h-1 rounded-full mt-1.5 ${
                          isSelected ? 'bg-accent-foreground' : 'bg-accent'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={goNextWeek}
              className="p-2 hover:bg-secondary rounded-xl transition-colors flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Error state ──────────────────────────────── */}
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
            <span>Erreur : {error}</span>
            <button onClick={refresh} className="ml-auto text-xs underline hover:no-underline">
              Réessayer
            </button>
          </div>
        )}

        {/* ── Loading state ────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* ── Events list ──────────────────────────────── */}
        {!loading && !error && (
          <div className="space-y-3">
            {dayEvents.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">Aucun événement ce jour</p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => setShowNewModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un événement
                </Button>
              </div>
            ) : (
              <>
                {dayEvents.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">
                      {dayEvents.length} événement{dayEvents.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onToggleComplete={handleToggleComplete}
                      onEdit={setEditingEvent}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── New appointment modal ─────────────────────── */}
      {showNewModal && (
        <NewAppointmentModal
          preselectedDate={selectedDate}
          onSave={handleSaveNew}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {/* ── Edit appointment modal ────────────────────── */}
      {editingEvent && (
        <EditAppointmentModal
          event={editingEvent}
          onSave={handleEditSave}
          onDelete={handleDelete}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
};

// ─── Inline Edit Modal ───────────────────────────────────────────────────
function EditAppointmentModal({
  event,
  onSave,
  onDelete,
  onClose,
}: {
  event: AgendaEvent;
  onSave: (id: string, data: UpdateAgendaEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const formatForInput = (iso: string) => {
    try {
      return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
    } catch {
      return iso;
    }
  };

  const [form, setForm] = useState({
    title: event.title,
    type: event.type,
    start: formatForInput(event.start),
    end: formatForInput(event.end),
    address: event.address || '',
    description: event.description || '',
    opportunityScore: event.opportunityScore,
    priority: event.priority,
    status: event.status,
    bufferMinutes: event.bufferMinutes,
  });
  const [saving, setSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave(event.id, {
      title: form.title.trim(),
      type: form.type,
      start: new Date(form.start).toISOString(),
      end: new Date(form.end).toISOString(),
      address: form.address.trim(),
      description: form.description.trim(),
      opportunityScore: form.opportunityScore,
      priority: form.priority,
      status: form.status,
      bufferMinutes: form.bufferMinutes,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-5">Modifier le rendez-vous</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Titre</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AgendaEvent['type'] })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              >
                <option value="rdv">RDV client</option>
                <option value="prospection">Prospection</option>
                <option value="rappel">Rappel</option>
                <option value="demo">Démo</option>
                <option value="livraison">Livraison</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AgendaEvent['status'] })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              >
                <option value="scheduled">Planifié</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Début</label>
              <input
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fin</label>
              <input
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Adresse</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Annuler
            </button>
          </div>

          <div className="pt-2 border-t border-border">
            {!showConfirmDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="text-xs text-destructive hover:underline"
              >
                Supprimer ce rendez-vous
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive">Confirmer la suppression ?</span>
                <button
                  type="button"
                  onClick={() => { onDelete(event.id); onClose(); }}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground"
                >
                  Oui, supprimer
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-secondary"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Agenda;
