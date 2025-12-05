import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Brain, Lightbulb, Target, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchResult {
  interpretedQuery: {
    original: string;
    interpreted: string;
    criteria: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
  };
  results: Array<{
    id: string;
    name: string;
    matchScore: number;
    matchReasons: string[];
    relevantData: Record<string, string>;
    suggestedAction: string;
  }>;
  suggestions: Array<{
    query: string;
    description: string;
  }>;
  insights: {
    totalMatches: number;
    averageScore: number;
    commonPattern: string;
  };
}

const mockProspectData = [
  { id: "1", name: "Le Petit Bistrot", contact: "Jean Dupont", status: "interested", notes: "Intéressé par le prix, attend la démo", lastContact: "2024-01-10", arrondissement: "11ème", employees: 12 },
  { id: "2", name: "Café de Flore", contact: "Marie Martin", status: "demo_done", notes: "Démo faite, très enthousiaste", lastContact: "2024-01-12", arrondissement: "6ème", employees: 25 },
  { id: "3", name: "La Bonne Table", contact: "Pierre Durand", status: "objection_price", notes: "Objection sur le prix, rappellera la semaine prochaine", lastContact: "2024-01-08", arrondissement: "11ème", employees: 8 },
  { id: "4", name: "Chez Marcel", contact: "Sophie Bernard", status: "interested", notes: "Intéressée mais pas de démo encore programmée", lastContact: "2024-01-15", arrondissement: "3ème", employees: 15 },
];

const SmartSearch = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Entrez une recherche");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-search', {
        body: { query, prospectData: mockProspectData }
      });

      if (error) throw error;
      
      setSearchResult(data.searchResults);
      toast.success("Recherche effectuée !");
    } catch (error) {
      console.error('Error in smart search:', error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setIsLoading(false);
    }
  };

  const exampleQueries = [
    "Les prospects intéressés par le prix mais sans démo",
    "Restaurants du 11ème avec plus de 10 employés",
    "Ceux qui ont dit qu'ils rappelleraient",
    "Prospects non contactés depuis 7 jours",
  ];

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Recherche Cerveau Humain
            <Badge className="bg-accent text-accent-foreground">IA Conversationnelle</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pose ta question en langage naturel..."
                className="pl-10 h-14 text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading} size="lg" className="h-14 px-8">
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Rechercher
                </>
              )}
            </Button>
          </div>

          {/* Example queries */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Exemples :</span>
            {exampleQueries.map((eq, i) => (
              <Button 
                key={i} 
                variant="outline" 
                size="sm"
                onClick={() => setQuery(eq)}
                className="text-xs"
              >
                "{eq}"
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchResult && (
        <div className="space-y-6">
          {/* Interpretation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-yellow-500 mt-1" />
                <div>
                  <p className="font-medium">Interprétation de la recherche</p>
                  <p className="text-muted-foreground">{searchResult.interpretedQuery.interpreted}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {searchResult.interpretedQuery.criteria.map((c, i) => (
                      <Badge key={i} variant="secondary">
                        {c.field} {c.operator} "{c.value}"
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-primary/20 to-primary/5">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{searchResult.insights.totalMatches}</div>
                <p className="text-sm text-muted-foreground">Résultats trouvés</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-500">{searchResult.insights.averageScore}%</div>
                <p className="text-sm text-muted-foreground">Score moyen</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-accent/20 to-accent/5">
              <CardContent className="p-4 text-center">
                <div className="text-sm font-medium text-accent">{searchResult.insights.commonPattern}</div>
                <p className="text-xs text-muted-foreground mt-1">Pattern commun</p>
              </CardContent>
            </Card>
          </div>

          {/* Results List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Résultats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {searchResult.results.map((result) => (
                    <div 
                      key={result.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{result.name}</h4>
                          <div className="flex gap-2 mt-1">
                            {result.matchReasons.map((reason, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{reason}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{result.matchScore}%</div>
                          <p className="text-xs text-muted-foreground">Match</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        {Object.entries(result.relevantData).map(([key, value]) => (
                          <div key={key} className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">{key}</p>
                            <p className="text-sm font-medium">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm"><strong>💡 Action suggérée :</strong> {result.suggestedAction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Recherches connexes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {searchResult.suggestions.map((suggestion, i) => (
                  <Button 
                    key={i} 
                    variant="outline"
                    onClick={() => setQuery(suggestion.query)}
                    className="flex-col items-start h-auto p-3"
                  >
                    <span className="font-medium">"{suggestion.query}"</span>
                    <span className="text-xs text-muted-foreground">{suggestion.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
