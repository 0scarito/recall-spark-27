import { useState, useEffect, useMemo } from "react";
import { loadCards as loadLocalCards, updateCardTags, deleteCards as deleteLocalCards } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Brain, List, Grid2X2, Network, ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import KnowledgeCard from "./KnowledgeCard";
import AddContentDialogV2 from "./AddContentDialogV2";
import SearchModal from "./SearchModal";
import SelectionBanner from "./SelectionBanner";
import TagHierarchySidebar from "./TagHierarchySidebar";
import { toast } from "sonner";
import { format } from "date-fns";
import CardDetailDrawer from "./CardDetailDrawer";
import { useNavigate } from "react-router-dom";
import ChatInterface from "./ChatInterface";
import ConnectionsGraph from "./ConnectionsGraph";
import DraggableCard from "./DraggableCard";
import { DndContext, DragEndEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

const Dashboard = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [orderBy, setOrderBy] = useState<"newest" | "oldest" | "title">("newest");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const navigate = useNavigate();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [prefillUrl, setPrefillUrl] = useState<string | undefined>(undefined);
  const [activeView, setActiveView] = useState<"cards" | "chat" | "graph">("cards");
  const [draggedCard, setDraggedCard] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
      for (const tag of tags) {
        if (!tag.startsWith('collection:'))
          counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [cards]);

  const filteredCards = useMemo(() => {
    let result = cards.filter((card) =>
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedCollection) {
      result = result.filter((card) => {
        const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
        return tags.includes(`collection:${selectedCollection}`);
      });
    }

    if (selectedTags.length > 0) {
      result = result.filter((card) => {
        const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
        return selectedTags.every((t) => tags.includes(t));
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
  }, [cards, searchQuery, selectedTags, selectedCollection, orderBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectionEnabled = selectedIds.size > 0;

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
    if (filters.tags?.length > 0) {
      setSelectedTags(filters.tags);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Top Bar - Clean and minimal */}
        <div className="border-b border-border px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Button 
              variant="outline" 
              size="icon"
              className="h-9 w-9"
              onClick={() => setSearchModalOpen(true)}
            >
              <Search className="w-4 h-4" />
            </Button>
            
            {/* Add Content Button */}
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              Add Content
              <PenLine className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Controls Bar - Compact, right-aligned */}
        <div className="px-6 py-2 flex items-center justify-end gap-3 border-b border-border flex-shrink-0">
          {/* Active tag filters */}
          {selectedTags.length > 0 && (
            <div className="flex-1 flex items-center gap-2 flex-wrap mr-auto">
              {selectedTags.map((t) => (
                <Badge 
                  key={t} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => setSelectedTags(selectedTags.filter((x) => x !== t))}
                >
                  {t} ×
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-6 px-2"
                onClick={() => setSelectedTags([])}
              >
                Clear
              </Button>
            </div>
          )}
          
          {/* View Mode Toggle - Single button */}
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-2 h-8"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? (
              <>
                <List className="w-4 h-4" />
                List
              </>
            ) : (
              <>
                <Grid2X2 className="w-4 h-4" />
                Grid
              </>
            )}
          </Button>

          {/* Order By */}
          <Select value={orderBy} onValueChange={(v: any) => setOrderBy(v)}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-transparent border-border">
              <span className="text-muted-foreground mr-1">Sort:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside className={`hidden md:flex flex-col border-r border-border transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-0'}`}>
            {sidebarOpen && (
              <div className="flex-1 overflow-y-auto p-4">
                <TagHierarchySidebar
                  cards={cards}
                  selectedTags={selectedTags}
                  onTagSelect={setSelectedTags}
                  selectedCollection={selectedCollection}
                  onCollectionSelect={setSelectedCollection}
                />
              </div>
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
                      {searchQuery ? 'No results found' : 'Your knowledge base is empty'}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery ? 'Try a different search' : 'Start by adding your first piece of content'}
                    </p>
                    {!searchQuery && (
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
        availableTags={availableTags}
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
