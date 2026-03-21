import { useState } from 'react';
import { Search, Globe } from 'lucide-react';
import SuperraceMonitor from '../components/trends/SuperraceMonitor';
import F1Tab from '../components/trends/F1Tab';

const TABS = [
  { id: 'superrace', label: '슈퍼레이스 모니터링', icon: Search },
  { id: 'f1', label: 'F1 / 해외', icon: Globe },
];

export default function Trends() {
  const [activeTab, setActiveTab] = useState('superrace');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">모터스포츠 트렌드</h1>
        <p className="text-sm text-gray-400 mt-1">
          슈퍼레이스와 F1 관련 콘텐츠를 모니터링합니다
        </p>
      </div>

      {/* Tabs */}
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
      {activeTab === 'superrace' && <SuperraceMonitor />}
      {activeTab === 'f1' && <F1Tab />}
    </div>
  );
}
