import { useEffect, useRef, useState } from "react";
import {
  Palette,
  User,
  FileText,
  Briefcase,
  Folder,
  GraduationCap,
  Sparkles,
  Languages,
  Plus,
  Trash2,
  ArrowLeft,
  Download,
  Check,
  ChevronUp,
  ChevronDown,
  Hash,
  LayoutTemplate,
  Image,
  X,
} from "lucide-react";
import { ResumePreview, ResumeData, ResumePreviewHandle } from "./resume-preview";
import type { ResumeDocument } from "../document-store";
import { Section, Field, Input, Textarea, Button, ColorPicker, Select, RichTextEditor } from "./editor-ui";

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter (Modern)" },
  { value: "Georgia, serif", label: "Georgia (Classic)" },
  { value: "'IBM Plex Sans', sans-serif", label: "IBM Plex Sans" },
  { value: "Roboto, sans-serif", label: "Roboto (Neutral)" },
];

const DEFAULT_SECTION_TITLES: Record<string, string> = {
  summary: "Profile Summary",
  experience: "Work Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
};

const SECTION_ICONS: Record<string, any> = {
  summary: FileText,
  experience: Briefcase,
  projects: Folder,
  education: GraduationCap,
  skills: Sparkles,
  languages: Languages,
};

const BUILTIN_IDS = new Set(["summary", "experience", "projects", "education", "skills", "languages"]);
const DEFAULT_SECTION_ORDER = ["summary", "experience", "projects", "education", "skills", "languages"] as const;
const DEFAULT_PHOTO_ADJUST = { x: 0, y: 0, scale: 1 };
const MIN_PHOTO_SCALE = 1;
const MAX_PHOTO_SCALE = 3;

const initial: ResumeData = {
  accent: "#6366f1",
  headerBackground: "#0f172a",
  font: "Inter, sans-serif",
  fontSize: 100,
  template: "classic",
  sectionTitles: { ...DEFAULT_SECTION_TITLES },
  sectionOrder: ["summary", "experience", "projects", "education", "skills", "languages"],
  personal: {
    name: "Alex Morgan",
    title: "Senior Product Designer",
    email: "alex.morgan@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    website: "alexmorgan.design",
    linkedin: "linkedin.com/in/alexmorgan",
    photo: "",
    photoAdjust: { ...DEFAULT_PHOTO_ADJUST },
  },
  summary:
    "<p>Product designer with 7+ years crafting intuitive digital experiences for high-growth SaaS companies. Passionate about design systems, accessibility, and bridging research with execution.</p>",
  experience: [
    {
      id: "1",
      role: "Senior Product Designer",
      company: "Linear",
      location: "Remote",
      start: "2022",
      end: "Present",
      description:
        "<p>Led redesign of the core issue tracking flow, improving task creation speed by 38%. Shipped the company's first public design system used by 200+ engineers.</p>",
    },
    {
      id: "2",
      role: "Product Designer",
      company: "Notion",
      location: "San Francisco",
      start: "2019",
      end: "2022",
      description:
        "<p>Owned collaboration features end-to-end. Partnered with research to launch Notion AI's writing assistant, adopted by 1M+ users in first quarter.</p>",
    },
  ],
  education: [
    {
      id: "1",
      degree: "B.S. Human-Computer Interaction",
      school: "Carnegie Mellon University",
      start: "2014",
      end: "2018",
      description: "<p>Focus on design research methods and interaction design. Graduated with honors.</p>",
    },
  ],
  projects: [
    {
      id: "1",
      name: "CVLab Resume Builder",
      link: "github.com/alexmorgan/cvlab",
      start: "2025",
      end: "2026",
      technologies: "React, TypeScript, Tailwind",
      description:
        "<p>Built a resume and cover-letter editor with live preview, section reordering, and ATS-friendly PDF export.</p>",
    },
  ],
  skills: ["Figma", "Design Systems", "Prototyping", "User Research", "A11y", "React", "TypeScript"],
  languages: [
    { id: "1", name: "English", level: "Native" },
    { id: "2", name: "Spanish", level: "Fluent" },
  ],
  customSections: [],
};

