import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KanaBrowserProps {
  onSelectKana: (kana: string) => void;
  selectedKana: string | null;
}

const KanaBrowser = ({ onSelectKana, selectedKana }: KanaBrowserProps) => {
  const kanaRows = [
    ["あ", "い", "う", "え", "お"],
    ["か", "き", "く", "け", "こ"],
    ["さ", "し", "す", "せ", "そ"],
    ["た", "ち", "つ", "て", "と"],
    ["な", "に", "ぬ", "ね", "の"],
    ["は", "ひ", "ふ", "へ", "ほ"],
    ["ま", "み", "む", "め", "も"],
    ["や", "ゆ", "よ"],
    ["ら", "り", "る", "れ", "ろ"],
    ["わ", "を", "ん"],
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <h2 className="text-xl font-semibold mb-4 text-center">Browse by Kana</h2>
      <ScrollArea className="w-full">
        <div className="space-y-2">
          {kanaRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-2 justify-center flex-wrap">
              {row.map((kana) => (
                <Button
                  key={kana}
                  variant={selectedKana === kana ? "default" : "outline"}
                  onClick={() => onSelectKana(kana)}
                  className="min-w-[3rem] text-lg font-medium"
                >
                  {kana}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default KanaBrowser;
