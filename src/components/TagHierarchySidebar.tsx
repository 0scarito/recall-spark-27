import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useDroppable } from "@dnd-kit/core";
import { 
  ChevronRight, 
  ChevronDown,
  Folder, 
  FolderPlus, 
  Plus,
  Trash2,
  LayoutGrid
} from "lucide-react";
import { CATEGORY_CONFIG, CATEGORIES, getCategoryIcon } from "@/lib/categories";

interface Collection {
  name: string;
  categories: string[];
}

interface TagHierarchySidebarProps {
  cards: any[];
  selectedFilter: string | null;
  onSelectFilter: (filter: string | null) => void;
  onCreateCollection: (name: string) => void;
  onDeleteCollection: (name: string) => void;
  onDeleteCategory: (category: string) => void;
}

// Droppable collection header
const DroppableCollectionHeader = ({ 
  collection, 
  isOpen,
  onToggle,
  isActive,
  onSelect,
  onDelete,
  cardCount
}: { 
  collection: Collection;
  isOpen: boolean;
  onToggle: () => void;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  cardCount: number;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `collection:${collection.name}`,
  });
  
  return (
    <div 
      ref={setNodeRef}
      className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-md text-sm transition-all duration-200 ${
        isOver
          ? "bg-primary/20 ring-2 ring-primary/30"
          : isActive
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/50"
      }`}
    >
      <button 
        onClick={onToggle}
        className="p-0.5 hover:bg-muted rounded transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      
      <button 
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 text-left truncate"
      >
        <Folder className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="truncate font-medium">{collection.name}</span>
        <span className="text-xs text-muted-foreground">({cardCount})</span>
      </button>
      
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
        title="Delete collection"
      >
        <Trash2 className="w-3 h-3 text-destructive" />
      </button>
    </div>
  );
};

// Category item inside a collection
const CategoryItem = ({
  category,
  count,
  isActive,
  onSelect,
  onDelete,
  showDelete
}: {
  category: string;
  count: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  showDelete: boolean;
}) => {
  const Icon = getCategoryIcon(category);
  
  return (
    <div 
      className={`group flex items-center justify-between gap-2 px-3 py-1.5 ml-5 rounded-md text-sm transition-all duration-200 cursor-pointer ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
      }`}
      onClick={onSelect}
    >
      <span className="flex items-center gap-2 truncate">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{category}</span>
      </span>
      <div className="flex items-center gap-1">
        <span className="text-xs opacity-60">{count}</span>
        {showDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded transition-all"
            title="Delete category from all cards"
          >
            <Trash2 className="w-2.5 h-2.5 text-destructive" />
          </button>
        )}
      </div>
    </div>
  );
};

// New collection creator
const NewCollectionCreator = ({ onCreateCollection }: { onCreateCollection: (name: string) => void }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const { setNodeRef, isOver } = useDroppable({
    id: "collection:__new__",
  });

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateCollection(newName.trim());
      setNewName("");
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <div className="flex gap-1.5 px-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Collection name..."
          className="h-7 text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") { setIsCreating(false); setNewName(""); }
          }}
        />
        <Button size="sm" variant="ghost" onClick={handleCreate} className="h-7 px-2">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <button
      ref={setNodeRef}
      onClick={() => setIsCreating(true)}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm border border-dashed transition-all duration-200 ${
        isOver
          ? "border-primary bg-primary/10 text-primary"
          : "border-muted-foreground/30 text-muted-foreground/60 hover:border-muted-foreground/50 hover:text-muted-foreground"
      }`}
    >
      <FolderPlus className="w-4 h-4 flex-shrink-0" />
      <span>{isOver ? "Drop to create" : "New Collection"}</span>
    </button>
  );
};

