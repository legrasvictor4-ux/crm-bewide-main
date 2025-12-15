import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Plus, Filter, SortDesc, Map as MapIcon, Grid, List, Download } from "lucide-react";

interface ActionBarProps {
  onAdd: () => void;
  onImport: () => void;
  onToggleMap: () => void;
  onSortLeadScore: () => void;
  onFilterLeadScore: (min: number) => void;
  onClearLeadFilter?: () => void;
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
  search: string;
  setSearch: (value: string) => void;
  minScore?: number;
  sortByScore?: boolean;
}

const ActionBar = ({
  onAdd,
  onImport,
  onToggleMap,
  onSortLeadScore,
  onFilterLeadScore,
  onClearLeadFilter,
  viewMode,
  setViewMode,
  search,
  setSearch,
  minScore = 0,
  sortByScore = false,
}: ActionBarProps) => {
  return (
    <div className="sticky top-16 z-40 bg-card/90 backdrop-blur border-b border-border" role="toolbar" aria-label="Barre d'actions prospection">
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 flex items-center gap-2">
          <Input
            placeholder="Rechercher un client..."
            value={search}
            data-testid="search-input"
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher un client"
            role="searchbox"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button size="sm" onClick={onAdd} className="gap-2 bg-accent text-white hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent" aria-label="Ajouter un client">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
          <Button size="sm" variant="secondary" onClick={onImport} className="gap-2 bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border" aria-label="Importer Excel">
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Button size="sm" variant="outline" onClick={onSortLeadScore} className="gap-2 border-border text-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border" aria-label="Trier par lead score">
            <SortDesc className="h-4 w-4" /> {sortByScore ? "Score décroissant" : "Score récent"}
          </Button>
          <div className="flex items-center gap-2">
            <Input
              aria-label="Filtrer par score minimum"
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => onFilterLeadScore(Number(e.target.value) || 0)}
              className="w-24"
              data-testid="lead-min"
            />
            <Button size="sm" variant="outline" onClick={() => onFilterLeadScore(minScore || 0)} className="gap-2 border-border text-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border" aria-label="Filtrer lead score">
              <Filter className="h-4 w-4" /> Min {minScore || 0}
            </Button>
            <Button size="sm" variant="outline" onClick={onClearLeadFilter} aria-label="Réinitialiser le filtre score" className="border-border text-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border">
              Réinitialiser
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={onToggleMap} aria-label="Basculer la carte" className="gap-1 border-border text-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border">
            <MapIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"} className="border-border text-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border">
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"} className="border-border text-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border">
            <Grid className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" aria-label="Exporter" className="border-border text-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
