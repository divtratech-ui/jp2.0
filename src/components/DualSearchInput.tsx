import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Languages, Loader2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DualSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const DualSearchInput = ({ value, onChange, placeholder, className }: DualSearchInputProps) => {
  const [enTerm, setEnTerm] = useState("");
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const handleEnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enTerm.trim()) return;
    setTranslating(true);
    setTranslation(null);
    try {
      const { data, error } = await supabase.functions.invoke("translate-en-ja", {
        body: { text: enTerm.trim() },
      });
      if (error) throw error;
      const jp = (data?.translation || "").trim();
      if (!jp) {
        toast.error("Could not translate that term");
        return;
      }
      setTranslation(jp);
      onChange(jp);
    } catch (err) {
      console.error("Translate error:", err);
      toast.error("Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className={className}>
      <Tabs defaultValue="jp" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="jp" className="text-xs">日本語 JP</TabsTrigger>
          <TabsTrigger value="en" className="text-xs">
            <Languages className="h-3 w-3 mr-1" />
            EN → JP
          </TabsTrigger>
        </TabsList>
        <TabsContent value="jp" className="mt-2">
          <div className="relative">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "Search..."}
            />
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => onChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TabsContent>
        <TabsContent value="en" className="mt-2 space-y-2">
          <form onSubmit={handleEnSubmit} className="flex gap-2">
            <Input
              value={enTerm}
              onChange={(e) => setEnTerm(e.target.value)}
              placeholder="Type in English..."
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={translating}>
              {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
          {translation && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Filtering by: <span className="font-medium text-foreground">{translation}</span></span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => {
                  setTranslation(null);
                  setEnTerm("");
                  onChange("");
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DualSearchInput;