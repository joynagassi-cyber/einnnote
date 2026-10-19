const THEME_CSS = `
:root {
  --bg: #F6F1E7;
  --surface: #FFFDF8;
  --surface-2: #EFE8D8;
  --line: #E4DCCB;
  --ink: #2B2A27;
  --muted: #6B6659;
  --accent: #0F766E;
  --accent-soft: #DDEAE5;
  --danger: #B3261E;
  --radius: 0.75rem;
  --background: 43 24% 93%;
  --foreground: 27 13% 17%;
  --card: 43 30% 98%;
  --card-foreground: 27 13% 17%;
  --popover: 0 0% 100%;
  --popover-foreground: 27 13% 17%;
  --primary: 174 82% 27%;
  --primary-foreground: 0 0% 100%;
  --secondary: 43 20% 90%;
  --secondary-foreground: 27 13% 17%;
  --muted: 30 8% 68%;
  --muted-foreground: 30 5% 42%;
  --accent: 174 82% 27%;
  --accent-foreground: 0 0% 100%;
  --destructive: 5 76% 41%;
  --destructive-foreground: 0 0% 100%;
  --border: 36 20% 87%;
  --input: 36 20% 87%;
  --ring: 174 82% 27%;
}
[data-theme="dark"] {
  --bg: #1E1C19;
  --surface: #27241F;
  --surface-2: #302C26;
  --line: #3A362F;
  --ink: #F1ECE1;
  --muted: #A8A193;
  --accent: #5EC8BD;
  --accent-soft: #2D3A38;
  --danger: #F2B8B5;
  --background: 24 12% 11%;
  --foreground: 36 20% 91%;
  --card: 24 12% 13%;
  --card-foreground: 36 20% 91%;
  --popover: 24 12% 11%;
  --popover-foreground: 36 20% 91%;
  --primary: 174 55% 66%;
  --primary-foreground: 24 12% 11%;
  --secondary: 24 10% 18%;
  --secondary-foreground: 36 20% 91%;
  --muted: 24 8% 42%;
  --muted-foreground: 24 8% 68%;
  --accent: 174 55% 66%;
  --accent-foreground: 24 12% 11%;
  --destructive: 0 63% 74%;
  --destructive-foreground: 24 12% 11%;
  --border: 24 10% 20%;
  --input: 24 10% 20%;
  --ring: 174 55% 66%;
}
[data-accent="blue"] { --accent: #1D4ED8; --accent-soft: #DCE6FA; --primary: 217 91% 60%; --ring: 217 91% 60%; }
[data-theme="dark"][data-accent="blue"] { --accent: #60A5FA; --accent-soft: #1E2D4A; --primary: 217 91% 75%; --ring: 217 91% 75%; }
[data-accent="violet"] { --accent: #6D28D9; --accent-soft: #E8E0FA; --primary: 262 83% 58%; --ring: 262 83% 58%; }
[data-theme="dark"][data-accent="violet"] { --accent: #A78BFA; --accent-soft: #2A1E4A; --primary: 262 83% 75%; --ring: 262 83% 75%; }
[data-accent="green"] { --accent: #15803D; --accent-soft: #D5EDE0; --primary: 152 60% 36%; --ring: 152 60% 36%; }
[data-theme="dark"][data-accent="green"] { --accent: #4ADE80; --accent-soft: #1A3328; --primary: 152 60% 60%; --ring: 152 60% 60%; }
[data-accent="terracotta"] { --accent: #B4532A; --accent-soft: #F5E4D8; --primary: 19 56% 43%; --ring: 19 56% 43%; }
[data-theme="dark"][data-accent="terracotta"] { --accent: #FB923C; --accent-soft: #3A2418; --primary: 19 56% 65%; --ring: 19 56% 65%; }
[data-accent="plum"] { --accent: #86198F; --accent-soft: #F3D8F5; --primary: 295 72% 32%; --ring: 295 72% 32%; }
[data-theme="dark"][data-accent="plum"] { --accent: #E879F9; --accent-soft: #3A1A3D; --primary: 295 72% 65%; --ring: 295 72% 65%; }
[data-accent="graphite"] { --accent: #3F3F46; --accent-soft: #E8E8EA; --primary: 240 6% 27%; --ring: 240 6% 27%; }
[data-theme="dark"][data-accent="graphite"] { --accent: #D4D4D8; --accent-soft: #2A2A2E; --primary: 0 0% 85%; --ring: 0 0% 85%; }
[data-high-contrast="true"] { --ink: #000000; --surface: #FFFFFF; --line: #CCCCCC; }
[data-theme="dark"][data-high-contrast="true"] { --ink: #FFFFFF; --surface: #000000; --line: #555555; }
* { border-color: hsl(var(--border)); }
body { background-color: var(--bg); color: var(--ink); margin: 0; }
`;

const CANVAS_CSS = `
.canvas-dots { background-image: radial-gradient(circle, var(--line) 1.2px, transparent 1.3px); background-size: 24px 24px; }
.canvas-ruled { background-color: var(--surface); }
.canvas-grid { background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); background-size: 28px 28px; }
.canvas-blank { background: transparent; }
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
`;

const EXTRA_CSS = `
h1,h2,h3,h4,h5,h6 { font-family: "Literata",serif; }
@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--line);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--muted)}
`;

let styleEl: HTMLStyleElement | null = null;

export function initThemeStyles() {
  if (styleEl) return;
  styleEl = document.createElement("style");
  styleEl.setAttribute("data-einnote-theme", "true");
  styleEl.textContent = THEME_CSS + CANVAS_CSS + EXTRA_CSS;
  document.head.appendChild(styleEl);
}

export function updateAccent(accent: string, dark: boolean) {
  if (!styleEl) return;
  const accentColors: Record<string, { light: string; dark: string }> = {
    teal: { light: "#0F766E", dark: "#5EC8BD" },
    blue: { light: "#1D4ED8", dark: "#60A5FA" },
    violet: { light: "#6D28D9", dark: "#A78BFA" },
    green: { light: "#15803D", dark: "#4ADE80" },
    terracotta: { light: "#B4532A", dark: "#FB923C" },
    plum: { light: "#86198F", dark: "#E879F9" },
    graphite: { light: "#3F3F46", dark: "#D4D4D8" },
  };
  const colors = accentColors[accent] ?? accentColors.teal;
  const accentVal = dark ? colors.dark : colors.light;
  const softVal = dark ? shadeColor(accentVal, 20) : shadeColor(accentVal, -15);
  styleEl.textContent = THEME_CSS + CANVAS_CSS + EXTRA_CSS;
  styleEl.textContent += `[data-accent="${accent}"]{--accent:${accentVal};--accent-soft:${softVal};--primary:${hueToHSL(hueOf(accentVal))}${satOf(accentVal)}%${lightOf(accentVal)}%;--ring:${accentVal}}\n`;
  styleEl.textContent += `[data-theme="dark"][data-accent="${accent}"]{--accent:${colors.dark};--accent-soft:${shadeColor(colors.dark, 20)};--primary:${hueToHSL(hueOf(colors.dark))}${satOf(colors.dark)}%${lightOf(colors.dark)}%;--ring:${colors.dark}}\n`;
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function hueOf(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return Math.round(h);
}

function satOf(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return Math.round(l > 0.5 ? d / (2 - max - min) : d / (max + min) * 100);
}

function lightOf(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return Math.round((Math.max(r, g, b) + Math.min(r, g, b)) / 2 * 100);
}

function hueToHSL(h: number): number { return h; }