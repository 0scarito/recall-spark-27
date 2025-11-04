import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";
import { Toggle } from "@/components/ui/toggle";
import { Plus, Search, LogOut, Brain, Tag, List, Grid2X2 } from "lucide-react";
import KnowledgeCard from "./KnowledgeCard";
import AddContentDialog from "./AddContentDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import CardDetailDrawer from "./CardDetailDrawer";

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
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [prefillUrl, setPrefillUrl] = useState<string | undefined>(undefined);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
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
  }, [cards, searchQuery, selectedTags, orderBy]);

  return (
    <SidebarProvider>
      <div className="min-h-screen">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/95 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="mr-1" />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Recall</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            {/* Sidebar */}
            <Sidebar className="bg-background/40 border-border/50" collapsible="icon">
              <SidebarHeader className="px-3 py-2">
                <div className="text-sm text-muted-foreground">Library</div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Filters</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <button onClick={() => setSelectedTags([])} className="w-full text-left">
                            All Items
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                  <SidebarGroupLabel>Collections</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={!selectedCollection}>
                          <button onClick={() => setSelectedCollection(null)} className="w-full text-left">All</button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {availableCollections.map((col) => (
                        <SidebarMenuItem key={col}>
                          <SidebarMenuButton asChild isActive={selectedCollection === col}>
                            <button onClick={() => setSelectedCollection(col)} className="w-full text-left">{col}</button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                  <SidebarGroupLabel className="flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Tags
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {availableTags.map((tag) => (
                        <SidebarMenuItem key={tag}>
                          <SidebarMenuButton asChild isActive={selectedTags.includes(tag)}>
                            <button
                              onClick={() =>
                                setSelectedTags((prev) =>
                                  prev.includes(tag)
                                    ? prev.filter((t) => t !== tag)
                                    : [...prev, tag]
                                )
                              }
                              className="w-full text-left"
                            >
                              {tag}
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="px-3 py-2">
                <Button size="sm" className="w-full" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Content
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={async () => {
                    const origin = window.location.origin;
                    const code = `javascript:(()=>{const u=location.href;window.open('${origin}/?add='+encodeURIComponent(u),'_self');})();`;
                    await navigator.clipboard.writeText(code);
                    toast.success('Bookmarklet copié. Ajoutez-le à votre barre de favoris.');
                  }}
                >
                  Copy Bookmarklet
                </Button>
              </SidebarFooter>
            </Sidebar>

            {/* Main */}
            <SidebarInset className="flex-1">
              {/* Tool bar */}
              <div className="py-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search your knowledge base..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle
                        pressed={viewMode === "list"}
                        onPressedChange={(p) => setViewMode(p ? "list" : "grid")}
                        aria-label="Toggle list view"
                      >
                        {viewMode === "list" ? <List className="w-4 h-4" /> : <Grid2X2 className="w-4 h-4" />}
                      </Toggle>
                      <Select value={orderBy} onValueChange={(v: any) => setOrderBy(v)}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Order by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="oldest">Oldest</SelectItem>
                          <SelectItem value="title">Title</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={() => setAddDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Content
                      </Button>
                    </div>
                  </div>

                  {/* Selected tags row */}
                  {selectedTags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm text-muted-foreground">Filtered tags:</div>
                      {selectedTags.map((t) => (
                        <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setSelectedTags(selectedTags.filter((x) => x !== t))}>
                          {t}
                        </Badge>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>Clear all</Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content area */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                  <p className="mt-4 text-muted-foreground">Loading your knowledge base...</p>
                </div>
              ) : filteredCards.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {searchQuery ? 'No results found' : 'Your knowledge base is empty'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Start building your second brain by adding your first piece of content'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Content
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {Object.entries(
                    filteredCards.reduce((acc: Record<string, any[]>, card) => {
                      const key = format(new Date(card.created_at), "EEE MMM dd yyyy");
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(card);
                      return acc;
                    }, {})
                  ).map(([dateLabel, items]) => (
                    <div key={dateLabel} className="flex flex-col gap-3">
                      <div className="text-sm text-muted-foreground">{dateLabel}</div>
                      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-3"}>
                        {items.map((card) => (
                          <KnowledgeCard
                            key={card.id}
                            title={card.title}
                            summary={card.summary}
                            url={card.url}
                            tags={card.tags || []}
                            contentType={card.content_type}
                            createdAt={card.created_at}
                            onClick={() => {
                              setSelectedCard(card);
                              setDetailOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Separator className="my-8" />
            </SidebarInset>
          </div>
        </div>

        <AddContentDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={loadCards}
          initialUrl={prefillUrl}
        />
        <CardDetailDrawer open={detailOpen} onOpenChange={setDetailOpen} card={selectedCard} />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;