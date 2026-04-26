import { jsPDF } from "jspdf";
import type { ResumeData } from "./components/resume-preview";
import type { CoverLetterData } from "./components/cover-letter-preview";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 54;
const MARGIN_TOP = 54;
const MARGIN_BOTTOM = 54;

type Rgb = [number, number, number];

type TextStyle = {
  size?: number;
  color?: Rgb;
  fontStyle?: "normal" | "bold" | "italic";
  lineHeight?: number;
};

type Rgba = [number, number, number, number];

type ElementPdfExportOptions = {
  element: HTMLElement;
  filename: string;
  fontFamily: string;
  pageStarts: number[];
  pageEnds: number[];
  pageTopPadPx: number;
  firstPageTopPadPx?: number;
  pageWidthPx?: number;
  pageHeightPx?: number;
  title?: string;
  subject?: string;
  author?: string;
};

const PREVIEW_PAGE_W = 794;
const PREVIEW_PAGE_H = 1123;

function hexToRgb(hex: string | undefined, fallback: Rgb = [15, 23, 42]): Rgb {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return fallback;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function filenameSafe(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "document.pdf";
}

function pdfFont(font: string): string {
  return font.toLowerCase().includes("georgia") ? "times" : "helvetica";
}

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseAlpha(value: string | undefined): number {
  if (!value) return 1;
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) return Math.max(0, Math.min(1, parseFloat(trimmed) / 100));
  return Math.max(0, Math.min(1, parseFloat(trimmed)));
}

function parseRgbChannel(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) return clamp255((parseFloat(trimmed) / 100) * 255);
  return clamp255(parseFloat(trimmed));
}

function linearToSrgb(value: number): number {
  const channel = value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return clamp255(channel * 255);
}

function oklabToRgb(l: number, a: number, b: number, alpha = 1): Rgba {
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lPrime ** 3;
  const m3 = mPrime ** 3;
  const s3 = sPrime ** 3;

  return [
    linearToSrgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    linearToSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    linearToSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
    alpha,
  ];
}

function splitCssColorArgs(value: string): string[] {
  return value
    .trim()
    .replace(/\s*\/\s*/g, " / ")
    .split(/[\s,]+/)
    .filter(Boolean);
}

function parseCssColor(value: string | undefined): Rgba | null {
  if (!value) return null;
  const color = value.trim().toLowerCase();
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return null;

  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3
      ? hex[1].split("").map((char) => char + char).join("")
      : hex[1];
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
      1,
    ];
  }

  const rgb = color.match(/^rgba?\((.*)\)$/);
  if (rgb) {
    const parts = splitCssColorArgs(rgb[1]);
    const slash = parts.indexOf("/");
    const alpha = slash >= 0 ? parseAlpha(parts[slash + 1]) : parseAlpha(parts[3]);
    return [parseRgbChannel(parts[0]), parseRgbChannel(parts[1]), parseRgbChannel(parts[2]), alpha];
  }

  const srgb = color.match(/^color\(srgb\s+(.*)\)$/);
  if (srgb) {
    const parts = splitCssColorArgs(srgb[1]);
    const slash = parts.indexOf("/");
    const alpha = slash >= 0 ? parseAlpha(parts[slash + 1]) : 1;
    return [
      clamp255(parseFloat(parts[0]) * 255),
      clamp255(parseFloat(parts[1]) * 255),
      clamp255(parseFloat(parts[2]) * 255),
      alpha,
    ];
  }

  const oklab = color.match(/^oklab\((.*)\)$/);
  if (oklab) {
    const parts = splitCssColorArgs(oklab[1]);
    const slash = parts.indexOf("/");
    const alpha = slash >= 0 ? parseAlpha(parts[slash + 1]) : 1;
    const l = parts[0].endsWith("%") ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
    return oklabToRgb(l, parseFloat(parts[1]), parseFloat(parts[2]), alpha);
  }

  const oklch = color.match(/^oklch\((.*)\)$/);
  if (oklch) {
    const parts = splitCssColorArgs(oklch[1]);
    const slash = parts.indexOf("/");
    const alpha = slash >= 0 ? parseAlpha(parts[slash + 1]) : 1;
    const l = parts[0].endsWith("%") ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
    const c = parseFloat(parts[1]);
    const h = (parseFloat(parts[2]) * Math.PI) / 180;
    return oklabToRgb(l, c * Math.cos(h), c * Math.sin(h), alpha);
  }

  return null;
}

function blendOnWhite(color: Rgba): Rgb {
  const [r, g, b, alpha] = color;
  return [
    clamp255(r * alpha + 255 * (1 - alpha)),
    clamp255(g * alpha + 255 * (1 - alpha)),
    clamp255(b * alpha + 255 * (1 - alpha)),
  ];
}

function cssPixels(value: string | undefined, relativeTo = 0): number {
  if (!value || value === "normal" || value === "medium") return 0;
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) return (Number.parseFloat(trimmed) / 100) * relativeTo;
  return Number.parseFloat(trimmed) || 0;
}

