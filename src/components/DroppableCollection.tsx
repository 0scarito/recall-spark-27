import { useDroppable } from "@dnd-kit/core";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { ChevronDown } from "lucide-react";

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
    <div ref={setNodeRef}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={`text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
          isOver ? "bg-sidebar-accent/50 ring-2 ring-primary" : ""
        }`}
      >
        <button onClick={onClick} className="w-full text-left capitalize">
          <ChevronDown className="w-4 h-4" />
          {collectionName}
        </button>
      </SidebarMenuButton>
    </div>
  );
};

export default DroppableCollection;
