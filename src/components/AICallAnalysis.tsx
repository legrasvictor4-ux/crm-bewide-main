// AICallAnalysis.tsx - Composant pour l'analyse d'appels et l'importation de dossiers
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, FolderUp, Phone, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const AICallAnalysis = () => {
  const [callStatus, setCallStatus] = useState('idle'); // idle, connecting, in-progress, ended
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('call'); // 'call' or 'import'

  // Simuler le démarrage d'un appel
  const handleStartCall = () => {
    setCallStatus('connecting');
    setTimeout(() => setCallStatus('in-progress'), 1000);
    
    // Simuler la fin de l'appel après 10 secondes
    setTimeout(() => {
      setCallStatus('ended');
    }, 10000);
  };

  // Gérer l'upload de fichiers
  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Simuler la progression de l'upload
    let progress = 0;
    const uploadInterval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(uploadInterval);
        // Simuler un succès après l'upload
        setTimeout(() => {
          alert('Importation terminée avec succès !');
          setUploadProgress(0);
        }, 500);
      }
    }, 100);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Onglets */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'call' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('call')}
        >
          Analyse d'appel
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'import' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('import')}
        >
          Importation
        </button>
      </div>

      {activeTab === 'call' ? (
        <Card>
          <CardHeader>
            <CardTitle>Analyse d'appel en direct</CardTitle>
            <CardDescription>
              Activez l'analyse en temps réel de vos appels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="h-12 w-12 text-primary" />
                </div>
                {callStatus === 'in-progress' && (
                  <div className="absolute -right-1 -top-1 flex h-6 w-6">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-6 w-6 bg-green-500"></span>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-medium mb-2">
                {callStatus === 'idle' && 'Prêt pour un appel'}
                {callStatus === 'connecting' && 'Connexion en cours...'}
                {callStatus === 'in-progress' && 'Appel en cours'}
                {callStatus === 'ended' && 'Appel terminé'}
              </h3>

              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {callStatus === 'idle' && 'Démarrez un appel pour activer l\'analyse en temps réel'}
                {callStatus === 'connecting' && 'Établissement de la connexion...'}
                {callStatus === 'in-progress' && 'Analyse en cours...'}
                {callStatus === 'ended' && 'Analyse terminée. Voir les résultats ci-dessous.'}
              </p>

              <Button
                onClick={handleStartCall}
                disabled={callStatus === 'in-progress' || callStatus === 'connecting'}
                className="w-64"
                size="lg"
              >
                {callStatus === 'idle' || callStatus === 'ended' ? (
                  <>
                    <Phone className="mr-2 h-5 w-5" />
                    Démarrer un appel
                  </>
                ) : (
                  'Appel en cours...'
                )}
              </Button>
            </div>

            {callStatus === 'in-progress' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Analyse en cours</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Niveau d'intérêt</span>
                    <span className="font-medium">72%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                <div className="pt-2">
                  <h4 className="font-medium text-sm mb-1">Dernière détection</h4>
                  <p className="text-sm text-muted-foreground">
                    Le client semble intéressé par nos solutions.
                  </p>
                </div>
              </div>
            )}

            {callStatus === 'ended' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Résumé de l'appel</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-medium mb-1">Niveau d'intérêt final</h5>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="h-2 flex-1" />
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-1">Points clés</h5>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      <li>Le client est intéressé par une démonstration</li>
                      <li>Préoccupation concernant le prix</li>
                      <li>Décision prévue dans 2 semaines</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-1">Prochaine étape recommandée</h5>
                    <p className="text-sm text-muted-foreground">
                      Envoyer une proposition détaillée avec options tarifaires
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Importation de dossiers</CardTitle>
            <CardDescription>Importez facilement vos dossiers clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FolderUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">Glissez-déposez vos dossiers ici</h3>
              <p className="text-muted-foreground text-sm mb-6">
                ou sélectionnez des fichiers sur votre ordinateur
              </p>
              
              <input
                type="file"
                id="folder-upload"
                className="hidden"
                // @ts-expect-error Render library expects numeric value for Bar data
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFileUpload}
              />
              
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => document.getElementById('folder-upload')?.click()}
              >
                <FolderUp className="h-4 w-4" />
                Sélectionner un dossier
              </Button>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progression de l'importation</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-6">
                Formats supportés: .csv, .xlsx, .json, .txt
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AICallAnalysis;
