import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Bot, Calendar, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (query: string, filters: SearchFilters) => void;
  availableTags: string[];
}

export interface SearchFilters {
  searchIn: "all" | "title" | "content" | "tags";
  dateRange: "all" | "today" | "week" | "month";
  tags: string[];
  aiPowered: boolean;
}

const SearchModal = ({ open, onOpenChange, onSearch, availableTags }: SearchModalProps) => {
  const [query, setQuery] = useState("");
  const [aiPowered, setAiPowered] = useState(false);
  const [searchIn, setSearchIn] = useState<SearchFilters["searchIn"]>("all");
  const [dateRange, setDateRange] = useState<SearchFilters["dateRange"]>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        onOpenChange(true);
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  const handleSearch = () => {
    onSearch(query, { searchIn, dateRange, tags: selectedTags, aiPowered });
    onOpenChange(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 bg-card border-border overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-border">
          <div className="relative flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for content..."
              className="flex-1 border-0 bg-transparent text-lg focus-visible:ring-0 px-0"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
              <Button
                variant={aiPowered ? "ghost" : "secondary"}
                size="sm"
                className={`rounded-full text-xs gap-1 ${!aiPowered ? 'bg-background shadow-sm' : ''}`}
                onClick={() => setAiPowered(false)}
              >
                <Search className="w-3 h-3" />
                Standard
              </Button>
              <Button
                variant={aiPowered ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full text-xs gap-1 ${aiPowered ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setAiPowered(true)}
              >
                <Sparkles className="w-3 h-3" />
                AI-Powered
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Select value={searchIn} onValueChange={(v: any) => setSearchIn(v)}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/30 border-border">
              <SelectValue placeholder="Search in" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="content">Content</SelectItem>
              <SelectItem value="tags">Tags</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-[100px] h-8 text-xs bg-muted/30 border-border">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTags.length > 0 ? "selected" : "all"} onValueChange={() => {}}>
            <SelectTrigger className="w-[100px] h-8 text-xs bg-muted/30 border-border">
              <Tag className="w-3 h-3 mr-1" />
              <span>Tags</span>
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {selectedTags.length}
                </Badge>
              )}
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {availableTags.slice(0, 20).map(tag => (
                <div
                  key={tag}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded"
                  onClick={() => toggleTag(tag)}
                >
                  <div className={`w-3 h-3 border rounded-sm ${selectedTags.includes(tag) ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                  <span className="text-sm">{tag}</span>
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content Area */}
        <div className="min-h-[300px] flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg text-foreground">Start typing to search...</p>
          {aiPowered && (
            <p className="text-sm text-muted-foreground mt-2 max-w-md text-center">
              AI-powered search understands meaning, not just keywords. Best for broad queries, fuzzy matches, or when you're unsure how something was written.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <kbd className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">ctrl/</kbd>
          <Button onClick={handleSearch} disabled={!query.trim()}>
            Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;
