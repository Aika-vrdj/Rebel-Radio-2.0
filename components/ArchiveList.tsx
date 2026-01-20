
import React from 'react';
import { Broadcast } from '../types.ts';
import BroadcastCard from './BroadcastCard.tsx';

interface ArchiveListProps {
  broadcasts: Broadcast[];
  onPlay: (broadcast: Broadcast) => void;
}

const ArchiveList: React.FC<ArchiveListProps> = ({ broadcasts, onPlay }) => {
  return (
    <div className="lg:col-span-5 flex flex-col h-[calc(100vh-280px)] min-h-[450px]">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-cyan-400 uppercase font-bold text-[10px] tracking-[0.3em]">
          Node Archive
        </h2>
        <span className="text-cyan-900 text-[8px] font-mono uppercase">Total Transmissions: {broadcasts.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 scroll-smooth custom-scrollbar">
        {broadcasts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-cyan-900/20 rounded-lg text-cyan-900 text-[10px] font-mono uppercase tracking-widest">
            No signals captured
          </div>
        ) : (
          broadcasts.map(b => (
            <BroadcastCard key={b.id} broadcast={b} onPlay={onPlay} />
          ))
        )}
      </div>
    </div>
  );
};

export default ArchiveList;