function cssFontStyle(style: CSSStyleDeclaration): string {
  const weight = Number.parseInt(style.fontWeight, 10);
  const isBold = Number.isFinite(weight) ? weight >= 600 : /bold/i.test(style.fontWeight);
  const isItalic = /italic|oblique/i.test(style.fontStyle);

  if (isBold && isItalic) return "bolditalic";
  if (isBold) return "bold";
  if (isItalic) return "italic";
  return "normal";
}

function isVisibleElement(el: Element): boolean {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity || "1") > 0.01;
}

function isTextNodeVisible(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent || !node.nodeValue?.trim()) return false;
  if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) return false;

  let el: Element | null = parent;
  while (el) {
    if (!isVisibleElement(el)) return false;
    el = el.parentElement;
  }

  return true;
}

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      if ("decode" in img) return img.decode().catch(() => undefined);
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  ).then(() => undefined);
}

function isElementInPage(rect: DOMRect, rootRect: DOMRect, pageStart: number, pageEnd: number): boolean {
  const top = rect.top - rootRect.top;
  const bottom = rect.bottom - rootRect.top;
  return bottom > pageStart && top < pageEnd && rect.width > 0 && rect.height > 0;
}

function pageRect(
  rect: DOMRect,
  rootRect: DOMRect,
  pageStart: number,
  pageEnd: number,
  pageTopPadPx: number,
  pxToPt: number,
) {
  const relLeft = rect.left - rootRect.left;
  const relTop = rect.top - rootRect.top;
  const relBottom = rect.bottom - rootRect.top;
  const visibleTop = Math.max(relTop, pageStart);
  const visibleBottom = Math.min(relBottom, pageEnd);

  return {
    x: relLeft * pxToPt,
    y: (visibleTop - pageStart + pageTopPadPx) * pxToPt,
    width: rect.width * pxToPt,
    height: Math.max(0, (visibleBottom - visibleTop) * pxToPt),
  };
}

function elementCornerRadius(style: CSSStyleDeclaration, width: number, height: number): number {
  const radius = Math.max(
    cssPixels(style.borderTopLeftRadius, width),
    cssPixels(style.borderTopRightRadius, width),
    cssPixels(style.borderBottomRightRadius, width),
    cssPixels(style.borderBottomLeftRadius, width),
  );
  return Math.max(0, Math.min(radius, width / 2, height / 2));
}

function drawRect(doc: jsPDF, x: number, y: number, width: number, height: number, radius: number, mode: "F" | "S" | null) {
  if (width <= 0 || height <= 0) return;
  if (radius >= Math.min(width, height) * 0.45 && Math.abs(width - height) < 1) {
    doc.circle(x + width / 2, y + height / 2, Math.min(width, height) / 2, mode);
    return;
  }
  if (radius > 0) doc.roundedRect(x, y, width, height, radius, radius, mode);
  else doc.rect(x, y, width, height, mode);
}

function drawElementBackgrounds(
  doc: jsPDF,
  elements: Element[],
  rootRect: DOMRect,
  pageStart: number,
  pageEnd: number,
  pageTopPadPx: number,
  pxToPt: number,
) {
  elements.forEach((el) => {
    if (!isVisibleElement(el)) return;
    const rect = el.getBoundingClientRect();
    if (!isElementInPage(rect, rootRect, pageStart, pageEnd)) return;

    const style = window.getComputedStyle(el);
    const background = parseCssColor(style.backgroundColor);
    if (!background || background[3] <= 0.01) return;

    const { x, y, width, height } = pageRect(rect, rootRect, pageStart, pageEnd, pageTopPadPx, pxToPt);
    const radius = elementCornerRadius(style, width / pxToPt, height / pxToPt) * pxToPt;
    doc.setFillColor(...blendOnWhite(background));
    drawRect(doc, x, y, width, height, radius, "F");
  });
}

function drawElementBorders(
  doc: jsPDF,
  elements: Element[],
  rootRect: DOMRect,
  pageStart: number,
  pageEnd: number,
  pageTopPadPx: number,
  pxToPt: number,
) {
  elements.forEach((el) => {
    if (!isVisibleElement(el)) return;
    const rect = el.getBoundingClientRect();
    if (!isElementInPage(rect, rootRect, pageStart, pageEnd)) return;

    const style = window.getComputedStyle(el);
    const { x, y, width, height } = pageRect(rect, rootRect, pageStart, pageEnd, pageTopPadPx, pxToPt);
    const radius = elementCornerRadius(style, width / pxToPt, height / pxToPt) * pxToPt;
    const borderSides = [
      { width: cssPixels(style.borderTopWidth), color: parseCssColor(style.borderTopColor), x1: x, y1: y, x2: x + width, y2: y },
      { width: cssPixels(style.borderRightWidth), color: parseCssColor(style.borderRightColor), x1: x + width, y1: y, x2: x + width, y2: y + height },
      { width: cssPixels(style.borderBottomWidth), color: parseCssColor(style.borderBottomColor), x1: x, y1: y + height, x2: x + width, y2: y + height },
      { width: cssPixels(style.borderLeftWidth), color: parseCssColor(style.borderLeftColor), x1: x, y1: y, x2: x, y2: y + height },
    ];
    const visibleSides = borderSides.filter((side) => side.width > 0 && side.color && side.color[3] > 0.01);
    if (!visibleSides.length) return;

    const sameBorder =
      visibleSides.length === 4 &&
      visibleSides.every((side) => side.width === visibleSides[0].width && side.color?.join(",") === visibleSides[0].color?.join(","));

    if (sameBorder && visibleSides[0].color) {
      doc.setDrawColor(...blendOnWhite(visibleSides[0].color));
      doc.setLineWidth(Math.max(0.2, visibleSides[0].width * pxToPt));
      drawRect(doc, x, y, width, height, radius, "S");
      return;
    }

    visibleSides.forEach((side) => {
      if (!side.color) return;
      doc.setDrawColor(...blendOnWhite(side.color));
      doc.setLineWidth(Math.max(0.2, side.width * pxToPt));
      doc.line(side.x1, side.y1, side.x2, side.y2);
    });
  });
}

