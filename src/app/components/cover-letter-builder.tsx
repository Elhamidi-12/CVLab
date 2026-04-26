import { CoverLetterPreview } from "./cover-letter-preview.tsx";
import type { CoverLetterData, CoverLetterPreviewHandle } from "./cover-letter-preview.tsx";
import { useEffect, useRef, useState } from "react";
import { DatePicker } from "@mantine/dates";
import { Popover } from "@mantine/core";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Download,
  Check,
  Upload,
  Palette,
  User,
  Building2,
  MessageSquare,
  LayoutTemplate,
} from "lucide-react";
import type { CoverLetterDocument } from "../document-store";
import { createDefaultCoverLetterData } from "../document-store";
import { Section, Field, Input, Textarea, Button, ColorPicker, Select, RichTextEditor } from "./editor-ui";

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter (Modern)" },
  { value: "Georgia, serif", label: "Georgia (Classic)" },
  { value: "'IBM Plex Sans', sans-serif", label: "IBM Plex Sans" },
  { value: "Roboto, sans-serif", label: "Roboto (Neutral)" },
];

const initial: CoverLetterData = createDefaultCoverLetterData();

function formatHumanDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function parseCoverLetterDate(value: string): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function toIsoDateString(input: Date | string): string {
  const date = typeof input === "string" ? parseCoverLetterDate(input) : input;
  if (!date || Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCoverLetterDate(value: string): string {
  const date = parseCoverLetterDate(value);
  return date ? formatHumanDate(date) : formatHumanDate(new Date());
}

const DATE_PRESETS = [
  { value: dayjs().subtract(1, "day").toDate(), label: "Yesterday" },
  { value: dayjs().toDate(), label: "Today" },
  { value: dayjs().add(1, "day").toDate(), label: "Tomorrow" },
  { value: dayjs().add(1, "month").toDate(), label: "Next month" },
  { value: dayjs().add(1, "year").toDate(), label: "Next year" },
  { value: dayjs().subtract(1, "month").toDate(), label: "Last month" },
  { value: dayjs().subtract(1, "year").toDate(), label: "Last year" },
];

// ─── Template Picker ──────────────────────────────────────────────────────────

function CLTemplatePicker({
  value,
  onChange,
  accent,
}: {
  value: string;
  onChange: (v: "professional" | "modern") => void;
  accent: string;
}) {
  const templates: { id: "professional" | "modern"; name: string }[] = [
    { id: "professional", name: "DIN 5008" },
    { id: "modern", name: "Minimal" },
  ];
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pickerRef.current?.style.setProperty("--accent", accent);
  }, [accent]);

  return (
    <div ref={pickerRef} className="grid grid-cols-2 gap-3 [--accent:#6366f1]">
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
          <div className="aspect-[3/4] w-full bg-white p-[6px]">
            {t.id === "professional" ? <Din5008CLThumb /> : <ModernCLThumb />}
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

function Din5008CLThumb() {
  return (
    <div className="flex h-full flex-col gap-1.5 text-[0] text-slate-900">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="h-[6px] w-[54px] rounded-[2px] bg-slate-900" />
          <div className="h-[2px] w-[34px] rounded-[1px] bg-slate-400" />
          <div className="h-[2px] w-[30px] rounded-[1px] bg-slate-400" />
        </div>
        <div className="h-[2px] w-[24px] rounded-[1px] bg-slate-400" />
      </div>
      <div className="mt-[1px] h-[2px] w-[22px] rounded-[1px] bg-slate-400" />
      <div className="h-[2px] w-[42px] rounded-[1px] bg-slate-800" />
      <div className="h-[2px] w-[32px] rounded-[1px] bg-slate-500" />
      <div className="h-[2px] w-[82px] rounded-[1px] bg-slate-300" />
      <div className="mt-[2px] h-[2px] w-[54px] rounded-[1px] bg-slate-900" />
      <div className="h-[2px] w-[78px] rounded-[1px] bg-slate-200" />
      <div className="h-[2px] w-[72px] rounded-[1px] bg-slate-200" />
      <div className="h-[2px] w-[80px] rounded-[1px] bg-slate-200" />
      <div className="h-[2px] w-[64px] rounded-[1px] bg-slate-200" />
    </div>
  );
}

function ModernCLThumb() {
  return (
    <div className="flex h-full flex-col text-[0]">
      <div className="mb-[5px] flex items-end justify-between rounded-t-[3px] bg-[color:var(--accent)] px-[6px] pb-[6px] pt-[7px]">
        <div className="flex flex-col gap-0.5">
          <div className="h-[6px] w-[52px] rounded-[1px] bg-white/95" />
          <div className="h-[3px] w-[36px] rounded-[1px] bg-white/60" />
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="h-[2px] w-[28px] rounded-[1px] bg-white/50" />
          <div className="h-[2px] w-[22px] rounded-[1px] bg-white/50" />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 px-[3px]">
        <div className="h-[2px] w-[30px] rounded-[1px] bg-slate-300" />
        <div className="mt-[2px] h-[2px] w-[48px] rounded-[1px] bg-slate-900" />
        <div className="h-[2px] w-[38px] rounded-[1px] bg-[color:var(--accent)] opacity-80" />
        <div className="mb-[2px] h-[2px] w-[32px] rounded-[1px] bg-slate-300" />
        <div className="h-[2px] w-[90px] rounded-[1px] bg-slate-200" />
        <div className="h-[2px] w-[82px] rounded-[1px] bg-slate-200" />
        <div className="h-[2px] w-[87px] rounded-[1px] bg-slate-200" />
        <div className="h-[2px] w-[70px] rounded-[1px] bg-slate-200" />
      </div>
    </div>
  );
}

// ─── Main builder ──────────────────────────────────────────────────────────────

export function CoverLetterBuilder({
  document,
  onBack,
  onSave,
  onDelete,
}: {
  document: CoverLetterDocument;
  onBack: () => void;
  onSave: (document: CoverLetterDocument) => void;
  onDelete: (id: string) => void;
}) {
  const [data, setData] = useState<CoverLetterData>({ ...initial, ...document.data, date: toIsoDateString(document.data?.date ?? initial.date) });
  const [title, setTitle] = useState(document.title);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [saved, setSaved] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [datePickerOpened, setDatePickerOpened] = useState(false);
  const previewRef = useRef<CoverLetterPreviewHandle>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setData({ ...initial, ...document.data, date: toIsoDateString(document.data?.date ?? initial.date) });
    setTitle(document.title);
    setSaved(true);
    setDirty(false);
  }, [document.id]);

  const update = (fn: (d: CoverLetterData) => CoverLetterData) => {
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
    if (window.confirm("Delete this cover letter? This cannot be undone.")) {
      onDelete(document.id);
      onBack();
    }
  };

  const importSignature = (file?: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      update((d) => ({ ...d, signature: result }));
    };
    reader.readAsDataURL(file);
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
                placeholder="Untitled Cover Letter"
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
                  await previewRef.current?.exportPDF(`${title.trim() || document.title || "cover-letter"}.pdf`);
                } catch (error) {
                  console.error("Cover letter export failed", error);
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
          {/* Document Style */}
          <Section title="Document Style" icon={Palette}>
            <div className="flex flex-col gap-5 mt-1">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Template
                </div>
                <CLTemplatePicker
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

          {/* Sender Info */}
          <Section title="Sender Info" icon={User}>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <Field label="Name">
                <Input
                  value={data.sender.name}
                  placeholder="Jane Smith"
                  onChange={(e) => update((d) => ({ ...d, sender: { ...d.sender, name: e.target.value } }))}
                />
              </Field>
              <Field label="Job Title">
                <Input
                  value={data.sender.title}
                  placeholder="Product Designer"
                  onChange={(e) => update((d) => ({ ...d, sender: { ...d.sender, title: e.target.value } }))}
                />
              </Field>
              <Field label="Email">
                <Input
                  value={data.sender.email}
                  placeholder="jane@example.com"
                  onChange={(e) => update((d) => ({ ...d, sender: { ...d.sender, email: e.target.value } }))}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={data.sender.phone}
                  placeholder="+1 (555) 000-0000"
                  onChange={(e) => update((d) => ({ ...d, sender: { ...d.sender, phone: e.target.value } }))}
                />
              </Field>
              <Field label="Location" span={2}>
                <Input
                  value={data.sender.location}
                  placeholder="City, State"
                  onChange={(e) =>
                    update((d) => ({ ...d, sender: { ...d.sender, location: e.target.value } }))
                  }
                />
              </Field>
            </div>
          </Section>

          {/* Recipient Info */}
          <Section title="Recipient Info" icon={Building2} defaultOpen={false}>
            <div className="flex flex-col gap-3 mt-1">
              <Field label="Recipient Name">
                <Input
                  value={data.recipient.name}
                  placeholder="Hiring Manager"
                  onChange={(e) =>
                    update((d) => ({ ...d, recipient: { ...d.recipient, name: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Company">
                <Input
                  value={data.recipient.company}
                  placeholder="Acme Inc."
                  onChange={(e) =>
                    update((d) => ({ ...d, recipient: { ...d.recipient, company: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Address">
                <Textarea
                  rows={2}
                  value={data.recipient.address}
                  placeholder="123 Main St&#10;City, State 00000"
                  onChange={(e) =>
                    update((d) => ({ ...d, recipient: { ...d.recipient, address: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Date">
                <Popover
                  opened={datePickerOpened}
                  onChange={setDatePickerOpened}
                  position="bottom-start"
                  withArrow={false}
                  shadow="md"
                  trapFocus={false}
                >
                  <Popover.Target>
                    <button
                      type="button"
                      onClick={() => setDatePickerOpened((open) => !open)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-left text-[13px] text-slate-900 hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    >
                      {formatCoverLetterDate(data.date)}
                    </button>
                  </Popover.Target>
                  <Popover.Dropdown p={0} className="overflow-hidden">
                    <div className="flex">
                      <div className="w-[130px] border-r border-slate-200 p-2 bg-slate-50">
                        <div className="flex flex-col gap-1">
                          {DATE_PRESETS.map((preset) => {
                            const active = dayjs(parseCoverLetterDate(data.date)).isSame(preset.value, "day");
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  update((d) => ({ ...d, date: toIsoDateString(preset.value) }));
                                  setDatePickerOpened(false);
                                }}
                                className={`px-2 py-1.5 rounded-md text-left text-[12px] transition-colors ${
                                  active
                                    ? "bg-indigo-100 text-indigo-700 font-medium"
                                    : "text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="p-2">
                        <DatePicker
                          value={parseCoverLetterDate(data.date)}
                          onChange={(value) => {
                            if (!value) return;
                            update((d) => ({ ...d, date: toIsoDateString(value) }));
                          }}
                          size="sm"
                        />
                      </div>
                    </div>
                  </Popover.Dropdown>
                </Popover>
              </Field>
            </div>
          </Section>

          {/* Letter Content */}
          <Section title="Letter Content" icon={MessageSquare}>
            <div className="flex flex-col gap-4 mt-1">
              <Field label="Betreff">
                <Input
                  value={data.subject}
                  placeholder="Bewerbung als Softwareentwickler"
                  onChange={(e) => update((d) => ({ ...d, subject: e.target.value }))}
                />
              </Field>
              <Field label="Opening Line">
                <RichTextEditor
                  value={data.opening}
                  placeholder="Sehr geehrte Damen und Herren,"
                  onChange={(html) => update((d) => ({ ...d, opening: html }))}
                />
              </Field>
              <Field label="Body">
                <RichTextEditor
                  value={data.body}
                  placeholder="Write the main paragraphs of your letter here…"
                  onChange={(e) => update((d) => ({ ...d, body: e }))}
                />
              </Field>
              <Field label="Closing">
                <RichTextEditor
                  value={data.closing}
                  placeholder="Mit freundlichen Grüßen"
                  onChange={(e) => update((d) => ({ ...d, closing: e }))}
                />
              </Field>
              <Field label="Signature" span={2}>
                <div className="flex flex-col gap-3">
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    title="Import signature image"
                    aria-label="Import signature image"
                    className="hidden"
                    onChange={(e) => {
                      importSignature(e.target.files?.[0] ?? null);
                      e.currentTarget.value = "";
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" type="button" onClick={() => signatureInputRef.current?.click()}>
                      <Upload size={14} />
                      Import Signature
                    </Button>
                    {data.signature && (
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => update((d) => ({ ...d, signature: "" }))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
                    {data.signature ? (
                      <img
                        src={data.signature}
                        alt="Imported signature preview"
                        className="max-h-16 max-w-[260px] object-contain"
                      />
                    ) : (
                      <div className="text-[12px] text-slate-400">
                        Import a handwritten signature image to place it above your name.
                      </div>
                    )}
                  </div>
                </div>
              </Field>
            </div>
          </Section>
        </div>

        {/* Preview panel */}
        <div className={`${mobileView === "edit" ? "hidden md:block" : ""}`}>
          <div className="sticky top-20">
            {/* Template badge */}
            <div className="flex items-center gap-2 mb-3">
              <LayoutTemplate size={13} className="text-slate-400" />
              <span className="text-[12px] font-medium capitalize text-slate-400">
                {data.template === "professional" ? "DIN 5008" : "minimal"} template
              </span>
            </div>
            <CoverLetterPreview data={data} ref={previewRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
