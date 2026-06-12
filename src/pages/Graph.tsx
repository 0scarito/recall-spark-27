import AppLayout from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { loadCards as loadLocalCards } from "@/lib/storage";
import ConnectionsGraph from "@/components/ConnectionsGraph";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

type CardRow = {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  created_at: string;
  content_type?: string;
  url?: string;
};

const Graph = () => {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadLocalCards().then((data) => {
      setCards(data || []);
      if (!selectedId && data && data.length) setSelectedId(data[0].id);
    });
  }, []);

  const selectedCard = useMemo(() => cards.find((c) => c.id === selectedId) || null, [cards, selectedId]);

  return (
    <AppLayout>
      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Select a card:</div>
          <Select value={selectedId} onValueChange={(v) => setSelectedId(v)}>
            <SelectTrigger className="w-[320px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cards.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title || c.url || c.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="pt-6">
            <ConnectionsGraph card={selectedCard} allCards={cards} onSelectCard={(c) => c && setSelectedId(c.id)} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Graph;