function imageClipElement(img: HTMLImageElement, root: HTMLElement): HTMLElement | null {
  let current = img.parentElement;

  while (current && current !== root.parentElement) {
    const style = window.getComputedStyle(current);
    const clips = /(hidden|clip|auto|scroll)/.test(`${style.overflow}${style.overflowX}${style.overflowY}`);
    if (clips) {
      // Always prefer the nearest clipping ancestor. For transformed images
      // (scale/translate), the image can extend outside this box by design.
      return current;
    }
    if (current === root) break;
    current = current.parentElement;
  }

  return null;
}

function objectPositionRatio(value: string | undefined): [number, number] {
  if (!value) return [0.5, 0.5];
  const parts = value.trim().split(/\s+/);
  const parsePart = (part: string | undefined, axis: "x" | "y") => {
    if (!part || part === "center") return 0.5;
    if (part === "left" || part === "top") return 0;
    if (part === "right" || part === "bottom") return 1;
    if (part.endsWith("%")) return Math.max(0, Math.min(1, Number.parseFloat(part) / 100));
    return axis === "x" ? 0.5 : 0.5;
  };

  return [parsePart(parts[0], "x"), parsePart(parts[1], "y")];
}

function imageDestinationRect(img: HTMLImageElement, box: { x: number; y: number; width: number; height: number }) {
  const style = window.getComputedStyle(img);
  const fit = style.objectFit;
  const naturalWidth = img.naturalWidth || box.width;
  const naturalHeight = img.naturalHeight || box.height;
  const imageRatio = naturalWidth / naturalHeight;
  const boxRatio = box.width / box.height;

  if (!Number.isFinite(imageRatio) || !Number.isFinite(boxRatio) || fit === "fill" || fit === "none") {
    return box;
  }

  if (fit !== "cover" && fit !== "contain") return box;

  const cover = fit === "cover";
  const expandWidth = cover ? imageRatio > boxRatio : imageRatio < boxRatio;
  const width = expandWidth ? box.height * imageRatio : box.width;
  const height = expandWidth ? box.height : box.width / imageRatio;
  const [positionX, positionY] = objectPositionRatio(style.objectPosition);

  return {
    x: box.x - Math.max(0, width - box.width) * positionX,
    y: box.y - Math.max(0, height - box.height) * positionY,
    width,
    height,
  };
}

function addClippedImage(
  doc: jsPDF,
  img: HTMLImageElement,
  root: HTMLElement,
  rootRect: DOMRect,
  pageStart: number,
  pageEnd: number,
  pageTopPadPx: number,
  pxToPt: number,
) {
  const rect = img.getBoundingClientRect();
  const imageBox = pageRect(rect, rootRect, pageStart, pageEnd, pageTopPadPx, pxToPt);
  const imageDest = imageDestinationRect(img, imageBox);
  const src = img.currentSrc || img.src;
  const clipElement = imageClipElement(img, root);

  try {
    const clipRect = clipElement?.getBoundingClientRect() ?? rect;
    const clipStyle = clipElement ? window.getComputedStyle(clipElement) : window.getComputedStyle(img);
    const clip = pageRect(clipRect, rootRect, pageStart, pageEnd, pageTopPadPx, pxToPt);
    const radius = elementCornerRadius(clipStyle, clip.width / pxToPt, clip.height / pxToPt) * pxToPt;
    doc.saveGraphicsState();
    drawRect(doc, clip.x, clip.y, clip.width, clip.height, radius, null);
    doc.clip();
    doc.discardPath();
    doc.addImage(src, imageFormat(src), imageDest.x, imageDest.y, imageDest.width, imageDest.height);
    doc.restoreGraphicsState();
  } catch {
    // Unsupported image data should not prevent text-based export.
  }
}

function serializedSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const style = window.getComputedStyle(svg);

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(rect.width || svg.clientWidth || 1));
  clone.setAttribute("height", String(rect.height || svg.clientHeight || 1));
  clone.style.color = style.color;

  const sourceChildren = Array.from(svg.querySelectorAll<SVGElement>("*"));
  Array.from(clone.querySelectorAll<SVGElement>("*")).forEach((child, index) => {
    const source = sourceChildren[index];
    if (!source) return;
    const sourceStyle = window.getComputedStyle(source);
    const stroke = source.getAttribute("stroke");
    const fill = source.getAttribute("fill");

    if (!stroke || stroke === "currentColor") child.setAttribute("stroke", sourceStyle.stroke || style.color);
    if (fill === "currentColor") child.setAttribute("fill", sourceStyle.fill || style.color);
  });

  return new XMLSerializer().serializeToString(clone);
}

