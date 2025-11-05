import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Brain, List, Grid2X2, Network } from "lucide-react";
import KnowledgeCard from "./KnowledgeCard";
import AddContentDialog from "./AddContentDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import CardDetailDrawer from "./CardDetailDrawer";
import { useNavigate } from "react-router-dom";
import ChatInterface from "./ChatInterface";
import ConnectionsGraph from "./ConnectionsGraph";
import DraggableCard from "./DraggableCard";
import { DndContext, DragEndEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

const Dashboard = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const loadCards = async () => {
    try {
      let query = supabase.from('knowledge_cards').select('*');
      if (searchQuery.trim().length > 0) {
        // Use Postgres FTS when searching
        query = (query as any).textSearch('search_vector', searchQuery);
      }
      const { data, error } = await (query as any).order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error: any) {
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
    // Support bookmarklet via ?add={url}
    const params = new URLSearchParams(window.location.search);
    const addUrl = params.get('add');
    if (addUrl) {
      setPrefillUrl(addUrl);
      setAddDialogOpen(true);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('add');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Sign out is handled globally in AppLayout; keep Dashboard focused on content

  // Collections side actions removed with the collections sidebar

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

    const { error } = await supabase
      .from('knowledge_cards')
      .update({ tags: newTags })
      .eq('id', cardId);

    if (error) {
      toast.error("Failed to move card");
    } else {
      toast.success("Card moved to collection");
      loadCards();
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

  const availableCollections = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
      for (const tag of tags) if (tag.startsWith('collection:')) set.add(tag.replace('collection:', ''));
    }
    return Array.from(set).sort();
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

  return (
    <div className="w-full">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="w-full">
            {/* Top Bar */}
            <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your knowledge..."
                    className="pl-10 bg-card text-foreground border-border"
                  />
                </div>
                {/* Filtered Tags */}
                {selectedTags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Tags:</span>
                    {selectedTags.map((t) => (
                      <Badge 
                        key={t} 
                        variant="secondary" 
                        className="bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80"
                        onClick={() => setSelectedTags(selectedTags.filter((x) => x !== t))}
                      >
                        {t}
                      </Badge>
                    ))}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedTags([])}
                      className="text-sm"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={() => setAddDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Add Content
                </Button>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="px-6 py-3 flex items-center justify-end gap-2 border-b border-border">
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-2"
              >
                <List className="w-4 h-4" />
                List
              </Button>
              <Button 
                variant={viewMode === "grid" ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setViewMode("grid")}
                className="gap-2"
              >
                <Grid2X2 className="w-4 h-4" />
                Grid
              </Button>
              <Select value={orderBy} onValueChange={(v: any) => setOrderBy(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div className="h-full flex">
              {sidebarOpen ? (
                <aside className="hidden md:block w-64 border-r border-border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Collections</h3>
                    <Button size="sm" variant="ghost" onClick={() => setSidebarOpen(false)}>Hide</Button>
                  </div>
                  <div className="space-y-1">
                    <Button
                      key="all"
                      variant={!selectedCollection ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedCollection(null)}
                    >All</Button>
                    {availableCollections.map((c) => (
                      <Button key={c} variant={selectedCollection === c ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setSelectedCollection(c)}>
                        {c}
                      </Button>
                    ))}
                  </div>
                  <div className="pt-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.slice(0, 40).map((t) => (
                        <Badge key={t} className="cursor-pointer" onClick={() => setSelectedTags(Array.from(new Set([...selectedTags, t])))}>
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </aside>
              ) : (
                <div className="hidden md:flex flex-col items-center justify-start px-2 border-r border-border">
                  <Button size="sm" variant="ghost" onClick={() => setSidebarOpen(true)}>Show</Button>
                </div>
              )}

              <div className="flex-1">
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
                        {Object.entries(
                          filteredCards.reduce((acc: Record<string, any[]>, card) => {
                            const key = format(new Date(card.created_at), "EEE MMM dd yyyy");
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(card);
                            return acc;
                          }, {})
                        ).map(([dateLabel, items]: [string, any[]]) => (
                          <div key={dateLabel} className="space-y-4">
                            <h2 className="text-base font-medium text-foreground">{dateLabel}</h2>
                            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                              {items.map((card) => (
                                <DraggableCard
                                  key={card.id}
                                  card={card}
                                  onClick={() => {
                                    navigate(`/card/${card.id}`);
                                  }}
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
            </div>
            <DragOverlay>
              {draggedCard ? (
                <div className="opacity-80">
                  <KnowledgeCard
                    title={draggedCard.title}
                    summary={draggedCard.summary}
                    url={draggedCard.url}
                    tags={draggedCard.tags || []}
                    contentType={draggedCard.content_type}
                    createdAt={draggedCard.created_at}
                    onClick={() => {}}
                    thumbnail={draggedCard.content_type === 'youtube' ? (function(){
                      const m = (draggedCard.url || '').match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
                      return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : (draggedCard.metadata?.image || undefined);
                    })() : (draggedCard?.metadata?.image || undefined)}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        <AddContentDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={loadCards}
          initialUrl={prefillUrl}
        />
        <CardDetailDrawer
          open={detailOpen}
          onOpenChange={setDetailOpen}
          card={selectedCard}
          allCards={cards}
          onSelectCard={(c) => {
            setSelectedCard(c);
            setDetailOpen(true);
          }}
        />
    </div>
  );
};

export default Dashboard;
