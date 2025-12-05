import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Scan, Upload, Globe, FileText, Linkedin, Camera, Loader2, 
  User, Mail, Phone, Building2, Target, DollarSign, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScannedData {
  extractedData: {
    contacts: Array<{
      name: string;
      role: string;
      email: string;
      phone: string;
      linkedin: string;
      isDecisionMaker: boolean;
    }>;
    company: {
      name: string;
      sector: string;
      size: string;
      employeeCount: number;
      address: string;
      website: string;
      description: string;
    };
    businessIntelligence: {
      needs: string[];
      painPoints: string[];
      currentSolutions: string[];
      budget: string;
      timeline: string;
    };
    salesKeywords: string[];
    scoring: {
      qualityScore: number;
      conversionProbability: number;
      priorityLevel: string;
      confidence: number;
    };
    suggestedApproach: {
      channel: string;
      pitch: string;
      timing: string;
    };
  };
  sourceAnalysis: {
    type: string;
    language: string;
    dataCompleteness: number;
    missingFields: string[];
  };
}

const ProspectScanner = () => {
  const [activeTab, setActiveTab] = useState("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (content: string, contentType: string, sourceUrl?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('scan-prospect', {
        body: { content, contentType, sourceUrl }
      });

      if (error) throw error;
      
      setScannedData(data.scannedData);
      toast.success("Scan terminé !");
    } catch (error) {
      console.error('Error scanning:', error);
      toast.error("Erreur lors du scan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlScan = () => {
    if (!url.trim()) {
      toast.error("Entrez une URL");
      return;
    }
    handleScan(url, "url", url);
  };

  const handleTextScan = () => {
    if (!text.trim()) {
      toast.error("Entrez du texte à analyser");
      return;
    }
    handleScan(text, "text");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        handleScan(base64, "image");
      };
      reader.readAsDataURL(file);
    } else {
      const text = await file.text();
      handleScan(text, file.type.includes('pdf') ? 'pdf' : 'text');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-orange-500";
  };

  return (
    <div className="space-y-6">
      {/* Scanner Input */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-6 w-6 text-primary" />
            Prospect Scanner
            <Badge className="bg-accent text-accent-foreground">Extraction IA</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Fichier
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Image
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Linkedin className="h-4 w-4" />
                Texte
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <div className="flex gap-4">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/... ou site web"
                  className="flex-1 h-12"
                />
                <Button onClick={handleUrlScan} disabled={isLoading} size="lg" className="h-12">
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Collez l'URL d'un profil LinkedIn, site web d'entreprise, ou page à analyser
              </p>
            </TabsContent>

            <TabsContent value="file" className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline" 
                className="w-full h-32 border-dashed"
                disabled={isLoading}
              >
                <div className="text-center">
                  <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p>Glissez un PDF, catalogue ou document</p>
                  <p className="text-sm text-muted-foreground">ou cliquez pour sélectionner</p>
                </div>
              </Button>
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline" 
                className="w-full h-32 border-dashed"
                disabled={isLoading}
              >
                <div className="text-center">
                  <Camera className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p>Uploadez une capture d'écran ou photo</p>
                  <p className="text-sm text-muted-foreground">carte de visite, flyer, etc.</p>
                </div>
              </Button>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Collez ici le texte d'un profil LinkedIn, email, description d'entreprise..."
                className="min-h-[150px]"
              />
              <Button onClick={handleTextScan} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Analyser le texte
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      {scannedData && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="bg-gradient-to-br from-primary/20 to-accent/10 border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{scannedData.extractedData.company.name}</h2>
                  <p className="text-muted-foreground">{scannedData.extractedData.company.sector}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{scannedData.sourceAnalysis.type}</Badge>
                    <Badge variant="outline">{scannedData.sourceAnalysis.dataCompleteness}% complet</Badge>
                  </div>
                </div>
                <div className="text-right grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(scannedData.extractedData.scoring.qualityScore)}`}>
                      {scannedData.extractedData.scoring.qualityScore}%
                    </div>
                    <p className="text-xs text-muted-foreground">Qualité</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(scannedData.extractedData.scoring.conversionProbability)}`}>
                      {scannedData.extractedData.scoring.conversionProbability}%
                    </div>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contacts extraits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scannedData.extractedData.contacts.map((contact, i) => (
                    <div key={i} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{contact.name}</h4>
                        {contact.isDecisionMaker && (
                          <Badge className="bg-primary">Décideur</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{contact.role}</p>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.linkedin && (
                          <div className="flex items-center gap-2">
                            <Linkedin className="h-4 w-4 text-blue-600" />
                            <span className="truncate">{contact.linkedin}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Entreprise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{scannedData.extractedData.company.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Taille</p>
                    <p className="font-medium">{scannedData.extractedData.company.size}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Effectif</p>
                    <p className="font-medium">{scannedData.extractedData.company.employeeCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Intelligence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Intelligence commerciale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Besoins identifiés</p>
                  <div className="flex flex-wrap gap-2">
                    {scannedData.extractedData.businessIntelligence.needs.map((need, i) => (
                      <Badge key={i} className="bg-green-500/20 text-green-500">{need}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Points de douleur</p>
                  <div className="flex flex-wrap gap-2">
                    {scannedData.extractedData.businessIntelligence.painPoints.map((pain, i) => (
                      <Badge key={i} className="bg-orange-500/20 text-orange-500">{pain}</Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Budget estimé</p>
                    <p className="font-medium">{scannedData.extractedData.businessIntelligence.budget}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Timeline</p>
                    <p className="font-medium">{scannedData.extractedData.businessIntelligence.timeline}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suggested Approach */}
            <Card className="bg-gradient-to-br from-primary/10 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Approche suggérée
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Canal recommandé</p>
                  <p className="font-medium text-lg">{scannedData.extractedData.suggestedApproach.channel}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Accroche personnalisée</p>
                  <p className="font-medium">{scannedData.extractedData.suggestedApproach.pitch}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Meilleur moment</p>
                  <p className="font-medium">{scannedData.extractedData.suggestedApproach.timing}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Keywords */}
          <Card>
            <CardHeader>
              <CardTitle>🔑 Mots-clés de vente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {scannedData.extractedData.salesKeywords.map((keyword, i) => (
                  <Badge key={i} variant="outline" className="text-lg px-4 py-2">{keyword}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProspectScanner;