async function drawMedia(
  doc: jsPDF,
  root: HTMLElement,
  elements: Element[],
  rootRect: DOMRect,
  pageStart: number,
  pageEnd: number,
  pageTopPadPx: number,
  pxToPt: number,
) {
  const tasks: Promise<unknown>[] = [];

  elements.forEach((el) => {
    if (!isVisibleElement(el)) return;
    const rect = el.getBoundingClientRect();
    if (!isElementInPage(rect, rootRect, pageStart, pageEnd)) return;

    if (el instanceof HTMLImageElement && (el.currentSrc || el.src)) {
      addClippedImage(doc, el, root, rootRect, pageStart, pageEnd, pageTopPadPx, pxToPt);
      return;
    }

    if (el instanceof SVGSVGElement) {
      // Lucide icons are decorative and can rasterize as corrupted glyph boxes
      // in some PDF viewers. Keep export ATS-clean by omitting them.
      if (el.hasAttribute("data-lucide")) return;

      const { x, y, width, height } = pageRect(rect, rootRect, pageStart, pageEnd, pageTopPadPx, pxToPt);
      try {
        const result = doc.addSvgAsImage(serializedSvg(el), x, y, width, height) as unknown;
        if (result && typeof (result as Promise<unknown>).then === "function") {
          tasks.push(result as Promise<unknown>);
        }
      } catch {
        // Decorative SVG icons should not block export.
      }
    }
  });

  await Promise.all(tasks);
}

type TextLine = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  style: CSSStyleDeclaration;
};

function textNodeLines(node: Text, rootRect: DOMRect): TextLine[] {
  const value = node.nodeValue ?? "";
  const parent = node.parentElement;
  if (!parent) return [];

  const range = document.createRange();
  const chars: { char: string; left: number; top: number; width: number; height: number }[] = [];

  for (let i = 0; i < value.length; i += 1) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = Array.from(range.getClientRects()).find((item) => item.width > 0 || item.height > 0);
    if (!rect) continue;
    chars.push({
      char: value[i],
      left: rect.left - rootRect.left,
      top: rect.top - rootRect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  range.detach();
  if (!chars.length) return [];

  const grouped: typeof chars[] = [];
  chars.forEach((char) => {
    const line = grouped.find((items) => Math.abs(items[0].top - char.top) < 2);
    if (line) line.push(char);
    else grouped.push([char]);
  });

  const style = window.getComputedStyle(parent);
  return grouped
    .map((line) => {
      const ordered = line.sort((a, b) => a.left - b.left);
      const left = Math.min(...ordered.map((char) => char.left));
      const right = Math.max(...ordered.map((char) => char.left + char.width));
      const top = Math.min(...ordered.map((char) => char.top));
      const bottom = Math.max(...ordered.map((char) => char.top + char.height));
      return {
        text: ordered.map((char) => char.char).join(""),
        left,
        top,
        width: right - left,
        height: bottom - top,
        style,
      };
    })
    .filter((line) => line.text.trim().length > 0);
}

function listItemIndex(li: HTMLLIElement): number {
  let index = 1;
  let sibling = li.previousElementSibling;
  while (sibling) {
    if (sibling instanceof HTMLLIElement) index += 1;
    sibling = sibling.previousElementSibling;
  }
  return index;
}

function firstTextLine(el: HTMLElement, rootRect: DOMRect): TextLine | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (isTextNodeVisible(node as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });

  let current: Node | null;
  while ((current = walker.nextNode())) {
    const line = textNodeLines(current as Text, rootRect)[0];
    if (line) return line;
  }

  return null;
}

function drawListMarkers(
  doc: jsPDF,
  root: HTMLElement,
  rootRect: DOMRect,
  pageStart: number,
  pageEnd: number,
  pageTopPadPx: number,
  pxToPt: number,
  fallbackFontFamily: string,
) {
  const items = Array.from(root.querySelectorAll("li"));

  items.forEach((li) => {
    if (!(li instanceof HTMLLIElement) || !isVisibleElement(li)) return;
    const style = window.getComputedStyle(li);
    if (style.listStyleType === "none") return;

    const line = firstTextLine(li, rootRect);
    if (!line || line.top + line.height <= pageStart || line.top >= pageEnd) return;

    const markerStyle = window.getComputedStyle(li, "::marker");
    const markerColor = parseCssColor(markerStyle.color || style.color) ?? [15, 23, 42, 1];
    const fontSizePx = cssPixels(markerStyle.fontSize) || cssPixels(style.fontSize) || 12;
    const markerX = (line.left - Math.max(6, fontSizePx * 0.75)) * pxToPt;
    const markerY = (line.top - pageStart + pageTopPadPx + fontSizePx * 0.52) * pxToPt;

    doc.setFillColor(...blendOnWhite(markerColor));
    doc.setDrawColor(...blendOnWhite(markerColor));
    doc.setTextColor(markerColor[0], markerColor[1], markerColor[2]);

    if (/decimal|lower-alpha|upper-alpha|lower-roman|upper-roman/.test(style.listStyleType)) {
      const marker = `${listItemIndex(li)}.`;
      doc.setFont(pdfFont(style.fontFamily || fallbackFontFamily), cssFontStyle(style));
      doc.setFontSize(fontSizePx * pxToPt);
      doc.text(marker, markerX, markerY + fontSizePx * 0.28 * pxToPt, { align: "right" });
      return;
    }

    const radius = Math.max(1.1, fontSizePx * 0.16) * pxToPt;
    if (style.listStyleType === "circle") doc.circle(markerX, markerY, radius, "S");
    else doc.circle(markerX, markerY, radius, "F");
  });
}

function drawTextLayer(
  doc: jsPDF,
  root: HTMLElement,
  rootRect: DOMRect,
  pageStart: number,
  pageEnd: number,
  pageTopPadPx: number,
  pxToPt: number,
  fallbackFontFamily: string,
) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (isTextNodeVisible(node as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });

  let current: Node | null;
  while ((current = walker.nextNode())) {
    const node = current as Text;
    const lines = textNodeLines(node, rootRect);

    lines.forEach((line) => {
      const lineBottom = line.top + line.height;
      if (lineBottom <= pageStart || line.top >= pageEnd) return;

      const fontSizePx = cssPixels(line.style.fontSize) || 12;
      const fontSizePt = fontSizePx * pxToPt;
      const color = parseCssColor(line.style.color) ?? [15, 23, 42, 1];
      const x = line.left * pxToPt;
      const y = (line.top - pageStart + pageTopPadPx + fontSizePx * 0.86) * pxToPt;
      const letterSpacing = cssPixels(line.style.letterSpacing) * pxToPt;

      doc.setFont(pdfFont(line.style.fontFamily || fallbackFontFamily), cssFontStyle(line.style));
      doc.setFontSize(fontSizePt);
      doc.setTextColor(color[0], color[1], color[2]);

      const pdfWidth = doc.getTextWidth(line.text);
      const targetWidth = line.width * pxToPt;
      const fitCharSpace =
        line.text.length > 1 && pdfWidth > targetWidth
          ? (targetWidth - pdfWidth) / (line.text.length - 1)
          : letterSpacing;

      doc.text(line.text, x, y, {
        baseline: "alphabetic",
        charSpace: Number.isFinite(fitCharSpace) ? fitCharSpace : 0,
      });
    });
  }
}

