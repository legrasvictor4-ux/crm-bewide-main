import { useState } from 'react';
import { X, Calendar, Clock, MapPin, FileText, Tag } from 'lucide-react';
import { format } from 'date-fns';
import type { CreateAgendaEvent } from '@/types/agenda';

interface NewAppointmentModalProps {
  preselectedDate?: Date;
  onSave: (data: CreateAgendaEvent) => void;
  onClose: () => void;
}

const EVENT_TYPES = [
  { value: 'rdv', label: 'RDV client' },
  { value: 'prospection', label: 'Prospection' },
  { value: 'rappel', label: 'Rappel' },
  { value: 'demo', label: 'Démo produit' },
  { value: 'livraison', label: 'Livraison' },
] as const;

export function NewAppointmentModal({ preselectedDate, onSave, onClose }: NewAppointmentModalProps) {
  const today = preselectedDate ? format(preselectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    title: '',
    type: 'rdv' as CreateAgendaEvent['type'],
    date: today,
    startTime: '09:00',
    endTime: '10:00',
    address: '',
    description: '',
    opportunityScore: 0,
    priority: 'normal' as CreateAgendaEvent['priority'],
    bufferMinutes: 10,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    const event: CreateAgendaEvent = {
      title: form.title.trim(),
      type: form.type,
      start: `${form.date}T${form.startTime}:00.000Z`,
      end: `${form.date}T${form.endTime}:00.000Z`,
      address: form.address.trim(),
      description: form.description.trim(),
      opportunityScore: form.opportunityScore,
      priority: form.priority,
      bufferMinutes: form.bufferMinutes,
    };
    await onSave(event);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Nouveau rendez-vous
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Ex: Café de la Paix"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CreateAgendaEvent['type'] })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as CreateAgendaEvent['priority'] })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Début</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fin</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Adresse
              </span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Adresse du rendez-vous"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              <span className="inline-flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Description
              </span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              rows={3}
              placeholder="Notes ou informations complémentaires"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Score opportunité</label>
              <input
                type="number"
                min={0}
                max={10}
                value={form.opportunityScore}
                onChange={(e) => setForm({ ...form, opportunityScore: Math.min(10, Math.max(0, Number(e.target.value))) })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tampon (min)</label>
              <input
                type="number"
                min={0}
                max={120}
                value={form.bufferMinutes}
                onChange={(e) => setForm({ ...form, bufferMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Création...' : 'Créer le rendez-vous'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
