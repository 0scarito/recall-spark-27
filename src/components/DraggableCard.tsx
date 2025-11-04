import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import KnowledgeCard from "./KnowledgeCard";

interface DraggableCardProps {
  card: any;
  onClick: () => void;
}

const DraggableCard = ({ card, onClick }: DraggableCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

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
      />
    </div>
  );
};

export default DraggableCard;
