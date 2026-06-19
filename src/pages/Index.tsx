import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DictionarySearch from "@/components/DictionarySearch";
import DictionaryResults from "@/components/DictionaryResults";
import KanaBrowser from "@/components/KanaBrowser";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKana, setSelectedKana] = useState<string | null>("あ");
  const [browseMode, setBrowseMode] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWordsByKana = async (kana: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("jisho-search", {
        body: { keyword: kana },
      });

      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error("Error fetching words:", error);
      toast.error("Failed to load words");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (browseMode && selectedKana) {
      fetchWordsByKana(selectedKana);
    }
  }, [selectedKana, browseMode]);

  const handleKanaSelect = (kana: string) => {
    setSelectedKana(kana);
    setBrowseMode(true);
  };

  const handleSearch = (searchResults: any) => {
    setResults(searchResults);
    setBrowseMode(false);
    setSelectedKana(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end gap-2 mb-4">
          {user ? (
            <>
              <Button onClick={() => navigate("/exercise")} variant="outline">
                練習 Exercise
              </Button>
              <Button onClick={() => navigate("/text-analysis")} variant="outline">
                📝 Text Analysis
              </Button>
              <Button onClick={handleSignOut} variant="ghost">
                Sign Out
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")} variant="outline">
              Sign In
            </Button>
          )}
        </div>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">Japanese Dictionary</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Search for Japanese words, kanji, and kana with examples
          </p>
        </div>

        <DictionarySearch onSearch={handleSearch} onLoading={setIsLoading} />

        <KanaBrowser onSelectKana={handleKanaSelect} selectedKana={selectedKana} />

        {isLoading && (
          <div className="text-center mt-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-muted-foreground">Searching...</p>
          </div>
        )}

        {!isLoading && results && <DictionaryResults results={results} />}
      </div>
    </div>
  );
};

export default Index;
