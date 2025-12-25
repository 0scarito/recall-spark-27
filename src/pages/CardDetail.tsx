import AppLayout from "@/components/AppLayout";
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadCards, KnowledgeCard } from "@/lib/storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, FileText } from "lucide-react";
import { useQuestions } from "@/hooks/useQuestions";
import ReaderView from "@/components/card-detail/ReaderView";
import NotebookView from "@/components/card-detail/NotebookView";
import ChatPanel from "@/components/card-detail/ChatPanel";
import CategorySelector from "@/components/CategorySelector";
import { getCategoryTags, getNonCategoryTags, getCategoryIcon } from "@/lib/categories";

const extractYouTubeId = (url?: string) => {
  if (!url) return "";
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
};

const CardDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  const { questions, isGenerating, generateQuestions } = useQuestions(id);

  const loadCardData = async () => {
    const data = await loadCards();
    setCards(data);
  };

  useEffect(() => {
    loadCardData();
  }, []);

  const card = useMemo(() => cards.find((c) => c.id === id), [cards, id]);
  const youtubeId = extractYouTubeId(card?.url);

  if (!card) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Card not found</p>
        </div>
      </AppLayout>
    );
  }

  const handleGenerateQuestions = async () => {
    if (id) {
      await generateQuestions(id);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Panel - Content (Notebook/Reader) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video/Content Header */}
          <div className="relative h-44 bg-card flex-shrink-0">
            {card.metadata?.image ? (
              <img 
                src={card.metadata.image} 
                alt={card.title} 
                className="w-full h-full object-cover opacity-70"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="max-w-3xl">
                <h1 className="text-xl font-semibold line-clamp-2 mb-2">
                  {card.title}
                </h1>
                {card.url && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {youtubeId && (
                      <div className="w-5 h-4 bg-destructive rounded-sm flex items-center justify-center text-[10px] font-bold text-destructive-foreground">
                        ▶
                      </div>
                    )}
                    <span>{new URL(card.url).hostname.replace('www.', '')}</span>
                    {card.content_type && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{card.content_type}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags Bar */}
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap bg-background">
            {(() => {
              const tags = Array.isArray(card.tags) ? card.tags : [];
              const categoryTags = getCategoryTags(tags);
              const nonCategoryTags = getNonCategoryTags(tags);
              
              return (
                <>
                  {/* Category tags with icons */}
                  {categoryTags.map((tag) => {
                    const Icon = getCategoryIcon(tag);
                    return (
                      <Badge key={tag} variant="secondary" className="rounded-full text-xs flex items-center gap-1.5">
                        <Icon className="w-3 h-3" />
                        {tag}
                      </Badge>
                    );
                  })}
                  {/* Regular connection tags */}
                  {nonCategoryTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="rounded-full text-xs">
                      {tag}
                    </Badge>
                  ))}
                </>
              );
            })()}
            <CategorySelector 
              card={card} 
              onUpdate={loadCardData}
            />
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="notebook" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-10 px-4">
              <TabsTrigger 
                value="notebook" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-sm"
              >
                <BookOpen className="w-4 h-4" />
                Notebook
              </TabsTrigger>
              <TabsTrigger 
                value="reader"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-sm"
              >
                <FileText className="w-4 h-4" />
                Reader
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notebook" className="flex-1 m-0 overflow-hidden">
              <NotebookView
                card={card}
                isGenerating={isGenerating}
                onGenerateQuestions={handleGenerateQuestions}
                questionsCount={questions.length}
              />
            </TabsContent>

            <TabsContent value="reader" className="flex-1 m-0 overflow-hidden">
              <ReaderView 
                card={card} 
                onRefresh={(updates) => {
                  setCards(prev => prev.map(c => c.id === card.id ? { ...c, ...updates } : c));
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsChatCollapsed(!isChatCollapsed)}
          className="w-6 flex-shrink-0 bg-muted/30 hover:bg-muted/50 flex items-center justify-center border-x border-border transition-colors"
        >
          {isChatCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Right Panel - Chat */}
        <div 
          className={`border-l border-border bg-background flex-shrink-0 transition-all duration-300 overflow-hidden ${
            isChatCollapsed ? 'w-0' : 'w-80'
          }`}
        >
          {!isChatCollapsed && <ChatPanel card={card} />}
        </div>
      </div>
    </AppLayout>
  );
};

export default CardDetail;
