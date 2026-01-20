
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase.ts';
import * as gemini from '../services/geminiService.ts';
import { Broadcast, RadioState, BroadcastMode } from '../types.ts';
import AudioVisualizer from './AudioVisualizer.tsx';

const ObserverView: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null);
  const [radioState, setRadioState] = useState<RadioState>(RadioState.IDLE);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const initializeAudio = () => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.connect(audioContextRef.current.destination);
    setIsReady(true);
  };

  const queueAndPlay = async (broadcast: Broadcast) => {
    if (!audioContextRef.current || !analyserRef.current || !broadcast.audioData) return;

    try {
      setRadioState(RadioState.PLAYING);
      setActiveBroadcast(broadcast);

      const binary = gemini.decodeBase64(broadcast.audioData);
      const buffer = await gemini.decodeAudioDataToBuffer(binary, audioContextRef.current);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(analyserRef.current);
      
      const now = audioContextRef.current.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
      
      source.onended = () => {
        // Debounced state change to avoid flickers between rapid segments
        setTimeout(() => {
          if (audioContextRef.current && audioContextRef.current.currentTime >= nextStartTimeRef.current - 0.2) {
            setRadioState(RadioState.IDLE);
          }
        }, 300);
      };
      
      sourceRef.current = source;
    } catch (e) {
      console.error("Observer Playback Error:", e);
    }
  };

  useEffect(() => {
    if (!isReady) return;

    const channel = supabase
      .channel('broadcasts_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'broadcasts' },
        (payload) => {
          console.log("Observer: New Signal Detected", payload.new.id);
          const row = payload.new;
          const broadcast: Broadcast = {
            id: row.id.toString(),
            title: row.title || "Underground Signal",
            prompt: row.prompt || "Real-time Transmission",
            script: row.script || "",
            audioData: row.audio_base_64 || "",
            imageUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${row.id}`,
            mode: (row.mode?.toUpperCase() as BroadcastMode) || BroadcastMode.CREATIVE,
            createdAt: new Date(row.created_at).getTime()
          };
          queueAndPlay(broadcast);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-12 overflow-hidden relative">
      {/* Gritty background texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]" />
      
      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-[2px] bg-cyan-500/10 absolute animate-[scanline_10s_linear_infinite]" />
      </div>

      {!isReady ? (
        <div className="z-10 flex flex-col items-center gap-8">
          <h2 className="text-cyan-500 orbitron tracking-[1em] text-xs animate-pulse">INITIATING DECRYPTION...</h2>
          <button 
            onClick={initializeAudio}
            className="px-12 py-6 bg-transparent border-2 border-pink-600 text-pink-500 font-bold orbitron text-xl animate-pulse neon-border tracking-[0.2em] hover:bg-pink-600 hover:text-white transition-all transform hover:scale-110"
          >
            ESTABLISH LINK
          </button>
          <p className="text-slate-600 text-[10px] font-mono uppercase tracking-widest mt-4">Authorized Personnel Only // Node: OBS_RENDER_ALPHA</p>
        </div>
      ) : (
        <div className="w-full max-w-5xl z-10 flex flex-col gap-12 text-center">
          <header className="flex flex-col gap-4 relative">
             <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            <div className="flex items-center justify-center gap-6">
              <div className={`w-4 h-4 rounded-full ${radioState === RadioState.PLAYING ? 'bg-red-600 animate-ping shadow-[0_0_20px_rgba(220,38,38,0.9)]' : 'bg-green-900 shadow-inner opacity-30'}`} />
              <h1 className="text-cyan-400 text-sm tracking-[1.5em] font-black uppercase italic ml-4">
                {radioState === RadioState.PLAYING ? 'TRANSMITTING' : 'LISTENING'}
              </h1>
            </div>
            <h2 className="text-7xl font-black italic pink-neon-text text-pink-500 orbitron tracking-tighter filter drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]">
              REBEL RADIO // 101.9
            </h2>
          </header>

          <div className="h-48 relative">
             <div className="absolute inset-0 bg-cyan-500/5 blur-3xl rounded-full scale-150 animate-pulse" />
             <AudioVisualizer analyser={analyserRef.current} isActive={radioState === RadioState.PLAYING} />
          </div>

          <div className={`transition-all duration-1000 transform ${radioState === RadioState.PLAYING ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
            <div className="bg-black/80 border-t-4 border-pink-500 p-10 rounded-b-lg neon-border backdrop-blur-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                 <div className="flex gap-2">
                    <div className="w-1 h-4 bg-cyan-500 animate-[bounce_0.5s_infinite]" />
                    <div className="w-1 h-6 bg-cyan-500 animate-[bounce_0.7s_infinite_0.1s]" />
                    <div className="w-1 h-3 bg-cyan-500 animate-[bounce_0.6s_infinite_0.2s]" />
                 </div>
              </div>
              <span className="text-[10px] text-pink-500 uppercase font-black tracking-[0.8em] block mb-6 animate-pulse">Incoming Audio Burst</span>
              <p className="text-cyan-300 font-mono text-3xl italic leading-snug tracking-tight max-w-3xl mx-auto">
                "{activeBroadcast?.script}"
              </p>
              <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">
                <span>Source: {activeBroadcast?.title}</span>
                <span className="text-cyan-800">Mode: {activeBroadcast?.mode}</span>
                <span>ID: {activeBroadcast?.id?.slice(0,8)}</span>
              </div>
            </div>
          </div>
          
          <footer className="flex justify-between items-center text-[10px] text-slate-800 font-mono tracking-widest uppercase mt-24 border-b border-slate-900 pb-4">
            <span>Uptime: {Math.floor(performance.now() / 1000)}s</span>
            <span>Sync: Supabase Native // Protocol: PCM-24k</span>
            <span>Signal: Clear</span>
          </footer>
        </div>
      )}

      <style>{`
        @keyframes scanline {
          0% { top: -100px; opacity: 0; }
          50% { opacity: 0.1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ObserverView;
