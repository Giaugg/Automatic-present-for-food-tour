interface Props {
  isMocking: boolean;
  setIsMocking: (val: boolean) => void;
  currentPos: { lat: number; lng: number };
}

export const SimulationPanel = ({ isMocking, setIsMocking, currentPos }: Props) => {
  return (
    <div className="absolute top-24 left-6 z-[1000] bg-card/80 backdrop-blur-md p-5 rounded-[2rem] border border-border shadow-2xl w-64">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Chế độ di chuyển
        </span>
        <div className={`w-2 h-2 rounded-full ${isMocking ? 'bg-orange-500 animate-ping' : 'bg-emerald-500'}`} />
      </div>

      <div className="space-y-3">
        <div className="bg-muted/50 p-3 rounded-2xl border border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Tọa độ hiện tại</p>
          <p className="text-xs font-mono font-bold text-primary">
            {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
          </p>
        </div>

        <button
          onClick={() => setIsMocking(!isMocking)}
          className={`w-full py-3 rounded-xl font-black text-xs transition-all ${
            isMocking 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' 
              : 'bg-primary text-white'
          }`}
        >
          {isMocking ? 'DỪNG GIẢ LẬP' : 'BẬT GIẢ LẬP GPS'}
        </button>

        {isMocking && (
          <p className="text-[9px] text-center text-muted-foreground leading-tight italic">
            * Click chuột vào bất kỳ điểm nào trên bản đồ để di chuyển User đến đó.
          </p>
        )}
      </div>
    </div>
  );
};