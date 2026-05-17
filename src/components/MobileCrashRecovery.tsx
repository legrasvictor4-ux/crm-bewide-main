import { useState, useEffect } from 'react';
import { restoreAfterCrash, clearCrashSnapshot } from '@/lib/mobile/errorRecovery';
import { getLastDraft } from '@/lib/voice/voiceDraftStore';

type RecoveryState = 'checking' | 'recovering' | 'done' | 'none';

export function MobileCrashRecovery({ onRecover }: { onRecover?: (data: { draft: unknown; route?: string }) => void }) {
  const [state, setState] = useState<RecoveryState>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const recovery = restoreAfterCrash();

    if (recovery.hasRecovery || recovery.pendingActions > 0) {
      setState('recovering');
      const parts: string[] = [];
      if (recovery.snapshot?.draftTranscript) parts.push('un brouillon vocal');
      if (recovery.pendingActions > 0) parts.push(`${recovery.pendingActions} action(s) en attente`);

      setMessage(`Récupération après interruption : ${parts.join(' et ')}`);
    } else {
      setState('none');
    }
  }, []);

  const handleDismiss = () => {
    setState('done');
  };

  if (state !== 'recovering') return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-amber-900/90 backdrop-blur border border-amber-700/50 rounded-xl p-4 shadow-2xl text-amber-100">
        <div className="flex items-start gap-3">
          <span className="text-amber-400 text-lg shrink-0">&#9888;</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{message}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={onRecover ? () => onRecover({ draft: getLastDraft() }) : handleDismiss}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-700/50 hover:bg-amber-700 text-amber-100 font-medium"
              >
                Restaurer
              </button>
              <button
                onClick={() => { clearCrashSnapshot(); handleDismiss(); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-950 text-amber-300"
              >
                Ignorer
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-amber-400/60 hover:text-amber-300 shrink-0">&times;</button>
        </div>
      </div>
    </div>
  );
}
