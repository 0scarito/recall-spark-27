import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, Search, LogOut, Brain, Home, MessageSquare, Network, GraduationCap, Settings, ChevronLeft, List, ChevronDown } from "lucide-react";
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
      <div className="min-h-screen flex w-full bg-background">
        {/* Main Navigation Sidebar - Very narrow */}
        <div className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-4 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <nav className="flex flex-col items-center gap-2 flex-1">
            <Button variant="ghost" size="icon" className="w-10 h-10 text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent">
              <Home className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10 text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent">
              <MessageSquare className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10 text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent">
              <Network className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10 text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent">
              <GraduationCap className="w-5 h-5" />
            </Button>
          </nav>
          <div className="flex flex-col items-center gap-2">
            <Button variant="ghost" size="icon" className="w-10 h-10 text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10 text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Collections Sidebar - Collapsible */}
        <Sidebar className="bg-sidebar border-r border-sidebar-border" collapsible="icon">
          <SidebarHeader className="p-3 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="text-sidebar-foreground" />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {availableCollections.map((col) => (
                    <SidebarMenuItem key={col}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={selectedCollection === col}
                        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        <button onClick={() => setSelectedCollection(col)} className="w-full text-left capitalize">
                          <ChevronDown className="w-4 h-4" />
                          {col}
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex-1 overflow-auto">
          <div className="w-full">
            {/* Top Bar */}
            <div className="border-b border-border px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 flex items-center gap-4">
                {/* Filtered Tags */}
                {selectedTags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Filtered tags:</span>
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
                <Button variant="ghost" size="icon">
                  <Search className="w-5 h-5" />
                </Button>
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
            </div>
          </div>
        </SidebarInset>

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
    </SidebarProvider>
  );
};

export default Dashboard;