export async function exportTextBasedElementPdf({
  element,
  filename,
  fontFamily,
  pageStarts,
  pageEnds,
  pageTopPadPx,
  firstPageTopPadPx,
  pageWidthPx = PREVIEW_PAGE_W,
  pageHeightPx = PREVIEW_PAGE_H,
  title,
  subject = "ATS-readable document",
  author = "CVLab",
}: ElementPdfExportOptions) {
  await waitForImages(element);

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const pxToPt = pdfW / pageWidthPx;
  const rootRect = element.getBoundingClientRect();
  const elements = [element, ...Array.from(element.querySelectorAll("*"))];
  const pageCount = Math.max(1, pageStarts.length);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pdfW, pdfH, "F");

    const currentPageTopPad =
      pageIndex === 0 && firstPageTopPadPx !== undefined ? firstPageTopPadPx : pageTopPadPx;
    const pageStart = pageStarts[pageIndex] ?? 0;
    const pageEnd = pageEnds[pageIndex] ?? pageStart + pageHeightPx;
    drawElementBackgrounds(pdf, elements, rootRect, pageStart, pageEnd, currentPageTopPad, pxToPt);
    await drawMedia(pdf, element, elements, rootRect, pageStart, pageEnd, currentPageTopPad, pxToPt);
    drawElementBorders(pdf, elements, rootRect, pageStart, pageEnd, currentPageTopPad, pxToPt);
    drawListMarkers(pdf, element, rootRect, pageStart, pageEnd, currentPageTopPad, pxToPt, fontFamily);
    drawTextLayer(pdf, element, rootRect, pageStart, pageEnd, currentPageTopPad, pxToPt, fontFamily);
  }

  pdf.setProperties({
    title: title ?? filenameSafe(filename).replace(/\.pdf$/i, ""),
    subject,
    creator: "CVLab",
    author,
  });
  pdf.save(filenameSafe(filename));
}

