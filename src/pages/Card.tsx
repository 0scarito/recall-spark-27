import AppLayout from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConnectionsGraph from "@/components/ConnectionsGraph";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { ExternalLink, PanelRightClose, PanelRightOpen } from "lucide-react";

type CardRow = {
  id: string;
  title: string;
  url?: string;
  summary?: string;
  tags?: string[];
  content_type?: string;
  metadata?: { image?: string | null; text?: string | null; siteName?: string | null };
  created_at: string;
};

const Card = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardRow[]>([]);
  const [showReader, setShowReader] = useState(true);

  useEffect(() => {
    supabase
      .from("knowledge_cards")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCards(data || []));
  }, []);

  const card = useMemo(() => cards.find((c) => c.id === id) || null, [cards, id]);

  const related = useMemo(() => {
    if (!card) return [] as CardRow[];
    const tags: string[] = Array.isArray(card.tags) ? card.tags : [];
    return cards.filter((c) => c.id !== card.id && Array.isArray(c.tags) && c.tags.some((t: string) => tags.includes(t)));
  }, [card, cards]);

  return (
    <AppLayout>
      <div className="px-6 py-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight line-clamp-2">{card?.title || "Card"}</h1>
            {card?.url && (
              <Button asChild variant="link" className="px-0 text-sm">
                <a href={card.url} target="_blank" rel="noreferrer">
                  Open source <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </Button>
            )}
            {Array.isArray(card?.tags) && card!.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {card!.tags.map((t: string, i: number) => (
                  <Badge key={i} variant="outline">{t}</Badge>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowReader((v) => !v)}>
            {showReader ? (<><PanelRightClose className="w-4 h-4 mr-2" />Hide reader</>) : (<><PanelRightOpen className="w-4 h-4 mr-2" />Show reader</>)}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={showReader ? "lg:col-span-7" : "lg:col-span-12"}>
            <Tabs defaultValue="notebook">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="notebook">Notebook</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="quiz">Quiz</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="graph">Graph</TabsTrigger>
              </TabsList>

              <TabsContent value="notebook" className="mt-4 space-y-4">
                {card?.summary ? (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{card.summary}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">No summary yet.</p>
                )}
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <p className="text-sm text-muted-foreground">Chat à venir ici.</p>
              </TabsContent>

              <TabsContent value="quiz" className="mt-4">
                <p className="text-sm text-muted-foreground">Quiz à venir ici.</p>
              </TabsContent>

              <TabsContent value="connections" className="mt-4 space-y-2">
                {related.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune connexion trouvée via les tags.</p>
                )}
                {related.map((c) => (
                  <Button key={c.id} variant="ghost" className="justify-start w-full px-2" onClick={() => navigate(`/card/${c.id}`)}>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium line-clamp-1">{c.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">{(c.tags || []).slice(0,3).join(', ')}</span>
                    </div>
                  </Button>
                ))}
              </TabsContent>

              <TabsContent value="graph" className="mt-4">
                <ConnectionsGraph card={card} allCards={cards} onSelectCard={(c) => c && navigate(`/card/${c.id}`)} />
              </TabsContent>
            </Tabs>
          </div>

          {showReader && (
            <div className="lg:col-span-5">
              <UICard>
                <CardContent className="pt-6 space-y-4">
                  {renderReader(card)}
                </CardContent>
              </UICard>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Card;

function renderReader(card: CardRow | null) {
  if (!card) return null;
  const isYT = /(?:youtube\.com|youtu\.be)\//i.test(card.url || "");
  if (isYT) {
    const vid = extractYouTubeId(card.url || "");
    return (
      <div className="space-y-4">
        <div className="aspect-video w-full rounded-md overflow-hidden border">
          <iframe
            src={`https://www.youtube.com/embed/${vid}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {card.metadata?.text && (
          <div className="prose prose-invert max-w-none text-sm leading-6 whitespace-pre-wrap">{card.metadata.text}</div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {card.metadata?.image && (
        <img src={card.metadata.image} alt={card.title || "image"} className="w-full rounded-md border" />
      )}
      {card.metadata?.text ? (
        <div className="prose prose-invert max-w-none text-sm leading-6 whitespace-pre-wrap">{card.metadata.text}</div>
      ) : (
        <p className="text-sm text-muted-foreground">No reader content available.</p>
      )}
    </div>
  );
}

function extractYouTubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : "";
}


