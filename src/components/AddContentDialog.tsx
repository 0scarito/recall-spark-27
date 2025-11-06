import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createCard } from "@/lib/storage";
import { getApiUrl } from "@/lib/api";
import { Loader2, Link as LinkIcon, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialUrl?: string;
}

const AddContentDialog = ({ open, onOpenChange, onSuccess, initialUrl }: AddContentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Sync initial URL when dialog opens or prop changes
  if (open && initialUrl && url !== initialUrl) {
    setUrl(initialUrl);
  }

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
      try {
        const endpoint = getApiUrl('/api/fetch-summarize');
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        if (!res.ok) {
          const html = await res.text();
          throw new Error(`Summarize failed (${res.status}). ${html.slice(0, 200)}`);
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const html = await res.text();
          throw new Error(`Unexpected response (not JSON). ${html.slice(0, 200)}`);
        }
        const summaryData = await res.json();

      const isYouTube = /(?:youtube\.com|youtu\.be)\//i.test(url);
      const isPDF = /\.pdf(\?|$)/i.test(url) || summaryData.contentType === 'pdf';
      const contentType = isPDF ? 'pdf' : (isYouTube ? 'youtube' : 'article');

      // Extract YouTube thumbnail
      let thumbnailImage = null;
       if (isYouTube) {
         const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (match) {
          thumbnailImage = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
        }
      }

      await createCard({
        id: crypto.randomUUID(),
        title: summaryData.title,
        url,
        summary: summaryData.summary,
        content_type: contentType,
        tags: Array.isArray(summaryData.tags) ? summaryData.tags : [],
         metadata: {
          image: thumbnailImage || summaryData.meta?.ogImage || summaryData.meta?.favicon || null,
          siteName: summaryData.meta?.siteName || null,
          text: summaryData.text || null,
        },
        created_at: new Date().toISOString(),
      });

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

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-file', {
        body: { 
          fileName: file.name,
          fileType: file.type,
          fileData: await fileToBase64(file)
        }
      });

      if (error) throw error;

      await createCard({
        id: crypto.randomUUID(),
        title: data.title,
        summary: data.summary,
        content_type: file.type.startsWith('image/') ? 'image' : 'pdf',
        tags: data.tags || [],
        metadata: {
          image: data.image || null,
          text: data.text || null,
          siteName: null,
        },
        created_at: new Date().toISOString(),
      });

      toast.success('File analyzed and added!');
      setFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error analyzing file:', error);
      toast.error(error.message || 'Failed to analyze file');
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Content</DialogTitle>
          <DialogDescription>
            Add content from URL or upload files (images, PDFs) for AI analysis
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="file">File Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="space-y-4 mt-4">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
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
                    Analyzing...
                  </>
                ) : (
                  'Analyze & Add'
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="file" className="space-y-4 mt-4">
            <form onSubmit={handleFileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Upload File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={loading}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported: Images (JPG, PNG, WEBP) and PDFs
                </p>
              </div>
              <Button type="submit" disabled={loading || !file} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze & Add'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;