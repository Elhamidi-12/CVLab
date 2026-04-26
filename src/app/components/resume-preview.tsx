import { Mail, Phone, MapPin, Globe, Github, Linkedin, UserRound } from "lucide-react";
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import DOMPurify from "dompurify";
import { createPreviewAccentPalette, type PreviewAccentPalette } from "./preview-accent";
import { exportTextBasedElementPdf } from "../pdf-export";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResumeData = {
  accent: string;
  headerBackground: string;
  font: string;
  fontSize: number;
  template: "classic" | "modern" | "minimal";
  sectionTitles: Record<string, string>;
  sectionOrder: string[];
  personal: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    photo?: string;
    photoAdjust?: {
      x: number;
      y: number;
      scale: number;
    };
  };
  summary: string;
  experience: {
    id: string;
    role: string;
    company: string;
    location: string;
    start: string;
    end: string;
    description: string;
  }[];
  education: {
    id: string;
    degree: string;
    school: string;
    start: string;
    end: string;
    description: string;
  }[];
  projects: {
    id: string;
    name: string;
    link: string;
    start: string;
    end: string;
    technologies: string;
    description: string;
  }[];
  skills: string[];
  languages: { id: string; name: string; level: string }[];
  customSections: { id: string; title: string; content: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_TITLES: Record<string, string> = {
  summary: "Profile",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
};

function getTitle(data: ResumeData, id: string): string {
  return (
    (data.sectionTitles ?? {})[id] ||
    DEFAULT_TITLES[id] ||
    (data.customSections ?? []).find((s) => s.id === id)?.title ||
    "Section"
  );
}

function htmlEmpty(html: string | undefined): boolean {
  if (!html) return true;
  const trimmed = html.replace(/<p><\/p>/g, "").replace(/<br\s*\/?>/g, "").trim();
  return trimmed === "";
}

function RichContent({ html, style }: { html: string; style?: React.CSSProperties }) {
  if (htmlEmpty(html)) return null;
  const content = html.startsWith("<") ? html : `<p>${html}</p>`;
  const safeHtml = DOMPurify.sanitize(content);
  return (
    <div
      className="rt-preview"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
      style={style}
    />
  );
}

function ContactRow({
  personal,
  showIcons = true,
  textColor = "#64748b",
}: {
  personal: ResumeData["personal"];
  showIcons?: boolean;
  textColor?: string;
}) {
  const items = [
    personal.email && { icon: <Mail size={9} />, text: personal.email },
    personal.phone && { icon: <Phone size={9} />, text: personal.phone },
    personal.location && { icon: <MapPin size={9} />, text: personal.location },
    personal.website && { icon: <Github size={9} />, text: personal.website },
    personal.linkedin && { icon: <Linkedin size={9} />, text: personal.linkedin },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  return (
    <div className="flex flex-wrap items-center gap-y-1 mt-1.5">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center text-[10px]" style={{ color: textColor }}>
          {showIcons ? item.icon : null}
          <span style={{ marginLeft: showIcons ? "4px" : 0 }}>{item.text}</span>
          {i < items.length - 1 ? (
            <span
              aria-hidden="true"
              style={{ marginLeft: "10px", marginRight: "10px", color: "rgba(255,255,255,0.72)" }}
            >
              |
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

// ─── A4 / page-margin constants ───────────────────────────────────────────────
// Declared before the template components so PAGE_PAD_H is in scope.

function PhotoFrame({
  src,
  size = 88,
  shape = "square",
  placeholderColor = "#e2e8f0",
  iconColor = "#94a3b8",
  borderColor = "#e2e8f0",
  offsetX = 0,
  offsetY = 0,
  zoom = 1,
}: {
  src?: string;
  size?: number;
  shape?: "square" | "circle";
  placeholderColor?: string;
  iconColor?: string;
  borderColor?: string;
  offsetX?: number;
  offsetY?: number;
  zoom?: number;
}) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: shape === "circle" ? "999px" : "10px",
        overflow: "hidden",
        flexShrink: 0,
        border: `1px solid ${borderColor}`,
        background: placeholderColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
            transformOrigin: "center center",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      ) : (
        <UserRound size={size * 0.42} color={iconColor} strokeWidth={1.8} />
      )}
    </div>
  );
}

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

// 24 mm × (96 / 25.4) ≈ 91 px   |   20 mm × (96 / 25.4) ≈ 76 px
const PAGE_PAD_TOP    = 91;   // 24 mm
const PAGE_PAD_BOTTOM = 91;   // 24 mm
const PAGE_PAD_H      = 76;   // 20 mm  (used by templates for left / right padding)
const CONTENT_HEIGHT  = A4_HEIGHT - PAGE_PAD_TOP - PAGE_PAD_BOTTOM; // 941 px

function getContentHeight(topPad = PAGE_PAD_TOP): number {
  return A4_HEIGHT - topPad - PAGE_PAD_BOTTOM;
}

// ─── CLASSIC TEMPLATE ─────────────────────────────────────────────────────────

function ClassicSectionTitle({ palette, children }: { palette: PreviewAccentPalette; children: React.ReactNode }) {
  return (
    <div className="mb-2.5 pb-1" style={palette.divider}>
      <span className="text-[10px] font-bold tracking-[1.8px] uppercase" style={palette.text}>
        {children}
      </span>
    </div>
  );
}

function ClassicTemplate({ data, showContactIcons = true }: { data: ResumeData; showContactIcons?: boolean }) {
  const { personal, accent } = data;
  const fontScale = Math.max(80, Math.min(130, data.fontSize ?? 100)) / 100;
  const accentPalette = createPreviewAccentPalette(accent);
  const sectionOrder = data.sectionOrder ?? [];

  const renderSection = (id: string) => {
    const title = getTitle(data, id);

    if (id === "summary") {
      if (htmlEmpty(data.summary)) return null;
      return (
        <section key={id} data-block="section">
          <ClassicSectionTitle palette={accentPalette}>{title}</ClassicSectionTitle>
          <RichContent html={data.summary} style={{ fontSize: "11.5px", lineHeight: 1.7, color: "#475569" }} />
        </section>
      );
    }

    if (id === "experience") {
      if (!data.experience.length) return null;
      return (
        <section key={id} data-block="section">
          <ClassicSectionTitle palette={accentPalette}>{title}</ClassicSectionTitle>
          <div className="flex flex-col gap-3.5">
            {data.experience.map((e) => (
              <div key={e.id} data-block="item">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-slate-800 leading-snug">{e.role || "Role"}</div>
                    <div className="text-[11px] font-medium mt-px text-slate-500">
                      {e.company}{e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-3 mt-0.5">
                    {e.start}{e.end ? ` — ${e.end}` : ""}
                  </span>
                </div>
                {!htmlEmpty(e.description) && (
                  <RichContent html={e.description} style={{ fontSize: "11px", lineHeight: 1.65, marginTop: "5px", color: "#475569" }} />
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (id === "education") {
      if (!data.education.length) return null;
      return (
        <section key={id} data-block="section">
          <ClassicSectionTitle palette={accentPalette}>{title}</ClassicSectionTitle>
          <div className="flex flex-col gap-2.5">
            {data.education.map((e) => (
              <div key={e.id} data-block="item">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{e.degree || "Degree"}</div>
                    <div className="text-[11px] font-medium mt-px text-slate-500">{e.school}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-3 mt-0.5">
                    {e.start}{e.end ? ` — ${e.end}` : ""}
                  </span>
                </div>
                {!htmlEmpty(e.description) && (
                  <RichContent html={e.description} style={{ fontSize: "11px", lineHeight: 1.65, marginTop: "5px", color: "#475569" }} />
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (id === "projects") {
      if (!data.projects.length) return null;
      return (
        <section key={id} data-block="section">
          <ClassicSectionTitle palette={accentPalette}>{title}</ClassicSectionTitle>
          <div className="flex flex-col gap-3.5">
            {data.projects.map((project) => (
              <div key={project.id} data-block="item">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-slate-800 leading-snug">{project.name || "Project"}</div>
                    {(project.link || project.technologies) && (
                      <div className="text-[11px] font-medium mt-px text-slate-500">
                        {project.link}
                        {project.link && project.technologies ? " · " : ""}
                        {project.technologies}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-3 mt-0.5">
                    {project.start}{project.end ? ` - ${project.end}` : ""}
                  </span>
                </div>
                {!htmlEmpty(project.description) && (
                  <RichContent html={project.description} style={{ fontSize: "11px", lineHeight: 1.65, marginTop: "5px", color: "#475569" }} />
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (id === "skills") {
      if (!data.skills.length) return null;
      return (
        <section key={id} data-block="section">
          <ClassicSectionTitle palette={accentPalette}>{title}</ClassicSectionTitle>
          <div className="flex flex-wrap gap-1">
            {data.skills.map((s) => (
              <span key={s} className="text-[10px] py-0.5 px-2 rounded" style={accentPalette.chip}>
                {s}
              </span>
            ))}
          </div>
        </section>
      );
    }

    if (id === "languages") {
      if (!data.languages.length) return null;
      return (
        <section key={id} data-block="section">
          <ClassicSectionTitle palette={accentPalette}>{title}</ClassicSectionTitle>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {data.languages.map((l) => (
              <div key={l.id} data-block="item" className="flex justify-between text-[11px]">
                <span className="font-medium text-slate-800">{l.name}</span>
                <span className="text-slate-400">{l.level}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    const custom = data.customSections.find((s) => s.id === id);
    if (custom) {
      return (
        <section key={id} data-block="section">
          <ClassicSectionTitle palette={accentPalette}>{title}</ClassicSectionTitle>
          <RichContent html={custom.content} style={{ fontSize: "11.5px", lineHeight: 1.7, color: "#475569" }} />
        </section>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col box-border" style={{ padding: `0 ${PAGE_PAD_H}px`, width: `${100 / fontScale}%`, zoom: fontScale }}>
      <header
        className="pb-3.5 mb-5 border-b flex items-start justify-between gap-5"
        style={{ background: data.headerBackground, borderBottomColor: "rgba(255,255,255,0.22)", padding: "16px", borderRadius: "10px" }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight" style={{ color: "#fff" }}>
            {personal.name || "Your Name"}
          </h1>
          <p className="text-[13px] font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.88)" }}>
            {personal.title || "Professional Title"}
          </p>
          <ContactRow personal={personal} showIcons={showContactIcons} textColor="rgba(255,255,255,0.9)" />
        </div>
        <PhotoFrame
          src={personal.photo}
          offsetX={personal.photoAdjust?.x}
          offsetY={personal.photoAdjust?.y}
          zoom={personal.photoAdjust?.scale}
          borderColor="rgba(255,255,255,0.35)"
          placeholderColor="rgba(255,255,255,0.14)"
          iconColor="rgba(255,255,255,0.72)"
        />
      </header>
      <div className="flex flex-col gap-4.5">
        {sectionOrder.map((id) => renderSection(id))}
      </div>
    </div>
  );
}

// ─── MODERN TEMPLATE ──────────────────────────────────────────────────────────

function ModernMainTitle({ palette, children }: { palette: PreviewAccentPalette; children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-2.5 pb-1.5" style={{ ...palette.text, ...palette.divider }}>
      {children}
    </div>
  );
}

function ModernTemplate({ data, showContactIcons = true }: { data: ResumeData; showContactIcons?: boolean }) {
  const { personal, accent } = data;
  const fontScale = Math.max(80, Math.min(130, data.fontSize ?? 100)) / 100;
  const accentPalette = createPreviewAccentPalette(accent);
  const sectionOrder = data.sectionOrder ?? [];
  const sidebarOnly = new Set(["skills", "languages"]);

  const renderMainSection = (id: string) => {
    const title = getTitle(data, id);
    if (sidebarOnly.has(id)) return null;

    if (id === "summary") {
      if (htmlEmpty(data.summary)) return null;
      return (
        <section key={id} data-block="section" className="mb-4.5">
          <ModernMainTitle palette={accentPalette}>{title}</ModernMainTitle>
          <RichContent html={data.summary} style={{ fontSize: "11px", lineHeight: 1.7, color: "#475569" }} />
        </section>
      );
    }

    if (id === "experience") {
      if (!data.experience.length) return null;
      return (
        <section key={id} data-block="section" className="mb-4.5">
          <ModernMainTitle palette={accentPalette}>{title}</ModernMainTitle>
          <div className="flex flex-col gap-3.5">
            {data.experience.map((e) => (
              <div key={e.id} data-block="item">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[11.5px] font-bold text-slate-800 leading-snug">{e.role || "Role"}</div>
                    <div className="text-[10.5px] font-semibold mt-px" style={accentPalette.text}>
                      {e.company}{e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <span className="text-[9.5px] text-slate-400 whitespace-nowrap ml-2 mt-0.5">
                    {e.start}{e.end ? ` — ${e.end}` : ""}
                  </span>
                </div>
                {!htmlEmpty(e.description) && (
                  <RichContent html={e.description} style={{ fontSize: "10.5px", lineHeight: 1.65, marginTop: "5px", color: "#475569" }} />
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (id === "education") {
      if (!data.education.length) return null;
      return (
        <section key={id} data-block="section" style={{ marginBottom: "18px" }}>
          <ModernMainTitle palette={accentPalette}>{title}</ModernMainTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.education.map((e) => (
              <div key={e.id} data-block="item">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a" }}>{e.degree || "Degree"}</div>
                    <div style={{ fontSize: "10.5px", fontWeight: 600, marginTop: "1px", color: "#64748b" }}>{e.school}</div>
                  </div>
                  <span style={{ fontSize: "9.5px", color: "#94a3b8", marginLeft: "8px", marginTop: "2px" }}>
                    {e.start}{e.end ? ` — ${e.end}` : ""}
                  </span>
                </div>
                {!htmlEmpty(e.description) && (
                  <RichContent html={e.description} style={{ fontSize: "10.5px", lineHeight: 1.65, marginTop: "5px", color: "#475569" }} />
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (id === "projects") {
      if (!data.projects.length) return null;
      return (
        <section key={id} data-block="section" style={{ marginBottom: "18px" }}>
          <ModernMainTitle palette={accentPalette}>{title}</ModernMainTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.projects.map((project) => (
              <div key={project.id} data-block="item">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a" }}>{project.name || "Project"}</div>
                    {(project.link || project.technologies) && (
                      <div style={{ fontSize: "10.5px", fontWeight: 600, marginTop: "1px", color: "#64748b" }}>
                        {project.link}
                        {project.link && project.technologies ? " · " : ""}
                        {project.technologies}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: "9.5px", color: "#94a3b8", marginLeft: "8px", marginTop: "2px" }}>
                    {project.start}{project.end ? ` - ${project.end}` : ""}
                  </span>
                </div>
                {!htmlEmpty(project.description) && (
                  <RichContent html={project.description} style={{ fontSize: "10.5px", lineHeight: 1.65, marginTop: "5px", color: "#475569" }} />
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    const custom = data.customSections.find((s) => s.id === id);
    if (custom) {
      return (
        <section key={id} data-block="section" style={{ marginBottom: "18px" }}>
          <ModernMainTitle palette={accentPalette}>{title}</ModernMainTitle>
          <RichContent html={custom.content} style={{ fontSize: "11px", lineHeight: 1.7, color: "#475569" }} />
        </section>
      );
    }
    return null;
  };

  return (
    <div style={{ width: `${100 / fontScale}%`, zoom: fontScale, display: "flex", boxSizing: "border-box" }}>
      {/* Sidebar */}
      <div style={{ width: "36%", background: data.headerBackground, padding: "32px 20px", display: "flex", flexDirection: "column", gap: "0", boxSizing: "border-box", flexShrink: 0 }}>
        <div style={{ marginBottom: "18px" }}>
          <PhotoFrame
            src={personal.photo}
            size={96}
            shape="circle"
            offsetX={personal.photoAdjust?.x}
            offsetY={personal.photoAdjust?.y}
            zoom={personal.photoAdjust?.scale}
            placeholderColor="rgba(255,255,255,0.16)"
            iconColor="rgba(255,255,255,0.72)"
            borderColor="rgba(255,255,255,0.36)"
          />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", lineHeight: 1.2, letterSpacing: "-0.3px" }}>
            {personal.name || "Your Name"}
          </h1>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontWeight: 500, marginTop: "4px" }}>
            {personal.title || "Professional Title"}
          </p>
        </div>
        <div style={{ height: "1px", background: "rgba(255,255,255,0.2)", marginBottom: "18px" }} />
        <div style={{ marginBottom: "22px" }}>
          <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "8px" }}>Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {personal.email && <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.85)" }}>{showContactIcons && <Mail size={9} />} {personal.email}</span>}
            {personal.phone && <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.85)" }}>{showContactIcons && <Phone size={9} />} {personal.phone}</span>}
            {personal.location && <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.85)" }}>{showContactIcons && <MapPin size={9} />} {personal.location}</span>}
            {personal.website && <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.85)" }}>{showContactIcons && <Globe size={9} />} {personal.website}</span>}
            {personal.linkedin && <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.85)" }}>{showContactIcons && <Linkedin size={9} />} {personal.linkedin}</span>}
          </div>
        </div>
        {data.skills.length > 0 && (
          <div style={{ marginBottom: "22px" }}>
            <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "8px" }}>{getTitle(data, "skills")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {data.skills.map((s) => (
                <span key={s} style={{ fontSize: "9.5px", padding: "2px 7px", borderRadius: "3px", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>
        )}
        {data.languages.length > 0 && (
          <div>
            <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: "8px" }}>{getTitle(data, "languages")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.languages.map((l) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                  <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{l.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>{l.level}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Main content */}
      <div style={{ flex: 1, padding: "32px 28px 28px", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        {sectionOrder.map((id) => renderMainSection(id))}
      </div>
    </div>
  );
}

// ─── MINIMAL TEMPLATE ─────────────────────────────────────────────────────────

function MinimalSectionTitle({ palette, children }: { palette: PreviewAccentPalette; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "9px" }}>
      <span style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", ...palette.text }}>
        {children}
      </span>
      <div style={{ height: "1px", marginTop: "5px", ...palette.divider }} />
    </div>
  );
}

function MinimalTemplate({ data, showContactIcons = true }: { data: ResumeData; showContactIcons?: boolean }) {
  const { personal, accent } = data;
  const fontScale = Math.max(80, Math.min(130, data.fontSize ?? 100)) / 100;
  const accentPalette = createPreviewAccentPalette(accent);
  const sectionOrder = data.sectionOrder ?? [];

  const renderSection = (id: string) => {
    const title = getTitle(data, id);

    if (id === "summary") {
      if (htmlEmpty(data.summary)) return null;
      return (
        <section key={id} data-block="section" style={{ marginBottom: "16px" }}>
          <MinimalSectionTitle palette={accentPalette}>{title}</MinimalSectionTitle>
          <RichContent html={data.summary} style={{ fontSize: "11.5px", lineHeight: 1.75, color: "#475569" }} />
        </section>
      );
    }

    if (id === "experience") {
      if (!data.experience.length) return null;
      return (
        <section key={id} data-block="section" style={{ marginBottom: "16px" }}>
          <MinimalSectionTitle palette={accentPalette}>{title}</MinimalSectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {data.experience.map((e) => (
              <div key={e.id} data-block="item">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{e.role || "Role"}</span>
                    {(e.company || e.location) && (
                      <span style={{ fontSize: "11.5px", fontWeight: 600, marginTop: "1px", color: "#64748b" }}>
                        {[e.company, e.location].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", marginLeft: "12px" }}>
                    {e.start}{e.end ? ` - ${e.end}` : ""}
                  </span>
                </div>
                {!htmlEmpty(e.description) && (
                  <RichContent html={e.description} style={{ fontSize: "11px", lineHeight: 1.7, marginTop: "5px", color: "#64748b" }} />
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (id === "education") {
      if (!data.education.length) return null;
      return (
        <section key={id} data-block="section" style={{ marginBottom: "16px" }}>
          <MinimalSectionTitle palette={accentPalette}>{title}</MinimalSectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.education.map((e) => (
              <div key={e.id} data-block="item" style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{e.degree || "Degree"}</div>
                  <div style={{ fontSize: "11px", fontWeight: 600, marginTop: "1px", color: "#64748b" }}>{e.school}</div>
                  {!htmlEmpty(e.description) && (
                    <RichContent html={e.description} style={{ fontSize: "11px", lineHeight: 1.65, marginTop: "4px", color: "#94a3b8" }} />
                  )}
                </div>
                <span style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", marginLeft: "12px", marginTop: "2px" }}>
                  {e.start}{e.end ? ` - ${e.end}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (id === "projects") {
      if (!data.projects.length) return null;
      return (
        <section key={id} data-block="section" style={{ marginBottom: "16px" }}>
          <MinimalSectionTitle palette={accentPalette}>{title}</MinimalSectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.projects.map((project) => (
              <div key={project.id} data-block="item">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{project.name || "Project"}</span>
                    {(project.link || project.technologies) && (
                      <span style={{ fontSize: "11px", fontWeight: 600, marginTop: "1px", color: "#64748b" }}>
                        {project.link}
                        {project.link && project.technologies ? " · " : ""}
                        {project.technologies}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", marginLeft: "12px", marginTop: "2px" }}>
                    {project.start}{project.end ? ` - ${project.end}` : ""}
                  </span>
                </div>
                {!htmlEmpty(project.description) && (
                  <RichContent html={project.description} style={{ fontSize: "11px", lineHeight: 1.65, marginTop: "4px", color: "#64748b" }} />
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (id === "skills") {
      if (!data.skills.length) return null;
      return (
        <section key={id} data-block="section" style={{ marginBottom: "16px" }}>
          <MinimalSectionTitle palette={accentPalette}>{title}</MinimalSectionTitle>
          <div className="flex flex-wrap gap-1">
            {data.skills.map((skill) => (
              <span key={skill} className="text-[10px] py-0.5 px-2 rounded" style={accentPalette.chip}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      );
    }

    if (id === "languages") {
      if (!data.languages.length) return null;
      return (
        <section key={id} data-block="section" style={{ marginBottom: "16px" }}>
          <MinimalSectionTitle palette={accentPalette}>{title}</MinimalSectionTitle>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {data.languages.map((l) => (
              <span key={l.id} style={{ fontSize: "11.5px", color: "#475569" }}>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>{l.name}</span>
                {l.level && <span style={{ color: "#94a3b8" }}> - {l.level}</span>}
              </span>
            ))}
          </div>
        </section>
      );
    }

    const custom = data.customSections.find((s) => s.id === id);
    if (custom) {
      return (
        <section key={id} data-block="section" style={{ marginBottom: "16px" }}>
          <MinimalSectionTitle palette={accentPalette}>{title}</MinimalSectionTitle>
          <RichContent html={custom.content} style={{ fontSize: "11.5px", lineHeight: 1.75, color: "#475569" }} />
        </section>
      );
    }
    return null;
  };

  return (
    <div style={{ width: `${100 / fontScale}%`, zoom: fontScale, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <header
        data-block="section"
        style={{
          minHeight: "126px",
          padding: `22px ${PAGE_PAD_H}px`,
          background: data.headerBackground,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "28px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "18px" }}>
          {personal.photo && (
            <PhotoFrame
              src={personal.photo}
              size={82}
              shape="circle"
              offsetX={personal.photoAdjust?.x}
              offsetY={personal.photoAdjust?.y}
              zoom={personal.photoAdjust?.scale}
              placeholderColor="rgba(255,255,255,0.16)"
              iconColor="rgba(255,255,255,0.72)"
              borderColor="rgba(255,255,255,0.36)"
            />
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: "26px", fontWeight: 900, color: "#ffffff", lineHeight: 1.08, margin: 0 }}>
              {personal.name || "Your Name"}
            </h1>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.82)", marginTop: "5px", fontWeight: 500 }}>
              {personal.title || "Professional Title"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", marginTop: "10px", color: "rgba(255,255,255,0.9)", fontSize: "9.5px", lineHeight: 1.35 }}>
              {[
                personal.email && { icon: <Mail size={8.5} />, text: personal.email },
                personal.phone && { icon: <Phone size={8.5} />, text: personal.phone },
                personal.location && { icon: <MapPin size={8.5} />, text: personal.location },
                personal.website && { icon: <Github size={8.5} />, text: personal.website },
                personal.linkedin && { icon: <Linkedin size={8.5} />, text: personal.linkedin },
              ]
                .filter(Boolean)
                .map((item, idx, arr) => (
                  <span key={idx} style={{ display: "inline-flex", alignItems: "center" }}>
                    {showContactIcons && (item as { icon: React.ReactNode; text: string }).icon}
                    <span style={{ marginLeft: showContactIcons ? "4px" : 0 }}>
                      {(item as { icon: React.ReactNode; text: string }).text}
                    </span>
                    {idx < arr.length - 1 ? (
                      <span aria-hidden="true" style={{ marginLeft: "10px", marginRight: "10px" }}>
                        |
                      </span>
                    ) : null}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </header>
      <div style={{ padding: `30px ${PAGE_PAD_H}px 0` }}>
        {sectionOrder.map((id) => renderSection(id))}
      </div>
    </div>
  );
}

interface PageLayout {
  /** doc-y where each page's content starts */
  starts: number[];
  /**
   * doc-y where each page's content ends.
   * ends[N] = starts[N+1] (the break point), which may be < starts[N]+CONTENT_HEIGHT
   * when a block was moved to the next page.  ends[last] = el.scrollHeight.
   */
  ends: number[];
}

// ─── Smart page-break engine ──────────────────────────────────────────────────

/**
 * Computes the start and end y-positions (in template coords) for each A4 page.
 *
 * Key guarantee: a [data-block] element is NEVER split across pages.  If it
 * would straddle the CONTENT_HEIGHT boundary, the break is moved to just
 * before that block (breakAt = block.top).  `ends[N]` records exactly where
 * page N stops, so the preview masks can hide everything beyond that point,
 * preventing the "same content appears on two consecutive pages" bug.
 */
function computePages(el: HTMLElement, contentHeight = CONTENT_HEIGHT, firstPageContentHeight = contentHeight): PageLayout {
  const totalHeight = el.scrollHeight;

  if (totalHeight <= firstPageContentHeight) {
    return { starts: [0], ends: [totalHeight] };
  }

  const containerTop = el.getBoundingClientRect().top;
  const blocks = Array.from(el.querySelectorAll("[data-block]")) as HTMLElement[];

  const blockPositions = blocks
    .map((b) => {
      const r = b.getBoundingClientRect();
      return { top: r.top - containerTop, height: r.height };
    })
    .filter((b) => b.height > 8)
    .sort((a, b) => a.top - b.top);

  const starts: number[] = [0];
  const ends: number[] = [];
  let pageStart = 0;
  let pageIndex = 0;

  while (true) {
    const pageBudget = pageIndex === 0 ? firstPageContentHeight : contentHeight;
    if (pageStart + pageBudget >= totalHeight) break;

    const pageEnd = pageStart + pageBudget;
    let breakAt = pageEnd;

    for (const { top, height } of blockPositions) {
      if (top >= pageEnd) break;
      const bottom = top + height;
      if (top < pageEnd && bottom > pageEnd) {
        // Block straddles the boundary — push entire block to next page
        // only when it starts in the lower half of the current content budget
        if (top > pageStart + contentHeight * 0.5) breakAt = top;
        break;
      }
    }

    if (breakAt <= pageStart) breakAt = pageEnd; // safety: prevent infinite loop
    ends.push(breakAt);
    starts.push(breakAt);
    pageStart = breakAt;
    pageIndex += 1;
  }

  ends.push(totalHeight); // last page ends at total content height
  return { starts, ends };
}

/** Stable equality check — avoids unnecessary re-renders */
function pagesEqual(a: PageLayout, b: PageLayout): boolean {
  return (
    a.starts.length === b.starts.length &&
    a.starts.every((v, i) => v === b.starts[i]) &&
    a.ends.every((v, i) => v === b.ends[i])
  );
}

// ─── Imperative handle ────────────────────────────────────────────────────────

export interface ResumePreviewHandle {
  exportPDF: (filename?: string) => Promise<void>;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const ResumePreview = forwardRef<ResumePreviewHandle, { data: ResumeData }>(
  ({ data }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [pages, setPages] = useState<PageLayout>({ starts: [0], ends: [CONTENT_HEIGHT] });

    const safeData: ResumeData = {
      ...data,
      headerBackground: data.headerBackground ?? "#0f172a",
      fontSize: data.fontSize ?? 100,
      personal: {
        ...data.personal,
        photoAdjust: {
          x: data.personal?.photoAdjust?.x ?? 0,
          y: data.personal?.photoAdjust?.y ?? 0,
          scale: data.personal?.photoAdjust?.scale ?? 1,
        },
      },
      sectionOrder: data.sectionOrder ?? ["summary", "experience", "projects", "education", "skills", "languages"],
      sectionTitles: data.sectionTitles ?? {},
      projects: data.projects ?? [],
      customSections: data.customSections ?? [],
      template: data.template ?? "classic",
    };
    const pageTopPad = PAGE_PAD_TOP;
    const firstPageTopPad = safeData.template === "minimal" ? 0 : pageTopPad;
    const contentHeight = getContentHeight(pageTopPad);
    const firstPageContentHeight = getContentHeight(firstPageTopPad);

    const TemplateComponent =
      safeData.template === "modern"
        ? ModernTemplate
        : safeData.template === "minimal"
        ? MinimalTemplate
        : ClassicTemplate;

    // Stable setter — only triggers a re-render when layout actually changes
    const updatePages = (el: HTMLElement) => {
      const next = computePages(el, contentHeight, firstPageContentHeight);
      setPages((prev) => (pagesEqual(prev, next) ? prev : next));
    };

    // Track container width → derive scale
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setScale(el.clientWidth / A4_WIDTH));
      ro.observe(el);
      setScale(el.clientWidth / A4_WIDTH);
      return () => ro.disconnect();
    }, []);

    // Observe measurement div — fires whenever content height changes
    useEffect(() => {
      const el = measureRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => updatePages(el));
      ro.observe(el);
      updatePages(el);
      return () => ro.disconnect();
    }, []);

    // ── PDF export ────────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      exportPDF: async (filename = "resume.pdf") => {
        const captureDiv = document.createElement("div");
        let root: ReturnType<typeof createRoot> | null = null;
        Object.assign(captureDiv.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: `${A4_WIDTH}px`,
          background: "white",
          fontFamily: safeData.font,
          zIndex: "-9999",
          pointerEvents: "none",
        });
        captureDiv.dataset.exportRoot = "true";
        document.body.appendChild(captureDiv);

        try {
          root = createRoot(captureDiv);
          root.render(createElement(TemplateComponent, { data: safeData, showContactIcons: false }));

          await new Promise<void>((r) => setTimeout(r, 400));

          const { starts: captureStarts, ends: captureEnds } = computePages(
            captureDiv,
            contentHeight,
            firstPageContentHeight
          );
          await exportTextBasedElementPdf({
            element: captureDiv,
            filename,
            fontFamily: safeData.font,
            pageStarts: captureStarts,
            pageEnds: captureEnds,
            pageTopPadPx: pageTopPad,
            firstPageTopPadPx: firstPageTopPad,
            pageWidthPx: A4_WIDTH,
            pageHeightPx: A4_HEIGHT,
            subject: "ATS-readable CV",
            author: safeData.personal.name || "CVLab",
          });
        } finally {
          root?.unmount();
          captureDiv.remove();
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        style={{ width: "100%", maxWidth: "820px", margin: "0 auto", position: "relative" }}
      >
        {/* Hidden measurement div — off-screen so layout is computed at full A4 width */}
        <div
          ref={measureRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: "-9999px",
            width: `${A4_WIDTH}px`,
            pointerEvents: "none",
            visibility: "hidden",
            fontFamily: safeData.font,
          }}
        >
          <TemplateComponent data={safeData} />
        </div>

        {/* Stacked A4 pages */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {pages.starts.map((startY, pageIndex) => {
            const endY = pages.ends[pageIndex];
            const contentLen = endY - startY;
            const currentPageTopPad = pageIndex === 0 ? firstPageTopPad : pageTopPad;

            // ── Mask percentages (relative to page height) ────────────────────
            // Top mask: always PAGE_PAD_TOP high — hides any bleed from the
            //           previous page that the transform shifts into this page's
            //           top-margin zone.
            const topMaskPct = (currentPageTopPad / A4_HEIGHT) * 100;
            // Bottom mask: covers from the end of THIS page's content to the
            //              bottom of the viewport.  When a block was pushed to
            //              the next page, contentLen < CONTENT_HEIGHT, so the
            //              mask grows to hide that early-end gap — eliminating
            //              the duplicate-content appearance.
            const bottomMaskPct =
              ((A4_HEIGHT - currentPageTopPad - contentLen) / A4_HEIGHT) * 100;

            return (
              <div
                key={pageIndex}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: `${A4_WIDTH} / ${A4_HEIGHT}`,
                  overflow: "hidden",
                  background: "white",
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.06)",
                  borderRadius: "2px",
                }}
              >
                {/* Template — translateY positions startY at PAGE_PAD_TOP on screen */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: `${A4_WIDTH}px`,
                    transformOrigin: "top left",
                    transform: `scale(${scale}) translateY(${currentPageTopPad - startY}px)`,
                    fontFamily: safeData.font,
                  }}
                >
                  <TemplateComponent data={safeData} />
                </div>

                {/* ── White masks ── */}
                {/* Top mask: hides content from the previous page bleeding into
                    this page's top-margin zone */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${topMaskPct}%`,
                    background: "white",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />
                {/* Bottom mask: hides content that overflows into the bottom
                    margin, and expands when a block was pushed to the next page
                    to prevent duplicate rendering */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${bottomMaskPct}%`,
                    background: "white",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />

                {/* Page number badge */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "12px",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    color: "#94a3b8",
                    background: "rgba(255,255,255,0.85)",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0",
                    pointerEvents: "none",
                    userSelect: "none",
                    zIndex: 3,
                  }}
                >
                  {pageIndex + 1} / {pages.starts.length}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

ResumePreview.displayName = "ResumePreview";
