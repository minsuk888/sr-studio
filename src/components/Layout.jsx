import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NoticeTicker from './NoticeTicker';
import { Menu, Flag } from 'lucide-react';
// dark mode v5

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const showTicker = location.pathname !== '/news';

  return (
    <div className="flex h-screen bg-surface-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 ml-0 lg:ml-[240px] p-4 lg:p-6 overflow-auto transition-[margin] duration-300">
        {/* Mobile header bar */}
        <div className="flex items-center gap-3 mb-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Menu className="w-6 h-6 text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Flag className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-extrabold text-white tracking-wide">SUPERRACE MKT</span>
          </div>
        </div>

        {showTicker && <NoticeTicker />}
        <Outlet />
      </main>
    </div>
  );
}
