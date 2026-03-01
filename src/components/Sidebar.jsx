import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  BarChart3,
  Newspaper,
  Target,
  FileText,
  Settings,
  Flag,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/tasks', icon: ListTodo, label: '업무 관리' },
  { to: '/calendar', icon: CalendarDays, label: '캘린더' },
  { to: '/analytics', icon: BarChart3, label: 'SNS 분석' },
  { to: '/news', icon: Newspaper, label: '뉴스 스크랩' },
  { to: '/kpi', icon: Target, label: 'KPI 관리' },
  { to: '/meetings', icon: FileText, label: '회의록' },
  { to: '/settings', icon: Settings, label: '관리자 설정' },
];

export default function Sidebar({ isOpen, onClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (onClose) onClose();
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-sidebar text-white flex flex-col z-50
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Logo area */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-brand-600/30">
            <Flag className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-extrabold tracking-widest whitespace-nowrap">SR STUDIO</h1>
              <p className="text-[10px] text-brand-400 tracking-widest font-medium">MOTORSPORT</p>
            </div>
          )}
        </div>
        {/* Mobile close button */}
        {!collapsed && (
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer lg:hidden"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-500/15 text-brand-400 border-l-2 border-brand-500 ml-0 pl-2.5'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-2 border-transparent'
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
          className="flex items-center gap-3 w-full px-6 py-3 text-sm text-gray-400 hover:text-brand-400 hover:bg-white/5 transition-colors cursor-pointer bg-transparent"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">로그아웃</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="items-center justify-center w-full py-3 border-t border-white/10 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer bg-transparent hidden lg:flex"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
