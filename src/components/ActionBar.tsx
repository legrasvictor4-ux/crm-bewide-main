import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Plus, Filter, SortDesc, Map as MapIcon, Grid, List, Download } from "lucide-react";

interface ActionBarProps {
  onAdd: () => void;
  onImport: () => void;
  onToggleMap: () => void;
  onSortLeadScore: () => void;
  onFilterLeadScore: (min: number) => void;
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
  search: string;
  setSearch: (value: string) => void;
}

const ActionBar = ({
  onAdd,
  onImport,
  onToggleMap,
  onSortLeadScore,
  onFilterLeadScore,
  viewMode,
  setViewMode,
  search,
  setSearch,
}: ActionBarProps) => {
  return (
    <div className="sticky top-16 z-40 bg-card/90 backdrop-blur border-b border-border">
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 flex items-center gap-2">
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher un client"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button size="sm" onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
          <Button size="sm" variant="secondary" onClick={onImport} className="gap-2">
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Button size="sm" variant="outline" onClick={onSortLeadScore} className="gap-2" aria-label="Trier par lead score">
            <SortDesc className="h-4 w-4" /> Score
          </Button>
          <Button size="sm" variant="outline" onClick={() => onFilterLeadScore(50)} className="gap-2" aria-label="Filtrer lead score">
            <Filter className="h-4 w-4" /> Score &gt; 50
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggleMap} aria-label="Basculer la carte" className="gap-1">
            <MapIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"}>
            <List className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Exporter">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
