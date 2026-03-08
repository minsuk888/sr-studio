import { useState } from 'react';
import { Target, Ticket } from 'lucide-react';
import KpiContent from '../components/kpi/KpiContent';
import TicketSales from '../components/kpi/TicketSales';

const TABS = [
  { id: 'kpi', label: 'KPI 관리', icon: Target },
  { id: 'tickets', label: '티켓 판매', icon: Ticket },
];

export default function KPI() {
  const [activeTab, setActiveTab] = useState('kpi');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">KPI 관리</h1>
        <p className="text-sm text-gray-400 mt-1">마케팅 목표와 진행 현황을 관리합니다</p>
      </div>

      {/* Tabs - 타이틀 아래 독립 행 */}
      <div className="flex items-center gap-1.5 bg-surface-800 rounded-xl p-1.5 border border-surface-700">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'kpi' && <KpiContent />}
      {activeTab === 'tickets' && <TicketSales />}
    </div>
  );
}
