// components/Map/SimulatorPanel.tsx
import { Navigation, Gauge, Radius, Move } from "lucide-react";

interface SimulatorPanelProps {
  useManual: boolean;
  setUseManual: (val: boolean) => void;
  targetPoi: any;
  minDistance: number;
  moveSpeed: number;
  setMoveSpeed: (val: number) => void;
}

export default function SimulatorPanel({ 
  useManual, 
  setUseManual, 
  targetPoi, 
  minDistance, 
  moveSpeed, 
  setMoveSpeed 
}: SimulatorPanelProps) {
  return (
    <div className="w-[min(18rem,calc(100vw-2rem))] bg-white/95 backdrop-blur-xl p-4 md:p-5 rounded-[2rem] shadow-2xl border border-white/50 transition-all duration-500">
      
      {/* Header: Toggle Switch */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-slate-400">
          <Navigation size={14} className={useManual ? "text-blue-600 animate-pulse" : "text-slate-300"}/> 
          Simulation Mode
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={useManual} 
            onChange={e => setUseManual(e.target.checked)} 
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      
      {/* Expanded Controls when Manual Mode is ON */}
      {useManual ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* Target Status Card */}
          <div className="p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-inner relative overflow-hidden">
             <div className="relative z-10">
               <div className="text-[8px] font-black uppercase text-slate-500 mb-1 tracking-widest">Current Target</div>
               <div className="text-xs font-bold truncate pr-4">
                 {targetPoi ? targetPoi.name : "Searching for POIs..."}
               </div>
               <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-blue-400">
                  <Radius size={12}/> 
                  {targetPoi ? `${(minDistance * 1000).toFixed(0)} meters` : "---"}
               </div>
             </div>
             {/* Decorative background icon */}
             <Radius size={60} className="absolute -right-4 -bottom-4 text-white/5 opacity-10" />
          </div>

          {/* Speed / Sensitivity Control */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400 tracking-tight">
              <div className="flex items-center gap-1"><Gauge size={12}/> Movement Step</div>
              <span className="text-blue-600 font-mono">{(moveSpeed * 100000).toFixed(0)}x</span>
            </div>
            <input 
              type="range" 
              min="0.00001" 
              max="0.0005" 
              step="0.00001" 
              value={moveSpeed} 
              onChange={(e) => setMoveSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Instructions */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex gap-1">
              {['W','A','S','D'].map(k => (
                <kbd key={k} className="px-1.5 py-0.5 text-[8px] font-bold bg-white border border-slate-200 rounded shadow-sm text-slate-500">{k}</kbd>
              ))}
            </div>
            <span className="text-[9px] text-slate-400 font-medium leading-none uppercase tracking-tighter">Use keys or drag marker to move</span>
          </div>

        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic leading-tight px-1">
          Enable simulation to manually move the user marker and test proximity audio triggers.
        </p>
      )}
    </div>
  );
}