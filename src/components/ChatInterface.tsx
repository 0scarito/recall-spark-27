import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

const ChatInterface = () => {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col h-full px-6 py-6">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-3xl font-semibold mb-8">Chat with your knowledge base</div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              className="w-full rounded-md border border-border bg-background pl-8 pr-4 py-3 text-base"
              placeholder="Chat with your knowledge base"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