function normalizeResumeData(source: ResumeData | undefined): ResumeData {
  const data = source ?? initial;
  const customSections = data.customSections ?? [];
  const customIds = customSections.map((section) => section.id);

  const rawOrder = Array.isArray(data.sectionOrder) && data.sectionOrder.length
    ? data.sectionOrder
    : [...DEFAULT_SECTION_ORDER];
  const orderWithoutProjects = rawOrder.filter((id) => id !== "projects");
  const hasProjects = rawOrder.includes("projects");

  let sectionOrder = orderWithoutProjects;
  if (!hasProjects) {
    const experienceIndex = orderWithoutProjects.indexOf("experience");
    const insertAt = experienceIndex >= 0 ? experienceIndex + 1 : Math.min(2, orderWithoutProjects.length);
    sectionOrder = [
      ...orderWithoutProjects.slice(0, insertAt),
      "projects",
      ...orderWithoutProjects.slice(insertAt),
    ];
  }

  const missingCustomIds = customIds.filter((id) => !sectionOrder.includes(id));
  if (missingCustomIds.length) sectionOrder = [...sectionOrder, ...missingCustomIds];

  return {
    ...data,
    template: data.template === "minimal" ? "minimal" : "classic",
    headerBackground: data.headerBackground ?? "#0f172a",
    fontSize: data.fontSize ?? 100,
    personal: {
      ...initial.personal,
      ...(data.personal ?? {}),
      photoAdjust: {
        ...DEFAULT_PHOTO_ADJUST,
        ...(data.personal?.photoAdjust ?? {}),
      },
    },
    sectionTitles: { ...DEFAULT_SECTION_TITLES, ...(data.sectionTitles ?? {}) },
    sectionOrder,
    experience: data.experience ?? [],
    education: data.education ?? [],
    projects: data.projects ?? [],
    skills: data.skills ?? [],
    languages: data.languages ?? [],
    customSections,
  };
}

// ─── Template Picker ──────────────────────────────────────────────────────────

