'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { BubbleMenu as BubbleMenuExtension } from '@tiptap/extension-bubble-menu';
import { useEffect, useState, useCallback } from 'react';
import { 
  MdFormatBold, 
  MdFormatItalic, 
  MdFormatUnderlined, 
  MdFormatStrikethrough,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatQuote,
  MdUndo,
  MdRedo,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
  MdFormatAlignJustify,
  MdCode,
  MdInsertLink,
  MdPlaylistAddCheck,
  MdHighlight,
  MdFormatColorText,
  MdTitle
} from 'react-icons/md';
import { motion } from 'framer-motion';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxLength?: number;
  disabled?: boolean;
}

const ToolbarButton = ({ 
  onClick, 
  active, 
  disabled, 
  title, 
  children 
}: { 
  onClick: () => void; 
  active?: boolean; 
  disabled?: boolean; 
  title: string; 
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded-md transition-all duration-200 ${
      active
        ? 'bg-blue-100 text-blue-600'
        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    title={title}
  >
    {children}
  </button>
);

const VerticalDivider = () => <div className="w-px h-6 bg-gray-200 mx-1 self-center" />;

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  minHeight = '200px',
  maxLength,
  disabled = false,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      BubbleMenuExtension,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-4 py-4 text-gray-700 leading-relaxed`,
        style: `min-height: ${minHeight}`,
      },
    },
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
  });

  // value가 외부에서 변경되면 에디터 업데이트
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL을 입력하세요', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-gray-200 rounded-xl bg-gray-50 animate-pulse" style={{ minHeight }}>
        <div className="h-11 bg-gray-100 rounded-t-xl border-b border-gray-200" />
      </div>
    );
  }

  const currentLength = editor.getText().length;
  const isOverLimit = maxLength ? currentLength > maxLength : false;

  return (
    <div 
      className={`group border rounded-xl overflow-hidden transition-all duration-300 shadow-sm ${
        isFocused 
          ? 'border-blue-400 ring-2 ring-blue-50/50' 
          : 'border-gray-200 hover:border-gray-300'
      } ${disabled ? 'bg-gray-50' : 'bg-white'}`}
    >
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-100 bg-white sticky top-0 z-10">
        {/* History Group */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().undo().run()} 
            disabled={disabled || !editor.can().undo()}
            title="실행 취소 (Ctrl+Z)"
          >
            <MdUndo size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().redo().run()} 
            disabled={disabled || !editor.can().redo()}
            title="다시 실행 (Ctrl+Shift+Z)"
          >
            <MdRedo size={20} />
          </ToolbarButton>
        </div>

        <VerticalDivider />

        {/* Text Style Group */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            active={editor.isActive('heading', { level: 2 })}
            disabled={disabled}
            title="대제목 (Ctrl+Alt+2)"
          >
            <span className="font-bold flex items-center"><MdTitle size={18} />2</span>
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
            active={editor.isActive('heading', { level: 3 })}
            disabled={disabled}
            title="소제목 (Ctrl+Alt+3)"
          >
            <span className="font-bold flex items-center"><MdTitle size={18} />3</span>
          </ToolbarButton>
        </div>

        <VerticalDivider />

        {/* Formatting Group */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            active={editor.isActive('bold')}
            disabled={disabled}
            title="굵게 (Ctrl+B)"
          >
            <MdFormatBold size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            active={editor.isActive('italic')}
            disabled={disabled}
            title="기울임 (Ctrl+I)"
          >
            <MdFormatItalic size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            active={editor.isActive('underline')}
            disabled={disabled}
            title="밑줄 (Ctrl+U)"
          >
            <MdFormatUnderlined size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleStrike().run()} 
            active={editor.isActive('strike')}
            disabled={disabled}
            title="취소선 (Ctrl+Shift+X)"
          >
            <MdFormatStrikethrough size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHighlight().run()} 
            active={editor.isActive('highlight')}
            disabled={disabled}
            title="하이라이트"
          >
            <MdHighlight size={18} />
          </ToolbarButton>
        </div>

        <VerticalDivider />

        {/* List Group */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            active={editor.isActive('bulletList')}
            disabled={disabled}
            title="글머리 기호 목록"
          >
            <MdFormatListBulleted size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            active={editor.isActive('orderedList')}
            disabled={disabled}
            title="번호 매기기 목록"
          >
            <MdFormatListNumbered size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleTaskList().run()} 
            active={editor.isActive('taskList')}
            disabled={disabled}
            title="할 일 목록"
          >
            <MdPlaylistAddCheck size={20} />
          </ToolbarButton>
        </div>

        <VerticalDivider />

        {/* Align Group */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('left').run()} 
            active={editor.isActive({ textAlign: 'left' })}
            disabled={disabled}
            title="왼쪽 정렬"
          >
            <MdFormatAlignLeft size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('center').run()} 
            active={editor.isActive({ textAlign: 'center' })}
            disabled={disabled}
            title="가운데 정렬"
          >
            <MdFormatAlignCenter size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('right').run()} 
            active={editor.isActive({ textAlign: 'right' })}
            disabled={disabled}
            title="오른쪽 정렬"
          >
            <MdFormatAlignRight size={20} />
          </ToolbarButton>
        </div>

        <VerticalDivider />

        {/* Insert Group */}
        <div className="flex items-center">
          <ToolbarButton 
            onClick={setLink} 
            active={editor.isActive('link')}
            disabled={disabled}
            title="링크 삽입"
          >
            <MdInsertLink size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            active={editor.isActive('blockquote')}
            disabled={disabled}
            title="인용구"
          >
            <MdFormatQuote size={20} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleCodeBlock().run()} 
            active={editor.isActive('codeBlock')}
            disabled={disabled}
            title="코드 블록"
          >
            <MdCode size={20} />
          </ToolbarButton>
        </div>

        <div className="flex-1" />

        {/* 글자 수 카운터 */}
        {maxLength && (
          <div className="px-3">
            <div className={`text-[11px] font-medium transition-colors ${
              isOverLimit ? 'text-red-500' : 'text-gray-400'
            }`}>
              {currentLength.toLocaleString()} / {maxLength.toLocaleString()}
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
              <motion.div 
                className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-blue-400'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((currentLength / maxLength) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bubble Menu (텍스트 선택 시 나타남) */}
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 p-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
        >
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            active={editor.isActive('bold')}
            title="굵게"
          >
            <MdFormatBold size={18} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            active={editor.isActive('italic')}
            title="기울임"
          >
            <MdFormatItalic size={18} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            active={editor.isActive('underline')}
            title="밑줄"
          >
            <MdFormatUnderlined size={18} />
          </ToolbarButton>
          <ToolbarButton 
            onClick={setLink} 
            active={editor.isActive('link')}
            title="링크"
          >
            <MdInsertLink size={18} />
          </ToolbarButton>
        </BubbleMenu>
      )}

      {/* 에디터 영역 */}
      <div className="relative overflow-auto" style={{ minHeight }}>
        <EditorContent editor={editor} className="prose-editor" />
      </div>

      {/* 바닥글 (선택사항) */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
        <div className="text-[10px] text-gray-400 flex gap-3">
          <span><b>Bold:</b> Ctrl+B</span>
          <span><b>List:</b> Ctrl+Shift+8</span>
          <span><b>Link:</b> Ctrl+K</span>
        </div>
        {disabled && (
          <div className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            읽기 전용 모드
          </div>
        )}
      </div>
    </div>
  );
}
