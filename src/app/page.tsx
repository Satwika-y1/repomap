"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  GitBranch,
  Search,
  Layers,
  FileCode2,
  BookOpen,
  Loader2,
  AlertCircle,
  Sparkles,
  Layout,
  Server,
  Cpu,
  Database,
  Settings,
  FolderGit2,
  ArrowUpRight,
  RotateCcw,
  X,
  CheckCircle2,
  Radar,
  Network,
  Compass,
  Copy,
  Check,
  FileText,
  History,
} from "lucide-react";

interface ArchNode {
  id: string;
  label: string;
  layer: "frontend" | "api" | "logic" | "database" | "config";
  description: string;
  files: string[];
  x: number;
  y: number;
}

interface ArchEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface OnboardingStep {
  step: number;
  filePath: string;
  reason: string;
}

interface AnalysisResult {
  projectName: string;
  summary: string;
  techStack: string[];
  nodes: ArchNode[];
  edges: ArchEdge[];
  onboardingSteps: OnboardingStep[];
}

interface RecentRepoItem {
  label: string;
  url: string;
}

const RECENT_STORAGE_KEY = "repomap_recent_repos_v1";

function Tilt3D({
  children,
  className = "",
  maxTilt = 6,
  lift = 6,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  lift?: number;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [renderState, setRenderState] = useState({
    rx: 0,
    ry: 0,
    z: 0,
    gx: 50,
    gy: 50,
    glow: 0,
  });

  const targetRef = useRef({ rx: 0, ry: 0, z: 0, gx: 50, gy: 50, glow: 0 });
  const currentRef = useRef({ rx: 0, ry: 0, z: 0, gx: 50, gy: 50, glow: 0 });

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const curr = currentRef.current;
      const tgt = targetRef.current;
      const ease = 0.085;

      curr.rx += (tgt.rx - curr.rx) * ease;
      curr.ry += (tgt.ry - curr.ry) * ease;
      curr.z += (tgt.z - curr.z) * ease;
      curr.gx += (tgt.gx - curr.gx) * 0.12;
      curr.gy += (tgt.gy - curr.gy) * 0.12;
      curr.glow += (tgt.glow - curr.glow) * 0.085;

      const delta =
        Math.abs(tgt.rx - curr.rx) +
        Math.abs(tgt.ry - curr.ry) +
        Math.abs(tgt.z - curr.z) +
        Math.abs(tgt.glow - curr.glow);

      if (delta > 0.004) {
        setRenderState({
          rx: curr.rx,
          ry: curr.ry,
          z: curr.z,
          gx: curr.gx,
          gy: curr.gy,
          glow: curr.glow,
        });
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    targetRef.current.rx = (0.5 - py) * maxTilt * 1.25;
    targetRef.current.ry = (px - 0.5) * maxTilt * 1.25;
    targetRef.current.z = lift;
    targetRef.current.gx = px * 100;
    targetRef.current.gy = py * 100;
    targetRef.current.glow = 1;
  };

  const handleMouseLeave = () => {
    targetRef.current.rx = 0;
    targetRef.current.ry = 0;
    targetRef.current.z = 0;
    targetRef.current.glow = 0;
  };

  return (
    <div style={{ perspective: "1100px" }} className="w-full h-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform:
            "rotateX(" +
            renderState.rx.toFixed(2) +
            "deg) rotateY(" +
            renderState.ry.toFixed(2) +
            "deg) translateZ(" +
            renderState.z.toFixed(1) +
            "px)",
          transformStyle: "preserve-3d",
        }}
        className={"relative h-full will-change-transform " + className}
      >
        <div
          style={{
            opacity: renderState.glow,
            background:
              "radial-gradient(240px circle at " +
              renderState.gx.toFixed(1) +
              "% " +
              renderState.gy.toFixed(1) +
              "%, rgba(192, 132, 252, 0.14), rgba(99, 102, 241, 0.06) 55%, transparent 80%)",
          }}
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-10"
        />
        {children}
      </div>
    </div>
  );
}

