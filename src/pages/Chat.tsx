import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const Chat = () => {
  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left sidebar for chat history */}
        <div className="w-64 border-r border-border bg-muted/30 p-4">
          <Button variant="ghost" className="w-full justify-start gap-2 mb-4">
            <MessageSquare className="w-4 h-4" />
            New Chat
          </Button>
          <div className="text-center text-muted-foreground text-sm py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
            No chats yet
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-3xl space-y-8">
            <h2 className="text-center text-3xl font-semibold">Chat with your knowledge base</h2>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                className="w-full rounded-md border border-border bg-background pl-8 pr-4 py-3 text-base"
                placeholder="Chat with your knowledge base"
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;


