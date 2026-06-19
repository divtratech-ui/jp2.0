import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Bookmark, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import WordChat from "./WordChat";
import ListenButton from "./listenbutton";

interface KanjiEntryProps {
  kanji: string;
  reading: string;
  meanings: string[];
  examples: Array<{
    japanese: string;
    reading?: string;
    english: string;
  }>;
}

const KanjiEntry = ({ kanji, reading, meanings, examples }: KanjiEntryProps) => {
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [aiExamples, setAiExamples] = useState<Array<{ japanese: string; reading?: string; english: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkBookmark(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkBookmark(session.user.id);
      } else {
        setIsBookmarked(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [kanji]);

  const checkBookmark = async (userId: string) => {
    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('word', kanji)
      .maybeSingle();
    
    setIsBookmarked(!!data);
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error("Please sign in to bookmark words");
      return;
    }

    if (isBookmarked) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('word', kanji);

      if (!error) {
        setIsBookmarked(false);
        toast.success("Bookmark removed");
      }
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          word: kanji,
          reading,
          meanings,
        });

      if (!error) {
        setIsBookmarked(true);
        toast.success("Bookmark added");
      }
    }
  };

  const getAiExplanation = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("explain-word", {
        body: { word: kanji, reading, meanings },
      });

      if (error) throw error;
      
      setAiExplanation(data.explanation);
      setAiExamples(data.examples || []);
      setShowAi(true);
    } catch (error: any) {
      console.error("Error getting AI explanation:", error);
      toast.error(error.message || "Failed to get AI explanation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold">{kanji}</span>
        <span className="text-xl text-muted-foreground">({reading})</span>
        <ListenButton text={kanji} />
      </div>
      
      <div className="space-y-1">
        <h4 className="font-semibold text-sm">Meanings:</h4>
        <p className="text-foreground">{meanings.join(", ")}</p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleBookmark}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          {isBookmarked ? (
            <>
              <BookmarkCheck className="mr-2 h-4 w-4" />
              Bookmarked
            </>
          ) : (
            <>
              <Bookmark className="mr-2 h-4 w-4" />
              Bookmark
            </>
          )}
        </Button>
        {!showAi && (
          <Button
            onClick={getAiExplanation}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Explain
              </>
            )}
          </Button>
        )}
      </div>

      {showAi && (
        <>
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="font-semibold text-sm">AI Explanation:</h4>
            <p className="text-sm text-foreground">{aiExplanation}</p>
          </div>

          {aiExamples.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="font-semibold text-sm">Example Sentences:</h4>
              {aiExamples.map((example, idx) => (
                <div key={idx} className="text-sm space-y-1 bg-muted/30 p-2 rounded">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{example.japanese}</p>
                    <ListenButton text={example.japanese} size="sm" />
                  </div>
                  {example.reading && (
                    <p className="text-xs text-muted-foreground">{example.reading}</p>
                  )}
                  <p className="text-muted-foreground">{example.english}</p>
                </div>
              ))}
            </div>
          )}

          <WordChat word={kanji} reading={reading} meanings={meanings} />
        </>
      )}
    </div>
  );
};

export default KanjiEntry;
