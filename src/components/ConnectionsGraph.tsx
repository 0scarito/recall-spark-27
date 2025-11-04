import { useMemo } from "react";

interface ConnectionsGraphProps {
  card: any | null;
  allCards: any[];
  onSelectCard?: (card: any) => void;
}

type GraphNode = {
  id: string;
  label: string;
  type: "card" | "tag";
};

type GraphEdge = {
  source: string;
  target: string;
};

// Very lightweight SVG graph: tags as hex around, related cards around, current card center
const ConnectionsGraph = ({ card, allCards, onSelectCard }: ConnectionsGraphProps) => {
  const { nodes, edges } = useMemo(() => {
    if (!card) return { nodes: [], edges: [] } as { nodes: GraphNode[]; edges: GraphEdge[] };
    const center: GraphNode = { id: card.id, label: card.title, type: "card" };
    const tags: string[] = Array.isArray(card.tags) ? card.tags : [];

    const tagNodes: GraphNode[] = tags.map((t) => ({ id: `tag:${t}`, label: t, type: "tag" }));

    const relatedCards = allCards.filter(
      (c) => c.id !== card.id && Array.isArray(c.tags) && c.tags.some((t: string) => tags.includes(t))
    );

    const relatedNodes: GraphNode[] = relatedCards.map((c) => ({ id: c.id, label: c.title, type: "card" }));

    const tagEdges: GraphEdge[] = tagNodes.map((t) => ({ source: center.id, target: t.id }));

    const crossEdges: GraphEdge[] = [];
    for (const rc of relatedCards) {
      crossEdges.push({ source: center.id, target: rc.id });
      const shared = rc.tags.filter((t: string) => tags.includes(t));
      for (const s of shared) {
        crossEdges.push({ source: `tag:${s}`, target: rc.id });
      }
    }

    return { nodes: [center, ...tagNodes, ...relatedNodes], edges: [...tagEdges, ...crossEdges] };
  }, [card, allCards]);

  if (!card) return null;

  const size = 520;
  const centerX = size / 2;
  const centerY = 220;

  // layout: place tags in inner circle, related cards in outer circle
  const tagNodes = nodes.filter((n) => n.type === "tag");
  const relatedNodes = nodes.filter((n) => n.type === "card" && n.id !== card.id);

  const tagPositions = new Map<string, { x: number; y: number }>();
  const relatedPositions = new Map<string, { x: number; y: number }>();

  const innerR = 120;
  const outerR = 200;

  tagNodes.forEach((n, i) => {
    const angle = (i / Math.max(1, tagNodes.length)) * Math.PI * 2;
    tagPositions.set(n.id, { x: centerX + innerR * Math.cos(angle), y: centerY + innerR * Math.sin(angle) });
  });

  relatedNodes.forEach((n, i) => {
    const angle = (i / Math.max(1, relatedNodes.length)) * Math.PI * 2;
    relatedPositions.set(n.id, { x: centerX + outerR * Math.cos(angle), y: centerY + outerR * Math.sin(angle) });
  });

  const getPos = (id: string) => {
    if (id === card.id) return { x: centerX, y: centerY };
    if (tagPositions.has(id)) return tagPositions.get(id)!;
    if (relatedPositions.has(id)) return relatedPositions.get(id)!;
    return { x: centerX, y: centerY };
  };

  const renderNode = (n: GraphNode) => {
    const { x, y } = getPos(n.id);
    if (n.type === "card") {
      return (
        <g key={n.id} transform={`translate(${x}, ${y})`}>
          <circle r={18} className="fill-primary/10 stroke-primary" />
          <text textAnchor="middle" dy={34} className="text-[10px] fill-foreground opacity-80">
            {n.label.slice(0, 28)}
          </text>
          <a onClick={() => onSelectCard && n.id !== card.id && onSelectCard(allCards.find((c) => c.id === n.id))}>
            <circle r={18} className="fill-transparent cursor-pointer" />
          </a>
        </g>
      );
    }
    return (
      <g key={n.id} transform={`translate(${x}, ${y})`}>
        <rect x={-16} y={-16} width={32} height={32} rx={6} className="fill-secondary/30 stroke-secondary" />
        <text textAnchor="middle" dy={34} className="text-[10px] fill-foreground opacity-80">
          {n.label}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-[360px]">
        {edges.map((e, i) => {
          const s = getPos(e.source);
          const t = getPos(e.target);
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} className="stroke-muted-foreground/30" />;
        })}
        {nodes.map(renderNode)}
      </svg>
      <p className="text-xs text-muted-foreground mt-2">
        Les cartes sont reliées via les tags partagés; cliquez sur un nœud carte pour ouvrir son détail.
      </p>
    </div>
  );
};

export default ConnectionsGraph;


