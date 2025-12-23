import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import KnowledgeCard from "./KnowledgeCard";
import { Badge } from "@/components/ui/badge";

interface DraggableCardProps {
  card: any;
  onClick: () => void;
  selectionEnabled?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  category?: string;
}

const DraggableCard = ({ 
  card, 
  onClick, 
  selectionEnabled = false, 
  selected = false, 
  onToggleSelect,
  category,
}: DraggableCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
      {/* Selection checkbox - appears on hover, stays visible when selected */}
      <button
        type="button"
        onClick={(e) => { 
          e.stopPropagation(); 
          e.preventDefault();
          onToggleSelect && onToggleSelect(card.id); 
        }}
        className={`absolute z-10 top-3 left-3 w-5 h-5 rounded border-2 transition-all duration-150 flex items-center justify-center ${
          selected 
            ? 'bg-primary border-primary opacity-100 scale-100' 
            : 'bg-background/80 border-muted-foreground/40 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
        }`}
        aria-pressed={selected}
        title={selected ? 'Deselect' : 'Select'}
      >
        {selected && (
          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Category badge - single tag */}
      {category && (
        <div className="absolute top-3 right-3 z-10">
          <Badge 
            variant="secondary" 
            className="text-[10px] px-2 py-0.5 bg-background/80 backdrop-blur-sm"
          >
            {category}
          </Badge>
        </div>
      )}

      <KnowledgeCard
        title={card.title}
        summary={card.summary}
        url={card.url}
        tags={[]} 
        contentType={card.content_type}
        createdAt={card.created_at}
        onClick={onClick}
        thumbnail={card.content_type === 'youtube' ? (function(){
          const m = (card.url || '').match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
          return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : (card.metadata?.image || undefined);
        })() : (card?.metadata?.image || undefined)}
      />
    </div>
  );
};

export default DraggableCard;

