import { Globe, Construction } from 'lucide-react';

export default function F1Tab() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center mb-4">
        <Globe size={28} className="text-gray-600" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">F1 / 해외 모터스포츠</h3>
      <p className="text-sm text-gray-400 mb-4">F1 일정, 순위, 해외 모터스포츠 뉴스</p>
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full">
        <Construction size={13} />
        Phase 2에서 구현 예정
      </div>
    </div>
  );
}
