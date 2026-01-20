
import React, { useState, useEffect, useRef } from 'react';
import * as gemini from './services/geminiService.ts';
import * as db from './services/supabaseService.ts';
import { Broadcast, RadioState, BroadcastMode } from './types.ts';

// Components
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import StudioDisplay from './components/StudioDisplay.tsx';
import ControlPanel from './components/ControlPanel.tsx';
import ArchiveList from './components/ArchiveList.tsx';
import ObserverView from './components/ObserverView.tsx';

// Set to true to bypass quota limits during development
const DEBUG_MODE = true; 

const App: React.FC = () => {
  const [isObserver, setIsObserver] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<BroadcastMode>(BroadcastMode.MANUAL);
  const [radioState, setRadioState] = useState<RadioState>(RadioState.IDLE);
  const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null);
  const [generationStep, setGenerationStep] = useState('');
  const [quota, setQuota] = useState<db.QuotaData>({ count: 0, resetAt: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<'offline' | 'schema_error' | 'connected' | 'connecting'>('connecting');
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // Authorization States
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const refreshAppData = async () => {
    try {
      const history = await db.getBroadcasts();
      setBroadcasts(history);
      const quotaData = await db.getQuota();
      setQuota(quotaData);
      setCloudStatus(db.getCloudStatus());
    } catch (e) {
      console.error("App: Sync failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isObs = params.get('view') === 'observer' || window.location.hash === '#/observer';
    setIsObserver(isObs);
    
    if (isObs) {
      setIsLoading(false);
    } else {
      // Check stored authorization
      const storedCode = localStorage.getItem('rebel_radio_access_code');
      if (storedCode) {
        setSavedCode(storedCode);
        db.validateAccessCode(storedCode).then(valid => {
          if (valid) setIsAuthorized(true);
          else localStorage.removeItem('rebel_radio_access_code');
        });
      }

      refreshAppData();
      const interval = setInterval(refreshAppData, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleValidateCode = async (code: string) => {
    setGenerationStep('VERIFYING CREDENTIALS...');
    const valid = await db.validateAccessCode(code);
    if (valid) {
      setIsAuthorized(true);
      setSavedCode(code);
      localStorage.setItem('rebel_radio_access_code', code);
      setGenerationStep('SYSTEM UNLOCKED');
      setTimeout(() => setGenerationStep(''), 2000);
    } else {
      setRadioState(RadioState.ERROR);
      setGenerationStep('INVALID ACCESS CODE');
      setTimeout(() => {
        setRadioState(RadioState.IDLE);
        setGenerationStep('');
      }, 3000);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !isAuthorized) return;
    
    // Final security check
    if (savedCode) {
      const stillValid = await db.validateAccessCode(savedCode);
      if (!stillValid) {
        setIsAuthorized(false);
        localStorage.removeItem('rebel_radio_access_code');
        setRadioState(RadioState.ERROR);
        setGenerationStep('AUTH EXPIRED');
        return;
      }
    }

    const currentQuota = await db.getQuota();
    if (!DEBUG_MODE && currentQuota.count >= 15) { 
      setRadioState(RadioState.ERROR);
      setGenerationStep('DAILY QUOTA EXHAUSTED');
      return;
    }

    setRadioState(RadioState.GENERATING);
    setGenerationStep('TUNING ENCRYPTION...');
    
    try {
      const data = await gemini.generateBroadcastData(prompt, mode);
      
      const broadcastToSave: Omit<Broadcast, 'id'> = {
        title: data.title || 'Unknown Signal',
        prompt: prompt,
        script: data.script || '', 
        audioData: data.audioData || '', 
        imageUrl: data.imageUrl || 'https://8i2lyyp4z9.ufs.sh/f/wkNKU1LyOpNgacHHzCAdxsIb68hCEn4TJuGqtSlFBV5vDPf2',
        mode: mode,
        createdAt: Date.now()
      };

      setGenerationStep('TRANSMITTING...');
      await db.saveBroadcast(broadcastToSave as Broadcast);

      const tempBroadcast = { ...broadcastToSave, id: broadcastToSave.createdAt.toString() } as Broadcast;
      setBroadcasts(prev => [tempBroadcast, ...prev].slice(0, 30));
      setActiveBroadcast(tempBroadcast);
      setPrompt('');
      setRadioState(RadioState.IDLE);
      setGenerationStep('SIGNAL TRANSMITTED');
      setTimeout(refreshAppData, 1500);

    } catch (error) {
      console.error('Failed to generate broadcast:', error);
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      setRadioState(RadioState.ERROR);
      setGenerationStep(errorMsg.includes('Forbidden') ? 'FORBIDDEN KEY' : 'SIGNAL JAMMED');
    }
  };

  const playBroadcast = async (broadcast: Broadcast) => {
    if (!broadcast.audioData) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch(e) {}
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    setRadioState(RadioState.PLAYING);
    setActiveBroadcast(broadcast);
    try {
      const binary = gemini.decodeBase64(broadcast.audioData);
      const buffer = await gemini.decodeAudioDataToBuffer(binary, audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(analyserRef.current!);
      source.onended = () => {
        setRadioState(RadioState.IDLE);
      };
      source.start(0);
      sourceRef.current = source;
    } catch (e) {
      console.error("Playback error:", e);
      setRadioState(RadioState.ERROR);
    }
  };

  const copyObsLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#/observer`;
    navigator.clipboard.writeText(link);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-cyan-500 font-mono italic">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="animate-pulse tracking-[0.4em] uppercase text-xs">Pinging Night City Nodes...</div>
      </div>
    );
  }

  if (isObserver) {
    return <ObserverView />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-6xl mx-auto relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]" />

      <Header 
        cloudStatus={cloudStatus} 
        copyObsLink={copyObsLink} 
        copyFeedback={copyFeedback}
        debugMode={DEBUG_MODE}
      />

      {generationStep === 'SIGNAL TRANSMITTED' && (
        <div className="w-full bg-green-500/10 border border-green-500/50 p-2 mb-6 rounded text-center text-[10px] text-green-400 uppercase tracking-widest font-bold animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.2)]">
          SUCCESS: SIGNAL TRANSMITTED TO NODES
        </div>
      )}

      {radioState === RadioState.ERROR && (
        <div className="w-full bg-red-500/10 border border-red-500/50 p-2 mb-6 rounded text-center text-[10px] text-red-500 uppercase tracking-widest font-bold animate-pulse">
          ERROR: {generationStep || 'SIGNAL JAMMED'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full relative z-10">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <StudioDisplay 
            radioState={radioState}
            generationStep={generationStep}
            analyser={analyserRef.current}
            activeBroadcast={activeBroadcast}
            onPlay={playBroadcast}
          />

          <ControlPanel 
            mode={mode}
            setMode={setMode}
            quota={quota}
            prompt={prompt}
            setPrompt={setPrompt}
            onGenerate={handleGenerate}
            radioState={radioState}
            generationStep={generationStep}
            bypassQuota={DEBUG_MODE}
            isAuthorized={isAuthorized}
            onValidateCode={handleValidateCode}
          />
        </div>

        <ArchiveList 
          broadcasts={broadcasts} 
          onPlay={playBroadcast} 
        />
      </div>

      <Footer cloudStatus={cloudStatus} />
    </div>
  );
};

export default App;
