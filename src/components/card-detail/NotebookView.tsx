import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Brain, Loader2, Lightbulb, List, Quote, Link2 } from "lucide-react";
import { KnowledgeCard } from "@/lib/storage";

interface NotebookViewProps {
  card: KnowledgeCard;
  isGenerating: boolean;
  onGenerateQuestions: () => void;
  questionsCount: number;
}

interface ParsedNotebook {
  summary: string;
  keyPoints: string[];
  quotes: string[];
  entities: string[];
}

const NotebookView = ({ card, isGenerating, onGenerateQuestions, questionsCount }: NotebookViewProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: true,
    keyPoints: true,
    quotes: false,
    entities: false,
  });

  const notebook = useMemo(() => {
    return parseNotebook(card.summary || '', card.metadata?.text || '');
  }, [card.summary, card.metadata?.text]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3">
        {/* Summary Section */}
        <Collapsible open={openSections.summary} onOpenChange={() => toggleSection('summary')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
            {openSections.summary ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Concise Summary</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 mt-2 bg-muted/30 rounded-lg p-4 border border-border/50">
              <p className="text-sm leading-relaxed text-foreground/90">
                {notebook.summary || 'No summary available yet.'}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Key Points Section */}
        <Collapsible open={openSections.keyPoints} onOpenChange={() => toggleSection('keyPoints')}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
            {openSections.keyPoints ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <List className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Key Points</span>
            <span className="text-xs text-muted-foreground">({notebook.keyPoints.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 mt-2 space-y-2">
              {notebook.keyPoints.length > 0 ? (
                notebook.keyPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-1.5">
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {point}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Key points will be extracted from the content.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Notable Quotes Section */}
        {notebook.quotes.length > 0 && (
          <Collapsible open={openSections.quotes} onOpenChange={() => toggleSection('quotes')}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
              {openSections.quotes ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <Quote className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Notable Quotes</span>
              <span className="text-xs text-muted-foreground">({notebook.quotes.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 mt-2 space-y-2">
                {notebook.quotes.map((quote, idx) => (
                  <div key={idx} className="border-l-2 border-primary/50 pl-3 py-1">
                    <p className="text-sm italic text-foreground/80">"{quote}"</p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Linked Entities Section */}
        {notebook.entities.length > 0 && (
          <Collapsible open={openSections.entities} onOpenChange={() => toggleSection('entities')}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
              {openSections.entities ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <Link2 className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Mentioned Topics</span>
              <span className="text-xs text-muted-foreground">({notebook.entities.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 mt-2 flex flex-wrap gap-2">
                {notebook.entities.map((entity, idx) => (
                  <span 
                    key={idx} 
                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20 cursor-pointer transition-colors"
                  >
                    {entity}
                  </span>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Divider */}
        <div className="border-t border-border my-4" />

        {/* Generate Questions Button */}
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={onGenerateQuestions}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              Generate Review Questions
              {questionsCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({questionsCount} existing)
                </span>
              )}
            </>
          )}
        </Button>
      </div>
    </ScrollArea>
  );
};

function parseNotebook(summaryField: string, fullText: string): ParsedNotebook {
  let summary = '';
  
  // Parse summary from the summary field
  try {
    let jsonStr = summaryField.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    const parsed = JSON.parse(jsonStr);
    summary = parsed.summary || summaryField;
  } catch {
    summary = summaryField;
  }

  // Extract key points from the full text
  const keyPoints: string[] = [];
  const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Take important-looking sentences (those with key indicators)
  const importantPatterns = [
    /important/i, /key/i, /main/i, /essential/i, /critical/i,
    /first/i, /second/i, /third/i, /finally/i,
    /because/i, /therefore/i, /however/i, /conclusion/i,
  ];
  
  for (const sentence of sentences.slice(0, 50)) {
    const trimmed = sentence.trim();
    if (trimmed.length > 30 && trimmed.length < 200) {
      const isImportant = importantPatterns.some(p => p.test(trimmed));
      if (isImportant && keyPoints.length < 5) {
        keyPoints.push(trimmed + '.');
      }
    }
  }

  // If no key points found, take first few substantial sentences
  if (keyPoints.length === 0) {
    for (const sentence of sentences.slice(0, 5)) {
      const trimmed = sentence.trim();
      if (trimmed.length > 40 && trimmed.length < 200) {
        keyPoints.push(trimmed + '.');
      }
    }
  }

  // Extract quotes (text in quotation marks)
  const quoteMatches = fullText.match(/"([^"]{20,150})"/g) || [];
  const quotes = quoteMatches.slice(0, 3).map(q => q.replace(/"/g, ''));

  // Extract entities (capitalized multi-word phrases)
  const entityMatches = fullText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
  const uniqueEntities = [...new Set(entityMatches)].slice(0, 8);

  return {
    summary,
    keyPoints: keyPoints.slice(0, 5),
    quotes,
    entities: uniqueEntities,
  };
}

export default NotebookView;
