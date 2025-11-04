import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";

const Chat = () => {
  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
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
    </AppLayout>
  );
};

export default Chat;


