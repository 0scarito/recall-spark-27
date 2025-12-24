import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createCard } from "@/lib/storage";
import { Loader2, Link as LinkIcon, Search, FileText, Import, PenLine, Youtube, Podcast, Globe, Video, FileIcon, Instagram, Mic, Music } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/lib/categories";

interface AddContentDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialUrl?: string;
}

const SUPPORTED_SOURCES = [
  { icon: Youtube, label: "YouTube Videos/Shorts" },
  { icon: Instagram, label: "Instagram Reels" },
  { icon: Podcast, label: "Apple and Spotify Podcasts" },
  { icon: Globe, label: "Websites, Articles & Blogs" },
  { icon: Video, label: "Vimeo Videos" },
  { icon: Music, label: "TikTok Videos" },
];

const AddContentDialogV2 = ({ open, onOpenChange, onSuccess, initialUrl }: AddContentDialogV2Props) => {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(initialUrl || "");
  const [file, setFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [summaryStyle, setSummaryStyle] = useState<"concise" | "detailed" | "bullet">("concise");
  const [selectedCategory, setSelectedCategory] = useState<string>("Other");
  const [wikiQuery, setWikiQuery] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [activeTab, setActiveTab] = useState("url");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Sync initial URL when dialog opens
  if (open && initialUrl && url !== initialUrl) {
    setUrl(initialUrl);
  }

  const detectContentType = (url: string): string => {
    if (/(?:youtube\.com|youtu\.be)\//i.test(url)) return 'youtube';
    if (/instagram\.com\/(?:reel|p)\//i.test(url)) return 'instagram';
    if (/tiktok\.com/i.test(url)) return 'tiktok';
    if (/vimeo\.com/i.test(url)) return 'vimeo';
    if (/\.pdf(\?|$)/i.test(url)) return 'pdf';
    if (/spotify\.com|podcasts\.apple\.com/i.test(url)) return 'podcast';
    return 'article';
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      const contentType = detectContentType(url);
      
      const { data: summaryData, error } = await supabase.functions.invoke('summarize-content', {
        body: { url, style: summaryStyle, category: selectedCategory }
      });

      if (error) throw error;
      if (!summaryData) throw new Error('No data returned from summarization');

      let thumbnailImage = null;
      if (contentType === 'youtube') {
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
        tags: [selectedCategory], // Single category tag
        metadata: {
          image: thumbnailImage || summaryData.meta?.ogImage || summaryData.meta?.favicon || null,
          siteName: summaryData.meta?.siteName || null,
          text: summaryData.text || null,
          transcriptSource: summaryData.meta?.transcriptSource,
          hasFullTranscript: summaryData.meta?.hasFullTranscript,
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
        tags: [selectedCategory],
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

  const handleAudioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) return;

    setLoading(true);
    try {
      const base64Audio = await fileToBase64(audioFile);
      
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64Audio.split(',')[1], // Remove data URL prefix
          fileName: audioFile.name,
        }
      });

      if (error) throw error;

      await createCard({
        id: crypto.randomUUID(),
        title: data.title || audioFile.name.replace(/\.[^/.]+$/, ""),
        summary: data.summary,
        content_type: 'audio',
        tags: [selectedCategory],
        metadata: {
          text: data.transcript || null,
          siteName: null,
          image: null,
        },
        created_at: new Date().toISOString(),
      });

      toast.success('Audio transcribed and added!');
      setAudioFile(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      toast.error(error.message || 'Failed to transcribe audio');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleWikiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wikiQuery.trim()) return;

    setLoading(true);
    try {
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
        tags: [selectedCategory],
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
        tags: [selectedCategory],
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
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between gap-4">
          <DialogTitle className="text-xl">Add Content</DialogTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={summaryStyle} onValueChange={(v: any) => setSummaryStyle(v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="bullet">Bullets</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-6 flex-shrink-0">
            <TabsTrigger value="url" className="gap-1 text-xs">
              <LinkIcon className="w-3.5 h-3.5" />
              URL
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-1 text-xs">
              <Mic className="w-3.5 h-3.5" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="wiki" className="gap-1 text-xs">
              <Search className="w-3.5 h-3.5" />
              Wiki
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-1 text-xs">
              <FileText className="w-3.5 h-3.5" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1 text-xs">
              <Import className="w-3.5 h-3.5" />
              Import
            </TabsTrigger>
            <TabsTrigger value="note" className="gap-1 text-xs">
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
                  <div className="grid grid-cols-2 gap-1">
                    {SUPPORTED_SOURCES.map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="audio" className="mt-0 space-y-4">
              <form onSubmit={handleAudioSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload Audio or Record</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                      disabled={loading || isRecording}
                      className="cursor-pointer"
                    />
                    {audioFile && (
                      <p className="mt-2 text-sm text-muted-foreground">{audioFile.name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <span className="text-sm text-muted-foreground">or</span>
                </div>

                <div className="flex justify-center">
                  {isRecording ? (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={stopRecording}
                      className="gap-2"
                    >
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      Stop Recording
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={startRecording}
                      disabled={loading}
                      className="gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      Record Audio
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Supports MP3, WAV, M4A, WebM, OGG files or direct recording
                </p>
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
                else if (activeTab === "audio") handleAudioSubmit(e as any);
                else if (activeTab === "wiki") handleWikiSearch(e as any);
                else if (activeTab === "pdf") handleFileSubmit(e as any);
                else if (activeTab === "note") handleNoteSubmit(e as any);
              }}
              disabled={loading || (activeTab === "url" && !url.trim()) || (activeTab === "wiki" && !wikiQuery.trim()) || (activeTab === "pdf" && !file) || (activeTab === "audio" && !audioFile) || (activeTab === "note" && !noteTitle.trim())}
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
