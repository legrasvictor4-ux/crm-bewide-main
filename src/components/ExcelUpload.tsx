import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  success: boolean;
  message: string;
  count: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  clients: any[];
  validationErrors?: Array<{
    row: number;
    client: string;
    errors: string[];
  }>;
}

const ExcelUpload = ({ onImportSuccess }: { onImportSuccess?: () => void }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [enrichWithAI, setEnrichWithAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error('Format de fichier invalide. Utilisez .xlsx, .xls ou .csv');
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('enrich', enrichWithAI.toString());

    try {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText) as ImportResult;
          setImportResult(result);
          
          if (result.success) {
            toast.success(`✅ ${result.message}`);
            if (onImportSuccess) {
              onImportSuccess();
            }
          } else {
            toast.error(`Erreur: ${result.message || 'Import échoué'}`);
          }
        } else {
          const error = JSON.parse(xhr.responseText);
          toast.error(`Erreur: ${error.error || 'Échec de l\'import'}`);
        }
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });

      xhr.addEventListener('error', () => {
        toast.error('Erreur réseau lors de l\'upload');
        setIsUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', '/api/import/excel');
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!importResult || !importResult.clients || importResult.clients.length === 0) {
      toast.error('Aucun client à enregistrer');
      return;
    }

    // Les clients sont déjà enregistrés dans la base de données lors de l'import
    // Cette fonction peut être utilisée pour rafraîchir la liste
    toast.success('Les clients ont été enregistrés dans la base de données');
    if (onImportSuccess) {
      onImportSuccess();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Excel
        </CardTitle>
        <CardDescription>
          Importez vos clients depuis un fichier Excel (.xlsx, .xls, .csv)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!isUploading && !importResult && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Glissez-déposez votre fichier Excel</h3>
              <p className="text-sm text-muted-foreground mb-4">
                ou cliquez pour sélectionner
              </p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Sélectionner un fichier
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enrich-ai"
                checked={enrichWithAI}
                onChange={(e) => setEnrichWithAI(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="enrich-ai" className="text-sm text-muted-foreground cursor-pointer">
                Enrichir automatiquement avec OpenAI (description, segmentation, score)
              </label>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Colonnes requises:</strong> last_name (ou nom)</p>
              <p><strong>Colonnes optionnelles:</strong> first_name, email, phone, company, address, postal_code, city, arrondissement, contact, notes</p>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="space-y-4">
            <div className="text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-sm font-medium">Import en cours...</p>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">{uploadProgress}%</p>
          </div>
        )}

        {importResult && (
          <div className="space-y-4">
            {importResult.success ? (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>{importResult.message}</strong>
                  <div className="mt-2 text-sm">
                    <p>• {importResult.validRows} ligne(s) valide(s) sur {importResult.totalRows}</p>
                    {importResult.invalidRows > 0 && (
                      <p className="text-orange-600 dark:text-orange-400">
                        • {importResult.invalidRows} ligne(s) invalide(s) ignorée(s)
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResult.message || 'Erreur lors de l\'import'}
                </AlertDescription>
              </Alert>
            )}

            {importResult.validationErrors && importResult.validationErrors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erreurs de validation:</strong>
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    {importResult.validationErrors.slice(0, 5).map((error, idx) => (
                      <li key={idx}>
                        Ligne {error.row}: {error.errors.join(', ')}
                      </li>
                    ))}
                    {importResult.validationErrors.length > 5 && (
                      <li className="text-muted-foreground">
                        ... et {importResult.validationErrors.length - 5} autre(s) erreur(s)
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importResult.success && importResult.clients.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveToDatabase}
                  className="flex-1"
                  variant="default"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Enregistrer dans la base de données
                </Button>
                <Button
                  onClick={() => {
                    setImportResult(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  variant="outline"
                >
                  Nouvel import
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExcelUpload;


