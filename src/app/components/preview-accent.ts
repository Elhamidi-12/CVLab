import type { CSSProperties } from "react";

export type PreviewAccentPalette = {
  text: CSSProperties;
  textSoft: CSSProperties;
  divider: CSSProperties;
  dividerStrong: CSSProperties;
  dividerTop: CSSProperties;
  bar: CSSProperties;
  chip: CSSProperties;
};

export function createPreviewAccentPalette(accent: string): PreviewAccentPalette {
  return {
    text: { color: accent },
    textSoft: { color: accent, opacity: 0.82 },
    divider: { borderBottom: `1.5px solid ${accent}20` },
    dividerStrong: { borderBottom: `2px solid ${accent}` },
    dividerTop: { borderTop: `1px solid ${accent}25` },
    bar: { backgroundColor: accent },
    chip: { backgroundColor: `${accent}15`, color: accent, fontWeight: 500 },
  };
}