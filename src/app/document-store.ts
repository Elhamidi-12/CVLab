import type { ResumeData } from "./components/resume-preview";
import type { CoverLetterData } from "./components/cover-letter-preview";

export type DocumentType = "resume" | "cover";

export type ResumeDocument = {
  id: string;
  type: "resume";
  title: string;
  updatedAt: string;
  data: ResumeData;
};

export type CoverLetterDocument = {
  id: string;
  type: "cover";
  title: string;
  updatedAt: string;
  data: CoverLetterData;
};

export type SavedDocument = ResumeDocument | CoverLetterDocument;

export const STORAGE_KEY = "cvlab.documents";

function getTodayDateLabel(): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

const DEFAULT_SECTION_TITLES: Record<string, string> = {
  summary: "Profile Summary",
  experience: "Work Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
};

export function createDefaultResumeData(): ResumeData {
  return {
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
      photoAdjust: { x: 0, y: 0, scale: 1 },
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
    skills: ["Design Systems", "Prototyping", "User Research", "A11y", "React", "TypeScript"],
    languages: [
      { id: "1", name: "English", level: "Native" },
      { id: "2", name: "Spanish", level: "Fluent" },
    ],
    customSections: [],
  };
}

export function createDefaultCoverLetterData(): CoverLetterData {
  return {
    accent: "#6366f1",
    font: "Inter, sans-serif",
    fontSize: 100,
    template: "professional",
    subject: "Bewerbung als Softwareentwickler",
    signature: "",
    sender: {
      name: "Alex Morgan",
      title: "Senior Product Designer",
      email: "alex.morgan@example.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
    },
    recipient: {
      name: "Hiring Team",
      company: "Acme, Inc.",
      address: "760 Market St\nSan Francisco, CA 94102",
    },
    date: getTodayDateLabel(),
    opening: "Sehr geehrte Damen und Herren,",
    body:
      "<p>I'm excited to apply for the Senior Product Designer role at Acme. Having spent the last seven years building design systems at Linear and Notion, I've come to deeply admire how Acme shapes the way modern teams create together.</p><p>At Linear, I led the redesign of the core issue tracker, improving task creation speed by 38% and shipping a design system now used by 200+ engineers. I believe I could bring that same rigor to Acme's product surface.</p>",
    closing: "<p>Mit freundlichen Grüßen</p>",
  };
}

export function createBlankDocument(type: DocumentType): SavedDocument {
  const now = new Date().toISOString();

  if (type === "resume") {
    return {
      id: `resume_${Date.now()}`,
      type: "resume",
      title: "Untitled Resume",
      updatedAt: now,
      data: createDefaultResumeData(),
    };
  }

  return {
    id: `cover_${Date.now()}`,
    type: "cover",
    title: "Untitled Cover Letter",
    updatedAt: now,
    data: createDefaultCoverLetterData(),
  };
}

function isSavedDocument(value: unknown): value is SavedDocument {
  if (!value || typeof value !== "object") return false;
  const record = value as { id?: unknown; type?: unknown; title?: unknown; updatedAt?: unknown; data?: unknown };
  return (
    typeof record.id === "string" &&
    (record.type === "resume" || record.type === "cover") &&
    typeof record.title === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.data === "object" &&
    record.data !== null
  );
}

export function loadDocuments(): SavedDocument[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedDocument);
  } catch {
    return [];
  }
}

export function saveDocuments(documents: SavedDocument[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  } catch (error) {
    // Keep the app responsive even when storage is unavailable/quota-limited.
    console.error("Failed to persist documents to localStorage", error);
  }
}
