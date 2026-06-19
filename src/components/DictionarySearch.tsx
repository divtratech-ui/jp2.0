import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Languages, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface DictionarySearchProps {
  onSearch: (results: any) => void;
  onLoading: (loading: boolean) => void;
}

const DictionarySearch = ({ onSearch, onLoading }: DictionarySearchProps) => {
  const [jpTerm, setJpTerm] = useState("");
  const [enTerm, setEnTerm] = useState("");
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const runSearch = async (keyword: string) => {
    onLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("jisho-search", {
        body: { keyword },
      });
      if (error) throw error;
      onSearch(data);
      if (!data?.data || data.data.length === 0) {
        toast({ title: "No results", description: "No results found for this search term" });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Failed to search dictionary. Please try again.",
        variant: "destructive",
      });
    } finally {
      onLoading(false);
    }
  };

  const handleJpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jpTerm.trim()) {
      toast({ title: "Empty search", description: "Please enter a word to search", variant: "destructive" });
      return;
    }
    runSearch(jpTerm.trim());
  };

  const handleEnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enTerm.trim()) {
      toast({ title: "Empty search", description: "Please enter an English word", variant: "destructive" });
      return;
    }
    setTranslating(true);
    setTranslation(null);
    try {
      const { data, error } = await supabase.functions.invoke("translate-en-ja", {
        body: { text: enTerm.trim() },
      });
      if (error) throw error;
      const jp = (data?.translation || "").trim();
      if (!jp) {
        toast({ title: "Translation failed", description: "Could not translate that term", variant: "destructive" });
        return;
      }
      setTranslation(jp);
      await runSearch(jp);
    } catch (err) {
      console.error("Translate error:", err);
      toast({ title: "Translation failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs defaultValue="jp" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jp">日本語 Japanese</TabsTrigger>
          <TabsTrigger value="en">
            <Languages className="h-4 w-4 mr-2" />
            English → Japanese
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jp">
          <form onSubmit={handleJpSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search for Japanese words..."
              value={jpTerm}
              onChange={(e) => setJpTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="en">
          <form onSubmit={handleEnSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Type in English (e.g. cat, to eat, beautiful)..."
              value={enTerm}
              onChange={(e) => setEnTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={translating}>
              {translating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Translate & Search
            </Button>
          </form>
          {translation && (
            <p className="text-sm text-muted-foreground mt-2">
              Translated to: <span className="font-medium text-foreground">{translation}</span>
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DictionarySearch;
