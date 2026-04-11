import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, SkipForward, Music } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PLAYLIST = [
  {
    name: "AC/DC - Thunderstruck",
    url: "/music/musica1.mp3"
  },
  {
    name: "Avenged Sevenfold - This Means War",
    url: "/music/musica2.mp3"
  },
  {
    name: "System of a Down - Aerials",
    url: "/music/musica3.mp3"
  }
];

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(err => console.log("Autoplay blocked:", err));
    }
  }, [currentTrackIndex]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.log("Autoplay blocked or error:", err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipTrack = () => {
    const nextIndex = (currentTrackIndex + 1) % PLAYLIST.length;
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
  };

  return (
    <div 
      className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-3"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-suopes-black/90 backdrop-blur-md border border-suopes-gray p-4 rounded-sm shadow-2xl w-64 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <Music size={14} className="text-suopes-gold shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest">Transmitindo:</span>
                  <span className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest truncate">
                    {PLAYLIST[currentTrackIndex].name}
                  </span>
                </div>
              </div>
              <button 
                onClick={skipTrack}
                className="p-2 hover:bg-suopes-gray/30 text-suopes-gold transition-colors rounded-full"
                title="Pular Música"
              >
                <SkipForward size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest">Volume</span>
                <span className="text-[8px] font-mono text-suopes-gold">{Math.round(volume * 100)}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-suopes-gray rounded-lg appearance-none cursor-pointer accent-suopes-gold"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={togglePlay}
        className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300 ${
          isPlaying 
            ? "bg-suopes-gold border-suopes-gold text-suopes-black shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
            : "bg-suopes-black border-suopes-gray text-suopes-muted hover:border-suopes-gold hover:text-suopes-gold"
        }`}
      >
        {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      <audio 
        ref={audioRef} 
        src={PLAYLIST[currentTrackIndex].url} 
        onEnded={skipTrack}
        loop={PLAYLIST.length === 1}
      />
    </div>
  );
}
