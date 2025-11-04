import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface CardDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: any | null;
}

const CardDetailDrawer = ({ open, onOpenChange, card }: CardDetailDrawerProps) => {
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
        {card?.summary && (
          <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{card.summary}</p>
        )}
        {Array.isArray(card?.tags) && card!.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {card!.tags.map((t: string, idx: number) => (
              <Badge key={idx} variant="outline">{t}</Badge>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CardDetailDrawer;


