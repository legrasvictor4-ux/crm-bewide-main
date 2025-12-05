import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Building2, Users, DollarSign, Globe, Mail, Phone, 
  Linkedin, Instagram, Star, TrendingUp, AlertCircle, Loader2, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EnrichedData {
  companyInfo: {
    name: string;
    sector: string;
    subSector: string;
    yearFounded: number;
    legalForm: string;
    siret: string;
  };
  financials: {
    estimatedRevenue: string;
    revenueGrowth: string;
    employeeCount: number;
    employeeGrowthRate: string;
  };
  contacts: Array<{
    role: string;
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    decisionMaker: boolean;
  }>;
  digitalPresence: {
    website: string;
    instagram: string;
    facebook: string;
    googleRating: number;
    reviewCount: number;
    hasOnlineOrdering: boolean;
    hasDelivery: boolean;
  };
  techStack: {
    pos: string;
    reservation: string;
    delivery: string[];
    marketing: string;
    crm: string;
  };
  recentNews: Array<{
    date: string;
    title: string;
    summary: string;
    sentiment: string;
    salesOpportunity: string;
  }>;
  salesIntelligence: {
    buyingSignals: string[];
    painPoints: string[];
    budgetIndicator: string;
    decisionTimeline: string;
    bestApproach: string;
  };
  score: {
    qualityScore: number;
    conversionProbability: number;
    priorityLevel: string;
  };
}

const ProspectEnricher = () => {
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);

  const handleEnrich = async () => {
    if (!companyName.trim()) {
      toast.error("Entrez un nom d'entreprise");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-prospect', {
        body: { companyName }
      });

      if (error) throw error;
      
      setEnrichedData(data.enrichedData);
      toast.success("Données enrichies avec succès !");
    } catch (error) {
      console.error('Error enriching prospect:', error);
      toast.error("Erreur lors de l'enrichissement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Enrichissement Auto-Magique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Tapez le nom de l'entreprise..."
                className="pl-10 h-12 text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleEnrich()}
              />
            </div>
            <Button onClick={handleEnrich} disabled={isLoading} size="lg" className="h-12 px-8">
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Enrichissement...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Enrichir
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {enrichedData && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="bg-gradient-to-br from-primary/20 to-accent/10 border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{enrichedData.companyInfo.name}</h2>
                  <p className="text-muted-foreground">{enrichedData.companyInfo.sector} • {enrichedData.companyInfo.subSector}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">{enrichedData.score.qualityScore}%</div>
                      <p className="text-xs text-muted-foreground">Qualité</p>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-500">{enrichedData.score.conversionProbability}%</div>
                      <p className="text-xs text-muted-foreground">Conversion</p>
                    </div>
                  </div>
                  <Badge className={`mt-2 ${
                    enrichedData.score.priorityLevel === 'high' ? 'bg-red-500' : 
                    enrichedData.score.priorityLevel === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    Priorité {enrichedData.score.priorityLevel}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="company">Entreprise</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="digital">Digital</TabsTrigger>
              <TabsTrigger value="intel">Intelligence</TabsTrigger>
              <TabsTrigger value="news">Actualités</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Informations Légales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Forme juridique</span>
                      <span className="font-medium">{enrichedData.companyInfo.legalForm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SIRET</span>
                      <span className="font-mono">{enrichedData.companyInfo.siret}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Création</span>
                      <span className="font-medium">{enrichedData.companyInfo.yearFounded}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Données Financières
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CA estimé</span>
                      <span className="font-medium">{enrichedData.financials.estimatedRevenue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Croissance</span>
                      <span className="font-medium text-green-500">{enrichedData.financials.revenueGrowth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effectif</span>
                      <span className="font-medium">{enrichedData.financials.employeeCount} employés</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="contacts">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {enrichedData.contacts.map((contact, index) => (
                      <div key={index} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{contact.name}</h4>
                              {contact.decisionMaker && (
                                <Badge className="bg-primary">Décideur</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{contact.role}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{contact.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{contact.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Linkedin className="h-4 w-4 text-blue-600" />
                            <span className="text-sm truncate">{contact.linkedin}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="digital" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Présence Web
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Site web</span>
                      <a href="#" className="text-primary hover:underline">{enrichedData.digitalPresence.website}</a>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Instagram</span>
                      <span className="font-medium">{enrichedData.digitalPresence.instagram}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Note Google</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{enrichedData.digitalPresence.googleRating}</span>
                        <span className="text-muted-foreground">({enrichedData.digitalPresence.reviewCount} avis)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tech Stack</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Caisse</span>
                      <span className="font-medium">{enrichedData.techStack.pos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Réservation</span>
                      <span className="font-medium">{enrichedData.techStack.reservation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Livraison</span>
                      <div className="flex gap-1">
                        {enrichedData.techStack.delivery.map((d, i) => (
                          <Badge key={i} variant="secondary">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="intel">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Signaux d'achat
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {enrichedData.salesIntelligence.buyingSignals.map((signal, i) => (
                        <Badge key={i} className="bg-green-500/20 text-green-500">{signal}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Points de douleur
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {enrichedData.salesIntelligence.painPoints.map((pain, i) => (
                        <Badge key={i} className="bg-orange-500/20 text-orange-500">{pain}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                    <h4 className="font-medium mb-2">💡 Meilleure approche</h4>
                    <p className="text-muted-foreground">{enrichedData.salesIntelligence.bestApproach}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="news">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {enrichedData.recentNews.map((news, index) => (
                      <div key={index} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{news.title}</h4>
                          <Badge variant="secondary">{news.date}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{news.summary}</p>
                        <div className="p-2 bg-primary/10 rounded text-sm">
                          💼 <strong>Opportunité :</strong> {news.salesOpportunity}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ProspectEnricher;
