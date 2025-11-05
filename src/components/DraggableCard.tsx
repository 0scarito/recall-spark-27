import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import KnowledgeCard from "./KnowledgeCard";

interface DraggableCardProps {
  card: any;
  onClick: () => void;
  selectionEnabled?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const DraggableCard = ({ card, onClick, selectionEnabled = false, selected = false, onToggleSelect }: DraggableCardProps) => {
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative">
      {selectionEnabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect && onToggleSelect(card.id); }}
          className={`absolute z-10 top-2 left-2 w-5 h-5 rounded border ${selected ? 'bg-primary border-primary' : 'bg-background border-border'} flex items-center justify-center`}
          aria-pressed={selected}
        >
          {selected && <span className="w-3 h-3 bg-primary-foreground rounded-sm" />}
        </button>
      )}
      <KnowledgeCard
        title={card.title}
        summary={card.summary}
        url={card.url}
        tags={card.tags || []}
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

