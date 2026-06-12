import { Button } from "@/components/ui/button";
import { Pin, Trash2, X, FolderPlus } from "lucide-react";

interface SelectionBannerProps {
  count: number;
  onPin: () => void;
  onDelete: () => void;
  onClear: () => void;
  onMoveToCollection?: () => void;
}

const SelectionBanner = ({ count, onPin, onDelete, onClear, onMoveToCollection }: SelectionBannerProps) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-full shadow-lg">
        <span className="text-sm font-medium text-foreground">
          {count} selected
        </span>
        <div className="w-px h-4 bg-border" />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs gap-1.5"
          onClick={onPin}
        >
          <Pin className="w-3.5 h-3.5" />
          Pin
        </Button>
        {onMoveToCollection && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5"
            onClick={onMoveToCollection}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Move
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs gap-1.5 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
        <div className="w-px h-4 bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClear}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default SelectionBanner;
