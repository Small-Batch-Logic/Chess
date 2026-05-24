import { Bus, Zap, AlertCircle, Info, RefreshCcw } from 'lucide-react';
import { PIECES } from '../lib/game';
import type { PlayerPiece, Turn, GameState } from '../types';

interface SidebarProps {
  turn: Turn;
  gameState: GameState;
  isLoading: boolean;
  isUsingLocalData: boolean;
  playerPieces: PlayerPiece[];
  selectedPieceIndex: number | null;
  status: string;
  error: string | null;
  handleGtfsUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectPiece: (index: number) => void;
}

export function Sidebar({
  turn,
  gameState,
  isLoading,
  isUsingLocalData,
  playerPieces,
  selectedPieceIndex,
  status,
  error,
  handleGtfsUpload,
  selectPiece
}: SidebarProps) {
  return (
    <div className="w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 shadow-2xl z-10">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black uppercase tracking-widest text-indigo-400 italic">Transit Chess</span>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${turn === 'player' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'}`}>
            {gameState === 'playing' ? (turn === 'player' ? 'Your Turn' : 'System Turn') : 'Match Over'}
          </div>
        </div>
        <h1 className="text-2xl font-black italic tracking-tighter leading-none mb-1 text-white">Operations Control</h1>
        <p className="text-sm text-slate-400 font-bold mb-4 italic">Intercept the red bus before the terminal.</p>
        
        <div className="mb-6">
          <label className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all shadow-lg shadow-indigo-500/20">
            <Zap className="w-3.5 h-3.5" />
            {isLoading ? 'Loading GTFS...' : 'Load Custom GTFS (.zip)'}
            <input type="file" accept=".zip" onChange={handleGtfsUpload} className="hidden" disabled={isLoading} />
          </label>
          {isUsingLocalData && !isLoading && <div className="mt-2 text-center text-[9px] font-black text-emerald-400 uppercase tracking-widest">Local Mode Active</div>}
        </div>

        <div className="space-y-3">
          {playerPieces.map((p, idx) => (
            <button key={idx} onClick={() => selectPiece(idx)} disabled={p.stop === null || turn !== 'player'} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${selectedPieceIndex === idx ? 'bg-indigo-500/10 border-indigo-500/30 ring-2 ring-indigo-500/20' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: `${PIECES[p.type].color}25`, border: `1px solid ${PIECES[p.type].color}40` }}><Bus className="w-5 h-5" style={{ color: PIECES[p.type].color }} /></div>
              <div className="text-left min-w-0">
                <div className="text-sm font-black italic tracking-tight text-slate-100">
                  {idx === 0 ? 'Blue Line' : idx === 1 ? 'Green Line' : 'Express Link'}
                </div>
                <div className="text-[11px] font-bold text-slate-400 truncate">{p.stop?.stop_name}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.routes.slice(0, 3).map((r, i) => (
                    <span key={i} className="px-1 py-0.5 bg-slate-700 text-slate-300 rounded text-[9px] font-black uppercase">{r.route_short_name}</span>
                  ))}
                  {p.routes.length > 3 && <span className="text-[9px] text-slate-500 font-bold italic">+{p.routes.length - 3}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
         {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-xs font-bold text-red-400 animate-pulse"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
         <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
           <div className="flex items-center gap-2 mb-3"><Info className="w-4 h-4 text-slate-500" /><span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Operations Feed</span></div>
           <p className="text-xs font-bold text-slate-300 leading-snug italic">"{status}"</p>
        </div>
      </div>
      <div className="p-6 border-t border-slate-800 bg-slate-900">
        <button onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all text-slate-400 hover:text-white shadow-sm">
          <RefreshCcw className="w-4 h-4" />Restart Match
        </button>
      </div>
    </div>
  );
}
