
import React, { useState } from 'react';
import { BroadcastMode, RadioState } from '../types.ts';
import { QuotaData } from '../services/supabaseService.ts';

interface ControlPanelProps {
  mode: BroadcastMode;
  setMode: (mode: BroadcastMode) => void;
  quota: QuotaData;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  radioState: RadioState;
  generationStep: string;
  bypassQuota?: boolean;
  isAuthorized: boolean;
  onValidateCode: (code: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  setMode,
  quota,
  prompt,
  setPrompt,
  onGenerate,
  radioState,
  generationStep,
  bypassQuota = false,
  isAuthorized,
  onValidateCode
}) => {
  const [codeEntry, setCodeEntry] = useState('');
  const isGenerating = radioState === RadioState.GENERATING;
  const isQuotaReached = !bypassQuota && quota.count >= 15;

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeEntry.trim()) {
      onValidateCode(codeEntry);
    }
  };

  return (
    <section className="bg-slate-900/80 p-6 rounded-xl pink-neon-border backdrop-blur-md relative overflow-hidden">
      {bypassQuota && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-yellow-500/20 text-yellow-500 text-[7px] font-bold px-4 py-0.5 rounded-b border-x border-b border-yellow-500/30 uppercase tracking-[0.3em] z-20">
          Admin Override: Quota Bypassed
        </div>
      )}
      
      {/* Authorization Layer */}
      <div className="mb-6 p-4 bg-black/40 rounded-lg border border-pink-500/20">
        {!isAuthorized ? (
          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-2">
            <label className="text-[9px] text-pink-500 font-black uppercase tracking-[0.4em] mb-1">
              Terminal Decryption Required
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={codeEntry}
                onChange={(e) => setCodeEntry(e.target.value)}
                placeholder="ENTER ACCESS CODE..."
                className="flex-1 bg-slate-950 border border-pink-500/40 rounded px-3 py-2 text-xs font-mono text-pink-400 placeholder:text-pink-900 focus:outline-none focus:border-pink-500"
              />
              <button 
                type="submit"
                className="bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500 text-pink-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Validate
              </button>
            </div>
            <span className="text-[7px] text-slate-600 italic">Unauthorized transmission is a level 4 cyber-offense.</span>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              <span className="text-[10px] text-green-400 font-black uppercase tracking-[0.3em]">Identity Verified // Link Established</span>
            </div>
            <div className="text-[8px] text-slate-500 font-mono">CODE: {localStorage.getItem('rebel_radio_access_code')?.slice(0,3)}***</div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
          <span className="text-[10px] text-pink-500 uppercase font-bold tracking-[0.2em]">Message Terminal</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase font-bold">Quota:</span>
          <div className="flex gap-1">
            {[...Array(15)].map((_, i) => (
              <div 
                key={i} 
                className={`w-3 h-1.5 rounded-sm ${i < quota.count ? 'bg-slate-700 shadow-inner' : 'bg-pink-500 animate-pulse shadow-[0_0_5px_rgba(236,72,153,0.5)]'}`}
              />
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isQuotaReached || !isAuthorized}
          placeholder={!isAuthorized ? "DECRYPT TERMINAL TO UNLOCK..." : isQuotaReached ? "ENCRYPTION LIMIT REACHED." : "TYPE MESSAGE FOR THE UNDERGROUND..."}
          className={`bg-black/80 border rounded-lg p-4 font-mono text-sm transition-all min-h-[100px] resize-none focus:outline-none focus:ring-1 ${(!isAuthorized || isQuotaReached) ? 'border-slate-800 text-slate-700 cursor-not-allowed opacity-50' : 'border-pink-500/30 text-pink-400 focus:border-pink-500'}`}
        />
        <button 
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim() || isQuotaReached || !isAuthorized}
          className={`group relative font-bold py-4 rounded-lg uppercase tracking-[0.2em] transition-all overflow-hidden bg-pink-600 hover:bg-pink-500 text-white shadow-lg disabled:opacity-50 disabled:grayscale shadow-[0_0_15px_rgba(236,72,153,0.3)]`}
        >
          <span className="relative z-10">
            {!isAuthorized ? 'LOCKED' : isGenerating ? generationStep : 'SEND MESSAGE'}
          </span>
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </button>
      </div>
    </section>
  );
};

export default ControlPanel;
