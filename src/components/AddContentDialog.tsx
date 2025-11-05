import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Link as LinkIcon } from "lucide-react";

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialUrl?: string;
}

const AddContentDialog = ({ open, onOpenChange, onSuccess, initialUrl }: AddContentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");

  // Sync initial URL when dialog opens or prop changes
  if (open && initialUrl && url !== initialUrl) {
    setUrl(initialUrl);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      // Call edge function to fetch and summarize (server-side, no CORS issues)
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('summarize-content', {
        body: { url }
      });

      if (summaryError) throw summaryError;

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // infer content type (very light)
      const isYouTube = /(?:youtube\.com|youtu\.be)\//i.test(url);
      const contentType = isYouTube ? 'youtube' : 'article';

      const { error: insertError } = await supabase
        .from('knowledge_cards')
        .insert({
          user_id: user.id,
          title: summaryData.title,
          url: url,
          summary: summaryData.summary,
          content_type: contentType,
          tags: Array.isArray(summaryData.tags) ? summaryData.tags : [],
          metadata: {
            image: (isYouTube ? (function(){
              const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
              return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
            })() : null) || summaryData.meta?.ogImage || summaryData.meta?.favicon || null,
            siteName: summaryData.meta?.siteName || null,
            text: summaryData.text || null,
          }
        });

      if (insertError) throw insertError;

      toast.success('Content added successfully!');
      setUrl("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding content:', error);
      toast.error(error.message || 'Failed to add content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Content</DialogTitle>
          <DialogDescription>
            Enter a URL to save and summarize content to your knowledge base
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Content URL</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading || !url.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Add Content'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;