import { MapPin, Calendar, Clock, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ProximitySuggestion } from '@/types/agenda';

interface SuggestionModalProps {
  suggestion: ProximitySuggestion;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export function SuggestionModal({ suggestion, onAccept, onDecline, onClose }: SuggestionModalProps) {
  const formatDate = (iso: string) => {
    try {
      return format(parseISO(iso), 'EEEE d MMMM à HH:mm', { locale: fr });
    } catch {
      return iso;
    }
  };

  const formatDay = (iso: string) => {
    try {
      return format(parseISO(iso), 'EEEE d MMMM', { locale: fr });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Optimisation de tournée</h2>
            <p className="text-sm text-muted-foreground">
              Pertinence : {suggestion.relevanceScore}%
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="rounded-xl bg-secondary/50 p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">{suggestion.reason}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {suggestion.distanceKm.toFixed(1)} km
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {suggestion.travelTimeMinutes} min de trajet
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-full min-h-[40px] bg-destructive/30 rounded-full mt-1.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Actuel</p>
                <p className="text-sm font-medium">{formatDay(suggestion.targetDate)}</p>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-accent" />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-1.5 h-full min-h-[40px] bg-success/30 rounded-full mt-1.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Proposé</p>
                <p className="text-sm font-medium text-success">{formatDay(suggestion.proposedDate)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onAccept}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-success text-success-foreground hover:opacity-90 transition-opacity"
          >
            <ThumbsUp className="w-4 h-4" />
            Accepter
          </button>
          <button
            onClick={onDecline}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <ThumbsDown className="w-4 h-4" />
            Refuser
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
