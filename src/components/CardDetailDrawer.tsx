import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import ConnectionsGraph from "./ConnectionsGraph";

interface CardDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: any | null;
  allCards?: any[];
  onSelectCard?: (card: any) => void;
}

const CardDetailDrawer = ({ open, onOpenChange, card, allCards = [], onSelectCard }: CardDetailDrawerProps) => {
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

        <Tabs defaultValue="notebook" className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="notebook">Notebook</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
          </TabsList>

          <TabsContent value="notebook" className="mt-4">
            {card?.summary && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{card.summary}</p>
            )}
            {Array.isArray(card?.tags) && card!.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {card!.tags.map((t: string, idx: number) => (
                  <Badge key={idx} variant="outline">{t}</Badge>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <p className="text-sm text-muted-foreground">Chat à venir ici.</p>
          </TabsContent>

          <TabsContent value="quiz" className="mt-4">
            <p className="text-sm text-muted-foreground">Quiz à venir ici.</p>
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


