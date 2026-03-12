import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ImagePlus,
  Palette,
  X,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

const PRESET_COLORS = [
  { label: '빨강', value: '#ef4444' },
  { label: '주황', value: '#f97316' },
  { label: '노랑', value: '#eab308' },
  { label: '초록', value: '#22c55e' },
  { label: '파랑', value: '#3b82f6' },
  { label: '남색', value: '#6366f1' },
  { label: '보라', value: '#a855f7' },
  { label: '분홍', value: '#ec4899' },
  { label: '흰색', value: '#f3f4f6' },
  { label: '회색', value: '#9ca3af' },
];

function ToolbarButton({ onClick, isActive, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1 rounded transition-colors cursor-pointer ${
        isActive
          ? 'bg-brand-500/20 text-brand-400'
          : 'text-gray-400 hover:bg-white/10 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function ColorPicker({ editor, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 p-2 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-50 grid grid-cols-5 gap-1.5"
    >
      {PRESET_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => {
            editor.chain().focus().setColor(c.value).run();
            onClose();
          }}
          className="w-6 h-6 rounded-full border border-surface-600 hover:scale-110 transition-transform cursor-pointer"
          style={{ backgroundColor: c.value }}
        />
      ))}
      <button
        type="button"
        title="색상 초기화"
        onClick={() => {
          editor.chain().focus().unsetColor().run();
          onClose();
        }}
        className="w-6 h-6 rounded-full border border-surface-600 hover:scale-110 transition-transform cursor-pointer bg-surface-700 flex items-center justify-center"
      >
        <X size={10} className="text-gray-400" />
      </button>
    </div>
  );
}

export default function AgendaEditor({ content = '', onChange, onConfirm, onCancel, compact = false }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: compact
          ? 'prose prose-invert prose-sm max-w-none px-3 py-2 min-h-[60px] focus:outline-none text-gray-200 leading-relaxed text-xs'
          : 'prose prose-invert prose-sm max-w-none px-3 py-2 min-h-[100px] focus:outline-none text-gray-200 leading-relaxed',
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          Array.from(files).forEach((file) => {
            if (file.type.startsWith('image/')) {
              handleImageFile(file);
            }
          });
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) handleImageFile(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  const handleImageFile = useCallback(
    (file) => {
      if (!editor) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        editor.chain().focus().setImage({ src: e.target.result }).run();
      };
      reader.readAsDataURL(file);
    },
    [editor],
  );

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
      }
      e.target.value = '';
    },
    [handleImageFile],
  );

  const toggleColorPicker = useCallback(() => {
    setShowColorPicker((prev) => !prev);
  }, []);

  if (!editor) return null;

  return (
    <div className="border border-surface-600 rounded-lg overflow-hidden bg-surface-900">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-surface-700 bg-surface-800 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="굵게"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="기울임"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="밑줄"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-surface-700 mx-0.5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="제목 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="제목 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="제목 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-surface-700 mx-0.5" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="순서 없는 목록"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="순서 목록"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-surface-700 mx-0.5" />

        <div className="relative">
          <ToolbarButton
            onClick={toggleColorPicker}
            isActive={showColorPicker}
            title="텍스트 색상"
          >
            <Palette className="w-3.5 h-3.5" />
          </ToolbarButton>
          {showColorPicker && (
            <ColorPicker editor={editor} onClose={() => setShowColorPicker(false)} />
          )}
        </div>

        <ToolbarButton onClick={handleImageUpload} isActive={false} title="이미지 삽입">
          <ImagePlus className="w-3.5 h-3.5" />
        </ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Confirm/Cancel buttons */}
      {onConfirm && (
        <div className="flex items-center justify-end gap-2 px-2 py-1.5 border-t border-surface-700 bg-surface-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200 rounded transition-colors cursor-pointer"
            >
              취소
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirm(editor.getHTML())}
            className="px-3 py-1 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600 transition-colors cursor-pointer"
          >
            추가
          </button>
        </div>
      )}
    </div>
  );
}
