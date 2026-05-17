// index.js - Point d'entrée pour les fonctionnalités AI
import { callListener } from './callListener';
import { callAnalyzer } from './analyzer';

// Exporter les fonctionnalités AI
export { callListener, callAnalyzer };

const cleanupFns = new Set<() => void>();

function initCallAnalysis() {
  if (!window.location.pathname.includes('/call')) return;

  const indicator = document.createElement('div');
  indicator.id = 'ai-call-analysis-indicator';
  indicator.style.position = 'fixed';
  indicator.style.bottom = '20px';
  indicator.style.right = '20px';
  indicator.style.padding = '10px 15px';
  indicator.style.background = 'rgba(0, 0, 0, 0.8)';
  indicator.style.color = 'white';
  indicator.style.borderRadius = '20px';
  indicator.style.zIndex = '9999';
  indicator.style.fontFamily = 'sans-serif';
  indicator.style.fontSize = '14px';
  indicator.style.display = 'flex';
  indicator.style.alignItems = 'center';
  indicator.style.gap = '8px';
  
  const dot = document.createElement('div');
  dot.style.width = '10px';
  dot.style.height = '10px';
  dot.style.borderRadius = '50%';
  dot.style.background = '#4CAF50';
  dot.style.animation = 'pulse 2s infinite';
  
  const text = document.createTextNode('AI listening for call analysis...');
  
  indicator.appendChild(dot);
  indicator.appendChild(text);
  document.body.appendChild(indicator);
  cleanupFns.add(() => {
    if (indicator.parentNode) indicator.remove();
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { opacity: 0.6; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 0.6; transform: scale(0.9); }
    }
  `;
  document.head.appendChild(style);
  cleanupFns.add(() => {
    if (style.parentNode) style.remove();
  });

  callListener.startListening();
  cleanupFns.add(() => callListener.stopListening());

  const onAnalysisUpdated = (event: Event) => {
    const { detail } = event as CustomEvent;
    console.log('Analyse en temps réel:', detail);
  };
  window.addEventListener('callAnalysisUpdated', onAnalysisUpdated);
  cleanupFns.add(() => window.removeEventListener('callAnalysisUpdated', onAnalysisUpdated));
  
  const onSummaryGenerated = (event: Event) => {
    const { detail: summary } = event as CustomEvent;
    console.log('Résumé de l\'appel:', summary);
  };
  window.addEventListener('callSummaryGenerated', onSummaryGenerated);
  cleanupFns.add(() => window.removeEventListener('callSummaryGenerated', onSummaryGenerated));
}

export function destroyAI() {
  for (const fn of cleanupFns) {
    try { fn(); } catch { /* no-op */ }
  }
  cleanupFns.clear();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCallAnalysis);
} else {
  initCallAnalysis();
}

window.AI = {
  callListener,
  callAnalyzer,
  initCallAnalysis,
  destroyAI,
};