function plainText(html: string | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function htmlBlocks(html: string | undefined): string[] {
  if (!html) return [];
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const blocks: string[] = [];
  const nodes = parsed.body.querySelectorAll("p, li");

  nodes.forEach((node) => {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    blocks.push(node.tagName.toLowerCase() === "li" ? `- ${text}` : text);
  });

  if (blocks.length) return blocks;
  const text = plainText(html);
  return text ? [text] : [];
}

function imageFormat(src: string): "PNG" | "JPEG" {
  return src.startsWith("data:image/png") ? "PNG" : "JPEG";
}

class PdfWriter {
  doc: jsPDF;
  y: number;
  font: string;

  constructor(font: string) {
    this.doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    this.font = pdfFont(font);
    this.y = MARGIN_TOP;
    this.doc.setFont(this.font, "normal");
  }

  pageBreak(height = 0) {
    if (this.y + height <= PAGE_H - MARGIN_BOTTOM) return;
    this.doc.addPage();
    this.y = MARGIN_TOP;
  }

  text(text: string, x: number, maxWidth: number, style: TextStyle = {}) {
    if (!text) return;
    const size = style.size ?? 10;
    const lineHeight = style.lineHeight ?? size * 1.35;
    this.doc.setFont(this.font, style.fontStyle ?? "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(style.color ?? [30, 41, 59]));
    const lines = this.doc.splitTextToSize(text, maxWidth) as string[];
    this.pageBreak(lines.length * lineHeight);
    this.doc.text(lines, x, this.y, { lineHeightFactor: lineHeight / size });
    this.y += lines.length * lineHeight;
  }

  line(x1: number, x2: number, color: Rgb = [226, 232, 240]) {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(0.8);
    this.doc.line(x1, this.y, x2, this.y);
  }

  section(title: string, accent: Rgb) {
    this.pageBreak(28);
    this.y += 18;
    this.doc.setFont(this.font, "bold");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...accent);
    this.doc.text(title.toUpperCase(), MARGIN_X, this.y);
    this.y += 8;
    this.line(MARGIN_X, PAGE_W - MARGIN_X);
    this.y += 12;
  }
}

function writeBlocks(writer: PdfWriter, blocks: string[], x = MARGIN_X, width = PAGE_W - MARGIN_X * 2) {
  blocks.forEach((block) => {
    const isBullet = block.startsWith("- ");
    writer.text(block, x + (isBullet ? 8 : 0), width - (isBullet ? 8 : 0), {
      size: 10,
      color: [51, 65, 85],
      lineHeight: 14.5,
    });
    writer.y += 3;
  });
}

function writeResumeHeader(writer: PdfWriter, data: ResumeData, accent: Rgb) {
  const { personal } = data;

  if (data.template === "minimal") {
    const headerH = 112;
    writer.doc.setFillColor(15, 23, 42);
    writer.doc.rect(0, 0, PAGE_W, headerH, "F");
    const hasPhoto = Boolean(personal.photo);
    const textX = hasPhoto ? 126 : MARGIN_X;

    if (personal.photo) {
      try {
        writer.doc.addImage(personal.photo, imageFormat(personal.photo), MARGIN_X, 25, 62, 62);
      } catch {
        // Keep the PDF export resilient if a pasted image format is unsupported.
      }
    }

    writer.doc.setFont(writer.font, "bold");
    writer.doc.setFontSize(22);
    writer.doc.setTextColor(255, 255, 255);
    writer.doc.text(personal.name || "Your Name", textX, 42);
    writer.doc.setFont(writer.font, "normal");
    writer.doc.setFontSize(10);
    writer.doc.setTextColor(226, 232, 240);
    writer.doc.text(personal.title || "Professional Title", textX, 58);
    writer.doc.setFontSize(8.5);
    const contacts = [personal.email, personal.phone, personal.location, personal.website, personal.linkedin].filter(Boolean).join("   |   ");
    const contactLines = writer.doc.splitTextToSize(contacts, PAGE_W - textX - MARGIN_X) as string[];
    writer.doc.text(contactLines, textX, 78, { lineHeightFactor: 1.3 });
    writer.y = headerH + 28;
    return;
  }

  writer.doc.setFont(writer.font, "bold");
  writer.doc.setFontSize(24);
  writer.doc.setTextColor(15, 23, 42);
  writer.doc.text(personal.name || "Your Name", MARGIN_X, writer.y);
  writer.y += 18;
  writer.doc.setFont(writer.font, "normal");
  writer.doc.setFontSize(11);
  writer.doc.setTextColor(...accent);
  writer.doc.text(personal.title || "Professional Title", MARGIN_X, writer.y);
  writer.y += 16;
  writer.text([personal.email, personal.phone, personal.location, personal.website, personal.linkedin].filter(Boolean).join(" | "), MARGIN_X, PAGE_W - MARGIN_X * 2, {
    size: 8.5,
    color: [71, 85, 105],
    lineHeight: 12,
  });
  writer.y += 8;
  writer.line(MARGIN_X, PAGE_W - MARGIN_X, accent);
}

export function exportResumePdf(data: ResumeData, filename = "resume.pdf") {
  const writer = new PdfWriter(data.font);
  const accent = hexToRgb(data.accent);
  const titles = data.sectionTitles ?? {};
  const sectionOrder = data.sectionOrder ?? ["summary", "experience", "projects", "education", "skills", "languages"];

  writeResumeHeader(writer, data, accent);

  sectionOrder.forEach((id) => {
    const title = titles[id] || id.replace(/^custom_/, "Custom Section");

    if (id === "summary" && !plainText(data.summary)) return;
    if (id === "experience" && !data.experience.length) return;
    if (id === "projects" && !data.projects.length) return;
    if (id === "education" && !data.education.length) return;
    if (id === "skills" && !data.skills.length) return;
    if (id === "languages" && !data.languages.length) return;

    const custom = data.customSections.find((section) => section.id === id);
    if (id.startsWith("custom_") && !custom) return;

    writer.section(title, accent);

    if (id === "summary") {
      writeBlocks(writer, htmlBlocks(data.summary));
    } else if (id === "experience") {
      data.experience.forEach((item) => {
        writer.pageBreak(46);
        writer.text(item.role || "Role", MARGIN_X, 330, { size: 11, fontStyle: "bold", color: [15, 23, 42], lineHeight: 14 });
        const date = [item.start, item.end].filter(Boolean).join(" - ");
        if (date) {
          writer.doc.setFont(writer.font, "normal");
          writer.doc.setFontSize(8.5);
          writer.doc.setTextColor(100, 116, 139);
          writer.doc.text(date, PAGE_W - MARGIN_X, writer.y - 14, { align: "right" });
        }
        writer.text([item.company, item.location].filter(Boolean).join(", "), MARGIN_X, 420, { size: 9.5, fontStyle: "bold", color: [71, 85, 105], lineHeight: 12 });
        writeBlocks(writer, htmlBlocks(item.description));
        writer.y += 5;
      });
    } else if (id === "projects") {
      data.projects.forEach((item) => {
        writer.pageBreak(42);
        writer.text(item.name || "Project", MARGIN_X, 330, { size: 11, fontStyle: "bold", color: [15, 23, 42], lineHeight: 14 });
        const date = [item.start, item.end].filter(Boolean).join(" - ");
        if (date) {
          writer.doc.setFont(writer.font, "normal");
          writer.doc.setFontSize(8.5);
          writer.doc.setTextColor(100, 116, 139);
          writer.doc.text(date, PAGE_W - MARGIN_X, writer.y - 14, { align: "right" });
        }
        const meta = [item.link, item.technologies].filter(Boolean).join(" | ");
        if (meta) {
          writer.text(meta, MARGIN_X, 420, { size: 9.5, fontStyle: "bold", color: [71, 85, 105], lineHeight: 12 });
        }
        writeBlocks(writer, htmlBlocks(item.description));
        writer.y += 5;
      });
    } else if (id === "education") {
      data.education.forEach((item) => {
        writer.pageBreak(42);
        writer.text(item.degree || "Degree", MARGIN_X, 330, { size: 11, fontStyle: "bold", color: [15, 23, 42], lineHeight: 14 });
        const date = [item.start, item.end].filter(Boolean).join(" - ");
        if (date) {
          writer.doc.setFont(writer.font, "normal");
          writer.doc.setFontSize(8.5);
          writer.doc.setTextColor(100, 116, 139);
          writer.doc.text(date, PAGE_W - MARGIN_X, writer.y - 14, { align: "right" });
        }
        writer.text(item.school, MARGIN_X, 420, { size: 9.5, fontStyle: "bold", color: [71, 85, 105], lineHeight: 12 });
        writeBlocks(writer, htmlBlocks(item.description));
        writer.y += 5;
      });
    } else if (id === "skills") {
      writeBlocks(writer, [data.skills.join(", ")]);
    } else if (id === "languages") {
      writeBlocks(writer, data.languages.map((item) => [item.name, item.level].filter(Boolean).join(" - ")));
    } else if (custom) {
      writeBlocks(writer, htmlBlocks(custom.content));
    }
  });

  writer.doc.setProperties({
    title: filenameSafe(filename).replace(/\.pdf$/i, ""),
    subject: "ATS-readable CV",
    creator: "CVLab",
    author: data.personal.name || "CVLab",
  });
  writer.doc.save(filenameSafe(filename));
}

export function exportCoverLetterPdf(data: CoverLetterData, filename = "cover-letter.pdf") {
  const writer = new PdfWriter(data.font);
  const accent = hexToRgb(data.accent);
  const { sender, recipient } = data;
  const modern = data.template === "modern";

  if (modern) {
    writer.doc.setFillColor(...accent);
    writer.doc.rect(0, 0, PAGE_W, 92, "F");
    writer.doc.setTextColor(255, 255, 255);
    writer.doc.setFont(writer.font, "bold");
    writer.doc.setFontSize(20);
    writer.doc.text(sender.name || "Your Name", MARGIN_X, 38);
    writer.doc.setFont(writer.font, "normal");
    writer.doc.setFontSize(10);
    writer.doc.text(sender.title || "", MARGIN_X, 54);
    writer.doc.setFontSize(8.5);
    writer.doc.text([sender.email, sender.phone, sender.location].filter(Boolean).join(" | "), MARGIN_X, 72);
    writer.y = 124;
  } else {
    writer.text(sender.name || "Your Name", MARGIN_X, PAGE_W - MARGIN_X * 2, { size: 16, fontStyle: "bold", color: [15, 23, 42], lineHeight: 18 });
    writeBlocks(writer, [sender.title, sender.email, sender.phone, sender.location].filter(Boolean), MARGIN_X, 240);
    writer.y += 18;
  }

  const recipientText = [recipient.name, recipient.company, recipient.address].filter(Boolean).join("\n");
  if (recipientText) {
    writeBlocks(writer, recipientText.split("\n"), MARGIN_X, 260);
    writer.y += 12;
  }

  if (data.date) {
    writer.doc.setFont(writer.font, "normal");
    writer.doc.setFontSize(9);
    writer.doc.setTextColor(100, 116, 139);
    writer.doc.text(data.date, PAGE_W - MARGIN_X, writer.y, { align: "right" });
    writer.y += 26;
  }

  writer.text(data.subject || "Bewerbung", MARGIN_X, PAGE_W - MARGIN_X * 2, {
    size: 12,
    fontStyle: "bold",
    color: [15, 23, 42],
    lineHeight: 15,
  });
  writer.y += 14;
  writeBlocks(writer, htmlBlocks(data.opening || "Sehr geehrte Damen und Herren,"));
  writer.y += 6;
  writeBlocks(writer, htmlBlocks(data.body));
  writer.y += 8;
  writeBlocks(writer, htmlBlocks(data.closing));
  writer.y += 26;

  if (data.signature) {
    try {
      writer.doc.addImage(data.signature, imageFormat(data.signature), MARGIN_X, writer.y - 14, 120, 42);
      writer.y += 36;
    } catch {
      // Signature images are decorative; text export should still succeed.
    }
  }

  writer.text(sender.name || "Your Name", MARGIN_X, PAGE_W - MARGIN_X * 2, {
    size: 10,
    fontStyle: "bold",
    color: [15, 23, 42],
    lineHeight: 13,
  });

  writer.doc.setProperties({
    title: filenameSafe(filename).replace(/\.pdf$/i, ""),
    subject: "ATS-readable cover letter",
    creator: "CVLab",
    author: sender.name || "CVLab",
  });
  writer.doc.save(filenameSafe(filename));
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (!line || seen.has(line)) return false;
      seen.add(line);
      return true;
    });
}

