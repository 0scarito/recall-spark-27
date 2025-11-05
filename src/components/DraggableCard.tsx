import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import KnowledgeCard from "./KnowledgeCard";

interface DraggableCardProps {
  card: any;
  onClick: () => void;
}

const DraggableCard = ({ card, onClick }: DraggableCardProps) => {
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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

