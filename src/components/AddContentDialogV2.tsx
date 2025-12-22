import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createCard } from "@/lib/storage";
import { Loader2, Link as LinkIcon, Search, FileText, Import, PenLine, Youtube, Podcast, Globe, Video, FileIcon, FileSpreadsheet, Presentation, Music } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AddContentDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialUrl?: string;
}

const SUPPORTED_SOURCES = [
  { icon: Youtube, label: "YouTube Videos/Shorts" },
  { icon: Podcast, label: "Apple and Spotify Podcasts" },
  { icon: Globe, label: "Websites, Articles & Blogs" },
  { icon: Video, label: "Vimeo Videos" },
  { icon: FileText, label: "Online PDFs" },
  { icon: FileSpreadsheet, label: "Google Docs" },
  { icon: Presentation, label: "Google Slides" },
  { icon: Music, label: "TikTok Videos" },
];

const AddContentDialogV2 = ({ open, onOpenChange, onSuccess, initialUrl }: AddContentDialogV2Props) => {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(initialUrl || "");
  const [file, setFile] = useState<File | null>(null);
  const [summaryStyle, setSummaryStyle] = useState<"concise" | "detailed" | "bullet">("concise");
  const [wikiQuery, setWikiQuery] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [activeTab, setActiveTab] = useState("url");

  // Sync initial URL when dialog opens
  if (open && initialUrl && url !== initialUrl) {
    setUrl(initialUrl);
  }

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      const { data: summaryData, error } = await supabase.functions.invoke('summarize-content', {
        body: { url, style: summaryStyle }
      });

      if (error) throw error;
      if (!summaryData) throw new Error('No data returned from summarization');

      const isYouTube = /(?:youtube\.com|youtu\.be)\//i.test(url);
      const isPDF = /\.pdf(\?|$)/i.test(url) || summaryData.contentType === 'pdf';
      const contentType = isPDF ? 'pdf' : (isYouTube ? 'youtube' : 'article');

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

  const handleWikiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wikiQuery.trim()) return;

    setLoading(true);
    try {
      // Use Wikipedia API to search
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) throw new Error('Wikipedia article not found');
      
      const data = await response.json();

      await createCard({
        id: crypto.randomUUID(),
        title: data.title,
        url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiQuery)}`,
        summary: data.extract,
        content_type: 'wiki',
        tags: ['wiki', data.type || 'general'],
        metadata: {
          image: data.thumbnail?.source || null,
          text: data.extract_html || data.extract,
          siteName: 'Wikipedia',
          wikidata_id: data.wikibase_item,
        },
        created_at: new Date().toISOString(),
      });

      toast.success('Wiki article added!');
      setWikiQuery("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error fetching wiki:', error);
      toast.error(error.message || 'Failed to find Wikipedia article');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    setLoading(true);
    try {
      await createCard({
        id: crypto.randomUUID(),
        title: noteTitle,
        summary: noteContent.slice(0, 200),
        content_type: 'note',
        tags: ['note'],
        metadata: {
          text: noteContent,
          siteName: null,
          image: null,
        },
        created_at: new Date().toISOString(),
      });

      toast.success('Note created!');
      setNoteTitle("");
      setNoteContent("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating note:', error);
      toast.error(error.message || 'Failed to create note');
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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">Add Content</DialogTitle>
          <Select value={summaryStyle} onValueChange={(v: any) => setSummaryStyle(v)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">Concise summary</SelectItem>
              <SelectItem value="detailed">Detailed summary</SelectItem>
              <SelectItem value="bullet">Bullet points</SelectItem>
            </SelectContent>
          </Select>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
            <TabsTrigger value="url" className="gap-1.5 text-xs">
              <LinkIcon className="w-3.5 h-3.5" />
              URL
            </TabsTrigger>
            <TabsTrigger value="wiki" className="gap-1.5 text-xs">
              <Search className="w-3.5 h-3.5" />
              Wiki
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5 text-xs">
              <Import className="w-3.5 h-3.5" />
              Import
            </TabsTrigger>
            <TabsTrigger value="note" className="gap-1.5 text-xs">
              <PenLine className="w-3.5 h-3.5" />
              Note
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="url" className="mt-0 space-y-4">
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="url"
                    placeholder="Paste a URL here"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-12 text-base bg-muted/30"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">Supports</p>
                  <div className="space-y-1">
                    {SUPPORTED_SOURCES.map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-3 py-1.5 text-sm text-muted-foreground">
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="wiki" className="mt-0 space-y-4">
              <form onSubmit={handleWikiSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Wikipedia</Label>
                  <Input
                    placeholder="e.g., Albert Einstein, Machine Learning, Tokyo"
                    value={wikiQuery}
                    onChange={(e) => setWikiQuery(e.target.value)}
                    className="h-12 text-base bg-muted/30"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Search for people, places, concepts, movies, or anything on Wikipedia
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {["People", "Places", "Movies", "Concepts"].map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => setWikiQuery(type === "People" ? "Albert Einstein" : type === "Places" ? "Tokyo" : type === "Movies" ? "The Matrix" : "Artificial Intelligence")}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="pdf" className="mt-0 space-y-4">
              <form onSubmit={handleFileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload PDF or Image</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      disabled={loading}
                      className="cursor-pointer"
                    />
                    {file && (
                      <p className="mt-2 text-sm text-muted-foreground">{file.name}</p>
                    )}
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="import" className="mt-0 space-y-4">
              <div className="text-center py-8">
                <Import className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Import from external services coming soon</p>
                <p className="text-xs text-muted-foreground mt-2">Notion, Pocket, Instapaper, Readwise</p>
              </div>
            </TabsContent>

            <TabsContent value="note" className="mt-0 space-y-4">
              <form onSubmit={handleNoteSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Note title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="bg-muted/30"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Write your note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="min-h-[150px] bg-muted/30"
                    disabled={loading}
                  />
                </div>
              </form>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t border-border flex-shrink-0">
          <kbd className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">ctrl+K</kbd>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button 
              onClick={(e) => {
                if (activeTab === "url") handleUrlSubmit(e as any);
                else if (activeTab === "wiki") handleWikiSearch(e as any);
                else if (activeTab === "pdf") handleFileSubmit(e as any);
                else if (activeTab === "note") handleNoteSubmit(e as any);
              }}
              disabled={loading || (activeTab === "url" && !url.trim()) || (activeTab === "wiki" && !wikiQuery.trim()) || (activeTab === "pdf" && !file) || (activeTab === "note" && !noteTitle.trim())}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialogV2;
