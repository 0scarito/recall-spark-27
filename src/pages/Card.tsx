import AppLayout from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadCards as loadLocalCards } from "@/lib/storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent } from "@/components/ui/card";
import ConnectionsGraph from "@/components/ConnectionsGraph";
import { ExternalLink, PanelRightClose, PanelRightOpen } from "lucide-react";

type CardRow = {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  created_at: string;
  content_type?: string;
  url?: string;
  metadata?: { image?: string | null; siteName?: string | null; text?: string | null };
};

const ReaderPane = ({ card }: { card: CardRow | null }) => {
  if (!card) return null;
  const youtubeId = extractYouTubeId(card.url);
  const isPdf = /\.pdf(\?|$)/i.test(card.url || '') || card.content_type === 'pdf';
  return (
    <div className="space-y-3">
      {card.content_type === "youtube" && youtubeId ? (
        <div className="aspect-video w-full rounded-md overflow-hidden border">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : isPdf ? (
        <div className="w-full h-[70vh] rounded-md overflow-hidden border">
          <iframe src={card.url} className="w-full h-full" />
        </div>
      ) : card.metadata?.image ? (
        <img src={card.metadata.image} alt={card.title || ""} className="w-full rounded-md border" />
      ) : null}
      {card.metadata?.text ? (
        <div className="prose prose-invert max-w-none text-sm leading-6 whitespace-pre-wrap">
          {card.metadata.text}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No reader content available.</p>
      )}
    </div>
  );
};

const CardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardRow[]>([]);
  const [showReader, setShowReader] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("notebook");

  useEffect(() => {
    loadLocalCards().then((data) => setCards((data || []) as CardRow[]));
  }, []);

  const card = useMemo(() => cards.find((c) => c.id === id) || null, [cards, id]);

  const related = useMemo(() => {
    if (!card) return [] as CardRow[];
    const tags = Array.isArray(card.tags) ? card.tags : [];
    return cards.filter((c) => c.id !== card.id && Array.isArray(c.tags) && c.tags.some((t) => tags.includes(t)));
  }, [card, cards]);

  return (
    <AppLayout>
      <div className="px-6 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-tight line-clamp-2">{card?.title || "Untitled"}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.isArray(card?.tags) && card!.tags!.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowReader((v) => !v)} title={showReader ? 'Hide reader' : 'Show reader'}>
              {showReader ? (<><PanelRightClose className="w-4 h-4" /></>) : (<><PanelRightOpen className="w-4 h-4" /></>)}
            </Button>
            {card?.url && (
              <Button asChild variant="outline" size="sm">
                <a href={card.url} target="_blank" rel="noreferrer">
                  Open source <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main center content */}
          <div className={showReader ? "lg:col-span-7" : "lg:col-span-12"}>
            <Tabs defaultValue="notebook" className="w-full" onValueChange={(v)=>{ setActiveTab(v); if (v === 'reader') setShowReader(true); }}>
              <TabsList className="w-full flex flex-wrap">
                <TabsTrigger value="reader" className="hidden lg:inline-flex">Reader</TabsTrigger>
                <TabsTrigger value="notebook">Notebook</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="quiz">Quiz</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="graph">Graph</TabsTrigger>
              </TabsList>

              <TabsContent value="reader" className={`mt-4 ${showReader ? 'lg:hidden' : ''}`}>
                <ReaderPane card={card} />
              </TabsContent>

              <TabsContent value="notebook" className="mt-4 space-y-4">
                {card?.summary && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{card.summary}</p>
                )}
                {related.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Related</div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {related.map((c) => (
                        <Button key={c.id} variant="ghost" className="justify-start" onClick={() => navigate(`/card/${c.id}`)}>
                          <span className="line-clamp-1">{c.title || c.url || c.id}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <p className="text-sm text-muted-foreground">Chat à venir.</p>
              </TabsContent>

              <TabsContent value="quiz" className="mt-4">
                <p className="text-sm text-muted-foreground">Quiz à venir.</p>
              </TabsContent>

              <TabsContent value="connections" className="mt-4">
                <div className="space-y-2">
                  {related.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune connexion trouvée via les tags.</p>
                  ) : (
                    related.map((c) => (
                      <Button key={c.id} variant="ghost" className="justify-start w-full px-2" onClick={() => navigate(`/card/${c.id}`)}>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium line-clamp-1">{c.title || c.url || c.id}</span>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="graph" className="mt-4">
                <UICard>
                  <CardContent className="pt-6">
                    <ConnectionsGraph card={card} allCards={cards} onSelectCard={(c) => c && navigate(`/card/${c.id}`)} />
                  </CardContent>
                </UICard>
              </TabsContent>
            </Tabs>
          </div>

          {/* Reader right column */}
          <div className={showReader ? "lg:col-span-5" : "hidden lg:block lg:col-span-5"}>
            {showReader && (
              <UICard>
                <CardContent className="pt-4">
                  <ReaderPane card={card} />
                </CardContent>
              </UICard>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CardPage;

function extractYouTubeId(url?: string) {
  if (!url) return "";
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : "";
}


