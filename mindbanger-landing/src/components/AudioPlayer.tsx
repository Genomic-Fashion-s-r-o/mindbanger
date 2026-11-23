'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Music, Mic, Sliders } from 'lucide-react';
import { useDictionary } from '@/lib/i18n-client';

interface AudioPlayerProps {
  src: string;
  backgroundSrc?: string;
  title: string;
  coverArt?: string;
  author?: string;
  compact?: boolean;
  recordingId?: string;
}

export default function AudioPlayer({ src, backgroundSrc, title, coverArt, author = "Mindbanger", compact = false, recordingId }: AudioPlayerProps) {
  const { dict } = useDictionary();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Volume states
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [musicVolume, setMusicVolume] = useState(0.22);
  const [showMixer, setShowMixer] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const playedOnceRef = useRef(false);
  

  // Refs for fade timers
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
      setCurrentTime(audio.currentTime);
    };

    const updateDuration = () => {
      if (!isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (audio) audio.currentTime = 0;
      
      // Stop background music with fade logic
      if (bgAudioRef.current) {
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

        const fadeDuration = 3000;
        const delay = 7000;
        
        fadeTimeoutRef.current = setTimeout(() => {
          const startVol = bgAudioRef.current?.volume || 0;
          const steps = 30;
          const stepTime = fadeDuration / steps; 
          const volStep = startVol / steps;

          fadeIntervalRef.current = setInterval(() => {
             if (bgAudioRef.current) {
                const newVol = Math.max(0, bgAudioRef.current.volume - volStep);
                bgAudioRef.current.volume = newVol;

                if (newVol <= 0) {
                   if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
                   bgAudioRef.current.pause();
                   bgAudioRef.current.currentTime = 0;
                }
             } else {
                if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
             }
          }, stepTime);
        }, delay);
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration); // Listen for duration changes too
    audio.addEventListener('ended', onEnded);

    // Initial check in case valid metadata is already loaded
    if (audio.readyState >= 1) {
      updateDuration();
    }

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]); // Re-run when src changes


  // Sync volumes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = voiceVolume;
    }
  }, [voiceVolume]);

  useEffect(() => {
    // If user manually changes volume, cancel any automated fading
    if (bgAudioRef.current) {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      
      bgAudioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  const togglePlay = () => {
    // Clear fade timers on interaction
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (bgAudioRef.current) bgAudioRef.current.pause();
      } else {
        // RESET Background Volume before playing
        if (bgAudioRef.current) {
            bgAudioRef.current.volume = musicVolume;
            bgAudioRef.current.play().catch(e => console.error("Background audio play failed:", e));
        }
        audioRef.current.play();
        if (recordingId && !playedOnceRef.current) {
            playedOnceRef.current = true;
            fetch('/api/user/recordings/track-play', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recordingId }) }).catch(console.error);
        }
        if (recordingId && !playedOnceRef.current) {
            playedOnceRef.current = true;
            fetch('/api/user/recordings/track-play', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recordingId }) }).catch(console.error);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Number(e.target.value);
    if (audioRef.current) {
      const newTime = (newVal / 100) * duration;
      audioRef.current.currentTime = newTime;
      setProgress(newVal);
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      onContextMenu={(e) => e.preventDefault()}
      className={`w-full bg-slate-900/80 border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden relative group ${compact ? 'p-3' : 'p-4'}`}>
      {/* Decorative ambient gradient behind the player (simulating glow based on cover art vibes) */}
      <div className="absolute top-0 right-0 -m-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl opacity-50 pointer-events-none group-hover:opacity-70 transition-opacity duration-700"></div>

      <audio ref={audioRef} src={src} preload="metadata" controlsList="nodownload" />
      {/* Background Music Audio Element */}
      {backgroundSrc && <audio ref={bgAudioRef} src={backgroundSrc} loop preload="auto" controlsList="nodownload" />}
      
      <div className="flex flex-col gap-4 relative z-10 w-full">
        
        {/* Top Section: Cover + Title + Controls */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 w-full">
           {/* Cover Art Visual */}
          {!compact && (
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl shadow-lg flex-shrink-0 overflow-hidden group-hover:shadow-[0_0_25px_rgba(251,191,36,0.15)] transition-all duration-500">
              {coverArt ? (
                <img 
                  src={coverArt} 
                  alt={title || "Audio Cover"} 
                  className={`w-full h-full object-cover transition-transform duration-1000 ${isPlaying ? 'scale-105' : 'scale-100'}`} 
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br from-amber-600 via-purple-700 to-slate-900 relative ${isPlaying ? 'bg-[length:200%_200%] animate-gradient-xy' : ''}`}>
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className={`w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,transparent_60%)] ${isPlaying ? 'animate-pulse' : ''}`}></div>
                  </div>
                </div>
              )}
              {/* Subtle overlay on cover art */}
              <div className="absolute inset-0 bg-black/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"></div>
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-between w-full h-full py-1">
             <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-white font-bold text-lg truncate drop-shadow-md" title={title}>{title}</p>
                  <p className="text-slate-400 text-sm font-medium truncate">{author}</p>
                </div>

                <div className="flex items-center gap-3">
                   {backgroundSrc && (
                     <button 
                       type="button"
                       onClick={() => setShowMixer(!showMixer)}
                       className={`p-2 rounded-full transition-all duration-200 ${showMixer ? 'bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/50' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                       title={dict.audio?.mixer || "Mixer"}
                     >
                       <Sliders size={20} />
                     </button>
                   )}
                   <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? (dict.audio?.pause || 'Pause') : (dict.audio?.play || 'Play')}
                    className="flex-shrink-0 w-12 h-12 bg-white/10 hover:bg-amber-500 hover:text-slate-900 text-amber-500 border border-white/5 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                  >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                  </button>
                </div>
             </div>

             {/* Progress Bar moved here */}
             <div className="flex items-center gap-3 w-full">
                <span className="text-xs text-slate-400 font-medium w-10 text-right font-mono tracking-tighter">
                  {formatTime(currentTime)}
                </span>
                
                <div className="relative flex-1 h-2 group/slider cursor-pointer">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                  />
                  <div className="absolute inset-0 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-150 relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-full"></div>
                    </div>
                  </div>
                </div>
                
                <span className="text-xs text-slate-400 font-medium w-10 font-mono tracking-tighter">
                  {formatTime(duration)}
                </span>
              </div>
          </div>
        </div>

        {/* Mixer Section (Collapsible) */}
        {backgroundSrc && showMixer && (
          <div className="w-full bg-slate-950/40 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300 border border-white/5 mt-1 backdrop-blur-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sliders size={12} /> {dict.audio?.mixer || "Audio Mixer"}
            </h4>
            <div className="flex flex-col gap-4">
               {/* Voice Volume */}
               <div className="flex items-center gap-3 group/vol">
                 <div className="w-6 flex justify-center">
                    <Mic size={16} className="text-slate-400 group-hover/vol:text-amber-500 transition-colors" />
                 </div>
                 <span className="text-xs text-slate-300 w-12 font-medium">{dict.audio?.voiceVolume || "Voice"}</span>
                 <input 
                   type="range" 
                   min="0" 
                   max="1" 
                   step="0.01" 
                   value={voiceVolume} 
                   onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                   className="flex-1 h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
                 />
                 <span className="text-xs text-slate-500 w-8 text-right font-mono">{Math.round(voiceVolume * 100)}%</span>
               </div>
               
               {/* Music Volume */}
               <div className="flex items-center gap-3 group/vol">
                 <div className="w-6 flex justify-center">
                    <Music size={16} className="text-slate-400 group-hover/vol:text-amber-500 transition-colors" />
                 </div>
                 <span className="text-xs text-slate-300 w-12 font-medium">{dict.audio?.musicVolume || "Music"}</span>
                 <input 
                   type="range" 
                   min="0" 
                   max="1" 
                   step="0.01" 
                   value={musicVolume} 
                   onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                   className="flex-1 h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
                 />
                 <span className="text-xs text-slate-500 w-8 text-right font-mono">{Math.round(musicVolume * 100)}%</span>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