function InteractiveHeroTitle() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [waveSeed, setWaveSeed] = useState(0);

  const line1Words = ["Map", "Any", "Repository"];
  const line2Words = ["Without", "Digging", "Blind"];

  let globalCharIndex = 0;

  const renderWordGroup = (words: string[], gradientClass: string) => (
    <span className="inline-flex flex-wrap gap-x-3 sm:gap-x-3.5">
      {words.map((word) => (
        <span key={word} className="inline-flex">
          {Array.from(word).map((ch) => {
            const myIdx = globalCharIndex++;
            const isHovered = hoveredIdx === myIdx;
            const nearHover = hoveredIdx !== null && Math.abs(hoveredIdx - myIdx) === 1;
            const waveDelay = waveSeed > 0 ? Math.min(350, myIdx * 18) : 0;

            return (
              <span
                key={myIdx + "-" + ch}
                onMouseEnter={() => setHoveredIdx(myIdx)}
                onMouseLeave={() => setHoveredIdx((curr) => (curr === myIdx ? null : curr))}
                style={{
                  transitionDelay: waveSeed > 0 ? waveDelay + "ms" : "0ms",
                }}
                className={[
                  "inline-block transition-all duration-200 ease-out select-none cursor-default",
                  gradientClass,
                  isHovered
                    ? "-translate-y-2 scale-110 text-white drop-shadow-[0_6px_16px_rgba(192,132,252,0.55)]"
                    : nearHover
                    ? "-translate-y-0.5 text-purple-100"
                    : "",
                ].join(" ")}
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );

  return (
    <h1
      onClick={() => setWaveSeed((w) => w + 1)}
      title="Hover letters or click to pulse"
      className="text-4xl sm:text-5xl lg:text-[3.45rem] font-extrabold tracking-tight text-white leading-[1.14] flex flex-col gap-1"
    >
      {renderWordGroup(line1Words, "text-white")}
      {renderWordGroup(
        line2Words,
        "bg-gradient-to-r from-indigo-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent"
      )}
    </h1>
  );
}

function CalmAmbientBackdrop({ activeLayer }: { activeLayer?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<string | null | undefined>(activeLayer);

  useEffect(() => {
    layerRef.current = activeLayer;
  }, [activeLayer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let tick = 0;

    const pointerTarget = { x: 0.5, y: 0.5 };
    const pointerSmooth = { x: 0.5, y: 0.5 };

    const waves = [
      { baseY: 0.24, amp: 34, freq: 0.0042, speed: 0.9, phase: 0.0, alpha: 0.065, purple: false },
      { baseY: 0.44, amp: 44, freq: 0.0034, speed: 0.72, phase: 1.4, alpha: 0.075, purple: true },
      { baseY: 0.65, amp: 38, freq: 0.0048, speed: 0.85, phase: 2.7, alpha: 0.06, purple: false },
      { baseY: 0.83, amp: 46, freq: 0.0031, speed: 0.65, phase: 4.1, alpha: 0.07, purple: true },
    ];

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const onMouseMove = (e: MouseEvent) => {
      pointerTarget.x = Math.min(1, Math.max(0, e.clientX / Math.max(1, width)));
      pointerTarget.y = Math.min(1, Math.max(0, e.clientY / Math.max(1, height)));
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    const getAccentRgba = (layer?: string | null) => {
      switch (layer) {
        case "frontend":
          return {
            a: "rgba(129, 140, 248, 0.16)",
            b: "rgba(168, 85, 247, 0.11)",
            waveIndigo: "129, 140, 248",
            wavePurple: "192, 132, 252",
          };
        case "api":
          return {
            a: "rgba(192, 132, 252, 0.17)",
            b: "rgba(99, 102, 241, 0.11)",
            waveIndigo: "168, 85, 247",
            wavePurple: "216, 180, 254",
          };
        case "logic":
          return {
            a: "rgba(167, 139, 250, 0.16)",
            b: "rgba(139, 92, 246, 0.12)",
            waveIndigo: "167, 139, 250",
            wavePurple: "196, 181, 253",
          };
        case "database":
          return {
            a: "rgba(165, 180, 252, 0.15)",
            b: "rgba(147, 51, 234, 0.11)",
            waveIndigo: "165, 180, 252",
            wavePurple: "192, 132, 252",
          };
        case "config":
          return {
            a: "rgba(196, 181, 253, 0.15)",
            b: "rgba(79, 70, 229, 0.11)",
            waveIndigo: "129, 140, 248",
            wavePurple: "196, 181, 253",
          };
        default:
          return {
            a: "rgba(99, 102, 241, 0.14)",
            b: "rgba(168, 85, 247, 0.12)",
            waveIndigo: "129, 140, 248",
            wavePurple: "192, 132, 252",
          };
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      tick += 0.006;

      pointerSmooth.x += (pointerTarget.x - pointerSmooth.x) * 0.03;
      pointerSmooth.y += (pointerTarget.y - pointerSmooth.y) * 0.03;

      const shiftX = (pointerSmooth.x - 0.5) * 32;
      const shiftY = (pointerSmooth.y - 0.5) * 24;
      const palette = getAccentRgba(layerRef.current);

      // Soft ambient light pools
      const g1 = ctx.createRadialGradient(
        width * 0.24 + shiftX,
        height * 0.22 + shiftY,
        12,
        width * 0.24 + shiftX,
        height * 0.22 + shiftY,
        Math.max(width, height) * 0.52
      );
      g1.addColorStop(0, palette.a);
      g1.addColorStop(1, "rgba(6, 9, 19, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      const g2 = ctx.createRadialGradient(
        width * 0.78 - shiftX * 0.8,
        height * 0.68 - shiftY * 0.8,
        12,
        width * 0.78 - shiftX * 0.8,
        height * 0.68 - shiftY * 0.8,
        Math.max(width, height) * 0.46
      );
      g2.addColorStop(0, palette.b);
      g2.addColorStop(1, "rgba(6, 9, 19, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);

      // Smooth undulating wave ribbons
      const stepX = 18;
      for (const w of waves) {
        const rgb = w.purple ? palette.wavePurple : palette.waveIndigo;
        ctx.strokeStyle = "rgba(" + rgb + ", " + w.alpha + ")";
        ctx.lineWidth = 1.4;
        ctx.beginPath();

        for (let x = -stepX; x <= width + stepX; x += stepX) {
          const wave1 = Math.sin(x * w.freq + tick * w.speed + w.phase) * w.amp;
          const wave2 = Math.cos(x * (w.freq * 0.55) - tick * (w.speed * 0.6) + w.phase) * (w.amp * 0.4);
          const cursorBend =
            Math.exp(-Math.pow((x - pointerSmooth.x * width) / 260, 2)) *
            (pointerSmooth.y - 0.5) *
            18;
          const y = height * w.baseY + shiftY * 0.45 + wave1 + wave2 + cursorBend;

          if (x === -stepX) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />;
}

const PIPELINE_STAGES = [
  { title: "Fetching GitHub Tree", detail: "Reading folders, manifests, and file paths" },
  { title: "Identifying Key Modules", detail: "Grouping UI, API, logic, storage, and config" },
  { title: "Mapping Connections", detail: "Tracing relationships across modules" },
  { title: "Preparing Onboarding Path", detail: "Ranking entry files to read first" },
];

const LOADING_LENSES = [
  {
    id: "layers",
    label: "Layers",
    hint: "Organizes folders into Frontend, API, Core Logic, Storage, and Config.",
    chips: ["Frontend", "API / Routes", "Core Logic", "Storage", "Config"],
    Icon: Layers,
  },
  {
    id: "links",
    label: "Links",
    hint: "Highlights which modules call or depend on each other so you can trace flow.",
    chips: ["Entry -> Router", "Router -> Handlers", "Handlers -> Data"],
    Icon: Network,
  },
  {
    id: "start",
    label: "First Read",
    hint: "Picks high-signal entry files so you know where to start reading.",
    chips: ["01 README / Manifest", "02 App Entrypoint", "03 Core Module"],
    Icon: Compass,
  },
];

function LoadingStageView({ repoUrl }: { repoUrl: string }) {
  const [activeStage, setActiveStage] = useState(0);
  const [selectedLens, setSelectedLens] = useState(LOADING_LENSES[0].id);
  const [boosts, setBoosts] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setActiveStage((prev) => (prev < PIPELINE_STAGES.length - 1 ? prev + 1 : prev));
    }, 950);
    const clockTimer = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(stageTimer);
      clearInterval(clockTimer);
    };
  }, []);

  const currentLens = LOADING_LENSES.find((l) => l.id === selectedLens) || LOADING_LENSES[0];
  const cleanRepo = repoUrl.replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/, "");
  const progressPct = ((activeStage + 1) / PIPELINE_STAGES.length) * 100;

  return (
    <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-14 relative z-10">
      <div className="w-full max-w-lg">
        <Tilt3D maxTilt={8} lift={9}>
          <div className="relative rounded-3xl bg-gradient-to-br from-[#121a36]/95 via-[#0b1022]/95 to-[#060913]/95 border border-purple-400/40 p-6 sm:p-7 space-y-5 shadow-[0_24px_70px_-15px_rgba(124,58,237,0.45)] overflow-hidden">
            <div className="h-1 w-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-purple-400" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setBoosts((b) => b + 1)}
                  title="Pulse scan radar"
                  className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-purple-300/45 flex items-center justify-center text-purple-200 hover:border-purple-200 transition cursor-pointer shrink-0"
                >
                  <span className="absolute inset-0 rounded-2xl border border-purple-400/45 animate-ping opacity-25" />
                  <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: "3.2s" }} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-purple-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                      Scanning Codebase
                    </span>
                    {boosts > 0 && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-100 border border-purple-300/35">
                        Pulse #{boosts}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white truncate mt-0.5">
                    {cleanRepo || "GitHub Repository"}
                  </h2>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs font-mono font-semibold text-purple-100 bg-purple-500/15 border border-purple-300/30 px-2.5 py-1 rounded-lg">
                  {activeStage + 1}/{PIPELINE_STAGES.length}
                </span>
                <span className="text-[11px] font-mono text-slate-400">{elapsedSec}s</span>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-900/95 border border-white/10 overflow-hidden p-[1px]">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 transition-all duration-500 rounded-full"
                style={{ width: progressPct + "%" }}
              />
            </div>

            <div className="space-y-2">
              {PIPELINE_STAGES.map((st, i) => {
                const done = i < activeStage;
                const current = i === activeStage;
                const rowCls = current
                  ? "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs transition-all bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-transparent border-purple-300/50 text-white"
                  : done
                  ? "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs transition-all bg-white/[0.03] border-indigo-400/20 text-slate-200"
                  : "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs transition-all bg-black/25 border-white/5 text-slate-400";
                return (
                  <div key={st.title} className={rowCls}>
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-300 shrink-0" />
                    ) : current ? (
                      <Loader2 className="w-4 h-4 text-fuchsia-300 animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{st.title}</div>
                      <div className="text-xs text-slate-400 truncate">{st.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                {LOADING_LENSES.map((lens) => {
                  const Icon = lens.Icon;
                  const active = lens.id === selectedLens;
                  const tabCls = active
                    ? "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer bg-purple-500/25 border-purple-300 text-white"
                    : "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition cursor-pointer bg-black/35 border-white/10 text-slate-300 hover:text-white";
                  return (
                    <button
                      key={lens.id}
                      type="button"
                      onClick={() => setSelectedLens(lens.id)}
                      className={tabCls}
                    >
                      <Icon className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                      <span>{lens.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="px-3.5 py-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <p className="text-xs text-slate-200 leading-relaxed">{currentLens.hint}</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentLens.chips.map((chip) => (
                    <span
                      key={chip}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-500/12 text-purple-200 border border-purple-400/25"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Tilt3D>
      </div>
    </div>
  );
}

const LAYER_ORDER = ["frontend", "api", "logic", "database", "config"] as const;

const LAYER_CONFIG: Record<
  string,
  {
    badge: string;
    shortLabel: string;
    topBar: string;
    border: string;
    pillBg: string;
    pillText: string;
    dotHex: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  frontend: {
    badge: "Frontend",
    shortLabel: "Frontend",
    topBar: "from-indigo-400 via-purple-400 to-indigo-300",
    border: "border-indigo-400/30 hover:border-purple-300/75",
    pillBg: "bg-indigo-500/15",
    pillText: "text-indigo-200",
    dotHex: "#818cf8",
    Icon: Layout,
  },
  api: {
    badge: "API / Routes",
    shortLabel: "API",
    topBar: "from-purple-400 via-fuchsia-400 to-violet-400",
    border: "border-purple-400/35 hover:border-purple-200/85",
    pillBg: "bg-purple-500/15",
    pillText: "text-purple-200",
    dotHex: "#c084fc",
    Icon: Server,
  },
  logic: {
    badge: "Core Logic",
    shortLabel: "Logic",
    topBar: "from-violet-400 via-purple-400 to-indigo-400",
    border: "border-violet-400/30 hover:border-purple-300/75",
    pillBg: "bg-violet-500/15",
    pillText: "text-violet-200",
    dotHex: "#a78bfa",
    Icon: Cpu,
  },
  database: {
    badge: "Storage",
    shortLabel: "Storage",
    topBar: "from-indigo-300 via-purple-300 to-indigo-400",
    border: "border-indigo-400/30 hover:border-purple-300/75",
    pillBg: "bg-indigo-500/15",
    pillText: "text-indigo-200",
    dotHex: "#a5b4fc",
    Icon: Database,
  },
  config: {
    badge: "Config",
    shortLabel: "Config",
    topBar: "from-purple-300 via-violet-300 to-indigo-400",
    border: "border-purple-400/30 hover:border-purple-300/75",
    pillBg: "bg-purple-500/15",
    pillText: "text-purple-200",
    dotHex: "#c4b5fd",
    Icon: Settings,
  },
};

function buildGithubBlobUrl(repoUrl: string, filePath: string): string | null {
  const match = repoUrl.trim().match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+?)(?:\.git)?$/i);
  if (!match) return null;
  const cleanPath = filePath.replace(/^\/+/, "");
  return "https://github.com/" + match[1] + "/" + match[2] + "/blob/HEAD/" + cleanPath;
}

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchNode | null>(null);
  const [cardTab, setCardTab] = useState<"overview" | "links" | "files">("overview");
  const [layerFilter, setLayerFilter] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [recentRepos, setRecentRepos] = useState<RecentRepoItem[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setRecentRepos(parsed.slice(0, 4));
      }
    } catch {}
  }, []);

  const saveRecentRepo = useCallback((url: string, projectName?: string) => {
    const cleaned = url.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/, "");
    const label = projectName && projectName !== cleaned ? cleaned + " (" + projectName + ")" : cleaned;
    if (!label) return;

    setRecentRepos((prev) => {
      const next = [{ label, url: url.trim() }, ...prev.filter((item) => item.url !== url.trim())].slice(0, 4);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape" && selectedNode) {
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNode]);

  const handleCopyPath = async (filePath: string) => {
    try {
      await navigator.clipboard.writeText(filePath);
      setCopiedPath(filePath);
      setTimeout(() => setCopiedPath(null), 1500);
    } catch {}
  };

  const handleCopyMarkdown = async () => {
    if (!analysis) return;
    const stepsText = (analysis.onboardingSteps || [])
      .map((s) => s.step + ". `" + s.filePath + "` — " + s.reason)
      .join("\n");
    const md = [
      "# " + analysis.projectName,
      "",
      analysis.summary,
      analysis.techStack?.length ? "\n**Stack:** " + analysis.techStack.join(", ") : "",
      "",
      "## Where to Start Reading",
      stepsText,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 1600);
    } catch {}
  };

  const handleReset = () => {
    setAnalysis(null);
    setSelectedNode(null);
    setCardTab("overview");
    setLayerFilter(null);
    setError(null);
    setRepoUrl("");
  };

  const handleAnalyze = async (targetUrl?: string) => {
    const urlToAnalyze = (targetUrl ?? repoUrl).trim();
    if (!urlToAnalyze) return;

    if (targetUrl) setRepoUrl(targetUrl);
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setCardTab("overview");
    setLayerFilter(null);

    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 5000));
      const [res] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: urlToAnalyze }),
        }),
        minDelay,
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze repository.");
      setAnalysis(data);
      saveRecentRepo(urlToAnalyze, data.projectName);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const groupedLayers = useMemo(() => {
    if (!analysis?.nodes) return [];
    const orderMap = new Map<string, number>();
    LAYER_ORDER.forEach((k, idx) => orderMap.set(k, idx));

    const buckets = new Map<string, ArchNode[]>();
    for (const n of analysis.nodes) {
      if (layerFilter && n.layer !== layerFilter) continue;
      const list = buckets.get(n.layer) || [];
      list.push(n);
      buckets.set(n.layer, list);
    }

    return Array.from(buckets.entries()).sort(
      (a, b) => (orderMap.get(a[0]) ?? 99) - (orderMap.get(b[0]) ?? 99)
    );
  }, [analysis, layerFilter]);

  const presentLayers = useMemo(() => {
    if (!analysis?.nodes) return [];
    const map = new Map<string, number>();
    for (const n of analysis.nodes) map.set(n.layer, (map.get(n.layer) || 0) + 1);
    return Array.from(map.entries());
  }, [analysis]);

  const starterRepos: RecentRepoItem[] = useMemo(() => {
    const defaults: RecentRepoItem[] = [
      { label: "sindresorhus/ky", url: "https://github.com/sindresorhus/ky" },
      { label: "expressjs/express", url: "https://github.com/expressjs/express" },
      { label: "shadcn-ui/ui", url: "https://github.com/shadcn-ui/ui" },
    ];
    if (!recentRepos.length) return defaults;
    return [...recentRepos, ...defaults.filter((d) => !recentRepos.some((r) => r.url === d.url))].slice(0, 4);
  }, [recentRepos]);

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-purple-500/30 relative">
      <CalmAmbientBackdrop activeLayer={selectedNode?.layer || layerFilter} />

      <header className="sticky top-0 z-30 border-b border-white/[0.09] bg-[#070b16]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <button type="button" onClick={handleReset} className="flex items-center gap-2.5 text-left cursor-pointer shrink-0 group">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-purple-600/25 group-hover:shadow-purple-500/40 transition">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">RepoMap AI</span>
          </button>

          <div className="flex-1 max-w-2xl flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-900/80 border border-white/[0.09] focus-within:border-purple-400/60 rounded-xl px-3.5 py-1.5 transition">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="https://github.com/owner/repository"
                className="w-full bg-transparent py-1 text-sm font-mono text-white placeholder:font-sans placeholder:text-slate-500 focus:outline-none"
              />
              {repoUrl && !loading && (
                <button
                  type="button"
                  onClick={() => setRepoUrl("")}
                  aria-label="Clear URL"
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 px-1.5 py-0.5 rounded border border-white/10">
                /
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleAnalyze()}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-md shadow-purple-600/20 transition cursor-pointer shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{loading ? "Analyzing..." : "Analyze"}</span>
            </button>

            {(analysis || error) && (
              <button
                type="button"
                onClick={handleReset}
                title="Reset"
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] text-slate-300 hover:text-white transition cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="relative z-20 bg-rose-950/75 border-b border-rose-500/35 px-6 py-3 text-sm text-rose-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          {repoUrl.trim() && !loading && (
            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/35 text-rose-100 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {!analysis && !loading && (
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-5 sm:px-8 py-12 sm:py-16 flex flex-col justify-center space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/12 border border-purple-400/35 text-xs font-medium text-purple-200">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
                <span>Blueprint Atlas for GitHub Repos</span>
              </div>

              <InteractiveHeroTitle />

              <p className="text-base text-slate-300 max-w-xl leading-relaxed">
                Paste any public GitHub URL to sort modules into clear architectural lanes, inspect details
                in a calm side panel, and follow a focused file reading order.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => inputRef.current?.focus()}
                  className="bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/25 transition cursor-pointer"
                >
                  Paste a Repo URL
                </button>
                <button
                  type="button"
                  onClick={() => handleAnalyze(starterRepos[0].url)}
                  className="bg-white/[0.04] hover:bg-purple-500/15 border border-white/[0.09] hover:border-purple-400/45 text-slate-200 hover:text-white font-medium text-sm px-4 py-2.5 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Try Live Demo</span>
                  <ArrowUpRight className="w-4 h-4 text-purple-300" />
                </button>
              </div>

              <div className="pt-3 space-y-2.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  {recentRepos.length > 0 && <History className="w-3.5 h-3.5 text-purple-300" />}
                  <span>{recentRepos.length > 0 ? "Recent & sample repos" : "Quick-start repos"}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {starterRepos.map((repo) => (
                    <button
                      key={repo.url}
                      type="button"
                      onClick={() => handleAnalyze(repo.url)}
                      className="inline-flex items-center gap-1.5 text-xs bg-[#0b1020]/85 hover:bg-slate-800/95 border border-white/[0.09] hover:border-purple-400/50 px-3.5 py-2 rounded-full text-slate-200 transition cursor-pointer"
                    >
                      <FolderGit2 className="w-3.5 h-3.5 text-purple-300" />
                      <span>{repo.label}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-3.5">
              {[
                {
                  tier: "Tier 01 · Entry & UI",
                  title: "Pages, Routes & Public API",
                  sub: "Where requests enter and UI views live",
                  tone: "from-[#141d3d]/95 to-[#0b1022]/95 border-indigo-400/35",
                },
                {
                  tier: "Tier 02 · Engine",
                  title: "Core Logic & State Flow",
                  sub: "How data transforms and modules connect",
                  tone: "from-[#17163b]/95 to-[#0b1022]/95 border-purple-400/40",
                },
                {
                  tier: "Tier 03 · Setup",
                  title: "Manifests, Types & Config",
                  sub: "Dependencies, build rules, and entry files",
                  tone: "from-[#121933]/95 to-[#090d1c]/95 border-violet-400/35",
                },
              ].map((plate, idx) => (
                <Tilt3D key={plate.tier} maxTilt={7} lift={7 + idx * 2}>
                  <div
                    className={
                      "rounded-2xl bg-gradient-to-br " +
                      plate.tone +
                      " border p-4 flex items-center justify-between gap-3 shadow-xl"
                    }
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-purple-300">
                        {plate.tier}
                      </div>
                      <div className="text-sm font-bold text-white truncate">{plate.title}</div>
                      <div className="text-xs text-slate-400 truncate">{plate.sub}</div>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-purple-200 shrink-0">
                      L{idx + 1}
                    </span>
                  </div>
                </Tilt3D>
              ))}
            </div>
          </div>
        </main>
      )}

      {loading && <LoadingStageView repoUrl={repoUrl} />}

      {analysis && !loading && (
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-5 sm:px-8 py-8">
          <style>{`
            @keyframes sidePanelFadeIn {
              0% {
                opacity: 0;
                transform: translateX(14px);
              }
              100% {
                opacity: 1;
                transform: translateX(0);
              }
            }
            .side-panel-fade {
              animation: sidePanelFadeIn 0.26s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            }
          `}</style>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
              <Tilt3D maxTilt={6} lift={6}>
                <div className="rounded-2xl bg-gradient-to-b from-[#0e152b]/95 to-[#090d1a]/95 border border-white/[0.09] overflow-hidden shadow-lg">
                  <div className="h-1 w-full bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400" />
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300">
                          Repository Atlas
                        </span>
                        <h2 className="text-lg font-extrabold text-white mt-0.5">{analysis.projectName}</h2>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyMarkdown}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-purple-500/20 border border-white/10 text-slate-200 hover:text-white transition cursor-pointer shrink-0"
                      >
                        {copiedMarkdown ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-purple-300" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5 text-purple-300" />
                            <span>Copy MD</span>
                          </>
                        )}
                      </button>
                    </div>

                   <div className="space-y-2.5">
                    {analysis.summary
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line, idx) => {
                        const match = line.match(/^(Step\s*\d+:?)\s*(.*)$/i);
                        return (
                          <div
                            key={idx}
                            className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs sm:text-sm leading-relaxed text-slate-300"
                          >
                            {match ? (
                              <>
                                <span className="font-semibold text-purple-300 mr-1.5">
                                  {match[1]}
                                </span>
                                <span>{match[2]}</span>
                              </>
                            ) : (
                              line
                            )}
                          </div>
                        );
                      })}
                  </div>

                    {analysis.techStack?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="text-[11px] px-2.5 py-0.5 rounded-md bg-purple-500/12 text-purple-200 border border-purple-400/25"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 border-t border-white/[0.09] space-y-2">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        Filter by Layer
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLayerFilter(null)}
                          className={!layerFilter
                            ? "text-xs px-3 py-1 rounded-lg border transition cursor-pointer bg-purple-500/25 border-purple-300 text-white font-semibold"
                            : "text-xs px-3 py-1 rounded-lg border transition cursor-pointer bg-black/35 border-white/10 text-slate-300 hover:text-white"}
                        >
                          All ({analysis.nodes?.length || 0})
                        </button>
                        {presentLayers.map(([layerKey, count]) => {
                          const cfg = LAYER_CONFIG[layerKey] || LAYER_CONFIG.config;
                          const active = layerFilter === layerKey;
                          return (
                            <button
                              key={layerKey}
                              type="button"
                              onClick={() => setLayerFilter(active ? null : layerKey)}
                              className={active
                                ? "inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border transition cursor-pointer bg-purple-500/25 border-purple-300 text-white font-semibold"
                                : "inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border transition cursor-pointer bg-black/35 border-white/10 text-slate-300 hover:text-white"}
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dotHex }} />
                              <span>{cfg.shortLabel}</span>
                              <span className="text-[11px] font-mono text-slate-400">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Tilt3D>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-300" />
                    <h3 className="text-sm font-bold text-white">Where to Start Reading</h3>
                  </div>
                  <span className="text-xs text-slate-400">Click path</span>
                </div>

                <div className="space-y-2">
                  {analysis.onboardingSteps?.map((step) => {
                    const isCopied = copiedPath === step.filePath;
                    const blobUrl = buildGithubBlobUrl(repoUrl, step.filePath);
                    return (
                      <Tilt3D key={step.step} maxTilt={5} lift={5}>
                        <div
                          onClick={() => handleCopyPath(step.filePath)}
                          className="p-3.5 rounded-xl bg-[#0b1020]/85 hover:bg-[#0e152b] border border-white/[0.09] hover:border-purple-400/40 space-y-1 transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-purple-500/15 border border-purple-400/35 text-purple-200 text-xs font-bold flex items-center justify-center shrink-0">
                                {step.step}
                              </span>
                              <span className="text-xs font-mono text-purple-200 truncate flex items-center gap-1.5">
                                <FileCode2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                                {step.filePath}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {blobUrl && (
                                <a
                                  href={blobUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Open on GitHub"
                                  className="text-slate-400 hover:text-purple-200"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-purple-300" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 pl-7 leading-relaxed">{step.reason}</p>
                        </div>
                      </Tilt3D>
                    );
                  })}
                </div>
              </div>
            </aside>

            <section className={selectedNode ? "lg:col-span-5 space-y-6" : "lg:col-span-8 space-y-7"}>
              {groupedLayers.map(([layerKey, nodesInLayer]) => {
                const cfg = LAYER_CONFIG[layerKey] || LAYER_CONFIG.config;
                const LayerIcon = cfg.Icon;

                return (
                  <div key={layerKey} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/[0.09] pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={"w-6 h-6 rounded-lg flex items-center justify-center " + cfg.pillBg + " " + cfg.pillText}
                        >
                          <LayerIcon className="w-3.5 h-3.5" />
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                          {cfg.badge}
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {nodesInLayer.length} {nodesInLayer.length === 1 ? "module" : "modules"}
                      </span>
                    </div>

                    <div className={selectedNode ? "grid grid-cols-1 gap-3.5" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                      {nodesInLayer.map((node) => {
                        const isSelected = selectedNode?.id === node.id;

                        return (
                          <div key={node.id} className="h-full">
                            <Tilt3D maxTilt={6} lift={6}>
                              <div
                                onClick={() => {
                                  setSelectedNode(isSelected ? null : node);
                                  setCardTab("overview");
                                }}
                                className={[
                                  "h-full rounded-2xl bg-gradient-to-br from-[#121a36]/95 via-[#0b1022]/95 to-[#060913]/95 border overflow-hidden flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-lg",
                                  isSelected
                                    ? "border-purple-300 ring-1 ring-purple-400/45 shadow-purple-950/50"
                                    : cfg.border,
                                ].join(" ")}
                              >
                                <div>
                                  <div className={"h-1.5 w-full bg-gradient-to-r " + cfg.topBar} />
                                  <div className="p-5 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-mono text-slate-400">
                                        {node.files?.length || 0} files
                                      </span>
                                      <span className="text-xs text-purple-300 font-medium">
                                        {isSelected ? "Viewing" : "Inspect"}
                                      </span>
                                    </div>

                                    <h4 className="font-bold text-base text-white leading-snug">
                                      {node.label}
                                    </h4>

                                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2">
                                      {node.description}
                                    </p>
                                  </div>
                                </div>

                                <div className="px-5 py-2.5 border-t border-white/[0.07] bg-black/25 flex items-center justify-between text-xs text-slate-400">
                                  <span className="font-mono truncate max-w-[220px]">
                                    {node.files?.[0] || node.layer}
                                  </span>
                                </div>
                              </div>
                            </Tilt3D>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>

            {selectedNode && (
              <aside key={selectedNode.id} className="lg:col-span-3 lg:sticky lg:top-20 side-panel-fade">
                <Tilt3D maxTilt={5} lift={6}>
                  <div className="rounded-2xl bg-gradient-to-b from-[#121a36]/95 via-[#0b1022]/95 to-[#060913]/95 border border-purple-400/40 overflow-hidden shadow-xl">
                    <div
                      className={
                        "h-1.5 w-full bg-gradient-to-r " +
                        (LAYER_CONFIG[selectedNode.layer] || LAYER_CONFIG.config).topBar
                      }
                    />
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300">
                          Module Details
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedNode(null)}
                          aria-label="Close side panel"
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-purple-500/20 px-2.5 py-1 rounded-lg border border-white/10 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Close</span>
                        </button>
                      </div>

                      <div>
                        <h3 className="text-lg font-extrabold text-white leading-snug">
                          {selectedNode.label}
                        </h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          {(LAYER_CONFIG[selectedNode.layer] || LAYER_CONFIG.config).badge} ·{" "}
                          {selectedNode.files?.length || 0} files
                        </p>
                      </div>

                      <div className="flex rounded-xl bg-black/45 p-1 border border-white/10 gap-1">
                        <button
                          type="button"
                          onClick={() => setCardTab("overview")}
                          className={
                            cardTab === "overview"
                              ? "flex-1 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/25 text-white border border-purple-300/40 cursor-pointer"
                              : "flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                          }
                        >
                          Overview
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardTab("links")}
                          className={
                            cardTab === "links"
                              ? "flex-1 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/25 text-white border border-purple-300/40 cursor-pointer"
                              : "flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                          }
                        >
                          Links
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardTab("files")}
                          className={
                            cardTab === "files"
                              ? "flex-1 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/25 text-white border border-purple-300/40 cursor-pointer"
                              : "flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                          }
                        >
                          Files
                        </button>
                      </div>

                      {cardTab === "overview" && (
                        <div className="rounded-xl bg-black/35 border border-white/[0.09] p-3.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {selectedNode.description}
                        </div>
                      )}

                      {cardTab === "links" && (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                          {(analysis.edges || []).filter(
                            (e) => e.source === selectedNode.id || e.target === selectedNode.id
                          ).length === 0 ? (
                            <div className="rounded-xl bg-black/35 border border-white/[0.09] p-3.5 text-xs text-slate-400">
                              No direct connections for this module.
                            </div>
                          ) : (
                            (analysis.edges || [])
                              .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                              .map((edge) => {
                                const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                                const otherNode = analysis.nodes.find((n) => n.id === otherId);
                                const direction = edge.source === selectedNode.id ? "Calls ->" : "<- Called by";
                                return (
                                  <button
                                    key={edge.id}
                                    type="button"
                                    onClick={() => {
                                      if (otherNode) {
                                        setSelectedNode(otherNode);
                                        setCardTab("overview");
                                      }
                                    }}
                                    className="w-full text-left flex items-center justify-between gap-2 text-xs bg-black/45 hover:bg-purple-500/15 border border-white/[0.09] hover:border-purple-400/40 px-3 py-2 rounded-xl transition cursor-pointer"
                                  >
                                    <span className="text-slate-200 truncate">
                                      <span className="font-mono text-[10px] text-purple-300 mr-1.5">
                                        {direction}
                                      </span>
                                      {otherNode?.label || otherId}
                                    </span>
                                  </button>
                                );
                              })
                          )}
                        </div>
                      )}

                      {cardTab === "files" && (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                          {(selectedNode.files || []).length === 0 ? (
                            <div className="rounded-xl bg-black/35 border border-white/[0.09] p-3.5 text-xs text-slate-400">
                              No files listed under this module.
                            </div>
                          ) : (
                            (selectedNode.files || []).map((file) => {
                              const blobUrl = buildGithubBlobUrl(repoUrl, file);
                              return (
                                <div
                                  key={file}
                                  className="flex items-center justify-between gap-2 text-xs font-mono bg-black/45 border border-white/[0.09] px-3 py-2 rounded-xl text-purple-200"
                                >
                                  <span className="truncate">{file}</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {blobUrl && (
                                      <a
                                        href={blobUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Open on GitHub"
                                        className="text-slate-400 hover:text-purple-200"
                                      >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleCopyPath(file)}
                                      title="Copy path"
                                      className="text-slate-400 hover:text-white cursor-pointer"
                                    >
                                      {copiedPath === file ? (
                                        <Check className="w-3.5 h-3.5 text-purple-300" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Tilt3D>
              </aside>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
