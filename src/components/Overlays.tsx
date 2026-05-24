import { Trophy, Skull } from 'lucide-react';
import type { GameState } from '../types';

interface GameOverOverlayProps {
  gameState: GameState;
}

export function GameOverOverlay({ gameState }: GameOverOverlayProps) {
  if (gameState === 'playing') return null;

  return (
    <div className="absolute inset-0 z-[2000] bg-white/60 backdrop-blur-md flex items-center justify-center p-8">
      <div className={`max-w-md w-full p-12 rounded-[3rem] border-2 text-center shadow-2xl ${gameState === 'won' ? 'bg-white border-indigo-100' : 'bg-white border-red-100'}`}>
        <div className="flex justify-center mb-6">
          {gameState === 'won' ? (
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center rotate-12 shadow-2xl shadow-indigo-200">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center -rotate-12 shadow-2xl shadow-red-200">
              <Skull className="w-10 h-10 text-white" />
            </div>
          )}
        </div>
        <h2 className="text-5xl font-black italic tracking-tighter mb-2 text-slate-900">
          {gameState === 'won' ? 'SUCCESS' : 'FAIL'}
        </h2>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">
          {gameState === 'won' ? 'System intercepted.' : 'System escaped.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

interface RulesOverlayProps {
  showRules: boolean;
  onClose: () => void;
}

export function RulesOverlay({ showRules, onClose }: RulesOverlayProps) {
  if (!showRules) return null;

  return (
    <div className="absolute inset-0 z-[3000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-8">
      <div className="max-w-lg w-full bg-white rounded-[3rem] shadow-2xl p-12 relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100%] -mr-8 -mt-8 opacity-50" />
        <div className="relative">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none mb-1 text-center">Transit Chess</h2>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em]">Operations Manual</p>
          </div>
          <div className="space-y-6 mb-10 text-left">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-xs font-black text-indigo-600">1</div>
              <div>
                <p className="text-sm font-black text-slate-800 mb-1 italic">The Mission</p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Catch the <span className="text-red-500 font-bold uppercase">Red Bus</span> before it reaches the <span className="text-amber-500 font-bold uppercase">Yellow Hub</span>.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-xs font-black text-indigo-600">2</div>
              <div>
                <p className="text-sm font-black text-slate-800 mb-1 italic">Movement</p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Pick a Blue Bus, then click a <span className="text-indigo-600 font-bold italic">Glowing Stop</span> to move.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-xs font-black text-indigo-600">3</div>
              <div>
                <p className="text-sm font-black text-slate-800 mb-1 italic">Tactical Intelligence</p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Fog of War active. The System is only visible when within range of your fleet. Use surveillance to maintain contact.</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Acknowledge & Start
          </button>
        </div>
      </div>
    </div>
  );
}