function TemplatePicker({
  value,
  onChange,
  accent,
}: {
  value: string;
  onChange: (v: "classic" | "minimal") => void;
  accent: string;
}) {
  const templates: { id: "classic" | "minimal"; name: string }[] = [
    { id: "classic", name: "Classic" },
    { id: "minimal", name: "Minimal" },
  ];
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pickerRef.current?.style.setProperty("--accent", accent);
  }, [accent]);

  return (
    <div ref={pickerRef} className="grid grid-cols-2 gap-2 [--accent:#6366f1]">
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`relative rounded-lg border-2 overflow-hidden transition-all ${
            value === t.id
              ? "border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          {/* Mini thumbnail */}
          <div className="aspect-[3/4] w-full bg-white p-[6px]">
            {t.id === "classic" && <ClassicThumb />}
            {t.id === "minimal" && <MinimalThumb />}
          </div>
          <div className={`py-1.5 text-center border-t text-[11px] font-semibold ${
              value === t.id ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-slate-50 border-slate-100 text-slate-500"
            }`}>
            {t.name}
          </div>
          {value === t.id && (
            <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
              <Check size={9} className="text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function ClassicThumb() {
  return (
    <div className="flex h-full flex-col gap-1 text-[0]">
      <div className="h-[7px] w-[65%] rounded-[2px] bg-slate-900" />
      <div className="h-[4px] w-[42%] rounded-[1px] bg-[color:var(--accent)]" />
      <div className="my-[2px] h-[1.5px] w-full bg-[color:var(--accent)]" />
      <div className="h-[3px] w-[28%] rounded-[1px] bg-[color:var(--accent)] opacity-70" />
      <div className="mt-px h-[2.5px] w-[88%] rounded-[1px] bg-slate-300" />
      <div className="h-[2.5px] w-[72%] rounded-[1px] bg-slate-300" />
      <div className="mt-[3px] h-[3px] w-[28%] rounded-[1px] bg-[color:var(--accent)] opacity-70" />
      <div className="mt-px h-[2.5px] w-[92%] rounded-[1px] bg-slate-300" />
      <div className="h-[2.5px] w-[78%] rounded-[1px] bg-slate-300" />
      <div className="h-[2.5px] w-[85%] rounded-[1px] bg-slate-300" />
    </div>
  );
}

function ModernThumb() {
  return (
    <div className="flex h-full overflow-hidden rounded text-[0]">
      <div className="flex w-[36%] flex-col gap-[2.5px] bg-[color:var(--accent)] px-1 py-[5px]">
        <div className="h-[5px] w-[80%] rounded-[1px] bg-white/90" />
        <div className="h-[3px] w-[60%] rounded-[1px] bg-white/60" />
        <div className="h-[6px]" />
        <div className="h-[2px] w-[85%] rounded-[1px] bg-white/50" />
        <div className="h-[2px] w-[70%] rounded-[1px] bg-white/40" />
        <div className="h-[2px] w-[75%] rounded-[1px] bg-white/40" />
        <div className="h-[5px]" />
        <div className="h-[2px] w-[60%] rounded-[1px] bg-white/50" />
        <div className="h-[2px] w-[50%] rounded-[1px] bg-white/30" />
      </div>
      <div className="flex flex-1 flex-col gap-[2.5px] bg-white px-[5px] py-[5px]">
        <div className="h-[3px] w-[55%] rounded-[1px] bg-[color:var(--accent)] opacity-80" />
        <div className="h-[2px] w-[85%] rounded-[1px] bg-slate-300" />
        <div className="h-[2px] w-[72%] rounded-[1px] bg-slate-300" />
        <div className="h-[5px]" />
        <div className="h-[3px] w-[55%] rounded-[1px] bg-[color:var(--accent)] opacity-80" />
        <div className="h-[2px] w-[90%] rounded-[1px] bg-slate-300" />
        <div className="h-[2px] w-[80%] rounded-[1px] bg-slate-300" />
        <div className="h-[2px] w-[65%] rounded-[1px] bg-slate-300" />
      </div>
    </div>
  );
}

function MinimalThumb() {
  return (
    <div className="flex h-full flex-col gap-1 text-[0]">
      <div className="h-[8px] w-[58%] rounded-[2px] bg-slate-900" />
      <div className="h-[3.5px] w-[38%] rounded-[1px] bg-slate-400" />
      <div className="my-[2px] mb-[4px] h-[3px] w-[28px] rounded-[2px] bg-[color:var(--accent)]" />
      <div className="h-px w-full bg-slate-200" />
      <div className="mt-[2px] h-[2.5px] w-[22%] rounded-[1px] bg-slate-400" />
      <div className="mt-px h-[2px] w-[85%] rounded-[1px] bg-slate-200" />
      <div className="h-[2px] w-[70%] rounded-[1px] bg-slate-200" />
      <div className="mt-[3px] h-px w-full bg-slate-200" />
      <div className="mt-[2px] h-[2.5px] w-[22%] rounded-[1px] bg-slate-400" />
      <div className="mt-px h-[2px] w-[80%] rounded-[1px] bg-slate-200" />
    </div>
  );
}

// ─── Entry card reorder buttons ───────────────────────────────────────────────

function EntryHeader({
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[12px] font-semibold text-slate-500">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="p-1 rounded hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          title="Move up"
        >
          <ChevronUp size={13} className="text-slate-500" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="p-1 rounded hover:bg-slate-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          title="Move down"
        >
          <ChevronDown size={13} className="text-slate-500" />
        </button>
        <Button variant="danger" onClick={onDelete} className="!px-2 !py-1">
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  );
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function ResumeBuilder({
  document,
  onBack,
  onSave,
  onDelete,
}: {
  document: ResumeDocument;
  onBack: () => void;
  onSave: (document: ResumeDocument) => void;
  onDelete: (id: string) => void;
}) {
  const [data, setData] = useState<ResumeData>(() => normalizeResumeData(document.data ?? initial));
  const [title, setTitle] = useState(document.title);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [saved, setSaved] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [photoDragging, setPhotoDragging] = useState(false);
  const previewRef = useRef<ResumePreviewHandle>(null);
  const photoDragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    setData(normalizeResumeData(document.data));
    setTitle(document.title);
    setSaved(true);
    setDirty(false);
  }, [document.id]);

  const update = (fn: (d: ResumeData) => ResumeData) => {
    setData(fn);
    setDirty(true);
    setSaved(false);
  };

  const persistDocument = () => {
    onSave({
      ...document,
      title: title.trim() || document.title,
      data,
      updatedAt: new Date().toISOString(),
    });
    setDirty(false);
    setSaved(true);
  };

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const photoAdjust = {
    ...DEFAULT_PHOTO_ADJUST,
    ...(data.personal.photoAdjust ?? {}),
  };

  const updatePhotoAdjust = (next: Partial<typeof DEFAULT_PHOTO_ADJUST>) => {
    update((d) => ({
      ...d,
      personal: {
        ...d.personal,
        photoAdjust: {
          ...DEFAULT_PHOTO_ADJUST,
          ...(d.personal.photoAdjust ?? {}),
          ...next,
        },
      },
    }));
  };

  const handlePhotoUpload = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      update((d) => ({
        ...d,
        personal: { ...d.personal, photo: reader.result as string, photoAdjust: { ...DEFAULT_PHOTO_ADJUST } },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!data.personal.photo) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    photoDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: photoAdjust.x,
      originY: photoAdjust.y,
    };
    setPhotoDragging(true);
  };

  const handlePhotoPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = photoDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    updatePhotoAdjust({
      x: drag.originX + deltaX,
      y: drag.originY + deltaY,
    });
  };

  const handlePhotoPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (photoDragRef.current?.pointerId === event.pointerId) {
      photoDragRef.current = null;
      setPhotoDragging(false);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    if (!dirty) return;

    const timeout = window.setTimeout(() => {
      persistDocument();
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [data, dirty, title]);

  const handleBack = () => {
    persistDocument();
    onBack();
  };

  const handleDelete = () => {
    if (window.confirm("Delete this resume? This cannot be undone.")) {
      onDelete(document.id);
      onBack();
    }
  };

  // Move a section up/down in sectionOrder
  const moveSection = (idx: number, dir: -1 | 1) => {
    update((d) => {
      const order = [...d.sectionOrder];
      const next = idx + dir;
      if (next < 0 || next >= order.length) return d;
      [order[idx], order[next]] = [order[next], order[idx]];
      return { ...d, sectionOrder: order };
    });
  };

  // Move experience entry
  const moveExp = (idx: number, dir: -1 | 1) => {
    update((d) => {
      const arr = [...d.experience];
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return d;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...d, experience: arr };
    });
  };

  // Move education entry
  const moveEdu = (idx: number, dir: -1 | 1) => {
    update((d) => {
      const arr = [...d.education];
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return d;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...d, education: arr };
    });
  };

  // Move projects entry
  const moveProject = (idx: number, dir: -1 | 1) => {
    update((d) => {
      const arr = [...d.projects];
      const next = idx + dir;
      if (next < 0 || next >= arr.length) return d;
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...d, projects: arr };
    });
  };

  // Rename a section
  const renameSection = (id: string, title: string) => {
    update((d) => ({
      ...d,
      sectionTitles: { ...d.sectionTitles, [id]: title },
    }));
  };

  // Add a custom section
  const addCustomSection = () => {
    const id = `custom_${Date.now()}`;
    update((d) => ({
      ...d,
      customSections: [
        ...d.customSections,
        { id, title: "Custom Section", content: "" },
      ],
      sectionOrder: [...d.sectionOrder, id],
      sectionTitles: { ...d.sectionTitles, [id]: "Custom Section" },
    }));
  };

  // Delete a custom section
  const deleteCustomSection = (id: string) => {
    update((d) => ({
      ...d,
      customSections: d.customSections.filter((s) => s.id !== id),
      sectionOrder: d.sectionOrder.filter((s) => s !== id),
    }));
  };

  // Render content for each section type
  const renderSectionContent = (sectionId: string) => {
    if (sectionId === "summary") {
      return (
        <RichTextEditor
          value={data.summary}
          placeholder="Write a short professional summary…"
          onChange={(e) => update((d) => ({ ...d, summary: e }))}
        />
      );
    }

    if (sectionId === "experience") {
      return (
        <div className="flex flex-col gap-3">
          {data.experience.map((exp, idx) => (
            <div key={exp.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <EntryHeader
                label={exp.role ? exp.role : `Experience ${idx + 1}`}
                canMoveUp={idx > 0}
                canMoveDown={idx < data.experience.length - 1}
                onMoveUp={() => moveExp(idx, -1)}
                onMoveDown={() => moveExp(idx, 1)}
                onDelete={() =>
                  update((d) => ({ ...d, experience: d.experience.filter((e) => e.id !== exp.id) }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Role">
                  <Input
                    value={exp.role}
                    placeholder="e.g. Product Designer"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        experience: d.experience.map((x) =>
                          x.id === exp.id ? { ...x, role: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Company">
                  <Input
                    value={exp.company}
                    placeholder="e.g. Acme Inc."
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        experience: d.experience.map((x) =>
                          x.id === exp.id ? { ...x, company: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={exp.location}
                    placeholder="e.g. Remote"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        experience: d.experience.map((x) =>
                          x.id === exp.id ? { ...x, location: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Start">
                  <Input
                    value={exp.start}
                    placeholder="2022"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        experience: d.experience.map((x) =>
                          x.id === exp.id ? { ...x, start: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="End" span={2}>
                  <Input
                    value={exp.end}
                    placeholder="Present"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        experience: d.experience.map((x) =>
                          x.id === exp.id ? { ...x, end: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Description" span={2}>
                  <RichTextEditor
                    value={exp.description}
                    placeholder="Describe your responsibilities and achievements…"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        experience: d.experience.map((x) =>
                          x.id === exp.id ? { ...x, description: e } : x
                        ),
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              update((d) => ({
                ...d,
                experience: [
                  ...d.experience,
                  {
                    id: Date.now().toString(),
                    role: "",
                    company: "",
                    location: "",
                    start: "",
                    end: "",
                    description: "",
                  },
                ],
              }))
            }
          >
            <Plus size={14} /> Add experience
          </Button>
        </div>
      );
    }

    if (sectionId === "education") {
      return (
        <div className="flex flex-col gap-3">
          {data.education.map((ed, idx) => (
            <div key={ed.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <EntryHeader
                label={ed.school ? ed.school : `Education ${idx + 1}`}
                canMoveUp={idx > 0}
                canMoveDown={idx < data.education.length - 1}
                onMoveUp={() => moveEdu(idx, -1)}
                onMoveDown={() => moveEdu(idx, 1)}
                onDelete={() =>
                  update((d) => ({ ...d, education: d.education.filter((e) => e.id !== ed.id) }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Degree" span={2}>
                  <Input
                    value={ed.degree}
                    placeholder="e.g. B.S. Computer Science"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        education: d.education.map((x) =>
                          x.id === ed.id ? { ...x, degree: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="School" span={2}>
                  <Input
                    value={ed.school}
                    placeholder="e.g. MIT"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        education: d.education.map((x) =>
                          x.id === ed.id ? { ...x, school: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Start">
                  <Input
                    value={ed.start}
                    placeholder="2018"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        education: d.education.map((x) =>
                          x.id === ed.id ? { ...x, start: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="End">
                  <Input
                    value={ed.end}
                    placeholder="2022"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        education: d.education.map((x) =>
                          x.id === ed.id ? { ...x, end: e.target.value } : x
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Description" span={2}>
                  <RichTextEditor
                    value={ed.description}
                    placeholder="Notable achievements, GPA, honors…"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        education: d.education.map((x) =>
                          x.id === ed.id ? { ...x, description: e } : x
                        ),
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              update((d) => ({
                ...d,
                education: [
                  ...d.education,
                  { id: Date.now().toString(), degree: "", school: "", start: "", end: "", description: "" },
                ],
              }))
            }
          >
            <Plus size={14} /> Add education
          </Button>
        </div>
      );
    }

    if (sectionId === "projects") {
      return (
        <div className="flex flex-col gap-3">
          {data.projects.map((project, idx) => (
            <div key={project.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <EntryHeader
                label={project.name ? project.name : `Project ${idx + 1}`}
                canMoveUp={idx > 0}
                canMoveDown={idx < data.projects.length - 1}
                onMoveUp={() => moveProject(idx, -1)}
                onMoveDown={() => moveProject(idx, 1)}
                onDelete={() =>
                  update((d) => ({ ...d, projects: d.projects.filter((entry) => entry.id !== project.id) }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Project Name">
                  <Input
                    value={project.name}
                    placeholder="e.g. Portfolio Website"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        projects: d.projects.map((entry) =>
                          entry.id === project.id ? { ...entry, name: e.target.value } : entry
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Link">
                  <Input
                    value={project.link}
                    placeholder="e.g. github.com/you/project"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        projects: d.projects.map((entry) =>
                          entry.id === project.id ? { ...entry, link: e.target.value } : entry
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Start">
                  <Input
                    value={project.start}
                    placeholder="2024"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        projects: d.projects.map((entry) =>
                          entry.id === project.id ? { ...entry, start: e.target.value } : entry
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="End">
                  <Input
                    value={project.end}
                    placeholder="Present"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        projects: d.projects.map((entry) =>
                          entry.id === project.id ? { ...entry, end: e.target.value } : entry
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Technologies" span={2}>
                  <Input
                    value={project.technologies}
                    placeholder="e.g. Next.js, Prisma, PostgreSQL"
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        projects: d.projects.map((entry) =>
                          entry.id === project.id ? { ...entry, technologies: e.target.value } : entry
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Description" span={2}>
                  <RichTextEditor
                    value={project.description}
                    placeholder="What did you build and what impact did it have?"
                    onChange={(value) =>
                      update((d) => ({
                        ...d,
                        projects: d.projects.map((entry) =>
                          entry.id === project.id ? { ...entry, description: value } : entry
                        ),
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              update((d) => ({
                ...d,
                projects: [
                  ...d.projects,
                  {
                    id: Date.now().toString(),
                    name: "",
                    link: "",
                    start: "",
                    end: "",
                    technologies: "",
                    description: "",
                  },
                ],
              }))
            }
          >
            <Plus size={14} /> Add project
          </Button>
        </div>
      );
    }

    if (sectionId === "skills") {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {data.skills.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-[12px] text-indigo-700"
              >
                {s}
                <button
                  type="button"
                  onClick={() => update((d) => ({ ...d, skills: d.skills.filter((x) => x !== s) }))}
                  className="hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
            {data.skills.length === 0 && (
              <span className="text-[12px] text-slate-400">No skills added yet</span>
            )}
          </div>
          <Input
            placeholder="Type a skill and press Enter…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v && !data.skills.includes(v)) {
                  update((d) => ({ ...d, skills: [...d.skills, v] }));
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
        </div>
      );
    }

    if (sectionId === "languages") {
      return (
        <div className="flex flex-col gap-2">
          {data.languages.map((l) => (
            <div key={l.id} className="flex gap-2 items-center">
              <Input
                placeholder="Language"
                value={l.name}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    languages: d.languages.map((x) =>
                      x.id === l.id ? { ...x, name: e.target.value } : x
                    ),
                  }))
                }
              />
              <Input
                placeholder="Level"
                value={l.level}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    languages: d.languages.map((x) =>
                      x.id === l.id ? { ...x, level: e.target.value } : x
                    ),
                  }))
                }
              />
              <Button
                variant="danger"
                className="!px-2 shrink-0"
                onClick={() =>
                  update((d) => ({ ...d, languages: d.languages.filter((x) => x.id !== l.id) }))
                }
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              update((d) => ({
                ...d,
                languages: [...d.languages, { id: Date.now().toString(), name: "", level: "" }],
              }))
            }
          >
            <Plus size={14} /> Add language
          </Button>
        </div>
      );
    }

    // Custom section
    const custom = data.customSections.find((s) => s.id === sectionId);
    if (custom) {
      return (
        <RichTextEditor
          value={custom.content}
          placeholder="Write the content of this section…"
          onChange={(e) =>
            update((d) => ({
              ...d,
              customSections: d.customSections.map((s) =>
                s.id === sectionId ? { ...s, content: e } : s
              ),
            }))
          }
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft size={15} /> Back
            </Button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="min-w-0">
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                  setSaved(false);
                }}
                className="w-[260px] max-w-[42vw] rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="Untitled Resume"
                aria-label="Document title"
              />
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                {saved ? (
                  <>
                    <Check size={11} className="text-green-500" /> Saved
                  </>
                ) : (
                  <span className="text-indigo-500">Saving…</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={persistDocument}>
              Save
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
            {/* Mobile tab toggle */}
            <div className="md:hidden flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              {(["edit", "preview"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMobileView(v)}
                  className={`px-3 py-1 rounded-md capitalize text-[12px] font-medium transition-all ${
                    mobileView === v ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button
              variant="primary"
              onClick={async () => {
                setExporting(true);
                try {
                  await previewRef.current?.exportPDF(`${title.trim() || document.title || "resume"}.pdf`);
                } catch (error) {
                  console.error("Resume export failed", error);
                  window.alert("Export failed. Please try again, or remove very large images and export once more.");
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
            >
              {exporting ? (
                <div className="animate-spin">
                  <Download size={15} />
                </div>
              ) : (
                <Download size={15} />
              )}
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-6 py-6 grid md:grid-cols-2 gap-6 items-start">
        {/* Editor panel */}
        <div className={`space-y-3 ${mobileView === "preview" ? "hidden md:block" : ""}`}>
          {/* Document Style (fixed) */}
          <Section title="Document Style" icon={Palette}>
            <div className="flex flex-col gap-5 mt-1">
              <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Template
                </div>
                <TemplatePicker
                  value={data.template}
                  onChange={(v) => update((d) => ({ ...d, template: v }))}
                  accent={data.accent}
                />
              </div>
              <Field label="Font">
                <Select
                  value={data.font}
                  onChange={(v) => update((d) => ({ ...d, font: v }))}
                  options={FONT_OPTIONS}
                />
              </Field>
              <Field label="Accent Color">
                <ColorPicker
                  value={data.accent}
                  onChange={(v) => update((d) => ({ ...d, accent: v }))}
                />
              </Field>
              <Field label="Header Background">
                <ColorPicker
                  value={data.headerBackground}
                  onChange={(v) => update((d) => ({ ...d, headerBackground: v }))}
                />
              </Field>
              <Field label="Font Size">
                <Select
                  value={String(data.fontSize ?? 100)}
                  onChange={(v) => update((d) => ({ ...d, fontSize: Number(v) }))}
                  options={[
                    { value: "90", label: "Small (90%)" },
                    { value: "100", label: "Normal (100%)" },
                    { value: "110", label: "Large (110%)" },
                    { value: "120", label: "XL (120%)" },
                  ]}
                />
              </Field>
            </div>
          </Section>

          {/* Personal Info (fixed) */}
          <Section title="Personal Info" icon={User}>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <Field label="Photo" span={2}>
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white ${
                        data.personal.photo ? (photoDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
                      }`}
                      style={{ touchAction: "none" }}
                      onPointerDown={handlePhotoPointerDown}
                      onPointerMove={handlePhotoPointerMove}
                      onPointerUp={handlePhotoPointerUp}
                      onPointerCancel={handlePhotoPointerUp}
                    >
                      {data.personal.photo ? (
                        <img
                          src={data.personal.photo}
                          alt=""
                          draggable={false}
                          className="h-full w-full object-cover select-none pointer-events-none"
                          style={{
                            transform: `translate(${photoAdjust.x}px, ${photoAdjust.y}px) scale(${photoAdjust.scale})`,
                            transformOrigin: "center center",
                          }}
                        />
                      ) : (
                        <Image size={24} className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50">
                        <Image size={14} />
                        Choose image
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            handlePhotoUpload(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {data.personal.photo && (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => updatePhotoAdjust({ ...DEFAULT_PHOTO_ADJUST })}
                          >
                            Reset
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              update((d) => ({
                                ...d,
                                personal: { ...d.personal, photo: "", photoAdjust: { ...DEFAULT_PHOTO_ADJUST } },
                              }))
                            }
                          >
                            <X size={14} /> Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {data.personal.photo && (
                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                        <span>Zoom</span>
                        <span>{Math.round(photoAdjust.scale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={MIN_PHOTO_SCALE}
                        max={MAX_PHOTO_SCALE}
                        step={0.01}
                        value={photoAdjust.scale}
                        onChange={(e) =>
                          updatePhotoAdjust({
                            scale: clamp(Number(e.target.value), MIN_PHOTO_SCALE, MAX_PHOTO_SCALE),
                          })
                        }
                        className="w-full accent-indigo-500"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Drag the image inside the frame to reposition.
                      </p>
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Full Name">
                <Input
                  value={data.personal.name}
                  placeholder="Jane Smith"
                  onChange={(e) =>
                    update((d) => ({ ...d, personal: { ...d.personal, name: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Job Title">
                <Input
                  value={data.personal.title}
                  placeholder="Product Designer"
                  onChange={(e) =>
                    update((d) => ({ ...d, personal: { ...d.personal, title: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Email">
                <Input
                  value={data.personal.email}
                  placeholder="jane@example.com"
                  onChange={(e) =>
                    update((d) => ({ ...d, personal: { ...d.personal, email: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={data.personal.phone}
                  placeholder="+1 (555) 000-0000"
                  onChange={(e) =>
                    update((d) => ({ ...d, personal: { ...d.personal, phone: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Location">
                <Input
                  value={data.personal.location}
                  placeholder="New York, NY"
                  onChange={(e) =>
                    update((d) => ({ ...d, personal: { ...d.personal, location: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Website">
                <Input
                  value={data.personal.website}
                  placeholder="yoursite.com"
                  onChange={(e) =>
                    update((d) => ({ ...d, personal: { ...d.personal, website: e.target.value } }))
                  }
                />
              </Field>
              <Field label="LinkedIn" span={2}>
                <Input
                  value={data.personal.linkedin}
                  placeholder="linkedin.com/in/yourname"
                  onChange={(e) =>
                    update((d) => ({ ...d, personal: { ...d.personal, linkedin: e.target.value } }))
                  }
                />
              </Field>
            </div>
          </Section>

          {/* Reorderable sections */}
          {(data.sectionOrder ?? []).map((sectionId, idx) => {
            const sectionOrder = data.sectionOrder ?? [];
            const title =
              (data.sectionTitles ?? {})[sectionId] ||
              DEFAULT_SECTION_TITLES[sectionId] ||
              (data.customSections ?? []).find((s) => s.id === sectionId)?.title ||
              "Custom Section";
            const icon = SECTION_ICONS[sectionId] ?? Hash;
            const isCustom = !BUILTIN_IDS.has(sectionId);

            return (
              <Section
                key={sectionId}
                title={title}
                icon={icon}
                defaultOpen={idx === 0}
                onRename={(t) => renameSection(sectionId, t)}
                canMoveUp={idx > 0}
                canMoveDown={idx < sectionOrder.length - 1}
                onMoveUp={() => moveSection(idx, -1)}
                onMoveDown={() => moveSection(idx, 1)}
                onDelete={isCustom ? () => deleteCustomSection(sectionId) : undefined}
              >
                <div className="mt-1">{renderSectionContent(sectionId)}</div>
              </Section>
            );
          })}

          {/* Add custom section */}
          <button
            type="button"
            onClick={addCustomSection}
            className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-[13px] text-slate-400 transition-all hover:border-indigo-300 hover:bg-indigo-50/50"
          >
            <Plus
              size={15}
              className="group-hover:text-indigo-500 transition-colors"
            />
            <span className="font-medium group-hover:text-indigo-600 transition-colors">
              Add custom section
            </span>
          </button>
        </div>

        {/* Preview panel */}
        <div className={`${mobileView === "edit" ? "hidden md:block" : ""}`}>
          <div className="sticky top-20">
            {/* Template badge */}
            <div className="flex items-center gap-2 mb-3">
              <LayoutTemplate size={13} className="text-slate-400" />
              <span className="text-[12px] font-medium capitalize text-slate-400">
                {data.template} template
              </span>
            </div>
            <ResumePreview data={data} ref={previewRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
