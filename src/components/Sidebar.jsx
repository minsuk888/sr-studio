import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  BarChart3,
  Newspaper,
  Settings,
  Flag,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/tasks', icon: ListTodo, label: '업무 관리' },
  { to: '/calendar', icon: CalendarDays, label: '캘린더' },
  { to: '/analytics', icon: BarChart3, label: 'SNS 분석' },
  { to: '/news', icon: Newspaper, label: '뉴스 스크랩' },
  { to: '/settings', icon: Settings, label: '관리자 설정' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-sidebar text-white flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
          <Flag className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-wide whitespace-nowrap">SR STUDIO</h1>
            <p className="text-[10px] text-slate-400 tracking-widest">MARKETING TOOL</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:bg-sidebar-hover hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Logout + Collapse */}
      <div className="border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-6 py-3 text-sm text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer bg-transparent"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">로그아웃</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-3 border-t border-white/10 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-transparent"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
