import { useState } from 'react';
import { Clock, MapPin, Phone, MoreHorizontal, Check, X, Edit3, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AgendaEvent } from '@/types/agenda';

interface EventCardProps {
  event: AgendaEvent;
  onToggleComplete: (id: string) => void;
  onEdit: (event: AgendaEvent) => void;
  onDelete: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  rdv: 'RDV',
  prospection: 'Prospection',
  rappel: 'Rappel',
  demo: 'Démo',
  livraison: 'Livraison',
};

const typeStyles: Record<string, string> = {
  rdv: 'bg-success/10 text-success border-success/20',
  prospection: 'bg-accent/10 text-accent border-accent/20',
  rappel: 'bg-warning/10 text-warning border-warning/20',
  demo: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  livraison: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

export function EventCard({ event, onToggleComplete, onEdit, onDelete }: EventCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isCompleted = event.status === 'completed';
  const isCancelled = event.status === 'cancelled';
  const isDimmed = isCompleted || isCancelled;

  const formatTime = (iso: string) => {
    try {
      return format(parseISO(iso), 'HH:mm');
    } catch {
      return iso;
    }
  };

  return (
    <div className={`p-4 rounded-xl border bg-card transition-all duration-200 hover:shadow-sm ${isDimmed ? 'opacity-55' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleComplete(event.id)}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
            isCompleted
              ? 'bg-success border-success text-success-foreground'
              : 'border-border hover:border-accent'
          }`}
        >
          {isCompleted && <Check className="w-3 h-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${typeStyles[event.type] || typeStyles.rdv}`}>
              {typeLabels[event.type] || event.type}
            </span>
            {event.opportunityScore > 0 && (
              <span className="text-[11px] font-medium text-muted-foreground">
                Score {event.opportunityScore}
              </span>
            )}
            {event.syncStatus === 'pending' && (
              <span className="text-[11px] font-medium text-amber-600">Sync...</span>
            )}
            {event.syncStatus === 'failed' && (
              <span className="text-[11px] font-medium text-destructive">Échec sync</span>
            )}
          </div>

          <h3 className={`font-semibold text-foreground ${isCompleted ? 'line-through' : ''}`}>
            {event.title}
          </h3>

          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(event.start)} – {formatTime(event.end)}
            </span>
            {event.address && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {event.address}
              </span>
            )}
          </div>

          {event.description && (
            <p className="mt-1.5 text-xs text-muted-foreground/80 line-clamp-1">{event.description}</p>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-card border border-border rounded-xl shadow-lg py-1">
                <button
                  onClick={() => { onEdit(event); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Modifier
                </button>
                <button
                  onClick={() => { onDelete(event.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
