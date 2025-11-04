import { useDroppable } from "@dnd-kit/core";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface DroppableCollectionProps {
  collectionName: string;
  isActive: boolean;
  onClick: () => void;
}

const DroppableCollection = ({ collectionName, isActive, onClick }: DroppableCollectionProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `collection:${collectionName}`,
  });

  return (
    <SidebarMenuButton
      ref={setNodeRef}
      asChild
      isActive={isActive}
      className={cn(
        "w-full text-left",
        isOver && "bg-accent/50"
      )}
    >
      <button onClick={onClick}>
        {collectionName}
      </button>
    </SidebarMenuButton>
  );
};

export default DroppableCollection;

