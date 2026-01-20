
import React from 'react';

interface FooterProps {
  cloudStatus: string;
}

const Footer: React.FC<FooterProps> = ({ cloudStatus }) => {
  return (
    <footer className="w-full mt-auto pt-8 pb-4 border-t border-cyan-900/20 flex flex-col md:flex-row justify-between items-center text-cyan-900 text-[8px] tracking-[0.3em] uppercase font-bold gap-4">
      <div>© 2077 Rebel Radio Underground</div>
      <div className="flex gap-4">
          <span className={cloudStatus === 'connected' ? 'text-green-500/50' : ''}>LINK: {cloudStatus.toUpperCase()}</span>
          <span>FREQ: 101.9 MHz</span>
      </div>
    </footer>
  );
};

export default Footer;
