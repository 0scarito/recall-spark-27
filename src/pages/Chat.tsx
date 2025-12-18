import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const Chat = () => {
  const { 
    messages, 
    conversations,
    currentConversationId,
    sendMessage, 
    isLoading,
    startNewConversation,
    selectConversation,
    deleteConversation,
  } = useChat();
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
    setInputValue("");
  };

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left sidebar for chat history */}
        <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
          <div className="p-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={startNewConversation}
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>
          
          <ScrollArea className="flex-1 px-2">
            {conversations.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                No history yet
              </div>
            ) : (
              <div className="space-y-1 pb-4">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                      currentConversationId === conv.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => selectConversation(conv.id)}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">{conv.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-3xl space-y-8">
                <h2 className="text-center text-3xl font-semibold">Chat with your knowledge base</h2>
                <p className="text-center text-muted-foreground">
                  Ask questions about your saved articles, videos, and notes
                </p>
                <form onSubmit={handleSubmit} className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    className="w-full rounded-md border border-border bg-background pl-8 pr-12 py-3 text-base"
                    placeholder="Ask anything about your saved content..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    disabled={!inputValue.trim() || isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="border-t border-border p-4">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
                  <Input
                    className="w-full rounded-md border border-border bg-background pr-12 py-3 text-base"
                    placeholder="Ask a follow-up question..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    disabled={!inputValue.trim() || isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;
