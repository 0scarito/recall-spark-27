import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Share, Copy, ExternalLink, Clock, Play, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { KnowledgeCard, CardMetadata } from "@/lib/storage";

interface ReaderViewProps {
  card: KnowledgeCard;
}

interface TranscriptSegment {
  timestamp?: string;
  seconds?: number;
  text: string;
  isHeader?: boolean;
}

type TranscriptSource = 'youtube-api' | 'youtubetranscript.com' | 'proxy-api' | 'perplexity-search' | 'none';

const ReaderView = ({ card }: ReaderViewProps) => {
  const textContent = card.metadata?.text || '';
  const transcriptSource = (card.metadata?.transcriptSource as TranscriptSource) || 
    (textContent.length > 200 ? 'unknown' : 'none');
  const hasFullTranscript = card.metadata?.hasFullTranscript ?? (textContent.length > 200);
  
  const readingTime = Math.ceil((textContent.split(' ').length || 0) / 200);
  const isYouTube = card.url?.includes('youtube.com') || card.url?.includes('youtu.be');
  
  const segments = useMemo(() => {
    if (!textContent) return [];
    return parseContentToSegments(textContent, isYouTube);
  }, [textContent, isYouTube]);

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

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Reader Header */}
      <div className="h-14 border-b border-border px-6 flex items-center justify-between flex-shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium">Reader</h2>
          {readingTime > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTime} min read
            </span>
          )}
          {isYouTube && (
            <Badge 
              variant={hasFullTranscript ? "secondary" : "outline"} 
              className="text-xs flex items-center gap-1"
            >
              {hasFullTranscript ? (
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
          <Button variant="ghost" size="sm" onClick={handleCopy}>
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
      {isYouTube && !hasFullTranscript && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400">Transcript unavailable</p>
            <p className="text-muted-foreground mt-1">
              YouTube blocked transcript access. The summary was generated using web search information.
            </p>
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
              <p className="text-muted-foreground">No content available</p>
              {card.url && (
                <Button variant="link" asChild className="mt-2">
                  <a href={card.url} target="_blank" rel="noreferrer">
                    View original source
                  </a>
                </Button>
              )}
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
