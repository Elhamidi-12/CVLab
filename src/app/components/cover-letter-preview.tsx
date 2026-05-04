import {
  createElement,
  forwardRef,
  type ComponentType,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import DOMPurify from "dompurify";
import { exportTextBasedElementPdf } from "../pdf-export";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CoverLetterData = {
  accent: string;
  font: string;
  fontSize: number;
  template: "professional" | "modern";
  subject: string;
  signature: string;
  sender: { name: string; title: string; email: string; phone: string; location: string };
  recipient: { name: string; company: string; address: string };
  date: string;
  opening: string;
  body: string;
  closing: string;
};

type CoverLetterTemplateComponent = ComponentType<{ data: CoverLetterData }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function htmlEmpty(html: string | undefined): boolean {
  if (!html) return true;
  const trimmed = html.replace(/<p><\/p>/g, "").replace(/<br\s*\/?>/g, "").trim();
  return trimmed === "";
}

function RichContent({ html }: { html: string }) {
  if (htmlEmpty(html)) return null;
  const content = html.startsWith("<") ? html : `<p>${html}</p>`;
  const safeHtml = DOMPurify.sanitize(content);
  return <div className="rt-preview" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}

function parseCoverLetterDate(dateValue: string): Date | null {
  if (!dateValue) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const parsed = new Date(`${dateValue}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const fallback = new Date(dateValue);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatCoverLetterDate(dateValue: string): string {
  const parsed = parseCoverLetterDate(dateValue);
  if (!parsed) return "";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

function toIsoDateString(input: string | Date): string {
  const date = typeof input === "string" ? parseCoverLetterDate(input) : input;
  if (!date || Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SignatureImage({ src }: { src?: string }) {
  if (!src) return null;
  return <img className="cover-letter-signature-image" src={src} alt="Imported signature" draggable={false} />;
}

function setCssVariable(el: HTMLElement | null, name: string, value: string) {
  if (!el) return;
  el.style.setProperty(name, value);
}

// ─── A4 / page-margin constants ───────────────────────────────────────────────
// Must be declared before the template components that reference PAGE_PAD_H.

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

// Top padding removed so letter templates start flush at the page edge.
const PAGE_PAD_TOP = 0;
const PAGE_PAD_BOTTOM = 91; // 24 mm
const CONTENT_HEIGHT = A4_HEIGHT - PAGE_PAD_TOP - PAGE_PAD_BOTTOM; // 941 px

// ─── DIN 5008 TEMPLATE ────────────────────────────────────────────────────────

function Din5008Template({ data }: { data: CoverLetterData }) {
  const { sender, recipient, date, subject, signature, opening, body, closing } = data;
  const fontScale = Math.max(80, Math.min(130, data.fontSize ?? 100)) / 100;
  const displayDate = formatCoverLetterDate(date);

  return (
    <div className="cover-letter-din-template" style={{ width: `${100 / fontScale}%`, zoom: fontScale }}>
      <div className="din5008-letter">
        <div className="din5008-letter__top-row" data-block="section">
          <div className="din5008-letter__sender">
            <div className="din5008-letter__sender-name">{sender.name || "Your Name"}</div>
            {sender.title && <div>{sender.title}</div>}
            {sender.email && <div>{sender.email}</div>}
            {sender.phone && <div>{sender.phone}</div>}
            {sender.location && <div>{sender.location}</div>}
          </div>
          <div className="din5008-letter__date">{displayDate}</div>
        </div>

        <div className="din5008-letter__recipient" data-block="section">
          {recipient.name && <div className="din5008-letter__recipient-name">{recipient.company}</div>}
          {recipient.company && <div>{recipient.name}</div>}
          {recipient.address && <div className="din5008-letter__recipient-address">{recipient.address}</div>}
        </div>

        <div className="din5008-letter__subject" data-block="section">
          {subject || "Bewerbung"}
        </div>

        <div className="din5008-letter__content">
          <div className="din5008-letter__salutation" data-block="section">
            <RichContent html={opening || "Sehr geehrte Damen und Herren,"} />
          </div>

          {!htmlEmpty(body) && (
            <div className="din5008-letter__body" data-block="section">
              <RichContent html={body} />
            </div>
          )}

          {!htmlEmpty(closing) && (
            <div className="din5008-letter__closing" data-block="section">
              <RichContent html={closing} />
            </div>
          )}

          <div className="din5008-letter__signature" data-block="section">
            <div className="din5008-letter__signature-space" />
            <SignatureImage src={signature} />
            <div className="din5008-letter__signature-name">{sender.name || "Your Name"}</div>
            {sender.title && <div className="din5008-letter__signature-title">{sender.title}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODERN TEMPLATE ──────────────────────────────────────────────────────────

function ModernCLTemplate({ data }: { data: CoverLetterData }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { sender, recipient, date, opening, body, closing, accent, signature } = data;
  const fontScale = Math.max(80, Math.min(130, data.fontSize ?? 100)) / 100;
  const displayDate = formatCoverLetterDate(date);

  useEffect(() => {
    setCssVariable(rootRef.current, "--cover-letter-modern-accent", accent);
  }, [accent]);

  return (
    <div ref={rootRef} className="cover-letter-modern" style={{ width: `${100 / fontScale}%`, zoom: fontScale }}>
      <div className="cover-letter-modern__header" data-block="section">
        <div>
          <h1 className="cover-letter-modern__name">{sender.name || "Your Name"}</h1>
          <p className="cover-letter-modern__title">{sender.title}</p>
        </div>
        <div className="cover-letter-modern__contacts">
          {sender.email && <span className="cover-letter-modern__contact">{sender.email}</span>}
          {sender.phone && <span className="cover-letter-modern__contact">{sender.phone}</span>}
          {sender.location && <span className="cover-letter-modern__contact">{sender.location}</span>}
        </div>
      </div>

      <div className="cover-letter-modern__body">
        <div className="cover-letter-modern__meta" data-block="section">
          <div className="cover-letter-modern__recipient-block">
            {recipient.name && <div className="cover-letter-modern__recipient-name">{recipient.company}</div>}
            {recipient.company && <div className="cover-letter-modern__recipient-company">{recipient.name}</div>}
            {recipient.address && <div className="cover-letter-modern__recipient-address">{recipient.address}</div>}
          </div>
          <div className="cover-letter-modern__date">{displayDate}</div>
        </div>

        <div className="cover-letter-modern__subject" data-block="section">
          {data.subject || "Bewerbung"}
        </div>

        <div className="cover-letter-modern__content">
          <div className="cover-letter-modern__opening" data-block="section">
            <RichContent html={opening || "Sehr geehrte Damen und Herren,"} />
          </div>
          {!htmlEmpty(body) && (
            <div className="cover-letter-modern__text" data-block="section">
              <RichContent html={body} />
            </div>
          )}
          {!htmlEmpty(closing) && (
            <div className="cover-letter-modern__text" data-block="section">
              <RichContent html={closing} />
            </div>
          )}
          <div className="cover-letter-modern__signature" data-block="section">
            <SignatureImage src={signature} />
            <div className="cover-letter-modern__signature-name">{sender.name || "Your Name"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page layout type ─────────────────────────────────────────────────────────

interface PageLayout {
  starts: number[];
  ends: number[];
}

// ─── Smart page-break engine ──────────────────────────────────────────────────

function computePages(el: HTMLElement): PageLayout {
  const totalHeight = el.scrollHeight;

  if (totalHeight <= CONTENT_HEIGHT) {
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

  while (pageStart + CONTENT_HEIGHT < totalHeight) {
    const pageEnd = pageStart + CONTENT_HEIGHT;
    let breakAt = pageEnd;

    for (const { top, height } of blockPositions) {
      if (top >= pageEnd) break;
      const bottom = top + height;
      if (top < pageEnd && bottom > pageEnd) {
        if (top > pageStart + CONTENT_HEIGHT * 0.5) breakAt = top;
        break;
      }
    }

    if (breakAt <= pageStart) breakAt = pageEnd;
    ends.push(breakAt);
    starts.push(breakAt);
    pageStart = breakAt;
  }

  ends.push(totalHeight);
  return { starts, ends };
}

function pagesEqual(a: PageLayout, b: PageLayout): boolean {
  return (
    a.starts.length === b.starts.length &&
    a.starts.every((v, i) => v === b.starts[i]) &&
    a.ends.every((v, i) => v === b.ends[i])
  );
}

function setPageStyles(
  pageEl: HTMLDivElement | null,
  contentEl: HTMLDivElement | null,
  scale: number,
  startY: number,
  fontFamily: string,
  contentLength: number,
) {
  if (contentEl) {
    setCssVariable(contentEl, "--preview-scale", String(scale));
    setCssVariable(contentEl, "--preview-translate-y", `${PAGE_PAD_TOP - startY}px`);
    setCssVariable(contentEl, "--preview-font-family", fontFamily);
  }

  if (pageEl) {
    const topMaskPct = (PAGE_PAD_TOP / A4_HEIGHT) * 100;
    const bottomMaskPct = ((A4_HEIGHT - PAGE_PAD_TOP - contentLength) / A4_HEIGHT) * 100;
    setCssVariable(pageEl, "--preview-top-mask-height", `${topMaskPct}%`);
    setCssVariable(pageEl, "--preview-bottom-mask-height", `${bottomMaskPct}%`);
  }
}

function PreviewPage({
  data,
  pageIndex,
  pageCount,
  startY,
  endY,
  scale,
  fontFamily,
  TemplateComponent,
}: {
  data: CoverLetterData;
  pageIndex: number;
  pageCount: number;
  startY: number;
  endY: number;
  scale: number;
  fontFamily: string;
  TemplateComponent: CoverLetterTemplateComponent;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentLength = endY - startY;

  useEffect(() => {
    setPageStyles(pageRef.current, contentRef.current, scale, startY, fontFamily, contentLength);
  }, [contentLength, fontFamily, scale, startY]);

  return (
    <div ref={pageRef} className="cover-letter-preview__page">
      <div ref={contentRef} className="cover-letter-preview__page-content">
        <TemplateComponent data={data} />
      </div>

      <div className="cover-letter-preview__top-mask" />
      <div className="cover-letter-preview__bottom-mask" />

      <div className="cover-letter-preview__page-badge">
        {pageIndex + 1} / {pageCount}
      </div>
    </div>
  );
}

// ─── Imperative handle ────────────────────────────────────────────────────────

export interface CoverLetterPreviewHandle {
  exportPDF: (filename?: string) => Promise<void>;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const CoverLetterPreview = forwardRef<CoverLetterPreviewHandle, { data: CoverLetterData }>(
  ({ data }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [pages, setPages] = useState<PageLayout>({ starts: [0], ends: [CONTENT_HEIGHT] });

    const safeData: CoverLetterData = {
      ...data,
      date: toIsoDateString(data.date),
      fontSize: data.fontSize ?? 100,
      template: data.template ?? "professional",
    };

    const TemplateComponent: CoverLetterTemplateComponent =
      safeData.template === "modern" ? ModernCLTemplate : Din5008Template;

    const updatePages = (el: HTMLElement) => {
      const next = computePages(el);
      setPages((prev) => (pagesEqual(prev, next) ? prev : next));
    };

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setScale(el.clientWidth / A4_WIDTH));
      ro.observe(el);
      setScale(el.clientWidth / A4_WIDTH);
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      const el = measureRef.current;
      if (!el) return;
      setCssVariable(el, "--preview-font-family", safeData.font);
      const ro = new ResizeObserver(() => updatePages(el));
      ro.observe(el);
      updatePages(el);
      return () => ro.disconnect();
    }, [safeData.font, safeData.fontSize]);

    useImperativeHandle(ref, () => ({
      exportPDF: async (filename = "cover-letter.pdf") => {
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
          root.render(createElement(TemplateComponent, { data: safeData }));

          await new Promise<void>((resolve) => setTimeout(resolve, 400));

          const { starts: captureStarts, ends: captureEnds } = computePages(captureDiv);
          await exportTextBasedElementPdf({
            element: captureDiv,
            filename,
            fontFamily: safeData.font,
            pageStarts: captureStarts,
            pageEnds: captureEnds,
            pageTopPadPx: PAGE_PAD_TOP,
            pageWidthPx: A4_WIDTH,
            pageHeightPx: A4_HEIGHT,
            subject: "ATS-readable cover letter",
            author: safeData.sender.name || "CVLab",
          });
        } finally {
          root?.unmount();
          captureDiv.remove();
        }
      },
    }));

    return (
      <div ref={containerRef} className="cover-letter-preview">
        <div ref={measureRef} aria-hidden="true" className="cover-letter-preview__measure">
          <TemplateComponent data={safeData} />
        </div>

        <div className="cover-letter-preview__stack">
          {pages.starts.map((startY, pageIndex) => {
            const endY = pages.ends[pageIndex];

            return (
              <PreviewPage
                key={pageIndex}
                data={safeData}
                pageIndex={pageIndex}
                pageCount={pages.starts.length}
                startY={startY}
                endY={endY}
                scale={scale}
                fontFamily={safeData.font}
                TemplateComponent={TemplateComponent}
              />
            );
          })}
        </div>
      </div>
    );
  },
);

CoverLetterPreview.displayName = "CoverLetterPreview";
