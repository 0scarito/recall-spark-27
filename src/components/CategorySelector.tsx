import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Plus } from "lucide-react";
import { CATEGORIES, CATEGORY_CONFIG, getCategoryIcon, getCategoryTags, getNonCategoryTags } from "@/lib/categories";
import { updateCardTags } from "@/lib/storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  card: any;
  onUpdate?: () => void;
  trigger?: React.ReactNode;
}

const CategorySelector = ({ card, onUpdate, trigger }: CategorySelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialize selected categories from card tags
  useEffect(() => {
    if (card) {
      const tags = Array.isArray(card.tags) ? card.tags : [];
      const categoryTags = getCategoryTags(tags);
      setSelectedCategories(categoryTags);
    }
  }, [card]);

  const handleToggleCategory = (category: string) => {
    if (category === "All") return; // Don't allow selecting "All"
    
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleSave = async () => {
    if (!card) return;
    
    setSaving(true);
    try {
      const tags = Array.isArray(card.tags) ? card.tags : [];
      const nonCategoryTags = getNonCategoryTags(tags);
      const collectionTags = tags.filter(t => t.startsWith('collection:'));
      const pinnedTags = tags.filter(t => t.startsWith('pinned'));
      
      // Combine non-category tags with selected categories
      const newTags = [...nonCategoryTags, ...selectedCategories, ...collectionTags, ...pinnedTags];
      
      await updateCardTags(card.id, newTags);
      toast.success("Categories updated");
      setOpen(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error("Error updating categories:", error);
      toast.error(error.message || "Failed to update categories");
    } finally {
      setSaving(false);
    }
  };

  const availableCategories = CATEGORIES.filter(c => c !== "All");

  if (!card) return null;

  const defaultTrigger = (
    <Button size="icon" variant="ghost" className="h-5 w-5 rounded-full">
      <Plus className="w-3 h-3" />
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Select Categories</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Choose one or more categories for this card
            </p>
          </div>

          {/* Current categories display */}
          {selectedCategories.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Current:</p>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((cat) => {
                  const Icon = getCategoryIcon(cat);
                  return (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className="text-xs px-2 py-1 flex items-center gap-1.5"
                    >
                      <Icon className="w-3 h-3" />
                      {cat}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category selection */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Available:</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableCategories.map((category) => {
                const Icon = getCategoryIcon(category);
                const isSelected = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleToggleCategory(category)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md text-sm text-left transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center",
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 truncate">{category}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CategorySelector;

