import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, HelpCircle, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KnowledgeCard } from "@/lib/storage";

interface ChatPanelProps {
  card: KnowledgeCard;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ChatPanel = ({ card }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-knowledge', {
        body: {
          message,
          cardId: card.id,
          context: card.metadata?.text || card.summary || '',
          history: messages,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer || data.response || 'Sorry, I could not process that.',
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: Sparkles, label: 'Summarize', prompt: 'Give me a quick summary of this content.' },
    { icon: HelpCircle, label: 'Explain', prompt: 'Explain the main concepts in simple terms.' },
    { icon: FileText, label: 'Key Facts', prompt: 'What are the key facts and takeaways?' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Chat with this content</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ask questions about this {card.content_type || 'content'}
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center py-4">
              Start a conversation about this content
            </p>
            
            {/* Quick Actions */}
            <div className="space-y-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(action.prompt)}
                  className="w-full flex items-center gap-2 p-2 text-left text-sm rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <action.icon className="w-4 h-4 text-primary" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary/10 ml-4'
                    : 'bg-muted/50 mr-4'
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this content..."
            className="flex-1 text-sm"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