const TagHierarchySidebar = ({
  cards,
  selectedFilter,
  onSelectFilter,
  onCreateCollection,
  onDeleteCollection,
  onDeleteCategory,
}: TagHierarchySidebarProps) => {
  const [openCollections, setOpenCollections] = useState<Set<string>>(new Set(["Uncategorized"]));

  // Parse collections and categories from card tags
  const { collections, categoryCounts, collectionCardCounts } = useMemo(() => {
    const collectionMap = new Map<string, Set<string>>();
    const counts: Record<string, number> = {};
    const collectionCounts: Record<string, number> = {};
    
    // Count cards per category and per collection
    for (const card of cards) {
      const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
      
      // Count categories
      for (const tag of tags) {
        if (CATEGORIES.includes(tag) && tag !== "All") {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
      
      // Extract collection info and count cards per collection
      for (const tag of tags) {
        if (tag.startsWith('collection:')) {
          const collectionName = tag.replace('collection:', '');
          collectionCounts[collectionName] = (collectionCounts[collectionName] || 0) + 1;
          
          if (!collectionMap.has(collectionName)) {
            collectionMap.set(collectionName, new Set());
          }
          
          // Add category tags to this collection
          for (const catTag of tags) {
            if (CATEGORIES.includes(catTag) && catTag !== "All") {
              collectionMap.get(collectionName)!.add(catTag);
            }
          }
        }
      }
    }
    
    const collectionsList: Collection[] = Array.from(collectionMap.entries())
      .map(([name, categories]) => ({
        name,
        categories: Array.from(categories).sort()
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    return {
      collections: collectionsList,
      categoryCounts: counts,
      collectionCardCounts: collectionCounts
    };
  }, [cards]);

  // Get all categories with cards (for standalone display)
  const allCategoriesWithCards = useMemo(() => {
    return CATEGORY_CONFIG
      .filter(c => c.name !== "All" && (categoryCounts[c.name] || 0) > 0)
      .map(c => c.name);
  }, [categoryCounts]);

  const toggleCollection = (name: string) => {
    setOpenCollections(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const totalCards = cards.length;

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* All Cards */}
        <button
          onClick={() => onSelectFilter(null)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            selectedFilter === null
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <LayoutGrid className="w-4 h-4" />
            <span>All Cards</span>
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            selectedFilter === null ? 'bg-primary/20' : 'bg-muted'
          }`}>
            {totalCards}
          </span>
        </button>

        <div className="h-px bg-border/50" />

        {/* Collections Section */}
        <div className="space-y-1">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Collections
          </h3>
          
          {collections.map((collection) => (
            <Collapsible
              key={collection.name}
              open={openCollections.has(collection.name)}
              onOpenChange={() => toggleCollection(collection.name)}
            >
              <DroppableCollectionHeader
                collection={collection}
                isOpen={openCollections.has(collection.name)}
                onToggle={() => toggleCollection(collection.name)}
                isActive={selectedFilter === `collection:${collection.name}`}
                onSelect={() => onSelectFilter(`collection:${collection.name}`)}
                onDelete={() => onDeleteCollection(collection.name)}
                cardCount={collectionCardCounts[collection.name] || 0}
              />
              
              <CollapsibleContent className="space-y-0.5 mt-0.5">
                {collection.categories.map((category) => (
                  <CategoryItem
                    key={category}
                    category={category}
                    count={categoryCounts[category] || 0}
                    isActive={selectedFilter === `category:${category}`}
                    onSelect={() => onSelectFilter(`category:${category}`)}
                    onDelete={() => onDeleteCategory(category)}
                    showDelete={true}
                  />
                ))}
                {collection.categories.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 px-3 py-1 ml-5 italic">
                    No categories yet
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
          
          <NewCollectionCreator onCreateCollection={onCreateCollection} />
        </div>

        {/* All Categories Section (collapsible) */}
        {allCategoriesWithCards.length > 0 && (
          <>
            <div className="h-px bg-border/50" />
            
            <Collapsible
              open={openCollections.has("__categories__")}
              onOpenChange={() => toggleCollection("__categories__")}
            >
              <CollapsibleTrigger className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-muted/50 transition-colors">
                {openCollections.has("__categories__") ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  All Categories
                </span>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-0.5 mt-0.5">
                {allCategoriesWithCards.map((category) => (
                  <CategoryItem
                    key={category}
                    category={category}
                    count={categoryCounts[category] || 0}
                    isActive={selectedFilter === `category:${category}`}
                    onSelect={() => onSelectFilter(`category:${category}`)}
                    onDelete={() => onDeleteCategory(category)}
                    showDelete={true}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

export default TagHierarchySidebar;
