import { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Plus,
  X,
  Loader,
  CheckCircle2,
  AlertTriangle,
  Pause,
  TrendingUp,
  BarChart3,
  Users,
  Ticket,
  Handshake,
  Sparkles,
  Pencil,
  Trash2,
  Calendar,
} from 'lucide-react';
import { kpiService } from '../services/kpiService';
import { useApp } from '../context/AppContext';

// ---- 카테고리 설정 ----
const CATEGORIES = {
  sns_growth: { label: 'SNS 성장', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  engagement: { label: '인게이지먼트', icon: BarChart3, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
  content: { label: '콘텐츠', icon: Target, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  sponsorship: { label: '스폰서십', icon: Handshake, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  event: { label: '이벤트/티켓', icon: Ticket, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' },
};

const STATUS_CONFIG = {
  active: { label: '진행 중', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { label: '달성', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  paused: { label: '보류', icon: Pause, color: 'text-gray-500', bg: 'bg-gray-50' },
};

function renderInsightText(text) {
  return text
    .split('\n')
    .map((line) => {
      if (line.startsWith('### ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2 flex items-center gap-1">${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h3 class="text-sm font-bold text-slate-800 mt-4 mb-2">${line.slice(3)}</h3>`;
      if (line.startsWith('- ')) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-700">$1</strong>');
        return `<li class="text-sm text-slate-600 leading-relaxed ml-4 mb-1 list-disc">${content}</li>`;
      }
      if (line.trim() === '') return '<div class="h-1"></div>';
      const content = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-700">$1</strong>');
      return `<p class="text-sm text-slate-600 leading-relaxed mb-1">${content}</p>`;
    })
    .join('');
}

export default function KPI() {
  const { members } = useApp();
  const [kpis, setKpis] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('all');

  // 모달
  const [showModal, setShowModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const [form, setForm] = useState({
    title: '', category: 'sns_growth', target_value: '', current_value: '',
    unit: '', period_start: '', period_end: '', status: 'active', notes: '', created_by: '',
  });
  const [saving, setSaving] = useState(false);

  // AI
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // 로드
  useEffect(() => {
    (async () => {
      try {
        const data = await kpiService.getAll();
        setKpis(data || []);
      } catch (err) {
        console.error('KPI 로드 실패:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // 필터링
  const filteredKpis = useMemo(() => {
    if (filter === 'all') return kpis;
    return kpis.filter((k) => k.category === filter);
  }, [kpis, filter]);

  // 요약 통계
  const stats = useMemo(() => {
    const total = kpis.length;
    const completed = kpis.filter((k) => k.status === 'completed').length;
    const active = kpis.filter((k) => k.status === 'active');
    const avgProgress = active.length > 0
      ? active.reduce((s, k) => s + (k.target_value > 0 ? (k.current_value / k.target_value) * 100 : 0), 0) / active.length
      : 0;
    const today = new Date();
    const atRisk = active.filter((k) => {
      const end = new Date(k.period_end);
      const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      const progress = k.target_value > 0 ? (k.current_value / k.target_value) * 100 : 0;
      return daysLeft <= 14 && progress < 80;
    }).length;
    return { total, completed, avgProgress: avgProgress.toFixed(0), atRisk };
  }, [kpis]);

  // 모달 열기
  const openCreate = () => {
    setEditingKpi(null);
    setForm({
      title: '', category: 'sns_growth', target_value: '', current_value: '',
      unit: '', period_start: '', period_end: '', status: 'active', notes: '', created_by: '',
    });
    setShowModal(true);
  };

  const openEdit = (kpi) => {
    setEditingKpi(kpi);
    setForm({
      title: kpi.title, category: kpi.category, target_value: kpi.target_value,
      current_value: kpi.current_value, unit: kpi.unit, period_start: kpi.period_start,
      period_end: kpi.period_end, status: kpi.status, notes: kpi.notes || '',
      created_by: kpi.created_by || '',
    });
    setShowModal(true);
  };

  // 저장
  const handleSave = async () => {
    if (!form.title.trim() || !form.period_start || !form.period_end) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        target_value: Number(form.target_value) || 0,
        current_value: Number(form.current_value) || 0,
        created_by: form.created_by || null,
      };
      if (editingKpi) {
        const updated = await kpiService.update(editingKpi.id, payload);
        setKpis((prev) => prev.map((k) => (k.id === editingKpi.id ? updated : k)));
      } else {
        const created = await kpiService.create(payload);
        setKpis((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (err) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    if (!confirm('이 KPI를 삭제하시겠습니까?')) return;
    try {
      await kpiService.delete(id);
      setKpis((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // AI 분석
  const handleAiAnalysis = async () => {
    if (kpis.length === 0) return;
    setAiLoading(true);
    setAiInsight('');
    try {
      const data = await kpiService.generateAiInsight(
        kpis.map((k) => ({
          title: k.title,
          category: CATEGORIES[k.category]?.label || k.category,
          target: `${k.target_value}${k.unit}`,
          current: `${k.current_value}${k.unit}`,
          progress: k.target_value > 0 ? `${((k.current_value / k.target_value) * 100).toFixed(0)}%` : '0%',
          period: `${k.period_start} ~ ${k.period_end}`,
          status: STATUS_CONFIG[k.status]?.label || k.status,
        })),
      );
      setAiInsight(data.insight || 'AI 응답을 생성하지 못했습니다.');
    } catch (err) {
      setAiInsight('AI 분석 실패: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // D-day 계산
  const getDday = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `D+${Math.abs(diff)}`, color: 'text-red-500' };
    if (diff === 0) return { text: 'D-Day', color: 'text-red-500' };
    if (diff <= 7) return { text: `D-${diff}`, color: 'text-orange-500' };
    return { text: `D-${diff}`, color: 'text-gray-400' };
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI 관리</h1>
          <p className="text-sm text-gray-500 mt-1">마케팅 목표와 진행 현황을 관리합니다</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors shadow-sm"
        >
          <Plus size={15} />
          새 KPI
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체 KPI', value: stats.total, icon: Target, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: '달성 완료', value: stats.completed, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: '평균 달성률', value: `${stats.avgProgress}%`, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: '위험 (마감임박)', value: stats.atRisk, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${card.bg}`}>
                <card.icon size={14} className={card.color} />
              </div>
              <span className="text-xs font-medium text-gray-500">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 카테고리 필터 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          전체
        </button>
        {Object.entries(CATEGORIES).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === key ? `${cfg.bg} ${cfg.color} ${cfg.border} border` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Icon size={12} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* KPI 리스트 */}
      {filteredKpis.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Target size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            {kpis.length === 0 ? 'KPI를 추가해보세요' : '해당 카테고리에 KPI가 없습니다'}
          </h3>
          <p className="text-sm text-gray-400">
            마케팅 목표를 설정하고 진행 상황을 추적하세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKpis.map((kpi) => {
            const progress = kpi.target_value > 0 ? Math.min((kpi.current_value / kpi.target_value) * 100, 100) : 0;
            const cat = CATEGORIES[kpi.category] || CATEGORIES.sns_growth;
            const statusCfg = STATUS_CONFIG[kpi.status] || STATUS_CONFIG.active;
            const dday = getDday(kpi.period_end);
            const assignee = members.find((m) => m.id === kpi.created_by);
            const CatIcon = cat.icon;

            return (
              <div key={kpi.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${cat.bg} shrink-0`}>
                      <CatIcon size={16} className={cat.color} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-800 truncate">{kpi.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.bg} ${cat.color}`}>
                          {cat.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        <span className={`text-[10px] font-medium ${dday.color}`}>{dday.text}</span>
                        {assignee && (
                          <span className="text-[10px] text-gray-400">
                            {assignee.avatar} {assignee.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(kpi)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(kpi.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 진행률 바 */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress >= 100 ? 'bg-green-500' : progress >= 70 ? 'bg-blue-500' : progress >= 40 ? 'bg-yellow-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <span className="text-sm font-bold text-gray-800">{progress.toFixed(0)}%</span>
                    <span className="text-[11px] text-gray-400 ml-1.5">
                      {kpi.current_value}{kpi.unit} / {kpi.target_value}{kpi.unit}
                    </span>
                  </div>
                </div>

                {kpi.notes && (
                  <p className="text-[11px] text-gray-400 mt-2 truncate">{kpi.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI KPI 분석 */}
      {kpis.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-sm border border-indigo-100">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-500" />
              <span className="text-sm font-semibold text-gray-700">AI KPI 분석</span>
            </div>
            <button
              onClick={handleAiAnalysis}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 shadow-sm"
            >
              <Sparkles size={13} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? '분석 중...' : aiInsight ? '다시 분석' : 'AI 분석 시작'}
            </button>
          </div>
          {aiLoading && (
            <div className="flex items-center gap-2 pb-6 justify-center text-sm text-indigo-600">
              <Loader className="w-5 h-5 animate-spin" />
              KPI 달성률을 분석하고 있습니다...
            </div>
          )}
          {!aiLoading && aiInsight && (
            <div className="px-4 pb-4">
              <div
                className="prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderInsightText(aiInsight) }}
              />
            </div>
          )}
        </div>
      )}

      {/* KPI 추가/수정 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingKpi ? 'KPI 수정' : '새 KPI 추가'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KPI 제목</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="예: 유튜브 구독자 15만 달성"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {Object.entries(CATEGORIES).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">목표값</label>
                    <input
                      type="number"
                      value={form.target_value}
                      onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                      placeholder="150000"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">현재값</label>
                    <input
                      type="number"
                      value={form.current_value}
                      onChange={(e) => setForm({ ...form, current_value: e.target.value })}
                      placeholder="128000"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">단위</label>
                    <input
                      type="text"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      placeholder="명, %, 건 등"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                    <input
                      type="date"
                      value={form.period_start}
                      onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                    <input
                      type="date"
                      value={form.period_end}
                      onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
                  <select
                    value={form.created_by}
                    onChange={(e) => setForm({ ...form, created_by: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">선택 안함</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="KPI에 대한 참고 사항"
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <><Loader size={15} className="animate-spin" /> 저장 중...</>
                  ) : (
                    editingKpi ? '수정 완료' : 'KPI 추가'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
