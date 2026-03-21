import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  ArrowLeft,
  Loader,
  Pin,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Save,
  X,
} from 'lucide-react';
import { noticesService } from '../services/noticesService';
import RichEditor from '../components/RichEditor';
import { useAuth } from '../context/AuthContext';

export default function Notices() {
  const { currentUser, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notices, setNotices] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // View: 'list' | 'write' | 'detail'
  const [view, setView] = useState('list');
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPinned, setFormPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadNotices = useCallback(async () => {
    try {
      const data = await noticesService.getAll();
      setNotices(data || []);
    } catch (error) {
      console.error('Failed to load notices:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  // Handle query param for direct notice view (from ticker click)
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && loaded && notices.length > 0) {
      const notice = notices.find((n) => String(n.id) === viewId);
      if (notice) {
        setSelectedNotice(notice);
        setView('detail');
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, loaded, notices, setSearchParams]);

  const handleNew = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormPinned(false);
    setView('write');
  };

  const handleEdit = (notice) => {
    setEditingId(notice.id);
    setFormTitle(notice.title);
    setFormContent(notice.content);
    setFormPinned(notice.is_pinned);
    setView('write');
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        content: formContent,
        is_pinned: formPinned,
        ...(editingId ? {} : { author_name: currentUser?.name || '' }),
      };

      if (editingId) {
        await noticesService.update(editingId, payload);
      } else {
        await noticesService.create(payload);
      }

      await loadNotices();
      setView('list');
    } catch (error) {
      console.error('Failed to save notice:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await noticesService.delete(id);
      await loadNotices();
      if (view === 'detail') setView('list');
    } catch (error) {
      console.error('Failed to delete notice:', error);
    }
  };

  const handleToggleActive = async (notice) => {
    try {
      await noticesService.update(notice.id, { is_active: !notice.is_active });
      await loadNotices();
    } catch (error) {
      console.error('Failed to toggle notice:', error);
    }
  };

  const handleTogglePin = async (notice) => {
    try {
      await noticesService.update(notice.id, { is_pinned: !notice.is_pinned });
      await loadNotices();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const openDetail = (notice) => {
    setSelectedNotice(notice);
    setView('detail');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        데이터를 불러오는 중...
      </div>
    );
  }

  // --- DETAIL VIEW ---
  if (view === 'detail' && selectedNotice) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </button>
        </div>

        <div className="bg-surface-800 rounded-xl shadow-sm border border-surface-700">
          <div className="px-6 py-5 border-b border-surface-700">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {selectedNotice.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold">
                      <Pin className="w-3 h-3" />
                      고정
                    </span>
                  )}
                  {!selectedNotice.is_active && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 font-semibold">
                      비공개
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">{selectedNotice.title}</h2>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(selectedNotice.created_at)}
                  </span>
                  {selectedNotice.author_name && (
                    <span>{selectedNotice.author_name}</span>
                  )}
                </div>
              </div>
              {(isAdmin || selectedNotice.author_name === currentUser?.name) && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(selectedNotice)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 bg-surface-700 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(selectedNotice.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>
          <div
            className="px-6 py-5 prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: selectedNotice.content }}
          />
        </div>
      </div>
    );
  }

  // --- WRITE VIEW ---
  if (view === 'write') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </button>
          <h1 className="text-lg font-bold text-white">
            {editingId ? '공지 수정' : '새 공지 작성'}
          </h1>
        </div>

        <div className="bg-surface-800 rounded-xl shadow-sm border border-surface-700 p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">제목</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="공지 제목을 입력하세요"
              className="w-full px-4 py-2.5 rounded-lg border border-surface-700 text-sm bg-surface-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
            />
          </div>

          {/* Content (Rich Editor) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">내용</label>
            <RichEditor content={formContent} onChange={setFormContent} />
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formPinned}
                onChange={(e) => setFormPinned(e.target.checked)}
                className="rounded border-surface-600 bg-surface-900 text-brand-500 focus:ring-brand-500/30"
              />
              <span className="text-sm text-gray-300 flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                상단 고정
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-surface-700">
            <button
              onClick={handleSave}
              disabled={!formTitle.trim() || saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? '저장 중...' : editingId ? '수정 완료' : '등록'}
            </button>
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-gray-400 bg-surface-700 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-brand-500" />
            공지사항
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            전체 공지사항을 관리합니다 ({notices.length}건)
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          새 공지 작성
        </button>
      </div>

      {/* Notice Cards */}
      {notices.length === 0 ? (
        <div className="bg-surface-800 rounded-xl shadow-sm border border-surface-700 p-12 text-center">
          <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">등록된 공지사항이 없습니다</p>
          <p className="text-gray-500 text-xs mt-1">새 공지를 작성해보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`bg-surface-800 rounded-xl shadow-sm border transition-colors ${
                notice.is_active
                  ? 'border-surface-700 hover:border-surface-600'
                  : 'border-surface-700/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Main content area - clickable */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => openDetail(notice)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {notice.is_pinned && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold shrink-0">
                        <Pin className="w-2.5 h-2.5" />
                        고정
                      </span>
                    )}
                    {!notice.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-500/15 text-gray-500 font-semibold shrink-0">
                        비공개
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-white truncate">
                      {notice.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(notice.created_at)}
                    </span>
                    {notice.author_name && <span>{notice.author_name}</span>}
                  </div>
                </div>

                {/* Action buttons */}
                {(isAdmin || notice.author_name === currentUser?.name) && (
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleTogglePin(notice)}
                          title={notice.is_pinned ? '고정 해제' : '상단 고정'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            notice.is_pinned
                              ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                          }`}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(notice)}
                          title={notice.is_active ? '비공개로 전환' : '공개로 전환'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            notice.is_active
                              ? 'text-green-400 hover:bg-white/5'
                              : 'text-gray-500 hover:bg-white/5'
                          }`}
                        >
                          {notice.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEdit(notice)}
                      title="수정"
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(notice.id)}
                      title="삭제"
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
