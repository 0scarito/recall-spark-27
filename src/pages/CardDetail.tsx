import AppLayout from "@/components/AppLayout";
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadCards, KnowledgeCard } from "@/lib/storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Share, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import ConnectionsGraph from "@/components/ConnectionsGraph";
import { ScrollArea } from "@/components/ui/scroll-area";

const extractYouTubeId = (url?: string) => {
  if (!url) return "";
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
};

const CardDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    loadCards().then(setCards);
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

  const readingTime = Math.ceil((card.metadata?.text?.split(' ').length || 0) / 200);

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Panel - Summary & Tabs */}
        <div className="w-[400px] border-r border-border bg-background flex flex-col">
          {/* Video Thumbnail with Title Overlay */}
          <div className="relative h-48 bg-black flex-shrink-0">
            {card.metadata?.image && (
              <img 
                src={card.metadata.image} 
                alt={card.title} 
                className="w-full h-full object-cover opacity-60"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h1 className="text-white text-lg font-semibold line-clamp-2 mb-2">
                {card.title}
              </h1>
              {card.url && (
                <div className="flex items-center gap-1 text-xs text-white/90">
                  <div className="w-4 h-4 bg-red-600 rounded-sm flex items-center justify-center text-[10px] font-bold">
                    ▶
                  </div>
                  <span>{new URL(card.url).hostname.replace('www.', '')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            {card.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full">
                {tag}
              </Badge>
            ))}
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full">
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="notebook" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="notebook" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Notebook
              </TabsTrigger>
              <TabsTrigger 
                value="chat"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger 
                value="quiz"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Quiz
              </TabsTrigger>
              <TabsTrigger 
                value="connections"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Connections
              </TabsTrigger>
              <TabsTrigger 
                value="graph"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Graph
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="notebook" className="p-4 space-y-4 m-0">
                {/* Concise Summary Button */}
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSummary(!showSummary)}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Concise summary
                </Button>

                {/* Summary Sections */}
                {card.summary && (
                  <div className="space-y-6">
                    {parseSummaryToSections(card.summary).map((section, idx) => (
                      <div key={idx}>
                        <h3 className="font-semibold text-base mb-3">{section.title}</h3>
                        <ul className="space-y-2">
                          {section.points.map((point, pidx) => (
                            <li key={pidx} className="text-sm text-muted-foreground leading-relaxed">
                              • {point.text}
                              {point.timestamp && (
                                <span className="ml-2 text-xs opacity-70">{point.timestamp}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="chat" className="p-4 m-0">
                <p className="text-sm text-muted-foreground">Chat feature coming soon</p>
              </TabsContent>

              <TabsContent value="quiz" className="p-4 m-0">
                <p className="text-sm text-muted-foreground">Quiz feature coming soon</p>
              </TabsContent>

              <TabsContent value="connections" className="p-4 m-0">
                <p className="text-sm text-muted-foreground">Connections feature coming soon</p>
              </TabsContent>

              <TabsContent value="graph" className="p-4 m-0">
                <ConnectionsGraph 
                  card={card} 
                  allCards={cards}
                  onSelectCard={(c) => navigate(`/card/${c.id}`)}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Right Panel - Reader */}
        <div className="flex-1 flex flex-col">
          {/* Reader Header */}
          <div className="h-14 border-b border-border px-6 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-medium">Reader</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="ghost" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
              {card.url && (
                <Button variant="ghost" size="icon" asChild>
                  <a href={card.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Reader Content */}
          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
              {readingTime > 0 && (
                <p className="text-sm text-muted-foreground">{readingTime} mins</p>
              )}
              
              <h1 className="text-3xl font-bold">{card.title}</h1>

              {card.metadata?.text ? (
                <div className="prose prose-invert max-w-none">
                  {parseTranscript(card.metadata.text)}
                </div>
              ) : (
                <p className="text-muted-foreground">No content available</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </AppLayout>
  );
};

// Helper to parse summary into sections with timestamps
function parseSummaryToSections(summary: string) {
  const lines = summary.split('\n').filter(l => l.trim());
  const sections: Array<{ title: string; points: Array<{ text: string; timestamp?: string }> }> = [];
  
  let currentSection: any = null;
  
  for (const line of lines) {
    // Check if it's a section header (usually starts with capital or is short)
    if (line.length < 50 && !line.startsWith('•') && !line.startsWith('-')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.trim(), points: [] };
    } else if (currentSection) {
      // Extract timestamp if present (format: MM:SS)
      const timestampMatch = line.match(/(\d{1,2}:\d{2})/);
      const text = line.replace(/^[•\-]\s*/, '').replace(/\d{1,2}:\d{2}/, '').trim();
      currentSection.points.push({
        text,
        timestamp: timestampMatch ? timestampMatch[1] : undefined
      });
    }
  }
  
  if (currentSection) sections.push(currentSection);
  
  return sections.length > 0 ? sections : [{ title: 'Summary', points: [{ text: summary }] }];
}

// Helper to parse and render transcript with timestamps
function parseTranscript(text: string) {
  const lines = text.split('\n');
  
  return (
    <div className="space-y-4">
      {lines.map((line, idx) => {
        // Check for timestamp pattern (MM:SS)
        const timestampMatch = line.match(/^(\d{1,2}:\d{2})\s*(.+)$/);
        
        if (timestampMatch) {
          const [, timestamp, content] = timestampMatch;
          return (
            <p key={idx} className="text-sm leading-relaxed">
              <span className="text-muted-foreground mr-2 font-mono text-xs">{timestamp}</span>
              {content}
            </p>
          );
        }
        
        return line.trim() ? (
          <p key={idx} className="text-sm leading-relaxed">{line}</p>
        ) : null;
      })}
    </div>
  );
}

export default CardDetail;
