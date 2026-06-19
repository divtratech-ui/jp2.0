import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ListenButtonProps {
  text: string;
  size?: "sm" | "icon" | "default";
  variant?: "ghost" | "outline" | "secondary";
  label?: string;
  className?: string;
}

const ListenButton = ({
  text,
  size = "icon",
  variant = "ghost",
  label,
  className,
}: ListenButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
 }, [text]);

  const play = async () => {
    if (!text?.trim() || loading) return;

    try {
      if (audioRef.current && !audioRef.current.ended) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (!audioUrlRef.current) {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("tts-japanese", {
          body: { text, speaking_rate: 0.65 },
        });
        if (error) throw error;

        if (!(data instanceof Blob)) {
          throw new Error("Text-to-speech returned an invalid audio response");
        }

        const blob = new Blob([data], { type: "audio/mpeg" });
        audioUrlRef.current = URL.createObjectURL(blob);
      }

      const audio = new Audio(audioUrlRef.current);
      audioRef.current = audio;
      setPlaying(true);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      await audio.play();
    } catch (err: unknown) {
      console.error("ListenButton error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to play audio");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={play}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
      title="Listen"
      aria-label="Listen"
      type="button"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className={`h-4 w-4 ${playing ? "text-primary" : ""}`} />
      )}
      {label && <span className="ml-2">{label}</span>}
    </Button>
  );
};

export default ListenButton;
