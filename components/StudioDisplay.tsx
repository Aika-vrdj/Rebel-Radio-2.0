
import React from 'react';
import { Broadcast, RadioState } from '../types.ts';
import AudioVisualizer from './AudioVisualizer.tsx';

interface StudioDisplayProps {
  radioState: RadioState;
  generationStep: string;
  analyser: AnalyserNode | null;
  activeBroadcast: Broadcast | null;
  onPlay: (broadcast: Broadcast) => void;
}

const StudioDisplay: React.FC<StudioDisplayProps> = ({ 
  radioState, 
  generationStep, 
  analyser, 
  activeBroadcast, 
  onPlay 
}) => {
  return (
    <section className="bg-slate-900/80 p-6 rounded-xl neon-border relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 p-2">
         <div className="flex gap-1">
           {[1,2,3,4,5].map(i => (
             <div key={i} className={`w-1 h-3 ${radioState === RadioState.PLAYING ? 'bg-cyan-400 animate-pulse' : 'bg-slate-800'}`} />
           ))}
         </div>
      </div>
      
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex justify-between items-end mb-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-pink-500 uppercase font-bold tracking-widest">Signal State</span>
            <span className={`text-xl font-bold tracking-tight ${radioState === RadioState.PLAYING ? 'text-green-400' : 'text-cyan-400'}`}>
              {radioState === RadioState.GENERATING ? generationStep : radioState === RadioState.PLAYING ? 'LIVE TRANSMISSION' : generationStep || 'FREQ: 101.X IDLE'}
            </span>
          </div>
          <div className="text-right">
              <span className="text-[10px] text-cyan-500 uppercase font-bold">Processor</span>
              <span className="block text-cyan-400 font-mono text-xs">KORE-TTS-LOCKED</span>
          </div>
        </div>

        <AudioVisualizer analyser={analyser} isActive={radioState === RadioState.PLAYING} />

        <div className="flex flex-col md:flex-row gap-4 mt-2">
          <div className="w-full md:w-40 h-40 border border-cyan-500/30 rounded overflow-hidden flex-shrink-0 relative group">
            {activeBroadcast ? (
              <>
                <img src={activeBroadcast.imageUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${activeBroadcast.id}`} className="w-full h-full object-cover" alt="Cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </>
            ) : (
              <div className="w-full h-full bg-slate-800/50 flex flex-col items-center justify-center text-cyan-900 border-2 border-dashed border-cyan-900/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>
                <span className="text-[8px] mt-2 uppercase font-bold">Wait Scan</span>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center justify-between">
              <div className="inline-block px-2 py-0.5 bg-pink-500/20 text-pink-500 text-[8px] font-bold rounded mb-1 w-fit tracking-widest uppercase">
                Preview Channel
              </div>
              {activeBroadcast && (
                <button 
                  onClick={() => onPlay(activeBroadcast)}
                  className="flex items-center gap-2 text-[10px] text-pink-400 hover:text-white transition-colors uppercase font-bold tracking-tighter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Test Audio
                </button>
              )}
            </div>
            <h2 className="text-2xl font-bold text-pink-500 pink-neon-text truncate leading-tight mt-1">
              {activeBroadcast?.title || 'System Standby'}
            </h2>
            <p className="text-slate-400 text-sm italic mt-1 overflow-hidden line-clamp-3 font-mono leading-snug">
              {activeBroadcast?.script || 'Signals are transmitted to the cloud. Open the Observer Link in OBS to hear the live feed.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StudioDisplay;
