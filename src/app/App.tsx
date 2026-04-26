import { useState } from "react";
import { ArrowRight, Clock, FileText, Mail, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { ResumeBuilder } from "./components/resume-builder";
import { CoverLetterBuilder } from "./components/cover-letter-builder";
import {
  createBlankDocument,
  loadDocuments,
  saveDocuments,
  type DocumentType,
  type SavedDocument,
} from "./document-store";

type View = "dashboard" | "resume" | "cover";

function formatUpdatedAt(updatedAt: string): string {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "Just now";

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [documents, setDocuments] = useState<SavedDocument[]>(() => loadDocuments());
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const updateDocuments = (updater: (current: SavedDocument[]) => SavedDocument[]) => {
    setDocuments((current) => {
      const next = updater(current);
      saveDocuments(next);
      return next;
    });
  };

  const openDocument = (id: string) => {
    const document = documents.find((item) => item.id === id);
    if (!document) return;
    setActiveDocumentId(id);
    setView(document.type);
  };

  const createDocument = (type: DocumentType) => {
    const document = createBlankDocument(type);
    updateDocuments((current) => [...current, document]);
    setActiveDocumentId(document.id);
    setView(type);
  };

  const saveDocument = (document: SavedDocument) => {
    const updatedDocument = { ...document, updatedAt: new Date().toISOString() } as SavedDocument;
    updateDocuments((current) => {
      const exists = current.some((item) => item.id === updatedDocument.id);
      return exists
        ? current.map((item) => (item.id === updatedDocument.id ? updatedDocument : item))
        : [...current, updatedDocument];
    });
    setActiveDocumentId(updatedDocument.id);
  };

  const renameDocument = (id: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    updateDocuments((current) =>
      current.map((item) =>
        item.id === id ? { ...item, title: cleanTitle, updatedAt: new Date().toISOString() } : item
      )
    );
  };

  const deleteDocument = (id: string) => {
    updateDocuments((current) => current.filter((item) => item.id !== id));
    if (activeDocumentId === id) {
      setActiveDocumentId(null);
      setView("dashboard");
    }
  };

  const activeDocument = activeDocumentId ? documents.find((item) => item.id === activeDocumentId) : null;

  if (view === "resume" && activeDocument?.type === "resume") {
    return (
      <ResumeBuilder
        document={activeDocument}
        onBack={() => setView("dashboard")}
        onSave={saveDocument}
        onDelete={deleteDocument}
      />
    );
  }

  if (view === "cover" && activeDocument?.type === "cover") {
    return (
      <CoverLetterBuilder
        document={activeDocument}
        onBack={() => setView("dashboard")}
        onSave={saveDocument}
        onDelete={deleteDocument}
      />
    );
  }

  return (
    <Dashboard
      documents={documents}
      onCreate={createDocument}
      onDelete={deleteDocument}
      onOpen={openDocument}
      onRename={renameDocument}
    />
  );
}

function Dashboard({
  documents,
  onCreate,
  onDelete,
  onOpen,
  onRename,
}: {
  documents: SavedDocument[];
  onCreate: (type: DocumentType) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const sortedDocuments = [...documents].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-[17px] font-bold text-[#0f172a]">CV Maker</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 rounded-lg hover:bg-slate-100 text-[14px] text-[#475569]">
              Templates
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[13px] font-semibold">
              AM
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 mb-4 text-[12px] font-medium">
            <Sparkles size={12} /> ATS-friendly · Real-time preview
          </div>
          <h1 className="text-[32px] font-bold text-[#0f172a] leading-tight">Craft documents that get you hired.</h1>
          <p className="mt-3 max-w-2xl text-[16px] text-[#475569] leading-relaxed">
            Build polished, text-based PDFs with instant visual feedback. Start a new resume or cover letter,
            rename drafts from the dashboard, and save everything locally as you work.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-12">
          <button
            onClick={() => onCreate("resume")}
            className="group text-left bg-white rounded-2xl border border-slate-200 p-8 hover:border-indigo-300 hover:shadow-[0_10px_30px_rgba(99,102,241,0.12)] transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileText size={22} />
            </div>
            <h2 className="text-[20px] font-semibold text-[#0f172a]">Create a Resume</h2>
            <p className="mt-2 text-[14px] text-[#64748b] leading-relaxed">
              A clean, ATS-friendly resume with live preview. Organized sections for experience, education,
              skills, and languages.
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-indigo-600 text-[14px] font-medium">
              Start building <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => onCreate("cover")}
            className="group text-left bg-white rounded-2xl border border-slate-200 p-8 hover:border-indigo-300 hover:shadow-[0_10px_30px_rgba(99,102,241,0.12)] transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Mail size={22} />
            </div>
            <h2 className="text-[20px] font-semibold text-[#0f172a]">Write a Cover Letter</h2>
            <p className="mt-2 text-[14px] text-[#64748b] leading-relaxed">
              Pair your resume with a tailored letter. Guided opening, body, and closing sections keep the tone consistent.
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-indigo-600 text-[14px] font-medium">
              Start writing <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold text-[#0f172a]">Recent documents</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onCreate("resume")}
                className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-[14px] font-medium"
              >
                <Plus size={14} /> New Resume
              </button>
              <button
                type="button"
                onClick={() => onCreate("cover")}
                className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-[14px] font-medium"
              >
                <Plus size={14} /> New Cover Letter
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {sortedDocuments.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-500">
                No saved documents yet. Create a resume or cover letter to get started.
              </div>
            ) : (
              sortedDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <button onClick={() => onOpen(document.id)} className="flex items-center gap-4 text-left flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      {document.type === "resume" ? <FileText size={16} /> : <Mail size={16} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-[#0f172a] truncate">{document.title}</div>
                      <div className="text-[12px] text-[#64748b]">
                        {document.type === "resume" ? "Resume" : "Cover Letter"}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mr-1">
                      <Clock size={12} /> {formatUpdatedAt(document.updatedAt)}
                    </div>
                    <button
                      type="button"
                      title="Rename document"
                      aria-label="Rename document"
                      onClick={() => {
                        const nextTitle = window.prompt("Rename document", document.title);
                        if (nextTitle) onRename(document.id, nextTitle);
                      }}
                      className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title="Delete document"
                      aria-label="Delete document"
                      onClick={() => onDelete(document.id)}
                      className="p-2 rounded-full hover:bg-red-100 text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
