// analyzer.js - Module d'analyse des transcriptions d'appels
class CallAnalyzer {
  constructor() {
    this.sentimentAnalysis = this.sentimentAnalysis.bind(this);
    this.detectObjections = this.detectObjections.bind(this);
    this.analyzeCall = this.analyzeCall.bind(this);
  }

  // Analyser le sentiment global de la conversation
  async sentimentAnalysis(text) {
    try {
      const response = await fetch('/api/ai/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      return await response.json();
    } catch (error) {
      console.error('Erreur d\'analyse de sentiment:', error);
      return { score: 0, magnitude: 0, label: 'NEUTRAL' };
    }
  }

  // Détecter les objections courantes
  detectObjections(text) {
    const objectionKeywords = [
      'trop cher', 'cher', 'coût', 'prix',
      'pas intéressé', 'pas maintenant', 'plus tard',
      'déjà un fournisseur', 'satisfait', 'pas besoin',
      'envoyer un email', 'envoyer un mail', 'plus d\'informations',
      'appeler plus tard', 'rappeler', 'pas le bon moment'
    ];

    const objections = objectionKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    );

    return [...new Set(objections)]; // Supprimer les doublons
  }

  // Calculer le niveau d'intérêt basé sur des indicateurs clés
  calculateInterestLevel(text) {
    const positiveIndicators = [
      'intéressé', 'ça m\'intéresse', 'combien ça coûte', 'disponible',
      'fonctionnalités', 'essayer', 'démo', 'période d\'essai', 'comment ça marche'
    ];

    const negativeIndicators = [
      'pas intéressé', 'pas maintenant', 'pas le temps', 'déjà un fournisseur',
      'trop cher', 'hors budget', 'pas pour l\'instant', 'rappelez plus tard'
    ];

    const positiveMatches = positiveIndicators.filter(indicator => 
      text.toLowerCase().includes(indicator)
    ).length;

    const negativeMatches = negativeIndicators.filter(indicator => 
      text.toLowerCase().includes(indicator)
    ).length;

    // Calculer un score sur 100
    let score = 50; // Score neutre par défaut
    score += (positiveMatches * 10);
    score -= (negativeMatches * 10);

    // Maintenir le score entre 0 et 100
    return Math.min(100, Math.max(0, score));
  }

  // Générer des recommandations basées sur l'analyse
  generateRecommendations(analysis) {
    const { interestLevel, objections, sentiment } = analysis;
    const recommendations = [];

    if (interestLevel < 30) {
      recommendations.push({
        type: 'LOW_INTEREST',
        message: 'Le client semble peu intéressé. Envisagez de comprendre ses préoccupations principales.',
        action: 'Poser des questions ouvertes pour identifier les obstacles.'
      });
    } else if (interestLevel > 70) {
      recommendations.push({
        type: 'HIGH_INTEREST',
        message: 'Le client semble très intéressé. C\'est le moment de conclure!',
        action: 'Proposer une démonstration ou un essai gratuit.'
      });
    }

    if (objections.length > 0) {
      objections.forEach(objection => {
        recommendations.push({
          type: 'OBJECTION',
          message: `Objection détectée: ${objection}`,
          action: this.getObjectionResponse(objection)
        });
      });
    }

    if (sentiment.label === 'NEGATIVE') {
      recommendations.push({
        type: 'NEGATIVE_SENTIMENT',
        message: 'Le client semble mécontent ou frustré.',
        action: 'Reconnaître ses préoccupations et proposer des solutions.'
      });
    }

    return recommendations;
  }

  // Générer des réponses aux objections courantes
  getObjectionResponse(objection) {
    const responses = {
      'trop cher': 'Pouvons-nous discuter de la valeur que vous apporterait notre solution?',
      'pas intéressé': 'Puis-je savoir ce qui vous ferait changer d\'avis?',
      'déjà un fournisseur': 'Qu\'est-ce qui vous plairait de différent chez un fournisseur?',
      'plus tard': 'Quand serait le bon moment pour en reparler?',
      'envoyer un email': 'Je vais vous envoyer un email avec plus d\'informations. Puis-je avoir votre adresse email?'
    };

    return responses[objection] || 'Pouvez-vous me dire plus sur cette préoccupation?';
  }

  // Analyser un appel complet et générer un résumé
  async analyzeCall(transcript) {
    const sentiment = await this.sentimentAnalysis(transcript);
    const objections = this.detectObjections(transcript);
    const interestLevel = this.calculateInterestLevel(transcript);
    
    const analysis = {
      transcript,
      sentiment,
      objections,
      interestLevel,
      timestamp: new Date().toISOString(),
      duration: transcript.length / 10 // Estimation approximative en secondes
    };

    analysis.recommendations = this.generateRecommendations(analysis);
    
    return analysis;
  }

  // Générer un script de suivi personnalisé
  generateFollowUpScript(analysis) {
    const { interestLevel, objections } = analysis;
    let script = 'Bonjour [Nom],\n\n';

    if (interestLevel >= 70) {
      script += 'Merci pour notre récente conversation au sujet de [produit/service]. ';
      script += 'Comme discuté, je vous propose de planifier une démonstration personnalisée. ';
      script += 'Quand seriez-vous disponible la semaine prochaine?\n\n';
    } else if (interestLevel >= 40) {
      script += 'Je vous remercie d\'avoir pris le temps de discuter avec moi. ';
      script += 'Je voulais suivre pour voir si vous aviez des questions supplémentaires ';
      script += 'sur comment [solution] pourrait vous aider avec [défi spécifique mentionné].\n\n';
    } else {
      script += 'Je vous remercie d\'avoir pris le temps de discuter avec moi. ';
      script += 'Je comprends que le moment n\'est peut-être pas idéal, mais j\'aimerais ';
      script += 'rester en contact pour le moment où vous serez prêt à en discuter davantage.\n\n';
    }

    if (objections.length > 0) {
      script += 'Lors de notre conversation, vous avez mentionné les préoccupations suivantes:\n';
      objections.forEach((obj, index) => {
        script += `${index + 1}. ${obj}\n`;
      });
      script += '\nJ\'aimerais vous fournir des informations supplémentaires à ce sujet.\n\n';
    }

    script += 'Cordialement,\n[Votre nom]\n[Votre poste]\n[Coordonnées]';

    return script;
  }
}

export const callAnalyzer = new CallAnalyzer();
