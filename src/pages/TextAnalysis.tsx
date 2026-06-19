import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Loader2, BookOpen, Trash2, Edit, Save, X } from "lucide-react";
import DictionaryResults from "@/components/DictionaryResults";
import ListenButton from "@/components/listenbutton";
<<<<<<< HEAD
import DualSearchInput from "@/components/DualSearchInput";
=======
>>>>>>> 1ad79e6 (first commit)

const CJK_RE = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/;

const TextAnalysis = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [vocabulary, setVocabulary] = useState<any[]>([]);
  const [vocabSearch, setVocabSearch] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingVocab, setIsLoadingVocab] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  
  const [notes, setNotes] = useState<any[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const saveNote = async () => {
    if (!noteTitle.trim()) {
      toast.error("Please enter a note title");
      return;
    }

    setIsSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to save notes");
        return;
      }

      if (editingNoteId) {
        const { error } = await supabase
          .from("notes")
          .update({
            title: noteTitle,
            content: noteContent,
          })
          .eq("id", editingNoteId);

        if (error) throw error;
        toast.success("Note updated!");
      } else {
        const { error } = await supabase
          .from("notes")
          .insert({
            user_id: user.id,
            title: noteTitle,
            content: noteContent,
          });

        if (error) throw error;
        toast.success("Note saved!");
      }

      setNoteTitle("");
      setNoteContent("");
      setEditingNoteId(null);
      fetchNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const editNote = (note: any) => {
    setNoteTitle(note.title);
    setNoteContent(note.content || "");
    setEditingNoteId(note.id);
  };

  const cancelEdit = () => {
    setNoteTitle("");
    setNoteContent("");
    setEditingNoteId(null);
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Note deleted!");
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const analyzeText = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-text", {
        body: { text },
      });

      if (error) throw error;
      setAnalysis(data.analysis);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Error analyzing text:", error);
      toast.error("Failed to analyze text");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractVocabulary = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text first");
      return;
    }

    setIsLoadingVocab(true);
    setVocabulary([]);

    try {
      const itemsToSearch = new Set<string>();

      // Extract individual kanji characters
      const kanjiMatches = text.match(/[\u4e00-\u9faf]/g) || [];
      kanjiMatches.forEach(kanji => itemsToSearch.add(kanji));

      // Extract kana sequences (words made of hiragana/katakana)
      const kanaSequences = text.match(/[\u3040-\u309f\u30a0-\u30ff]+/g) || [];
      kanaSequences.forEach(seq => {
        // Add the full sequence
        itemsToSearch.add(seq);
        // Also add individual kana characters for particles and single kana
        if (seq.length <= 3) {
          for (const char of seq) {
            itemsToSearch.add(char);
          }
        }
      });

      const vocabResults = [];
      let processedCount = 0;
      
      for (const item of itemsToSearch) {
        const { data, error } = await supabase.functions.invoke("jisho-search", {
          body: { keyword: item },
        });

        processedCount++;
        
        if (!error && data?.data && data.data.length > 0) {
          vocabResults.push(...data.data);
        }

        // Show progress for large texts
        if (processedCount % 10 === 0) {
          toast.info(`Processing... ${processedCount}/${itemsToSearch.size} items`);
        }
      }

      setVocabulary(vocabResults);
      toast.success(`Found ${vocabResults.length} vocabulary items from ${itemsToSearch.size} searches`);
    } catch (error) {
      console.error("Error extracting vocabulary:", error);
      toast.error("Failed to extract vocabulary");
    } finally {
      setIsLoadingVocab(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      setSelectedSentence(selection);
      toast.success("Sentence selected! Ask questions in the AI chat.");
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    if (!text.trim()) {
      toast.error("Please add some text first");
      return;
    }

    const userMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsSendingChat(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-text", {
        body: {
          text,
          selectedSentence: selectedSentence || null,
          messages: [...chatMessages, userMessage],
        },
      });

      if (error) throw error;

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.analysis },
      ]);
    } catch (error) {
      console.error("Error sending chat:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Text Analysis</h1>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">
            Back to Dictionary
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Paste Japanese text or story here
                  </label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onMouseUp={handleTextSelection}
                    placeholder="貼り付けるテキストをここに入力してください..."
                    className="min-h-[200px] font-japanese"
                  />
                </div>
                <Button onClick={analyzeText} disabled={isAnalyzing} className="w-full">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Text"
                  )}
                </Button>
              </div>
            </Card>

            {analysis && (
              <Card className="p-6 mt-6">
                <h2 className="text-xl font-semibold mb-4">Analysis</h2>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{analysis}</p>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-8">
              <Tabs defaultValue="vocabulary" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
                  <TabsTrigger value="chat">AI Chat</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="vocabulary" className="mt-4">
                  <div className="space-y-4">
                    <Button
                      onClick={extractVocabulary}
                      disabled={isLoadingVocab}
                      className="w-full"
                    >
                      {isLoadingVocab ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        "Extract Vocabulary"
                      )}
                    </Button>
                    {vocabulary.length > 0 && (
<<<<<<< HEAD
                      <DualSearchInput
                        value={vocabSearch}
                        onChange={setVocabSearch}
                        placeholder="Search vocabulary..."
=======
                      <Input
                        value={vocabSearch}
                        onChange={(e) => setVocabSearch(e.target.value)}
                        placeholder="Search vocabulary..."
                        className="w-full"
>>>>>>> 1ad79e6 (first commit)
                      />
                    )}
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      {vocabulary.length > 0 ? (
                        <DictionaryResults 
                          results={{ 
                            data: vocabulary.filter(item => {
                              if (!vocabSearch.trim()) return true;
                              const search = vocabSearch.toLowerCase();
                              const word = item.japanese?.[0]?.word?.toLowerCase() || "";
                              const reading = item.japanese?.[0]?.reading?.toLowerCase() || "";
                              const meanings = item.senses?.flatMap((s: any) => s.english_definitions || []).join(" ").toLowerCase() || "";
                              return word.includes(search) || reading.includes(search) || meanings.includes(search);
                            })
                          }} 
                        />
                      ) : (
                        <p className="text-center text-muted-foreground mt-8">
                          No vocabulary extracted yet. Click "Extract Vocabulary" to begin.
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>
                <TabsContent value="chat" className="mt-4">
                  <div className="space-y-4">
                    {selectedSentence && (
                      <Card className="p-3 bg-muted">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-1">
                              Selected sentence:
                            </p>
                            <p className="font-japanese">{selectedSentence}</p>
                          </div>
                          <ListenButton text={selectedSentence} size="sm" />
                        </div>
                      </Card>
                    )}
                    <ScrollArea className="h-[calc(100vh-380px)]">
                      <div className="space-y-4 pr-4">
                        {chatMessages.map((msg, index) => (
                          <Card
                            key={index}
                            className={`p-4 ${
                              msg.role === "user"
                                ? "bg-primary/10 ml-4"
                                : "bg-muted mr-4"
                            }`}
                          >
                            {msg.role === "assistant" && CJK_RE.test(msg.content) && (
                              <div className="flex justify-end mb-1">
                                <ListenButton text={msg.content} size="sm" />
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendChatMessage();
                          }
                        }}
                        placeholder="Ask questions about the text..."
                        className="min-h-[60px]"
                      />
                      <Button
                        onClick={sendChatMessage}
                        disabled={isSendingChat}
                        size="icon"
                      >
                        {isSendingChat ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="notes" className="mt-4">
                  <div className="space-y-4">
                    <Card className="p-4">
                      <div className="space-y-3">
                        <Input
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Note title..."
                          className="font-medium"
                        />
                        <Textarea
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="What did you learn?..."
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={saveNote}
                            disabled={isSavingNote}
                            className="flex-1"
                          >
                            {isSavingNote ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                {editingNoteId ? "Update Note" : "Save Note"}
                              </>
                            )}
                          </Button>
                          {editingNoteId && (
                            <Button onClick={cancelEdit} variant="outline">
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                    <ScrollArea className="h-[calc(100vh-480px)]">
                      <div className="space-y-3 pr-4">
                        {notes.length > 0 ? (
                          notes.map((note) => (
                            <Card key={note.id} className="p-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-semibold">{note.title}</h3>
                                  <div className="flex gap-1">
                                    <Button
                                      onClick={() => editNote(note)}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => deleteNote(note.id)}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                {note.content && (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {note.content}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(note.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </Card>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground mt-8">
                            No notes yet. Start taking notes about what you learn!
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextAnalysis;