function resumeAtsLines(data: ResumeData): string[] {
  const lines: string[] = [];
  const titles = data.sectionTitles ?? {};
  const order = data.sectionOrder ?? ["summary", "experience", "projects", "education", "skills", "languages"];

  lines.push(data.personal.name, data.personal.title, data.personal.email, data.personal.phone, data.personal.location, data.personal.website, data.personal.linkedin);

  order.forEach((id) => {
    if (id === "summary") {
      lines.push(titles[id] || "Profile", ...htmlBlocks(data.summary));
    } else if (id === "experience") {
      lines.push(titles[id] || "Experience");
      data.experience.forEach((item) => {
        lines.push(item.role, [item.company, item.location].filter(Boolean).join(", "), [item.start, item.end].filter(Boolean).join(" - "), ...htmlBlocks(item.description));
      });
    } else if (id === "projects") {
      lines.push(titles[id] || "Projects");
      data.projects.forEach((item) => {
        lines.push(item.name, [item.link, item.technologies].filter(Boolean).join(" | "), [item.start, item.end].filter(Boolean).join(" - "), ...htmlBlocks(item.description));
      });
    } else if (id === "education") {
      lines.push(titles[id] || "Education");
      data.education.forEach((item) => {
        lines.push(item.degree, item.school, [item.start, item.end].filter(Boolean).join(" - "), ...htmlBlocks(item.description));
      });
    } else if (id === "skills") {
      lines.push(titles[id] || "Skills", ...data.skills);
    } else if (id === "languages") {
      lines.push(titles[id] || "Languages", ...data.languages.map((item) => [item.name, item.level].filter(Boolean).join(" - ")));
    } else {
      const custom = data.customSections.find((section) => section.id === id);
      if (custom) lines.push(titles[id] || custom.title, ...htmlBlocks(custom.content));
    }
  });

  return uniqueLines(lines.filter(Boolean));
}

