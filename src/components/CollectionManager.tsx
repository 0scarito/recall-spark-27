import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CollectionManagerProps {
  collections: string[];
  onCreateCollection: (name: string) => void;
  onDeleteCollection: (name: string) => void;
}

const CollectionManager = ({ collections, onCreateCollection, onDeleteCollection }: CollectionManagerProps) => {
  const [newCollectionName, setNewCollectionName] = useState("");
  const [open, setOpen] = useState(false);

  const handleCreate = () => {
    if (!newCollectionName.trim()) {
      toast.error("Please enter a collection name");
      return;
    }
    if (collections.includes(newCollectionName.toLowerCase())) {
      toast.error("Collection already exists");
      return;
    }
    onCreateCollection(newCollectionName.trim());
    setNewCollectionName("");
    toast.success("Collection created");
  };

  const handleDelete = (name: string) => {
    if (confirm(`Delete collection "${name}"? Cards won't be deleted, just uncategorized.`)) {
      onDeleteCollection(name);
      toast.success("Collection deleted");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
          <FolderPlus className="w-4 h-4 mr-2" />
          Manage Collections
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Manage Collections</DialogTitle>
          <DialogDescription>Create and manage your knowledge collections</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="collection-name">New Collection</Label>
            <div className="flex gap-2">
              <Input
                id="collection-name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Enter collection name..."
                className="bg-background text-foreground border-border"
              />
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </div>

          {collections.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Collections</Label>
              <div className="space-y-1">
                {collections.map((col) => (
                  <div key={col} className="flex items-center justify-between p-2 rounded-md bg-background border border-border">
                    <span className="text-sm capitalize">{col}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(col)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionManager;
