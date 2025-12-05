// index.js - Point d'entrée pour les fonctionnalités AI
import { callListener } from './callListener';
import { callAnalyzer } from './analyzer';

// Exporter les fonctionnalités AI
export { callListener, callAnalyzer };

// Initialiser l'écoute des appels si on est sur une page d'appel
const initCallAnalysis = () => {
  if (window.location.pathname.includes('/call')) {
    // Créer un indicateur visuel
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
    
    // Ajouter le style d'animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 0.6; transform: scale(0.9); }
        50% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 0.6; transform: scale(0.9); }
      }
    `;
    document.head.appendChild(style);
    
    // Démarrer l'écoute
    callListener.startListening();
    
    // Écouter les événements d'analyse
    window.addEventListener('callAnalysisUpdated', (event) => {
      const { detail } = event;
      console.log('Analyse en temps réel:', detail);
      
      // Mettre à jour l'interface utilisateur avec les résultats de l'analyse
      // (à adapter selon votre interface utilisateur)
    });
    
    window.addEventListener('callSummaryGenerated', (event) => {
      const { detail: summary } = event;
      console.log('Résumé de l\'appel:', summary);
      
      // Afficher un résumé à l'utilisateur
      // (à adapter selon votre interface utilisateur)
    });
  }
};

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCallAnalysis);
} else {
  initCallAnalysis();
}

// Exposer les fonctionnalités AI globalement pour un accès facile
window.AI = {
  callListener,
  callAnalyzer,
  initCallAnalysis
};
