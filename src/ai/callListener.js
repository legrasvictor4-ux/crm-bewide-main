// callListener.js - Module d'écoute des appels en temps réel
class CallListener {
  constructor() {
    this.isListening = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.callInProgress = false;
    this.initialize();
  }

  async initialize() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.setupEventListeners();
      console.log('AI Call Listener initialisé');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du microphone:', error);
    }
  }

  setupEventListeners() {
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        this.processAudioChunk(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.processFullCall();
    };
  }

  startListening() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'recording') {
      this.audioChunks = [];
      this.callInProgress = true;
      this.mediaRecorder.start(1000); // Collecte des données chaque seconde
      console.log('Écoute active');
      this.showListeningIndicator(true);
    }
  }

  stopListening() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.callInProgress = false;
      console.log('Arrêt de l\'écoute');
      this.showListeningIndicator(false);
    }
  }

  async processAudioChunk(audioData) {
    // Envoyer le fragment audio au serveur pour transcription
    try {
      const formData = new FormData();
      const audioBlob = new Blob([audioData], { type: 'audio/webm' });
      formData.append('audio', audioBlob);
      
      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData
      });
      
      const { text } = await response.json();
      if (text) {
        this.analyzeTranscription(text);
      }
    } catch (error) {
      console.error('Erreur lors de la transcription:', error);
    }
  }

  async analyzeTranscription(text) {
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const analysis = await response.json();
      this.updateCallAnalysis(analysis);
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
    }
  }

  updateCallAnalysis(analysis) {
    // Émettre un événement personnalisé avec les résultats de l'analyse
    const event = new CustomEvent('callAnalysisUpdated', { detail: analysis });
    window.dispatchEvent(event);
  }

  async processFullCall() {
    if (this.audioChunks.length === 0) return;
    
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    try {
      const response = await fetch('/api/ai/finalize-call', {
        method: 'POST',
        body: formData
      });
      
      const summary = await response.json();
      this.saveCallSummary(summary);
    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'appel:', error);
    }
  }

  saveCallSummary(summary) {
    // Sauvegarder le résumé dans le stockage local ou envoyer au serveur
    const event = new CustomEvent('callSummaryGenerated', { detail: summary });
    window.dispatchEvent(event);
  }

  showListeningIndicator(show) {
    // Créer ou mettre à jour l'indicateur d'écoute
    let indicator = document.getElementById('ai-listener-indicator');
    
    if (show) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'ai-listener-indicator';
        indicator.style.position = 'fixed';
        indicator.style.bottom = '20px';
        indicator.style.right = '20px';
        indicator.style.padding = '10px 15px';
        indicator.style.background = 'rgba(0, 0, 0, 0.8)';
        indicator.style.color = 'white';
        indicator.style.borderRadius = '20px';
        indicator.style.zIndex = '9999';
        document.body.appendChild(indicator);
      }
      indicator.textContent = '🔊 AI listening for call analysis...';
    } else if (indicator) {
      indicator.textContent = '✅ Call analysis complete';
      setTimeout(() => indicator.remove(), 3000);
    }
  }
}

// Exporter une instance unique
export const callListener = new CallListener();

// Démarrer automatiquement l'écoute si on est sur une page d'appel
if (window.location.pathname.includes('/call')) {
  callListener.startListening();
}