function coverLetterAtsLines(data: CoverLetterData): string[] {
  return uniqueLines([
    data.sender.name,
    data.sender.title,
    data.sender.email,
    data.sender.phone,
    data.sender.location,
    data.recipient.name,
    data.recipient.company,
    ...data.recipient.address.split("\n"),
    data.date,
    data.subject,
    ...htmlBlocks(data.opening),
    ...htmlBlocks(data.body),
    ...htmlBlocks(data.closing),
  ].filter(Boolean));
}

function addInvisibleTextLayer(doc: jsPDF, lines: string[]) {
  try {
    const pageCount = doc.getNumberOfPages();
    doc.setPage(1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(2);
    doc.setTextColor(0, 0, 0);

    const chunks = doc.splitTextToSize(lines.join("\n"), PAGE_W - 20) as string[];
    let y = 10;
    chunks.forEach((line) => {
      if (y > PAGE_H - 10) return;
      doc.text(line, 10, y, { renderingMode: "invisible" } as never);
      y += 2.4;
    });

    doc.setPage(pageCount);
  } catch (error) {
    console.warn("Skipped ATS text layer because the PDF renderer rejected invisible text.", error);
  }
}

export function addResumeAtsTextLayer(doc: jsPDF, data: ResumeData) {
  addInvisibleTextLayer(doc, resumeAtsLines(data));
}

export function addCoverLetterAtsTextLayer(doc: jsPDF, data: CoverLetterData) {
  addInvisibleTextLayer(doc, coverLetterAtsLines(data));
}
