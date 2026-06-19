import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import KanjiEntry from "./KanjiEntry";
import KanaEntry from "./KanaEntry";
import WordEntry from "./WordEntry";

interface DictionaryResultsProps {
  results: any;
}

interface CategorizedEntries {
  [key: string]: any[];
}

const DictionaryResults = ({ results }: DictionaryResultsProps) => {
  if (!results?.data || results.data.length === 0) {
    return null;
  }

  // Helper to check if text contains kanji
  const hasKanji = (text: string) => {
    return /[\u4e00-\u9faf]/.test(text);
  };

  // Helper to check if text is only kana
  const isOnlyKana = (text: string) => {
    return /^[\u3040-\u309f\u30a0-\u30ff]+$/.test(text);
  };

  // Convert katakana to hiragana for sorting
  const katakanaToHiragana = (str: string) => {
    return str.replace(/[\u30a0-\u30ff]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0x60);
    });
  };

  // Sort by gojūon order (hiragana alphabetical)
  const sortByGojuon = (entries: any[]) => {
    return entries.sort((a, b) => {
      const aReading = katakanaToHiragana(a.reading || a.word);
      const bReading = katakanaToHiragana(b.reading || b.word);
      return aReading.localeCompare(bReading, 'ja');
    });
  };

  // Categorize by parts of speech
  const categorizeByPartOfSpeech = (entries: any[]): CategorizedEntries => {
    const categories: CategorizedEntries = {
      "Nouns": [],
      "Verbs": [],
      "い-adjectives": [],
      "な-adjectives": [],
      "Adverbs": [],
      "Particles": [],
      "Auxiliary verbs": [],
      "Pre-noun adjectives": [],
      "Conjunctions": [],
      "Interjections": [],
      "Other": []
    };

    entries.forEach(entry => {
      const partsOfSpeech = entry.original.senses.flatMap((s: any) => s.parts_of_speech);
      let categorized = false;

      if (partsOfSpeech.some((p: string) => p.includes("Noun"))) {
        categories["Nouns"].push(entry);
        categorized = true;
      }
      if (partsOfSpeech.some((p: string) => p.includes("verb") || p.includes("Verb"))) {
        categories["Verbs"].push(entry);
        categorized = true;
      }
      if (partsOfSpeech.some((p: string) => p.includes("い-adjective") || p.includes("I-adjective"))) {
        categories["い-adjectives"].push(entry);
        categorized = true;
      }
      if (partsOfSpeech.some((p: string) => p.includes("な-adjective") || p.includes("Na-adjective"))) {
        categories["な-adjectives"].push(entry);
        categorized = true;
      }
      if (partsOfSpeech.some((p: string) => p.includes("Adverb"))) {
        categories["Adverbs"].push(entry);
        categorized = true;
      }
      if (partsOfSpeech.some((p: string) => p.includes("Particle"))) {
        categories["Particles"].push(entry);
        categorized = true;
      }
      if (partsOfSpeech.some((p: string) => p.includes("Auxiliary"))) {
        categories["Auxiliary verbs"].push(entry);
        categorized = true;
      }
      if (partsOfSpeech.some((p: string) => p.includes("Pre-noun"))) {
        categories["Pre-noun adjectives"].push(entry);
        categorized = true;
      }
      if (partsOfSpeech.some((p: string) => p.includes("Conjunction"))) {
        categories["Conjunctions"].push(entry);
        categorized = true;
      }
      if (partsOfSpeech.some((p: string) => p.includes("Interjection"))) {
        categories["Interjections"].push(entry);
        categorized = true;
      }
      if (!categorized) {
        categories["Other"].push(entry);
      }
    });

    return categories;
  };

  // Categorize results
  const kanjiEntries: any[] = [];
  const kanaEntries: any[] = [];
  const normalEntries: any[] = [];

  results.data.forEach((item: any) => {
    const japanese = item.japanese[0];
    const word = japanese.word || japanese.reading;
    const reading = japanese.reading || "";
    
    const meanings = item.senses
      .flatMap((sense: any) => sense.english_definitions)
      .filter((def: string, idx: number, arr: string[]) => arr.indexOf(def) === idx);

    // Jisho API doesn't provide example sentences, so we'll leave examples empty
    const examples: Array<{ japanese: string; english: string }> = [];

    const entry = {
      word,
      reading,
      meanings,
      examples,
      original: item
    };

    // Single kanji character
    if (word.length === 1 && hasKanji(word)) {
      kanjiEntries.push(entry);
    }
    // Only kana (hiragana or katakana)
    else if (isOnlyKana(word)) {
      kanaEntries.push(entry);
    }
    // Normal words (kanji + kana or just kanji words)
    else if (hasKanji(word)) {
      normalEntries.push(entry);
    }
    // Fallback to kana entries
    else {
      kanaEntries.push(entry);
    }
  });

  // Sort by gojūon order
  const sortedKanjiEntries = sortByGojuon(kanjiEntries);
  const sortedKanaEntries = sortByGojuon(kanaEntries);
  const sortedNormalEntries = sortByGojuon(normalEntries);

  // Categorize by parts of speech
  const kanjiByPos = categorizeByPartOfSpeech(sortedKanjiEntries);
  const kanaByPos = categorizeByPartOfSpeech(sortedKanaEntries);
  const normalByPos = categorizeByPartOfSpeech(sortedNormalEntries);

  const renderEntriesByPos = (categorizedEntries: CategorizedEntries, EntryComponent: any) => {
    return (
      <Accordion type="multiple" className="w-full">
        {Object.entries(categorizedEntries).map(([category, entries]) => {
          if (entries.length === 0) return null;
          return (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="text-lg font-semibold">
                {category} ({entries.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {entries.map((entry, idx) => (
                  <EntryComponent
                    key={idx}
                    {...(EntryComponent === KanjiEntry ? { kanji: entry.word } : 
                        EntryComponent === KanaEntry ? { kana: entry.word } : 
                        { word: entry.word })}
                    reading={entry.reading}
                    meanings={entry.meanings}
                    examples={entry.examples}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <Tabs defaultValue={sortedKanjiEntries.length > 0 ? "kanji" : sortedKanaEntries.length > 0 ? "kana" : "normal"} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kanji" disabled={sortedKanjiEntries.length === 0}>
            Kanji ({sortedKanjiEntries.length})
          </TabsTrigger>
          <TabsTrigger value="kana" disabled={sortedKanaEntries.length === 0}>
            Kana ({sortedKanaEntries.length})
          </TabsTrigger>
          <TabsTrigger value="normal" disabled={sortedNormalEntries.length === 0}>
            Words ({sortedNormalEntries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanji" className="mt-4">
          {renderEntriesByPos(kanjiByPos, KanjiEntry)}
        </TabsContent>

        <TabsContent value="kana" className="mt-4">
          {renderEntriesByPos(kanaByPos, KanaEntry)}
        </TabsContent>

        <TabsContent value="normal" className="mt-4">
          {renderEntriesByPos(normalByPos, WordEntry)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DictionaryResults;
