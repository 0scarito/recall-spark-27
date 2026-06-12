import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Share, Copy, ExternalLink, Clock, Play, AlertTriangle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeCard, CardMetadata } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

interface ReaderViewProps {
  card: KnowledgeCard;
  onRefresh?: (updatedCard: Partial<KnowledgeCard>) => void;
}

interface TranscriptSegment {
  timestamp?: string;
  seconds?: number;
  text: string;
  isHeader?: boolean;
}

type TranscriptSource = 'youtube-api' | 'youtubetranscript.com' | 'proxy-api' | 'perplexity-search' | 'none';

const ReaderView = ({ card, onRefresh }: ReaderViewProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const textContent = card.metadata?.text || '';
  const transcriptSource = (card.metadata?.transcriptSource as TranscriptSource) || 
    (textContent.length > 200 ? 'unknown' : 'none');
  const hasFullTranscript = card.metadata?.hasFullTranscript ?? (textContent.length > 200);
  
  // Check if content contains error patterns (indicates failed fetch)
  const hasErrorContent = useMemo(() => {
    const errorPatterns = [
      /sorry.*blocking/i,
      /youtube.*blocking/i,
      /unable.*fetch/i,
      /we're sorry/i,
      /preventing us from/i,
      /working on a fix/i,
    ];
    return errorPatterns.some(pattern => pattern.test(textContent));
  }, [textContent]);
  
  const readingTime = Math.ceil((textContent.split(' ').length || 0) / 200);
  const isYouTube = card.url?.includes('youtube.com') || card.url?.includes('youtu.be');
  
  const segments = useMemo(() => {
    if (!textContent || hasErrorContent) return [];
    return parseContentToSegments(textContent, isYouTube);
  }, [textContent, isYouTube, hasErrorContent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    toast.success('Content copied to clipboard');
  };

  const handleTimestampClick = (seconds?: number) => {
    if (seconds !== undefined && card.url) {
      const baseUrl = card.url.split('&t=')[0].split('?t=')[0];
      const separator = baseUrl.includes('?') ? '&' : '?';
      window.open(`${baseUrl}${separator}t=${seconds}`, '_blank');
    }
  };

  const handleRefresh = async () => {
    if (!card.url) return;
    
    setIsRefreshing(true);
    try {
      toast.info('Re-fetching content...');
      
      const { data, error } = await supabase.functions.invoke('summarize-content', {
        body: { url: card.url }
      });
      
      if (error) throw error;
      
      // Update the card in the database
      const updatedMetadata = {
        ...card.metadata,
        text: data.text || '',
        transcriptSource: data.meta?.transcriptSource || 'none',
        hasFullTranscript: data.meta?.hasFullTranscript || false,
        image: data.meta?.ogImage || card.metadata?.image,
        siteName: data.meta?.siteName || card.metadata?.siteName,
      };
      
      const { error: updateError } = await supabase
        .from('knowledge_cards')
        .update({
          summary: data.summary,
          tags: data.tags,
          metadata: updatedMetadata,
        })
        .eq('id', card.id);
      
      if (updateError) throw updateError;
      
      // Notify parent to refresh card data
      if (onRefresh) {
        onRefresh({
          summary: data.summary,
          tags: data.tags,
          metadata: updatedMetadata as CardMetadata,
        });
      }
      
      if (data.meta?.hasFullTranscript) {
        toast.success('Content refreshed with full transcript!');
      } else if (data.meta?.transcriptSource === 'perplexity-search') {
        toast.success('Content refreshed with web search summary');
      } else {
        toast.success('Content refreshed');
      }
    } catch (err) {
      console.error('Error refreshing content:', err);
      toast.error('Failed to refresh content');
    } finally {
      setIsRefreshing(false);
    }
  };

  const showRefreshButton = isYouTube && (!hasFullTranscript || hasErrorContent);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Reader Header */}
      <div className="h-14 border-b border-border px-6 flex items-center justify-between flex-shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium">Reader</h2>
          {readingTime > 0 && !hasErrorContent && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTime} min read
            </span>
          )}
          {isYouTube && (
            <Badge 
              variant={hasFullTranscript && !hasErrorContent ? "secondary" : "outline"} 
              className="text-xs flex items-center gap-1"
            >
              {hasFullTranscript && !hasErrorContent ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Full transcript
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Web summary
                </>
              )}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showRefreshButton && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Retry
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!textContent || hasErrorContent}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button variant="ghost" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
          {card.url && (
            <Button variant="ghost" size="icon" asChild>
              <a href={card.url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Transcript Warning */}
      {isYouTube && (!hasFullTranscript || hasErrorContent) && (
        <div className="mx-6 mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-600 dark:text-amber-400">Transcript unavailable</p>
            <p className="text-sm text-muted-foreground mt-1">
              YouTube blocked transcript access. The summary was generated using web search information.
            </p>
            <div className="flex gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs"
              >
                {isRefreshing ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Retry fetching
              </Button>
              {card.url && (
                <Button variant="outline" size="sm" asChild className="text-xs">
                  <a href={card.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Watch on YouTube
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reader Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-1">
          <h1 className="text-2xl font-bold mb-6">{card.title}</h1>

          {segments.length > 0 ? (
            <div className="space-y-3">
              {segments.map((segment, idx) => (
                <div key={idx} className="group">
                  {segment.isHeader ? (
                    <h3 className="text-lg font-semibold text-foreground mt-6 mb-2 flex items-center gap-2">
                      {segment.timestamp && (
                        <button
                          onClick={() => handleTimestampClick(segment.seconds)}
                          className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          {segment.timestamp}
                        </button>
                      )}
                      <span>{segment.text}</span>
                    </h3>
                  ) : (
                    <div className="flex gap-3 py-1.5 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
                      {segment.timestamp && (
                        <button
                          onClick={() => handleTimestampClick(segment.seconds)}
                          className="text-xs font-mono text-muted-foreground hover:text-primary shrink-0 w-14 text-left transition-colors"
                        >
                          {segment.timestamp}
                        </button>
                      )}
                      <p className="text-sm leading-relaxed text-foreground/90 flex-1">
                        {segment.text}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {hasErrorContent ? 'Content could not be fetched' : 'No content available'}
              </p>
              <div className="flex gap-2 justify-center">
                {showRefreshButton && (
                  <Button 
                    variant="outline" 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Retry fetching
                  </Button>
                )}
                {card.url && (
                  <Button variant="link" asChild>
                    <a href={card.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View original source
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

function parseContentToSegments(text: string, isYouTube?: boolean): TranscriptSegment[] {
  const lines = text.split('\n').filter(line => line.trim());
  const segments: TranscriptSegment[] = [];

  // Regex patterns for timestamps
  const timestampPatterns = [
    /^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*[-–]?\s*/,  // [0:00] or 0:00 or [00:00:00]
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*[-–]\s*/,         // 0:00 - text
  ];

  for (const line of lines) {
    let timestamp: string | undefined;
    let seconds: number | undefined;
    let cleanText = line.trim();

    // Try to extract timestamp
    for (const pattern of timestampPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const hours = match[3] ? parseInt(match[1]) : 0;
        const mins = match[3] ? parseInt(match[2]) : parseInt(match[1]);
        const secs = match[3] ? parseInt(match[3]) : parseInt(match[2]);
        
        seconds = hours * 3600 + mins * 60 + secs;
        timestamp = hours > 0 
          ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          : `${mins}:${secs.toString().padStart(2, '0')}`;
        cleanText = cleanText.replace(pattern, '').trim();
        break;
      }
    }

    // Detect headers (all caps, short lines, or lines ending with :)
    const isHeader = (
      cleanText.length < 60 && 
      (cleanText === cleanText.toUpperCase() || cleanText.endsWith(':'))
    ) || cleanText.startsWith('#');

    if (cleanText.startsWith('#')) {
      cleanText = cleanText.replace(/^#+\s*/, '');
    }

    if (cleanText) {
      segments.push({
        timestamp: isYouTube ? timestamp : undefined,
        seconds: isYouTube ? seconds : undefined,
        text: cleanText,
        isHeader: isHeader && cleanText.length < 80,
      });
    }
  }

  return segments;
}

export default ReaderView;
