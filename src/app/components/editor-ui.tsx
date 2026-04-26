import { ChevronDown, ChevronUp, Pencil, Trash2, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, ReactNode, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { ColorPicker as MantineColorPicker } from "@mantine/core";

export function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
  onRename,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
  onRename?: (title: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(title);
    setEditing(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 10);
  };

  const saveEdit = () => {
    if (editTitle.trim()) onRename?.(editTitle.trim());
    setEditing(false);
  };

  const showReorder = canMoveUp !== undefined || canMoveDown !== undefined;

  return (
    <div className="group/sec bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="flex items-stretch">
        {/* Reorder controls */}
        {showReorder && (
          <div className="flex flex-col justify-center border-r border-slate-100 opacity-0 group-hover/sec:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
              disabled={!canMoveUp}
              className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Move section up"
            >
              <ChevronUp size={12} className="text-slate-500" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
              disabled={!canMoveDown}
              className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Move section down"
            >
              <ChevronDown size={12} className="text-slate-500" />
            </button>
          </div>
        )}

        {/* Toggle + title */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !editing && setOpen(!open)}
          onKeyDown={(e) => e.key === "Enter" && !editing && setOpen(!open)}
          className="flex-1 flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer select-none min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && <Icon size={15} className="text-indigo-500 shrink-0" />}
            {editing ? (
              <input
                ref={inputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") setEditing(false);
                }}
                onClick={(e) => e.stopPropagation()}
                className="rounded-md px-2 py-0.5 outline-none border border-indigo-400 ring-2 ring-indigo-100 bg-white"
                style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", width: "180px" }}
              />
            ) : (
              <span
                className="truncate"
                style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}
              >
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 ml-2 shrink-0">
            {onRename && !editing && (
              <span
                role="button"
                onClick={startEdit}
                className="p-1 rounded hover:bg-slate-200 opacity-0 group-hover/sec:opacity-100 transition-all cursor-pointer"
                title="Rename section"
              >
                <Pencil size={11} className="text-slate-400" />
              </span>
            )}
            {onDelete && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1 rounded hover:bg-red-50 opacity-0 group-hover/sec:opacity-100 transition-all cursor-pointer"
                title="Delete section"
              >
                <Trash2 size={11} className="text-red-400" />
              </span>
            )}
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform ml-1 ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 pt-3 border-t border-slate-100">{children}</div>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
  span = 1,
}: {
  label: string;
  children: ReactNode;
  span?: 1 | 2;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label
        className="block mb-1.5"
        style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 ${props.className ?? ""}`}
      style={{ fontSize: "13px" }}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none placeholder:text-slate-300"
      style={{ fontSize: "13px", lineHeight: 1.65 }}
    />
  );
}

// ─── Rich Text Editor ─────────────────────────────────────────────────────────

function RTToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`p-1.5 rounded transition-colors flex items-center justify-center ${
        active
          ? "bg-indigo-100 text-indigo-600"
          : "text-slate-500 hover:bg-slate-200 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  minHeight = 80,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        underline: false, // disable StarterKit's built-in underline; we add it explicitly below
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sync external value into editor (e.g. when parent resets)
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value !== prevValueRef.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
    prevValueRef.current = value;
  }, [value, editor]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50/80">
        <RTToolBtn
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={12} />
        </RTToolBtn>
        <RTToolBtn
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={12} />
        </RTToolBtn>
        <RTToolBtn
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon size={12} />
        </RTToolBtn>

        <div className="w-px h-3.5 bg-slate-200 mx-1" />

        <RTToolBtn
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List size={12} />
        </RTToolBtn>
        <RTToolBtn
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered size={12} />
        </RTToolBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="px-3 py-2"
        style={{ minHeight: `${minHeight}px`, fontSize: "13px", lineHeight: 1.65, color: "#0f172a" }}
      />
    </div>
  );
}

export function Button({
  variant = "primary",
  children,
  ...props
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_1px_3px_rgba(99,102,241,0.3)]",
    secondary:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "text-red-500 hover:bg-red-50 hover:text-red-600",
  }[variant];

  return (
    <button
      {...props}
      className={`px-3.5 py-2 rounded-lg transition-all inline-flex items-center gap-1.5 ${styles} ${props.className ?? ""}`}
      style={{ fontSize: "13px", fontWeight: 500 }}
    >
      {children}
    </button>
  );
}

const PRESET_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#0f172a",
];

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="max-w-[220px] rounded-lg border border-slate-200 bg-white p-2.5">
      <MantineColorPicker
        format="hex"
        value={value}
        onChange={onChange}
        swatches={PRESET_COLORS}
        swatchesPerRow={8}
        size="xs"
        withPicker
      />
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
      style={{ fontSize: "13px" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
