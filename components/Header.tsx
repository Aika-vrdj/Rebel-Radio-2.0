
import React from 'react';

interface HeaderProps {
  cloudStatus: 'offline' | 'schema_error' | 'connected' | 'connecting';
  copyObsLink: () => void;
  copyFeedback: boolean;
  debugMode?: boolean;
}

const Header: React.FC<HeaderProps> = ({ cloudStatus, copyObsLink, copyFeedback, debugMode = false }) => {
  return (
    <header className="w-full mb-8 text-center relative">
      <div className="absolute top-0 right-0 text-[10px] font-mono hidden md:block animate-pulse text-right">
        <div className="flex items-center justify-end gap-2 mb-1">
           <span className="text-slate-500">CLOUD_SYNC:</span>
           <div className={`w-2 h-2 rounded-full ${cloudStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : cloudStatus === 'schema_error' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]' : 'bg-red-500 animate-ping'}`} />
        </div>
        <div className="flex items-center justify-end gap-2">
          {debugMode && (
            <span className="text-yellow-500 font-bold border border-yellow-500/50 px-1 rounded-[2px] mr-1">DEBUG</span>
          )}
          <span className="text-pink-500 uppercase">
            {cloudStatus === 'connected' ? 'SUPABASE_ACTIVE' : cloudStatus === 'schema_error' ? 'LOCAL_FALLBACK' : 'OFFLINE'}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 mt-1">
          <span className="text-cyan-500 font-bold opacity-70">OBS_FEED: READY</span>
          <button 
            onClick={copyObsLink}
            className={`px-2 py-0.5 rounded border ${copyFeedback ? 'border-green-500 text-green-500' : 'border-cyan-500/50 text-cyan-500'} hover:bg-cyan-500/10 transition-all text-[9px] uppercase font-bold`}
          >
            {copyFeedback ? 'COPIED' : 'COPY OBS LINK'}
          </button>
        </div>
      </div>
      <h1 className="text-4xl md:text-7xl font-black italic orbitron neon-text tracking-tighter mb-2">
        REBEL <span className="text-pink-500 pink-neon-text">RADIO</span>
      </h1>
      <div className="flex items-center justify-center gap-4">
         <div className="h-[1px] w-12 bg-cyan-900"></div>
         <p className="text-cyan-500/80 text-xs tracking-[0.4em] uppercase font-bold">
          Quantum Sound Synthesis Active
         </p>
         <div className="h-[1px] w-12 bg-cyan-900"></div>
      </div>
    </header>
  );
};

export default Header;
