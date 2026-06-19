import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ArrowLeft, Send } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ListenButton from "@/components/listenbutton";
<<<<<<< HEAD
import DualSearchInput from "@/components/DualSearchInput";
=======
>>>>>>> 1ad79e6 (first commit)

const CJK_RE = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/;

interface Bookmark {
  id: string;
  word: string;
  reading: string | null;
  meanings: string[];
}

interface ValidationResult {
  isCorrect: boolean;
  explanation: string;
  correctedSentence: string | null;
  suggestions: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const Exercise = () => {
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [sentence, setSentence] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [bookmarkSearch, setBookmarkSearch] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchBookmarks(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchBookmarks(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchBookmarks = async (userId: string) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarks:', error);
      toast({
        title: "Error",
        description: "Failed to load bookmarks",
        variant: "destructive",
      });
    } else {
      setBookmarks(data || []);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete bookmark",
        variant: "destructive",
      });
    } else {
      setBookmarks(bookmarks.filter(b => b.id !== id));
      if (selectedWord && bookmarks.find(b => b.id === id)?.word === selectedWord) {
        setSelectedWord(null);
      }
      toast({
        title: "Success",
        description: "Bookmark deleted",
      });
    }
  };

  const handleValidate = async () => {
    if (!sentence.trim()) {
      toast({
        title: "Error",
        description: "Please write a sentence first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setValidationResult(null);

    const { data, error } = await supabase.functions.invoke('validate-sentence', {
      body: { sentence, word: selectedWord }
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to validate sentence",
        variant: "destructive",
      });
    } else {
      setValidationResult(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    const conversationHistory = chatMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const { data, error } = await supabase.functions.invoke('exercise-chat', {
      body: {
        message: chatInput,
        sentence,
        validationResult,
        word: selectedWord,
        conversationHistory
      }
    });

    setChatLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } else if (data?.reply) {
      const assistantMessage: ChatMessage = { role: 'assistant', content: data.reply };
      setChatMessages(prev => [...prev, assistantMessage]);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dictionary
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">練習 Practice</h1>
          <p className="text-muted-foreground">Write sentences and get AI feedback</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Bookmarked Words</CardTitle>
              <CardDescription>Select a word to practice with</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bookmarks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookmarks yet. Add some from the dictionary!</p>
              ) : (
                <>
<<<<<<< HEAD
                  <DualSearchInput
                    value={bookmarkSearch}
                    onChange={setBookmarkSearch}
                    placeholder="Search bookmarks..."
=======
                  <Input
                    placeholder="Search bookmarks..."
                    value={bookmarkSearch}
                    onChange={(e) => setBookmarkSearch(e.target.value)}
>>>>>>> 1ad79e6 (first commit)
                  />
                  <div className="space-y-2">
                    {bookmarks
                      .filter((b) => {
                        const q = bookmarkSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          b.word.toLowerCase().includes(q) ||
                          (b.reading || "").toLowerCase().includes(q) ||
                          b.meanings.some((m) => m.toLowerCase().includes(q))
                        );
                      })
                      .map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedWord === bookmark.word
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => setSelectedWord(bookmark.word)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
<<<<<<< HEAD
                              <div className="flex items-center gap-1">
                                <div className="font-medium">{bookmark.word}</div>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <ListenButton text={bookmark.word} size="sm" className="h-6 w-6" />
                                </div>
                              </div>
=======
                              <div className="font-medium">{bookmark.word}</div>
>>>>>>> 1ad79e6 (first commit)
                              {bookmark.reading && (
                                <div className="text-sm text-muted-foreground">{bookmark.reading}</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {bookmark.meanings.slice(0, 2).join(', ')}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBookmark(bookmark.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Write a Sentence</CardTitle>
              <CardDescription>
                {selectedWord 
                  ? `Try using the word "${selectedWord}" in a sentence`
                  : "Write any Japanese sentence for practice"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="あなたの文章をここに書いてください..."
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                className="min-h-[120px] text-lg"
              />
              <Button onClick={handleValidate} disabled={loading} className="w-full">
                {loading ? "Validating..." : "Check My Sentence"}
              </Button>

              {validationResult && (
                <>
                  <div className={`p-4 rounded-lg border space-y-3 ${
                    validationResult.isCorrect 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' 
                      : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`text-lg font-semibold ${
                        validationResult.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {validationResult.isCorrect ? '✓ Correct!' : '✗ Needs Improvement'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm font-medium mb-1">Explanation:</div>
                        <div className="text-sm">{validationResult.explanation}</div>
                      </div>

                      {validationResult.correctedSentence && (
                        <div>
                          <div className="text-sm font-medium mb-1">Corrected Sentence:</div>
                          <div className="text-sm font-medium p-2 bg-background rounded">
                            {validationResult.correctedSentence}
                          </div>
                        </div>
                      )}

                      {validationResult.suggestions && (
                        <div>
                          <div className="text-sm font-medium mb-1">Suggestions:</div>
                          <div className="text-sm">{validationResult.suggestions}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Chat with AI Tutor</CardTitle>
                      <CardDescription>Ask questions about the correction</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ScrollArea className="h-[300px] pr-4">
                        {chatMessages.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-8">
                            Ask the AI tutor questions about your sentence to better understand the corrections.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {chatMessages.map((msg, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg ${
                                  msg.role === 'user'
                                    ? 'bg-primary/10 ml-8'
                                    : 'bg-muted mr-8'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="text-xs font-semibold">
                                    {msg.role === 'user' ? 'You' : 'AI Tutor'}
                                  </div>
                                  {msg.role === 'assistant' && CJK_RE.test(msg.content) && (
                                    <ListenButton text={msg.content} size="sm" />
                                  )}
                                </div>
                                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                              </div>
                            ))}
                            <div ref={chatEndRef} />
                          </div>
                        )}
                      </ScrollArea>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Ask a question about the correction..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleChatSubmit();
                            }
                          }}
                          disabled={chatLoading}
                        />
                        <Button
                          onClick={handleChatSubmit}
                          disabled={chatLoading || !chatInput.trim()}
                          size="icon"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Exercise;
