import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";
import ConnectionsGraph from "./ConnectionsGraph";

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

  const addTag = async () => {
    const t = newTag.trim();
    if (!t || !card) return;
    const current: string[] = Array.isArray(card.tags) ? card.tags : [];
    if (current.includes(t)) return toast.info("Déjà présent");
    const next = [...current, t];
    const { error } = await supabase.from('knowledge_cards').update({ tags: next }).eq('id', card.id);
    if (error) return toast.error("Échec de l’ajout du tag");
    toast.success("Connexion ajoutée");
    setNewTag("");
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q) return;
    setChatMessages((m)=>[...m,{role:'user',content:q}]);
    setChatInput("");
    const { data, error } = await supabase.functions.invoke('chat-knowledge', {
      body: { question: `Réponds à propos de cette carte précise titled "${card?.title}". Contexte: ${card?.summary || ''}. Question: ${q}` },
    });
    if (error) return toast.error("Chat indisponible");
    setChatMessages((m)=>[...m,{role:'assistant',content:data.answer}]);
  };

  const generateQuiz = async () => {
    if (!card) return;
    setGeneratingQuiz(true);
    setQuiz(null);
    try {
      const { data, error } = await supabase.functions.invoke('chat-knowledge', {
        body: { question: `Génère 5 questions QCM concises (JSON) sur: ${card.title}. Contexte: ${card.summary}. Format: [{question, options:[a,b,c,d], answer}]` },
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
          <SheetTitle className="line-clamp-2">{card?.title}</SheetTitle>
          <SheetDescription className="space-y-2">
            {card?.url && (
              <Button variant="link" asChild className="px-0">
                <a href={card.url} target="_blank" rel="noreferrer">
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
            {card?.content_type === 'youtube' ? (
              <div className="aspect-video w-full rounded-md overflow-hidden border">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(card.url)}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : card?.metadata?.image ? (
              <img src={card.metadata.image} alt={card?.title || ''} className="w-full rounded-md border" />
            ) : null}
            {card?.metadata?.text && (
              <div className="prose prose-invert max-w-none text-sm leading-6 whitespace-pre-wrap">
                {card.metadata.text}
              </div>
            )}
            {!card?.metadata?.text && (
              <p className="text-sm text-muted-foreground">No reader content available.</p>
            )}
          </TabsContent>

          <TabsContent value="notebook" className="mt-4">
            {card?.summary && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{card.summary}</p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <Input value={newTag} onChange={(e)=>setNewTag(e.target.value)} placeholder="Ajouter une connexion (tag)" />
              <Button size="icon" onClick={addTag} title="Créer une connexion">
                <Zap className="w-4 h-4" />
              </Button>
            </div>
            {Array.isArray(card?.tags) && card!.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {card!.tags.map((t: string, idx: number) => (
                  <Badge key={idx} variant="outline">{t}</Badge>
                ))}
              </div>
            )}
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
            <ConnectionsList card={card} allCards={allCards} onSelectCard={onSelectCard} />
          </TabsContent>

          <TabsContent value="graph" className="mt-4">
            <ConnectionsGraph card={card} allCards={allCards} onSelectCard={onSelectCard} />
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


