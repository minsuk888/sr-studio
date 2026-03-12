import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  ImagePlus,
  Palette,
  X,
  Type,
  ChevronDown,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

// ---- Custom FontSize extension ----
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return { types: ['textStyle'] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// ---- Resizable Image extension ----
function ResizableImageComponent({ node, updateAttributes, selected }) {
  const [resizing, setResizing] = useState(false);
  const imgRef = useRef(null);
  const startRef = useRef({ x: 0, width: 0 });

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;
    startRef.current = { x: e.clientX, width: img.offsetWidth };
    setResizing(true);
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const onMouseMove = (e) => {
      const diff = e.clientX - startRef.current.x;
      const newWidth = Math.max(50, startRef.current.width + diff);
      updateAttributes({ width: `${newWidth}px` });
    };

    const onMouseUp = () => setResizing(false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizing, updateAttributes]);

  return (
    <NodeViewWrapper className="relative group my-1">
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        style={{ width: node.attrs.width || 'auto', maxWidth: '100%', height: 'auto', display: 'block' }}
        className={`rounded ${selected ? 'ring-2 ring-brand-500' : ''}`}
        draggable={false}
      />
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
        title="드래그하여 크기 조절"
      >
        <svg viewBox="0 0 16 16" className="w-full h-full text-brand-400 drop-shadow">
          <path d="M14 14H10M14 14V10M14 14L8 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </NodeViewWrapper>
  );
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width') || el.style.width || null,
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { width: attrs.width, style: `width: ${attrs.width}; height: auto;` };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});

// ---- Constants ----
const FONT_SIZES = [
  { label: '8pt', value: '8pt' },
  { label: '9pt', value: '9pt' },
  { label: '10pt', value: '10pt' },
  { label: '11pt', value: '11pt' },
  { label: '12pt', value: '12pt' },
  { label: '13pt', value: '13pt' },
  { label: '14pt', value: '14pt' },
  { label: '15pt', value: '15pt' },
  { label: '16pt', value: '16pt' },
  { label: '17pt', value: '17pt' },
  { label: '18pt', value: '18pt' },
  { label: '19pt', value: '19pt' },
  { label: '20pt', value: '20pt' },
];

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

// ---- Sub-components ----
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

function FontSizePicker({ editor, onClose }) {
  const ref = useRef(null);
  const currentSize = editor.getAttributes('textStyle').fontSize || null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 py-1 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-50 max-h-52 overflow-y-auto w-20"
    >
      <button
        type="button"
        onClick={() => {
          editor.chain().focus().unsetFontSize().run();
          onClose();
        }}
        className={`w-full text-left px-3 py-1 text-xs hover:bg-white/10 cursor-pointer ${
          !currentSize ? 'text-brand-400 font-semibold' : 'text-gray-400'
        }`}
      >
        기본
      </button>
      {FONT_SIZES.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => {
            editor.chain().focus().setFontSize(s.value).run();
            onClose();
          }}
          className={`w-full text-left px-3 py-1 text-xs hover:bg-white/10 cursor-pointer ${
            currentSize === s.value ? 'text-brand-400 font-semibold' : 'text-gray-300'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({ editor, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
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

// ---- Main component ----
export default function AgendaEditor({ content = '', onChange, onConfirm, onCancel, compact = false }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
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

  if (!editor) return null;

  const currentFontSize = editor.getAttributes('textStyle').fontSize || '기본';

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

        {/* Font Size Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFontSizePicker((prev) => !prev)}
            title="글자 크기"
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
              showFontSizePicker
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-gray-400 hover:bg-white/10 hover:text-gray-200'
            }`}
          >
            <Type className="w-3 h-3" />
            <span className="min-w-[24px] text-center">{currentFontSize}</span>
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {showFontSizePicker && (
            <FontSizePicker editor={editor} onClose={() => setShowFontSizePicker(false)} />
          )}
        </div>

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
            onClick={() => setShowColorPicker((prev) => !prev)}
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
