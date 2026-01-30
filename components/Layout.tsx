
import React from 'react';
import { Language } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  lang: Language;
  onLangToggle: () => void;
  onNavigate: (view: 'app' | 'tos' | 'privacy') => void;
  onHomeClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, lang, onLangToggle, onNavigate, onHomeClick }) => {
  return (
    <div className="min-h-screen flex flex-col selection:bg-slate-200 selection:text-slate-900 bg-white font-sans animate-in fade-in duration-1000">
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            className="flex items-center gap-2 cursor-pointer focus:outline-none group" 
            onClick={onHomeClick}
          >
            <div className="bg-slate-900 w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="fas fa-flask text-white text-sm"></i>
            </div>
            <span className="font-bold text-xl tracking-tighter text-slate-900">LabMatch</span>
          </button>
          
          <button 
            onClick={onLangToggle}
            className="text-[10px] font-black uppercase tracking-widest border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-all text-slate-600"
          >
            {lang === 'en' ? '中文' : 'English'}
          </button>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-100 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <button onClick={onHomeClick} className="flex items-center gap-2 group">
              <i className="fas fa-microscope text-slate-900 group-hover:rotate-12 transition-transform"></i>
              <span className="font-bold text-slate-900 tracking-tighter">LabMatch</span>
            </button>
            
            <nav className="flex gap-8 text-[10px] font-black uppercase tracking-widest">
              <button onClick={() => onNavigate('tos')} className="hover:text-slate-900 transition-colors">
                {lang === 'en' ? 'Terms of Service' : '服务条款'}
              </button>
              <button onClick={() => onNavigate('privacy')} className="hover:text-slate-900 transition-colors">
                {lang === 'en' ? 'Privacy Policy' : '隐私政策'}
              </button>
            </nav>

            <div className="text-[10px] font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} LABMATCH. {lang === 'en' ? 'ALL RIGHTS RESERVED.' : '版权所有。'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
