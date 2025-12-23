import { useState, useEffect, useMemo } from "react";
import { loadCards as loadLocalCards, updateCardTags, deleteCards as deleteLocalCards } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Brain, List, Grid2X2, Network, ChevronLeft, ChevronRight, Hash, Folder } from "lucide-react";
import KnowledgeCard from "./KnowledgeCard";
import AddContentDialogV2 from "./AddContentDialogV2";
import SearchModal from "./SearchModal";
import SelectionBanner from "./SelectionBanner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import CardDetailDrawer from "./CardDetailDrawer";
import { useNavigate } from "react-router-dom";
import ChatInterface from "./ChatInterface";
import ConnectionsGraph from "./ConnectionsGraph";
import DraggableCard from "./DraggableCard";
import { DndContext, DragEndEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

// Category definitions for single tag per card
const CATEGORIES = [
  "All",
  "Finance",
  "Personal Development", 
  "Technology",
  "Health",
  "Business",
  "Learning",
  "Creative",
  "Entertainment",
  "Other"
];

const Dashboard = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [orderBy, setOrderBy] = useState<"newest" | "oldest" | "title">("newest");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const navigate = useNavigate();
  const [prefillUrl, setPrefillUrl] = useState<string | undefined>(undefined);
  const [activeView, setActiveView] = useState<"cards" | "chat" | "graph">("cards");
  const [draggedCard, setDraggedCard] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const loadCards = async () => {
    try {
      const data = await loadLocalCards();
      setCards(data || []);
    } catch {
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
    const params = new URLSearchParams(window.location.search);
    const addUrl = params.get('add');
    if (addUrl) {
      setPrefillUrl(addUrl);
      setAddDialogOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('add');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setAddDialogOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDragStart = (event: any) => {
    const card = cards.find((c) => c.id === event.active.id);
    setDraggedCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedCard(null);

    if (!over) return;

    const cardId = active.id as string;
    const targetCollection = over.id as string;

    if (!targetCollection.startsWith("collection:")) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const currentTags: string[] = Array.isArray(card.tags) ? card.tags : [];
    const withoutCollections = currentTags.filter((t) => !t.startsWith("collection:"));
    const newTags = [...withoutCollections, targetCollection];

    try {
      await updateCardTags(cardId, newTags);
      toast.success("Card moved to collection");
      loadCards();
    } catch {
      toast.error("Failed to move card");
    }
  };

  // Get primary category for a card (first non-collection tag or 'Other')
  const getCardCategory = (card: any): string => {
    const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
    const categoryTags = tags.filter(t => !t.startsWith('collection:') && !t.startsWith('pinned'));
    
    // Find matching category
    for (const cat of CATEGORIES) {
      if (cat === "All") continue;
      if (categoryTags.some(t => t.toLowerCase().includes(cat.toLowerCase()))) {
        return cat;
      }
    }
    
    return categoryTags[0] || "Other";
  };

  const filteredCards = useMemo(() => {
    let result = cards.filter((card) =>
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedCategory !== "All") {
      result = result.filter((card) => {
        const category = getCardCategory(card);
        return category.toLowerCase().includes(selectedCategory.toLowerCase());
      });
    }

    if (orderBy === "newest") {
      result = result.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (orderBy === "oldest") {
      result = result.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (orderBy === "title") {
      result = result.slice().sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    return result;
  }, [cards, searchQuery, selectedCategory, orderBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const pinSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      const card = cards.find((c) => c.id === id);
      if (!card) continue;
      const current: string[] = Array.isArray(card.tags) ? card.tags : [];
      const next = current.includes('pinned') ? current : [...current, 'pinned'];
      await updateCardTags(id, next);
    }
    toast.success('Pinned selected cards');
    clearSelection();
    loadCards();
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await deleteLocalCards(ids);
    toast.success('Deleted selected cards');
    clearSelection();
    loadCards();
  };

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    if (filters.category) {
      setSelectedCategory(filters.category);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: cards.length };
    for (const card of cards) {
      const cat = getCardCategory(card);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [cards]);

  return (
    <div className="w-full h-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Single Top Bar - Left: controls, Center: categories, Right: actions */}
        <div className="border-b border-border px-4 py-2.5 flex items-center gap-4 flex-shrink-0">
          {/* Left: View toggle and Sort */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? (
                <List className="w-4 h-4" />
              ) : (
                <Grid2X2 className="w-4 h-4" />
              )}
            </Button>

            <Select value={orderBy} onValueChange={(v: any) => setOrderBy(v)}>
              <SelectTrigger className="w-[100px] h-8 text-xs bg-transparent border-0 hover:bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Center: Category tabs */}
          <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto scrollbar-hide">
            {CATEGORIES.filter(cat => cat === "All" || (categoryCounts[cat] || 0) > 0).map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 px-3 text-xs whitespace-nowrap ${
                  selectedCategory === cat 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
                {cat !== "All" && categoryCounts[cat] && (
                  <span className="ml-1.5 text-[10px] opacity-60">{categoryCounts[cat]}</span>
                )}
              </Button>
            ))}
          </div>
          
          {/* Right: Search and Add */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setSearchModalOpen(true)}
            >
              <Search className="w-4 h-4" />
            </Button>
            
            <Button onClick={() => setAddDialogOpen(true)} size="sm" className="h-8 gap-1.5">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside 
            className={`hidden md:flex flex-col border-r border-border bg-muted/20 transition-all duration-200 ${
              sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
            }`}
          >
            {sidebarOpen && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  {/* Categories */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Categories
                    </h3>
                    <div className="space-y-0.5">
                      {CATEGORIES.filter(cat => cat === "All" || (categoryCounts[cat] || 0) > 0).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                            selectedCategory === cat
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{cat}</span>
                          </span>
                          <span className="text-xs opacity-60">{categoryCounts[cat] || 0}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collections */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      Collections
                    </h3>
                    <div className="space-y-0.5">
                      {(() => {
                        const collections = new Set<string>();
                        for (const card of cards) {
                          const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
                          for (const tag of tags) {
                            if (tag.startsWith('collection:')) {
                              collections.add(tag.replace('collection:', ''));
                            }
                          }
                        }
                        return Array.from(collections).sort().map((c) => (
                          <button
                            key={c}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <Folder className="w-3.5 h-3.5" />
                            <span className="truncate">{c}</span>
                          </button>
                        ));
                      })()}
                      {cards.every(c => !c.tags?.some((t: string) => t.startsWith('collection:'))) && (
                        <p className="text-xs text-muted-foreground/60 px-2 py-1">No collections yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </aside>
          
          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex items-center justify-center w-4 hover:bg-muted/50 transition-colors border-r border-border"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </button>

          {/* Cards Area */}
          <div className="flex-1 overflow-y-auto">
            {activeView === "chat" ? (
              <ChatInterface />
            ) : activeView === "graph" ? (
              <div className="px-6 py-6 h-full flex flex-col">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Knowledge Graph</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Explore connections between your knowledge cards based on shared tags
                  </p>
                </div>
                {selectedCard ? (
                  <ConnectionsGraph 
                    card={selectedCard} 
                    allCards={cards}
                    onSelectCard={(c) => {
                      setSelectedCard(c);
                      setDetailOpen(true);
                    }}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Network className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Select a card to view its connections
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-6 py-6">
                {loading ? (
                  <div className="text-center py-20">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                  </div>
                ) : filteredCards.length === 0 ? (
                  <div className="text-center py-20">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">
                      {searchQuery || selectedCategory !== "All" ? 'No results found' : 'Your knowledge base is empty'}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery || selectedCategory !== "All" ? 'Try a different search or category' : 'Start by adding your first piece of content'}
                    </p>
                    {!searchQuery && selectedCategory === "All" && (
                      <Button onClick={() => setAddDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Content
                      </Button>
                    )}
                  </div>
                ) : (
                  <SortableContext items={filteredCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-8">
                      {/* Add Content Card - first in grid */}
                      <div className="space-y-4">
                        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Today</h2>
                        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
                          {/* Add Content Card */}
                          <button
                            onClick={() => setAddDialogOpen(true)}
                            className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-all min-h-[200px]"
                          >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Plus className="w-6 h-6 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Add Content</span>
                          </button>
                          
                          {/* Cards from Today */}
                          {filteredCards
                            .filter(card => format(new Date(card.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"))
                            .map((card) => (
                              <DraggableCard
                                key={card.id}
                                card={card}
                                onClick={() => navigate(`/card/${card.id}`)}
                                selectionEnabled={true}
                                selected={selectedIds.has(card.id)}
                                onToggleSelect={toggleSelect}
                                category={getCardCategory(card)}
                              />
                            ))}
                        </div>
                      </div>

                      {/* Remaining cards grouped by date */}
                      {Object.entries(
                        filteredCards
                          .filter(card => format(new Date(card.created_at), "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd"))
                          .reduce((acc: Record<string, any[]>, card) => {
                            const key = format(new Date(card.created_at), "EEE MMM dd yyyy");
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(card);
                            return acc;
                          }, {})
                      ).map(([dateLabel, items]: [string, any[]]) => (
                        <div key={dateLabel} className="space-y-4">
                          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{dateLabel}</h2>
                          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
                            {items.map((card) => (
                              <DraggableCard
                                key={card.id}
                                card={card}
                                onClick={() => navigate(`/card/${card.id}`)}
                                selectionEnabled={true}
                                selected={selectedIds.has(card.id)}
                                onToggleSelect={toggleSelect}
                                category={getCardCategory(card)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {draggedCard && (
            <div className="opacity-80">
              <KnowledgeCard
                title={draggedCard.title}
                summary={draggedCard.summary}
                url={draggedCard.url}
                tags={draggedCard.tags || []}
                contentType={draggedCard.content_type}
                createdAt={draggedCard.created_at}
                onClick={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Selection Banner */}
      <SelectionBanner
        count={selectedIds.size}
        onPin={pinSelected}
        onDelete={deleteSelected}
        onClear={clearSelection}
      />

      {/* Search Modal */}
      <SearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        onSearch={handleSearch}
        availableTags={CATEGORIES.filter(c => c !== "All")}
      />

      {/* Add Content Dialog */}
      <AddContentDialogV2
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={loadCards}
        initialUrl={prefillUrl}
      />

      {/* Card Detail Drawer */}
      <CardDetailDrawer
        card={selectedCard}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
};

export default Dashboard;
