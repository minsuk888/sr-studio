export function getDeadlineStatus(deadline) {
  if (!deadline) return { label: '-', cls: 'text-gray-500 bg-white/5' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: '기간만료', cls: 'text-red-400 bg-red-500/20 animate-pulse' };
  if (diff === 0) return { label: 'D-Day', cls: 'text-orange-400 bg-orange-500/20 font-bold' };
  if (diff <= 3) return { label: `D-${diff}`, cls: 'text-orange-400 bg-orange-500/20' };
  if (diff <= 7) return { label: `D-${diff}`, cls: 'text-yellow-400 bg-yellow-500/20' };
  return { label: `D-${diff}`, cls: 'text-gray-400 bg-white/5' };
}
