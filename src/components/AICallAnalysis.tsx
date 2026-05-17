// AICallAnalysis.tsx - Composant pour l'analyse d'appels et l'importation de dossiers
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, FolderUp, Phone, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const AICallAnalysis = () => {
  const [callStatus, setCallStatus] = useState('idle'); // idle, connecting, in-progress, ended
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('call'); // 'call' or 'import'
  const mountedRef  = useRef(true);
  const timerRef    = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    const timers = timerRef.current;
    return () => {
      mountedRef.current = false;
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const safeStatus = useCallback((v: typeof callStatus) => {
    if (!mountedRef.current) return;
    setCallStatus(v);
  }, []);

  const trackTimer = (t: ReturnType<typeof setTimeout>) => {
    timerRef.current.add(t);
  };

  // ─── Simuler le démarrage d'un appel ─────────────────────────────────────────
  const handleStartCall = useCallback(() => {
    safeStatus('connecting');
    const t1 = window.setTimeout(() => safeStatus('in-progress'), 1000);
    trackTimer(t1);
    // Simuler la fin de l'appel après 10 secondes
    const t2 = window.setTimeout(() => {
      if (!mountedRef.current) return;
      safeStatus('ended');
    }, 10_000);
    trackTimer(t2);
  }, [safeStatus]);

  // ─── Gérer l'upload de fichiers ──────────────────────────────────────────────
  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let progress = 0;
    const uploadInterval = window.setInterval(() => {
      if (!mountedRef.current) { clearInterval(uploadInterval); return; }
      progress += 5;
      setUploadProgress(progress);

      if (progress >= 100) {
        clearInterval(uploadInterval);
        const t = window.setTimeout(() => {
          if (!mountedRef.current) return;
          alert('Importation terminée avec succès !');
          setUploadProgress(0);
        }, 500);
        trackTimer(t);
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b pb-2">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'call' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('call')}
        >
          <Phone className="inline-block w-4 h-4 mr-2" />
          Analyse d'appel
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'import' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('import')}
        >
          <FolderUp className="inline-block w-4 h-4 mr-2" />
          Import dossier
        </button>
      </div>

      {activeTab === 'call' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Analyse d'appel téléphonique
            </CardTitle>
            <CardDescription>
              Simulez une analyse d'appel pour tester le flux vocal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {callStatus === 'idle' && (
              <Button onClick={handleStartCall} className="w-full">
                <Phone className="w-4 h-4 mr-2" />
                Démarrer un appel
              </Button>
            )}
            {callStatus === 'connecting' && (
              <div className="text-center space-y-2">
                <div className="animate-pulse text-lg font-medium text-muted-foreground">
                  Connexion en cours...
                </div>
                <Progress value={30} className="w-full" />
              </div>
            )}
            {callStatus === 'in-progress' && (
              <div className="text-center space-y-2">
                <div className="animate-pulse text-lg font-medium text-green-600">
                  Appel en cours...
                </div>
                <Progress value={60} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  Analyse vocale en temps réel
                </p>
              </div>
            )}
            {callStatus === 'ended' && (
              <div className="text-center space-y-3">
                <div className="text-lg font-medium text-blue-600">
                  Appel terminé
                </div>
                <div className="rounded-lg bg-muted p-4 text-left text-sm">
                  <p className="font-medium mb-2">Résumé de l'analyse :</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Durée : 45 secondes</li>
                    <li>Sentiment : Positif</li>
                    <li>Mots-clés détectés : rendez-vous, devis, suivi</li>
                    <li>Prochaines étapes : Envoyer un devis</li>
                  </ul>
                </div>
                <Button variant="outline" onClick={() => { setCallStatus('idle'); setUploadProgress(0); }}>
                  Nouvel appel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'import' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Importation de dossier
            </CardTitle>
            <CardDescription>
              Importez un fichier contenant les informations du prospect
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-8">
              <label className="cursor-pointer text-center space-y-2">
                <FolderUp className="w-8 h-8 mx-auto text-muted-foreground" />
                <span className="block text-sm font-medium text-muted-foreground">
                  Cliquez pour sélectionner un fichier
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.csv"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importation...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AICallAnalysis;