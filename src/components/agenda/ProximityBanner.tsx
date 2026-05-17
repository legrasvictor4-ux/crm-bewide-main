import { useState } from 'react';
import { MapPin, X, ChevronRight, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';
import type { ProximitySuggestion } from '@/types/agenda';
import { SuggestionModal } from './SuggestionModal';

interface ProximityBannerProps {
  suggestion: ProximitySuggestion;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onDismiss: (id: string) => void;
  onHide: () => void;
}

export function ProximityBanner({ suggestion, onAccept, onDecline, onDismiss, onHide }: ProximityBannerProps) {
  const [showModal, setShowModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    await onAccept(suggestion.id);
    setAccepting(false);
    onHide();
  };

  const handleDecline = async () => {
    setDeclining(true);
    await onDecline(suggestion.id);
    setDeclining(false);
    onHide();
  };

  return (
    <>
      <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-background border border-accent/20 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {suggestion.reason}
              </p>
              <button
                onClick={onHide}
                className="flex-shrink-0 p-1 hover:bg-secondary rounded-full transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {suggestion.distanceKm.toFixed(1)} km
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1">
                Pertinence : {suggestion.relevanceScore}%
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-success text-success-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                {accepting ? '...' : 'Accepter'}
              </button>
              <button
                onClick={handleDecline}
                disabled={declining}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                {declining ? '...' : 'Refuser'}
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Voir détails
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <SuggestionModal
          suggestion={suggestion}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
