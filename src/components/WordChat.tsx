import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WordChatProps {
  word: string;
  reading?: string;
  meanings: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const WordChat = ({ word, reading, meanings }: WordChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("word-chat", {
        body: { word, reading, meanings, messages: next },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      console.error("word-chat error:", err);
      toast.error(err.message || "Failed to get response");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <h4 className="font-semibold text-sm">Ask AI about this word:</h4>
      {messages.length > 0 && (
        <ScrollArea className="h-[240px] pr-3">
          <div className="space-y-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded text-sm ${
                  m.role === "user" ? "bg-primary/10 ml-6" : "bg-muted mr-6"
                }`}
              >
                <div className="text-xs font-semibold mb-1">
                  {m.role === "user" ? "You" : "AI"}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </ScrollArea>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask how to use this word..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()} size="icon">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default WordChat;
