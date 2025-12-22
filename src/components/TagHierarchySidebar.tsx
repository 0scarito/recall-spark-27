import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Folder, Tag, Hash } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TagHierarchySidebarProps {
  cards: any[];
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
  selectedCollection: string | null;
  onCollectionSelect: (collection: string | null) => void;
}

// Define category mappings
const TAG_CATEGORIES: Record<string, string[]> = {
  "Productivity": ["productivity", "focus", "habits", "workflow", "time-management", "gtd"],
  "Personal Development": ["personal-development", "self-improvement", "mindset", "growth", "motivation", "psychology"],
  "Technology": ["technology", "tech", "programming", "software", "development", "coding", "ai", "machine-learning"],
  "Finance": ["finance", "investing", "money", "economics", "wealth", "trading"],
  "Health": ["health", "fitness", "nutrition", "wellness", "exercise", "mental-health"],
  "Business": ["business", "startup", "entrepreneurship", "marketing", "leadership", "management"],
  "Learning": ["learning", "education", "reading", "knowledge", "research", "study"],
  "Creative": ["creative", "design", "art", "writing", "music", "photography"],
};

const TagHierarchySidebar = ({
  cards,
  selectedTags,
  onTagSelect,
  selectedCollection,
  onCollectionSelect,
}: TagHierarchySidebarProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Personal Development", "Technology"]));

  // Compute tag counts
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
      for (const tag of tags) {
        if (!tag.startsWith('collection:')) {
          counts.set(tag.toLowerCase(), (counts.get(tag.toLowerCase()) || 0) + 1);
        }
      }
    }
    return counts;
  }, [cards]);

  // Get collections
  const collections = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
      for (const tag of tags) {
        if (tag.startsWith('collection:')) {
          set.add(tag.replace('collection:', ''));
        }
      }
    }
    return Array.from(set).sort();
  }, [cards]);

  // Organize tags into categories
  const categorizedTags = useMemo(() => {
    const result: Record<string, { tag: string; count: number; display: string }[]> = {};
    const assignedTags = new Set<string>();

    // Assign tags to categories
    for (const [category, keywords] of Object.entries(TAG_CATEGORIES)) {
      result[category] = [];
      for (const [tag, count] of tagCounts) {
        if (keywords.some(kw => tag.includes(kw))) {
          result[category].push({ tag, count, display: tag });
          assignedTags.add(tag);
        }
      }
    }

    // Uncategorized tags
    const uncategorized: { tag: string; count: number; display: string }[] = [];
    for (const [tag, count] of tagCounts) {
      if (!assignedTags.has(tag)) {
        uncategorized.push({ tag, count, display: tag });
      }
    }
    if (uncategorized.length > 0) {
      result["Other"] = uncategorized;
    }

    // Remove empty categories
    for (const category of Object.keys(result)) {
      if (result[category].length === 0) {
        delete result[category];
      }
    }

    return result;
  }, [tagCounts]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagSelect(selectedTags.filter(t => t !== tag));
    } else {
      onTagSelect([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Collections */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          Collections
        </h3>
        <div className="space-y-0.5">
          <Button
            variant={!selectedCollection ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start h-8 text-sm"
            onClick={() => onCollectionSelect(null)}
          >
            <Folder className="w-3.5 h-3.5 mr-2" />
            All Items
          </Button>
          {collections.map((c) => (
            <Button
              key={c}
              variant={selectedCollection === c ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start h-8 text-sm"
              onClick={() => onCollectionSelect(c)}
            >
              <Folder className="w-3.5 h-3.5 mr-2" />
              {c}
            </Button>
          ))}
        </div>
      </div>

      {/* Tags by Category */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          Tags
        </h3>
        <div className="space-y-1">
          {Object.entries(categorizedTags).map(([category, tags]) => (
            <Collapsible
              key={category}
              open={expandedCategories.has(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-8 text-sm font-medium hover:bg-muted/50"
                >
                  <span className="flex items-center gap-2">
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    {category}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    {tags.length}
                  </Badge>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-5 space-y-0.5 mt-0.5">
                {tags.sort((a, b) => b.count - a.count).slice(0, 10).map(({ tag, count, display }) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded text-sm transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Hash className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate capitalize">{display.replace(/-/g, ' ')}</span>
                    </span>
                    <span className="text-xs opacity-60">{count}</span>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TagHierarchySidebar;
