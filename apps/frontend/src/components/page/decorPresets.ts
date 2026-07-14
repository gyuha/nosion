export const EMOJI_OPTIONS = [
  "📄", "📝", "📌", "📎", "✅", "⭐", "🎯", "🚀",
  "💡", "🔥", "🌟", "🎨", "📊", "📚", "🗂️", "🏆",
  "🎉", "🧠", "💻", "🌈", "🍀", "🌙", "☀️", "🎵",
];

export interface CoverPreset {
  id: string;
  label: string;
  style: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  { id: "blue", label: "블루", style: "linear-gradient(135deg, #60a5fa, #3b82f6)" },
  { id: "sunset", label: "선셋", style: "linear-gradient(135deg, #fb923c, #ef4444)" },
  { id: "forest", label: "포레스트", style: "linear-gradient(135deg, #4ade80, #16a34a)" },
  { id: "violet", label: "바이올렛", style: "linear-gradient(135deg, #c084fc, #7c3aed)" },
  { id: "gold", label: "골드", style: "linear-gradient(135deg, #fde047, #ca8a04)" },
  { id: "slate", label: "슬레이트", style: "linear-gradient(135deg, #94a3b8, #475569)" },
];

export function coverStyle(coverId: string | null): string | undefined {
  return COVER_PRESETS.find((c) => c.id === coverId)?.style;
}
