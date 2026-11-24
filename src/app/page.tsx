"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ValidLayer = "frontend" | "api" | "logic" | "database" | "config";

interface ArchNode {
  id: string;
  label?: string;
  name?: string;
  layer?: ValidLayer | string;
  role?: string;
  description?: string;
  files?: string[];
  filePath?: string;
}

interface ArchEdge {
  id?: string;
  source?: string;
  target?: string;
  from?: string;
  to?: string;
  label?: string;
  relation?: string;
}

interface OnboardingStep {
  step: number;
  filePath: string;
  reason: string;
}

interface ArchitectureResult {
  projectName: string;
  summary: string;
  techStack: string[];
  nodes: ArchNode[];
  edges: ArchEdge[];
  onboardingSteps: OnboardingStep[];
}

const EXAMPLE_REPOS = [
  "shadcn-ui/taxonomy",
  "vercel/next.js",
  "tailwindlabs/tailwindcss",
  "pmndrs/zustand",
];

const LAYER_STYLES: Record<
  string,
  { badge: string; border: string; pillActive: string }
> = {
  frontend: {
    badge: "bg-purple-500/15 text-purple-200 border-purple-400/30",
    border: "border-purple-400/25 hover:border-purple-300/60",
    pillActive: "bg-purple-500/25 text-purple-100 border-purple-400/60",
  },
  api: {
    badge: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30",
    border: "border-fuchsia-400/25 hover:border-fuchsia-300/60",
    pillActive: "bg-fuchsia-500/25 text-fuchsia-100 border-fuchsia-400/60",
  },
  logic: {
    badge: "bg-violet-500/15 text-violet-200 border-violet-400/30",
    border: "border-violet-400/25 hover:border-violet-300/60",
    pillActive: "bg-violet-500/25 text-violet-100 border-violet-400/60",
  },
  database: {
    badge: "bg-indigo-500/15 text-indigo-200 border-indigo-400/30",
    border: "border-indigo-400/25 hover:border-indigo-300/60",
    pillActive: "bg-indigo-500/25 text-indigo-100 border-indigo-400/60",
  },
  config: {
    badge: "bg-slate-500/15 text-slate-200 border-slate-400/30",
    border: "border-slate-400/25 hover:border-slate-300/60",
    pillActive: "bg-slate-500/25 text-slate-100 border-slate-400/60",
  },
};

function getLayerStyle(layer?: string) {
  const key = (layer || "logic").toLowerCase();
  return LAYER_STYLES[key] || LAYER_STYLES.logic;
}

function getNodeTitle(node: ArchNode): string {
  return node.label || node.name || node.id || "Module";
}

function getNodeFiles(node: ArchNode): string[] {
  if (Array.isArray(node.files) && node.files.length > 0) return node.files;
  if (node.filePath) return [node.filePath];
  return [];
}

/**
 * Interactive Orbital Architecture Backdrop
 * Concentric glowing architectural rings, orbiting satellites, and click shockwaves
 */
function OrbitalArchitectureBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let targetOffsetX = 0;
    let targetOffsetY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let angle = 0;

    const waves: { x: number; y: number; r: number; alpha: number }[] = [];

    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / Math.max(1, width) - 0.5) * 2;
      const ny = (e.clientY / Math.max(1, height) - 0.5) * 2;
      targetOffsetX = nx * 28;
      targetOffsetY = ny * 20;
    };

    const onClick = (e: MouseEvent) => {
      waves.push({ x: e.clientX, y: e.clientY, r: 12, alpha: 0.5 });
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("click", onClick);

    const satellites = [
      { radiusFactor: 0.2, speed: 0.0045, phase: 0, size: 3.2, rgb: "192, 132, 252" },
      { radiusFactor: 0.2, speed: 0.0045, phase: Math.PI, size: 2.6, rgb: "232, 121, 249" },
      { radiusFactor: 0.34, speed: -0.0028, phase: 1.1, size: 3.5, rgb: "167, 139, 250" },
      { radiusFactor: 0.34, speed: -0.0028, phase: 4.2, size: 2.8, rgb: "129, 140, 248" },
      { radiusFactor: 0.48, speed: 0.0017, phase: 2.3, size: 3.0, rgb: "217, 70, 239" },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      angle += 0.0016;
      offsetX += (targetOffsetX - offsetX) * 0.05;
      offsetY += (targetOffsetY - offsetY) * 0.05;

      const cx = width * 0.5 + offsetX;
      const cy = height * 0.44 + offsetY;
      const baseRadius = Math.min(width, height) * 0.85;

      // Subtle radial sweep cone
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * 2.2);
      const sweep = ctx.createConicGradient(0, 0);
      sweep.addColorStop(0, "rgba(168, 85, 247, 0.11)");
      sweep.addColorStop(0.14, "rgba(217, 70, 239, 0.04)");
      sweep.addColorStop(0.28, "rgba(168, 85, 247, 0)");
      sweep.addColorStop(1, "rgba(168, 85, 247, 0)");
      ctx.fillStyle = sweep;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Concentric architectural orbital rings
      const ringFactors = [0.2, 0.34, 0.48];
      ringFactors.forEach((rf, idx) => {
        const r = baseRadius * rf;
        ctx.strokeStyle =
          idx === 1
            ? "rgba(192, 132, 252, 0.18)"
            : "rgba(139, 92, 246, 0.13)";
        ctx.lineWidth = idx === 1 ? 1.15 : 0.9;
        ctx.setLineDash(idx === 1 ? [6, 8] : []);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Orbiting nodes along rings
      for (const sat of satellites) {
        sat.phase += sat.speed;
        const r = baseRadius * sat.radiusFactor;
        const sx = cx + Math.cos(sat.phase) * r;
        const sy = cy + Math.sin(sat.phase) * r;

        ctx.fillStyle = `rgba(${sat.rgb}, 0.85)`;
        ctx.beginPath();
        ctx.arc(sx, sy, sat.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${sat.rgb}, 0.18)`;
        ctx.beginPath();
        ctx.arc(sx, sy, sat.size * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Click shockwave rings
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.r += 5;
        w.alpha *= 0.94;
        if (w.alpha < 0.015) {
          waves.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(217, 70, 239, ${w.alpha.toFixed(3)})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      animId = window.requestAnimationFrame(render);
    };

    animId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#060510]"
    >
      {/* Soft violet & magenta ambient washes */}
      <div
        className="absolute -top-44 left-1/2 -translate-x-1/2 h-[560px] w-[920px] rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(168,85,247,0.28) 0%, rgba(109,40,217,0.12) 54%, rgba(6,5,16,0) 78%)",
          animation: "rmOrbBloom 11s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-0 right-0 h-[440px] w-[680px] rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(217,70,239,0.18) 0%, rgba(79,70,229,0.10) 56%, rgba(6,5,16,0) 78%)",
          animation: "rmOrbBloom 14s ease-in-out 3s infinite",
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/**
 * 3D Interactive Search Bar with Glowing Typing Indicator
 */
function SearchBar3D({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  buttonLabel,
  isTyping,
  inputRef,
  compact = false,
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder: string;
  buttonLabel: string;
  isTyping: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  compact?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    const maxTilt = compact ? 2.5 : 4.5;
    el.style.transform = `perspective(1000px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg) translateY(-2px)`;
  };

  const handleLeave = () => {
    if (!boxRef.current) return;
    boxRef.current.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={
        compact ? "flex-1 max-w-xl" : "relative max-w-2xl mx-auto pt-2"
      }
    >
      <div
        ref={boxRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="relative transition-transform duration-200 ease-out will-change-transform"
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-purple-500/45 via-fuchsia-500/40 to-indigo-500/45 blur-xl transition-opacity duration-300 ${
            isTyping ? "opacity-100" : "opacity-65"
          }`}
        />

        <div
          className={`relative flex ${
            compact
              ? "flex-row items-center gap-2 p-1.5"
              : "flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2"
          } rounded-2xl border bg-[#090818]/80 transition-all duration-300 ${
            isTyping
              ? "border-fuchsia-400/75 shadow-[0_14px_38px_rgba(168,85,247,0.34),inset_0_1px_0_rgba(255,255,255,0.14)]"
              : "border-purple-400/40 shadow-[0_10px_30px_rgba(147,51,234,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]"
          }`}
        >
          <div className="flex items-center gap-2.5 flex-1 px-2.5 min-w-0">
            <svg
              className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
                isTyping ? "text-fuchsia-300" : "text-purple-300"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={`w-full bg-transparent text-white placeholder:text-slate-500 focus:outline-none ${
                compact ? "py-1.5 text-xs sm:text-sm" : "py-2.5 text-sm"
              }`}
            />

            <div
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition-all duration-300 ${
                isTyping
                  ? "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-100 opacity-100 shadow-[0_0_14px_rgba(217,70,239,0.5)]"
                  : "border-transparent bg-transparent text-transparent opacity-0 pointer-events-none"
              }`}
            >
              <span className="flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300 animate-bounce [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-purple-300 animate-bounce [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-300 animate-bounce" />
              </span>
              <span>typing</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className={`shrink-0 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 font-semibold text-white shadow-[0_6px_20px_rgba(168,85,247,0.42)] transition-all cursor-pointer ${
              compact ? "px-3.5 py-1.5 text-xs sm:text-sm" : "px-6 py-3 text-sm"
            }`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * Crisp Translucent Panel with a Soft Purple Halo Behind It
 */
function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group relative ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1.5 rounded-3xl opacity-65 group-hover:opacity-95 transition-opacity duration-500 blur-xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(168,85,247,0.24) 0%, rgba(126,34,206,0.10) 58%, rgba(6,5,16,0) 84%)",
        }}
      />
      <div className="relative h-full rounded-2xl border border-purple-400/25 bg-[#0b091c]/60 shadow-[0_0_28px_rgba(147,51,234,0.12)]">
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ArchitectureResult | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [layerFilter, setLayerFilter] = useState<string | null>(null);
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [fadeKey, setFadeKey] = useState(0);
  const [showPurpleFade, setShowPurpleFade] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevLoadingRef = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("repomap_recent_repos") || "[]"
      );
      if (Array.isArray(saved)) {
        setRecentRepos(
          saved.filter((x): x is string => typeof x === "string").slice(0, 4)
        );
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleRepoInputChange = (val: string) => {
    setRepoUrl(val);
    setIsTyping(val.length > 0);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
    }, 900);
  };

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;

    if (wasLoading !== loading) {
      setFadeKey((k) => k + 1);
      setShowPurpleFade(true);
    }
  }, [loading]);

  useEffect(() => {
    if (!showPurpleFade) return;
    const t = window.setTimeout(() => setShowPurpleFade(false), 3000);
    return () => window.clearTimeout(t);
  }, [showPurpleFade, fadeKey]);

  useEffect(() => {
    if (!loading) {
      setLoadingStage(0);
      setElapsedSec(0);
      return;
    }

    const start = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSec((Date.now() - start) / 1000);
    }, 100);

    const t1 = window.setTimeout(() => setLoadingStage(1), 650);
    const t2 = window.setTimeout(() => setLoadingStage(2), 1800);
    const t3 = window.setTimeout(() => setLoadingStage(3), 3400);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [loading]);

  const saveRecentRepo = (url: string) => {
    setRecentRepos((prev) => {
      const next = [url, ...prev.filter((item) => item !== url)].slice(0, 4);
      try {
        localStorage.setItem("repomap_recent_repos", JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleAnalyze = async (targetUrl?: string) => {
    const urlToAnalyze = (targetUrl ?? repoUrl).trim();
    if (!urlToAnalyze) {
      inputRef.current?.focus();
      return;
    }

    setIsTyping(false);
    setError(null);
    setLoading(true);
    setSelectedNodeId(null);
    setLayerFilter(null);

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 1500));
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 35000);

    try {
      const [res] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: urlToAnalyze }),
          signal: controller.signal,
        }),
        minDelay,
      ]);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to analyze repository.");
      }

      const parsed = data as ArchitectureResult;
      setAnalysis(parsed);
      setSelectedNodeId(parsed.nodes?.[0]?.id ?? null);
      saveRecentRepo(urlToAnalyze);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(
          "Analysis timed out after 35s—try again or test a smaller public repository."
        );
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setSelectedNodeId(null);
    setLayerFilter(null);
    setError(null);
    setRepoUrl("");
    setIsTyping(false);
  };

  const handleCopyPath = async (filePath: string) => {
    try {
      await navigator.clipboard.writeText(filePath);
      setCopiedPath(filePath);
      window.setTimeout(() => setCopiedPath(null), 1500);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const layers = useMemo(() => {
    if (!analysis?.nodes) return [];
    const set = new Set<string>();
    for (const n of analysis.nodes) {
      if (n.layer) set.add(String(n.layer).toLowerCase());
    }
    return Array.from(set);
  }, [analysis]);

  const filteredNodes = useMemo(() => {
    if (!analysis?.nodes) return [];
    if (!layerFilter) return analysis.nodes;
    return analysis.nodes.filter(
      (n) => (n.layer || "logic").toLowerCase() === layerFilter
    );
  }, [analysis, layerFilter]);

  const selectedNode = useMemo(() => {
    if (!analysis?.nodes?.length) return null;
    return (
      analysis.nodes.find((n) => n.id === selectedNodeId) ||
      filteredNodes[0] ||
      analysis.nodes[0]
    );
  }, [analysis, selectedNodeId, filteredNodes]);

  const connectedEdges = useMemo(() => {
    if (!analysis?.edges?.length || !selectedNode) return [];
    return analysis.edges.filter((e) => {
      const from = e.source || e.from;
      const to = e.target || e.to;
      return from === selectedNode.id || to === selectedNode.id;
    });
  }, [analysis, selectedNode]);

  const cleanOverviewText = useMemo(() => {
    if (!analysis) return "";
    const raw = String(analysis.summary || "").trim();
    const stripped = raw.replace(/\s*\(AI note:[\s\S]*$/i, "").trim();
    if (!stripped || stripped.toLowerCase().startsWith("structural map of")) {
      const count = analysis.nodes?.length || 0;
      return `${analysis.projectName} maps ${count} core modules across its codebase—start with Step 01 to see how requests flow from entry to logic.`;
    }
    const firstSentence = stripped
      .replace(/^step\s*\d+:\s*/i, "")
      .split(/(?<=[.!?])\s+/)[0];
    return firstSentence || stripped.slice(0, 160);
  }, [analysis]);

  const walkthroughSteps = useMemo(() => {
    const firstStep = analysis?.onboardingSteps?.[0];
    return [
      {
        num: "01",
        title: "Install & Env",
        detail:
          "Check package.json scripts, dependencies, and required env keys first.",
      },
      {
        num: "02",
        title: "Entry File",
        detail: firstStep
          ? `Open ${firstStep.filePath} — ${firstStep.reason}`
          : "Open #1 under Where to Start Reading to see how the app boots.",
      },
      {
        num: "03",
        title: "Request Flow",
        detail:
          "Trace UI components into API routes, core logic, and data layers.",
      },
      {
        num: "04",
        title: "Inspect Modules",
        detail:
          "Click any module card below to view its files and connections.",
      },
    ];
  }, [analysis]);

  const loadingSteps = [
    "Fetching repository file tree",
    "Detecting architectural layers",
    "Mapping module connections",
    "Building beginner walkthrough",
  ];

  const loadingProgress = Math.min(
    92,
    Math.round((loadingStage + 1) * 22 + elapsedSec * 2)
  );

  return (
    <div className="min-h-screen bg-[#060510] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-purple-500/30 antialiased">
      <OrbitalArchitectureBackdrop />

      {/* Smooth purple enter/exit transition overlay */}
      {showPurpleFade && (
        <div
          key={fadeKey}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50"
          style={{
            background:
              "radial-gradient(ellipse 85% 65% at 50% 40%, rgba(168,85,247,0.22) 0%, rgba(126,34,206,0.10) 50%, rgba(6,5,16,0) 84%)",
            animation:
              "rmSmoothDissolve 3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
          }}
        />
      )}

      <style>{`
        @keyframes rmSmoothDissolve {
          0% { opacity: 0; }
          36% { opacity: 0.95; }
          68% { opacity: 0.55; }
          100% { opacity: 0; }
        }
        @keyframes rmOrbBloom {
          0%, 100% { opacity: 0.55; transform: scale(0.98); }
          50% { opacity: 0.95; transform: scale(1.04); }
        }
        @keyframes rmFadeSlide {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-purple-400/15 bg-[#070614]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500/35 to-fuchsia-500/20 border border-purple-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:scale-105 transition-transform">
              <svg
                className="w-4 h-4 text-purple-100"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="12" cy="18" r="3" />
                <path d="M8.5 7.5 11 15.5" />
                <path d="M15.5 7.5 13 15.5" />
              </svg>
            </div>
            <div>
              <div className="text-sm sm:text-base font-semibold tracking-tight text-white">
                RepoMap AI
              </div>
              <div className="text-[11px] text-slate-400">
                Codebase architecture &amp; walkthrough
              </div>
            </div>
          </button>

          {(analysis || loading) && (
            <div className="flex items-center gap-2 flex-1 max-w-2xl justify-end">
              <SearchBar3D
                compact
                inputRef={inputRef}
                value={repoUrl}
                onChange={handleRepoInputChange}
                onSubmit={() => void handleAnalyze()}
                disabled={loading}
                placeholder="Paste GitHub URL or owner/repo..."
                buttonLabel={loading ? "Mapping..." : "Analyze"}
                isTyping={isTyping}
              />
              {analysis && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="shrink-0 rounded-xl border border-white/10 bg-[#0b091c]/70 hover:bg-white/[0.08] px-3 py-2 text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  New
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {error && (
          <div className="max-w-3xl mx-auto rounded-xl border border-rose-400/35 bg-rose-950/75 px-4 py-3 text-xs sm:text-sm text-rose-200 text-center">
            {error}
          </div>
        )}

        {/* Crisp, Translucent Loading State */}
        {loading && (
          <div
            className="max-w-xl mx-auto py-10"
            style={{ animation: "rmFadeSlide 0.45s ease-out forwards" }}
          >
            <Panel>
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                    <span className="font-mono text-xs text-purple-200 truncate">
                      {repoUrl || "Analyzing repository"}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md border border-purple-400/25 bg-purple-500/10 px-2.5 py-0.5 font-mono text-[11px] text-purple-200">
                    {elapsedSec.toFixed(1)}s
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold text-white">
                    Mapping Repository Architecture
                  </h2>
                  <p className="text-xs text-slate-300">
                    {loadingSteps[loadingStage] || "Processing repository..."}
                  </p>
                </div>

                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-indigo-400 transition-all duration-500"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {loadingSteps.map((step, idx) => {
                    const active = idx === loadingStage;
                    const done = idx < loadingStage;
                    return (
                      <div
                        key={step}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                          active
                            ? "border-purple-400/45 bg-purple-500/15 text-white font-medium"
                            : done
                              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                              : "border-white/10 bg-white/[0.02] text-slate-400"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            done
                              ? "bg-emerald-400"
                              : active
                                ? "bg-purple-300 animate-pulse"
                                : "bg-slate-600"
                          }`}
                        />
                        <span className="truncate">{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </div>
        )}

        {/* Landing Page */}
        {!loading && !analysis && (
          <section
            className="space-y-12"
            style={{ animation: "rmFadeSlide 0.45s ease-out forwards" }}
          >
            <div className="text-center max-w-3xl mx-auto pt-4 sm:pt-8 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/35 bg-purple-500/10 px-3.5 py-1.5 text-xs text-purple-200">
                <span className="h-2 w-2 rounded-full bg-purple-400" />
                <span className="font-mono tracking-wide">
                  AI-Powered Codebase Intelligence
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.12] text-white">
                Turn any GitHub repo into an{" "}
                <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                  interactive architecture map
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Skip hours of digging through nested folders. Paste a public
                repository to get a clean layer breakdown, module connections,
                and a step-by-step beginner reading order in seconds.
              </p>

              <SearchBar3D
                inputRef={inputRef}
                value={repoUrl}
                onChange={handleRepoInputChange}
                onSubmit={() => void handleAnalyze()}
                disabled={loading}
                placeholder="github.com/owner/repo or owner/repo"
                buttonLabel="Map Repository"
                isTyping={isTyping}
              />

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mr-1">
                  Try:
                </span>
                {EXAMPLE_REPOS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setRepoUrl(item);
                      void handleAnalyze(item);
                    }}
                    className="rounded-lg border border-purple-400/25 bg-purple-500/10 hover:border-purple-400/60 hover:bg-purple-500/20 px-3 py-1.5 font-mono text-xs text-purple-100 transition-all cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
                {recentRepos
                  .filter((r) => !EXAMPLE_REPOS.includes(r))
                  .slice(0, 2)
                  .map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setRepoUrl(item);
                        void handleAnalyze(item);
                      }}
                      className="rounded-lg border border-white/10 bg-white/[0.04] hover:border-purple-400/45 px-3 py-1.5 font-mono text-xs text-slate-200 transition-all cursor-pointer"
                    >
                      {item}
                    </button>
                  ))}
              </div>
            </div>

            <Panel className="max-w-5xl mx-auto">
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/75" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/75" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/75" />
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      architecture-preview.map
                    </span>
                  </div>
                  <span className="rounded-md border border-purple-400/25 bg-purple-500/10 px-2.5 py-0.5 font-mono text-[11px] text-purple-200">
                    4 Layers · Auto-Detected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    {
                      layer: "Frontend",
                      title: "UI & Pages",
                      path: "src/app/page.tsx",
                      desc: "Interactive views, state, and user flows",
                      badge:
                        "bg-purple-500/20 text-purple-200 border-purple-400/30",
                    },
                    {
                      layer: "API",
                      title: "Route Handlers",
                      path: "src/app/api/analyze",
                      desc: "Request validation & GitHub tree fetch",
                      badge:
                        "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30",
                    },
                    {
                      layer: "Logic",
                      title: "Core Engine",
                      path: "src/lib/analyzer.ts",
                      desc: "Dependency graph & module clustering",
                      badge:
                        "bg-violet-500/20 text-violet-200 border-violet-400/30",
                    },
                    {
                      layer: "Guide",
                      title: "Reading Order",
                      path: "#1 → #4 Steps",
                      desc: "Exact files a beginner should open first",
                      badge:
                        "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
                    },
                  ].map((card, i) => (
                    <div
                      key={card.title}
                      className="rounded-xl border border-purple-400/20 bg-[#070614]/65 p-4 space-y-2 hover:border-purple-400/55 hover:bg-purple-500/[0.06] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-[10px] ${card.badge}`}
                        >
                          {card.layer}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          0{i + 1}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">
                        {card.title}
                      </h3>
                      <p className="font-mono text-[11px] text-purple-300 truncate">
                        {card.path}
                      </p>
                      <p className="text-xs text-slate-300/85 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </section>
        )}

        {/* Analysis Results Dashboard */}
        {!loading && analysis && (
          <section
            className="space-y-6"
            style={{ animation: "rmFadeSlide 0.45s ease-out forwards" }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <Panel className="lg:col-span-5">
                <div className="p-5 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-purple-300">
                        Quick Walkthrough
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {analysis.nodes?.length || 0} modules
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-white mb-2">
                      {analysis.projectName}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4">
                      {cleanOverviewText}
                    </p>
                  </div>

                  {Array.isArray(analysis.techStack) &&
                    analysis.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
                        {analysis.techStack.slice(0, 8).map((tech) => (
                          <span
                            key={tech}
                            className="rounded-md border border-purple-400/25 bg-purple-500/15 px-2 py-0.5 font-mono text-[11px] text-purple-100"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              </Panel>

              {/* 2x2 Beginner Walkthrough Grid */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {walkthroughSteps.map((step) => (
                  <Panel key={step.num}>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="h-5 min-w-5 px-1.5 rounded-md bg-purple-500/25 border border-purple-400/35 flex items-center justify-center font-mono text-[10px] font-semibold text-purple-100">
                          {step.num}
                        </span>
                        <h3 className="text-xs sm:text-sm font-medium text-white">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </Panel>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    Architecture Modules ({filteredNodes.length})
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLayerFilter(null)}
                      className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                        layerFilter === null
                          ? "bg-purple-500/25 text-purple-100 border-purple-400/55"
                          : "border-white/10 bg-[#0b091c]/65 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      All
                    </button>
                    {layers.map((layer) => {
                      const st = getLayerStyle(layer);
                      const active = layerFilter === layer;
                      return (
                        <button
                          key={layer}
                          type="button"
                          onClick={() => setLayerFilter(active ? null : layer)}
                          className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] capitalize transition-colors ${
                            active
                              ? st.pillActive
                              : "border-white/10 bg-[#0b091c]/65 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {layer}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredNodes.map((node) => {
                    const st = getLayerStyle(node.layer);
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <div key={node.id} className="group relative">
                        <div
                          aria-hidden="true"
                          className={`pointer-events-none absolute -inset-1 rounded-2xl blur-lg transition-opacity duration-300 ${
                            isSelected
                              ? "opacity-90"
                              : "opacity-50 group-hover:opacity-85"
                          }`}
                          style={{
                            background:
                              "radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.24) 0%, rgba(126,34,206,0.10) 60%, rgba(6,5,16,0) 85%)",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedNodeId(node.id)}
                          className={`relative w-full h-full text-left rounded-2xl border p-4 transition-all ${
                            isSelected
                              ? "border-purple-400/70 bg-[#150f2e]/80 shadow-[0_0_24px_rgba(168,85,247,0.2)]"
                              : `${st.border} bg-[#0b091c]/65 hover:bg-[#100c26]/75`
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs sm:text-sm font-medium text-white truncate">
                              {getNodeTitle(node)}
                            </span>
                            <span
                              className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] capitalize ${st.badge}`}
                            >
                              {node.layer || "logic"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300/85 line-clamp-2 leading-relaxed">
                            {node.role ||
                              node.description ||
                              "Core repository module"}
                          </p>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="lg:col-span-5 space-y-5">
                {selectedNode && (
                  <Panel>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-purple-300">
                          Module Inspector
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {selectedNode.layer || "logic"}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white">
                        {getNodeTitle(selectedNode)}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedNode.description ||
                          selectedNode.role ||
                          "No additional description provided for this module."}
                      </p>

                      {getNodeFiles(selectedNode).length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                          <p className="font-mono text-[11px] text-slate-400">
                            Files
                          </p>
                          <div className="space-y-1">
                            {getNodeFiles(selectedNode).map((file) => (
                              <div
                                key={file}
                                className="flex items-center justify-between gap-2 rounded-lg bg-[#070614]/70 border border-purple-400/15 px-2.5 py-1.5"
                              >
                                <span className="font-mono text-[11px] text-slate-200 truncate">
                                  {file}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleCopyPath(file)}
                                  className="shrink-0 font-mono text-[10px] text-purple-300 hover:text-purple-200"
                                >
                                  {copiedPath === file ? "Copied" : "Copy"}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {connectedEdges.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                          <p className="font-mono text-[11px] text-slate-400">
                            Connections ({connectedEdges.length})
                          </p>
                          <div className="space-y-1">
                            {connectedEdges.slice(0, 6).map((edge, idx) => (
                              <div
                                key={edge.id || idx}
                                className="rounded-lg bg-purple-500/[0.08] border border-purple-400/15 px-2.5 py-1.5 font-mono text-[11px] text-slate-200"
                              >
                                {edge.source || edge.from} →{" "}
                                {edge.target || edge.to}
                                {edge.label ? ` (${edge.label})` : ""}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Panel>
                )}

                {Array.isArray(analysis.onboardingSteps) &&
                  analysis.onboardingSteps.length > 0 && (
                    <Panel>
                      <div className="p-4 space-y-2.5">
                        <h3 className="font-mono text-[11px] uppercase tracking-wider text-purple-300">
                          Where to Start Reading
                        </h3>
                        <div className="space-y-2">
                          {analysis.onboardingSteps.map((item) => (
                            <div
                              key={`${item.step}-${item.filePath}`}
                              className="rounded-xl border border-purple-400/15 bg-[#070614]/65 p-3"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-mono text-[11px] font-semibold text-purple-200 truncate">
                                  #{item.step} · {item.filePath}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyPath(item.filePath)
                                  }
                                  className="shrink-0 font-mono text-[10px] text-slate-400 hover:text-purple-200"
                                >
                                  {copiedPath === item.filePath
                                    ? "Copied"
                                    : "Copy"}
                                </button>
                              </div>
                              <p className="text-xs text-slate-300/85 leading-relaxed">
                                {item.reason}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Panel>
                  )}
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}