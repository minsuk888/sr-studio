import { useState } from 'react';
import { ShoppingBag, Package, BarChart3, ClipboardList, TrendingUp } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MdItemsTab from '../components/md/MdItemsTab';
import MdStockTab from '../components/md/MdStockTab';
import MdLogsTab from '../components/md/MdLogsTab';
import MdRevenueTab from '../components/md/MdRevenueTab';

const TABS = [
  { id: 'items', label: '품목 관리', icon: Package },
  { id: 'stock', label: '재고 현황', icon: BarChart3 },
  { id: 'logs', label: '판매/자소 기록', icon: ClipboardList },
  { id: 'revenue', label: '수익 분석', icon: TrendingUp },
];

export default function MdInventory() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;

  const [activeTab, setActiveTab] = useState('items');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-brand-500" />
          MD 재고/판매 관리
        </h1>
        <p className="text-sm text-gray-400 mt-1">레이싱팀 굿즈 재고와 판매 현황을 관리합니다</p>
      </div>

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

      {activeTab === 'items' && <MdItemsTab />}
      {activeTab === 'stock' && <MdStockTab />}
      {activeTab === 'logs' && <MdLogsTab />}
      {activeTab === 'revenue' && <MdRevenueTab />}
    </div>
  );
}
