import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Zap, X } from "lucide-react";
import { toast } from "sonner";
import ConnectionsGraph from "./ConnectionsGraph";
import CategorySelector from "./CategorySelector";
import { getCategoryTags, getNonCategoryTags, getCategoryIcon, isCategory } from "@/lib/categories";
import { updateCardTags } from "@/lib/storage";

interface CardDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: any | null;
  allCards?: any[];
  onSelectCard?: (card: any) => void;
}

const CardDetailDrawer = ({ open, onOpenChange, card, allCards = [], onSelectCard }: CardDetailDrawerProps) => {
  const [newTag, setNewTag] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{role:"user"|"assistant";content:string}[]>([]);
  const [quiz, setQuiz] = useState<any[] | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [cardData, setCardData] = useState<any | null>(null);

  // Sync card data when card prop changes
  useEffect(() => {
    setCardData(card);
  }, [card]);

  const refreshCard = async () => {
    if (!card) return;
    const { data, error } = await supabase
      .from('knowledge_cards')
      .select('*')
      .eq('id', card.id)
      .single();
    if (!error && data) {
      setCardData(data);
      // Also update the card prop if possible (for parent component)
      if (onSelectCard) {
        onSelectCard(data);
      }
    }
  };

  const addTag = async () => {
    const t = newTag.trim();
    if (!t || !cardData) return;
    // Don't allow adding category tags through this input
    if (isCategory(t)) {
      return toast.info("Use the category selector to add categories");
    }
    const current: string[] = Array.isArray(cardData.tags) ? cardData.tags : [];
    if (current.includes(t)) return toast.info("Déjà présent");
    const next = [...current, t];
    try {
      await updateCardTags(cardData.id, next);
      toast.success("Connexion ajoutée");
      setNewTag("");
      await refreshCard();
    } catch (error: any) {
      toast.error(error.message || "Échec de l'ajout du tag");
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!cardData) return;
    const current: string[] = Array.isArray(cardData.tags) ? cardData.tags : [];
    const next = current.filter(t => t !== tagToRemove);
    try {
      await updateCardTags(cardData.id, next);
      toast.success("Tag supprimé");
      await refreshCard();
    } catch (error: any) {
      toast.error(error.message || "Échec de la suppression du tag");
    }
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || !cardData) return;
    setChatMessages((m)=>[...m,{role:'user',content:q}]);
    setChatInput("");
    const { data, error } = await supabase.functions.invoke('chat-knowledge', {
      body: { question: `Réponds à propos de cette carte précise titled "${cardData?.title}". Contexte: ${cardData?.summary || ''}. Question: ${q}` },
    });
    if (error) return toast.error("Chat indisponible");
    setChatMessages((m)=>[...m,{role:'assistant',content:data.answer}]);
  };

  const generateQuiz = async () => {
    if (!cardData) return;
    setGeneratingQuiz(true);
    setQuiz(null);
    try {
      const { data, error } = await supabase.functions.invoke('chat-knowledge', {
        body: { question: `Génère 5 questions QCM concises (JSON) sur: ${cardData.title}. Contexte: ${cardData.summary}. Format: [{question, options:[a,b,c,d], answer}]` },
      });
      if (error) throw error;
      let parsed: any = null;
      try { parsed = JSON.parse(data.answer); } catch { /* fallback */ }
      setQuiz(Array.isArray(parsed) ? parsed : null);
    } catch {
      toast.error("Échec de la génération du quiz");
    } finally {
      setGeneratingQuiz(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px]">
        <SheetHeader>
          <SheetTitle className="line-clamp-2">{cardData?.title}</SheetTitle>
          <SheetDescription className="space-y-2">
            {cardData?.url && (
              <Button variant="link" asChild className="px-0">
                <a href={cardData.url} target="_blank" rel="noreferrer">
                  Open source <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </Button>
            )}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="reader" className="mt-4">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="reader">Reader</TabsTrigger>
            <TabsTrigger value="notebook">Notebook</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
          </TabsList>

          <TabsContent value="reader" className="mt-4 space-y-3">
            {cardData?.content_type === 'youtube' ? (
              <div className="aspect-video w-full rounded-md overflow-hidden border">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(cardData.url)}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : cardData?.metadata?.image ? (
              <img src={cardData.metadata.image} alt={cardData?.title || ''} className="w-full rounded-md border" />
            ) : null}
            {cardData?.metadata?.text && (
              <div className="prose prose-invert max-w-none text-sm leading-6 whitespace-pre-wrap">
                {cardData.metadata.text}
              </div>
            )}
            {!cardData?.metadata?.text && (
              <p className="text-sm text-muted-foreground">No reader content available.</p>
            )}
          </TabsContent>

          <TabsContent value="notebook" className="mt-4">
            {cardData?.summary && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cardData.summary}</p>
            )}
            
            {/* Categories Section */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Categories</label>
                <CategorySelector 
                  card={cardData} 
                  onUpdate={refreshCard}
                />
              </div>
              {(() => {
                const tags = Array.isArray(cardData?.tags) ? cardData.tags : [];
                const categoryTags = getCategoryTags(tags);
                if (categoryTags.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground">No categories assigned</p>
                  );
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map((t: string) => {
                      const Icon = getCategoryIcon(t);
                      return (
                        <Badge 
                          key={t} 
                          variant="secondary" 
                          className="text-xs flex items-center gap-1.5 pr-1"
                        >
                          <Icon className="w-3 h-3" />
                          {t}
                          <button
                            onClick={() => removeTag(t)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                            title="Remove category"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Connections Section */}
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Connections</label>
              <div className="flex items-center gap-2">
                <Input 
                  value={newTag} 
                  onChange={(e)=>setNewTag(e.target.value)} 
                  placeholder="Ajouter une connexion (tag)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button size="icon" onClick={addTag} title="Créer une connexion">
                  <Zap className="w-4 h-4" />
                </Button>
              </div>
              {(() => {
                const tags = Array.isArray(cardData?.tags) ? cardData.tags : [];
                const nonCategoryTags = getNonCategoryTags(tags);
                if (nonCategoryTags.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground">No connections yet</p>
                  );
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {nonCategoryTags.map((t: string, idx: number) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="text-xs flex items-center gap-1 pr-1"
                      >
                        {t}
                        <button
                          onClick={() => removeTag(t)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                          title="Remove connection"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-4 space-y-3">
            <div className="max-h-64 overflow-auto space-y-2">
              {chatMessages.map((m,i)=> (
                <div key={i} className={m.role==='user'?"text-right":"text-left"}>
                  <span className="inline-block px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm">
                    {m.content}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Poser une question sur cette carte" value={chatInput} onChange={(e)=>setChatInput(e.target.value)} />
              <Button onClick={sendChat}>Envoyer</Button>
            </div>
          </TabsContent>

          <TabsContent value="quiz" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Button onClick={generateQuiz} disabled={generatingQuiz}>{generatingQuiz? 'Génération…' : 'Générer un quiz IA'}</Button>
            </div>
            {quiz && (
              <div className="space-y-3">
                {quiz.map((q:any,idx:number)=> (
                  <div key={idx} className="p-3 rounded-md border">
                    <div className="font-medium mb-2">{q.question}</div>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      {(q.options||[]).map((o:string,i:number)=> (<li key={i}>{o}</li>))}
                    </ul>
                    {q.answer && (
                      <div className="text-xs text-muted-foreground mt-2">Réponse: {q.answer}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="mt-4">
            <ConnectionsList card={cardData} allCards={allCards} onSelectCard={onSelectCard} />
          </TabsContent>

          <TabsContent value="graph" className="mt-4">
            <ConnectionsGraph card={cardData} allCards={allCards} onSelectCard={onSelectCard} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default CardDetailDrawer;

interface ConnectionsListProps {
  card: any | null;
  allCards: any[];
  onSelectCard?: (card: any) => void;
}

const ConnectionsList = ({ card, allCards, onSelectCard }: ConnectionsListProps) => {
  if (!card) return null;
  const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
  const related = allCards.filter((c) => c.id !== card.id && Array.isArray(c.tags) && c.tags.some((t: string) => tags.includes(t)));

  if (related.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune connexion trouvée via les tags.</p>;
  }

  return (
    <div className="space-y-3">
      {related.map((c) => (
        <Button key={c.id} variant="ghost" className="justify-start w-full px-2" onClick={() => onSelectCard && onSelectCard(c)}>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium line-clamp-1">{c.title}</span>
            <span className="text-xs text-muted-foreground line-clamp-1">{(c.tags || []).filter((t: string) => tags.includes(t)).join(', ')}</span>
          </div>
        </Button>
      ))}
    </div>
  );
};

function extractYouTubeId(url?: string) {
  if (!url) return "";
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : "";
}


