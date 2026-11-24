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
  { badge: string; border: string; pillActive: string; dot: string }
> = {
  frontend: {
    badge: "bg-purple-500/15 text-purple-200 border-purple-400/30",
    border: "border-purple-400/25 hover:border-purple-300/55",
    pillActive: "bg-purple-500/25 text-purple-100 border-purple-400/55",
    dot: "bg-purple-400",
  },
  api: {
    badge: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30",
    border: "border-fuchsia-400/25 hover:border-fuchsia-300/55",
    pillActive: "bg-fuchsia-500/25 text-fuchsia-100 border-fuchsia-400/55",
    dot: "bg-fuchsia-400",
  },
  logic: {
    badge: "bg-violet-500/15 text-violet-200 border-violet-400/30",
    border: "border-violet-400/25 hover:border-violet-300/55",
    pillActive: "bg-violet-500/25 text-violet-100 border-violet-400/55",
    dot: "bg-violet-400",
  },
  database: {
    badge: "bg-indigo-500/15 text-indigo-200 border-indigo-400/30",
    border: "border-indigo-400/25 hover:border-indigo-300/55",
    pillActive: "bg-indigo-500/25 text-indigo-100 border-indigo-400/55",
    dot: "bg-indigo-400",
  },
  config: {
    badge: "bg-slate-500/15 text-slate-200 border-slate-400/30",
    border: "border-slate-400/25 hover:border-slate-300/55",
    pillActive: "bg-slate-500/25 text-slate-100 border-slate-400/55",
    dot: "bg-slate-400",
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

function GlowPanel({
  children,
  className = "",
  tilt = false,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateY(-2px)`;
  };

  const handleLeave = () => {
    if (!tilt) return;
    const el = ref.current;
    if (!el) return;
    el.style.transform =
      "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`group relative transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {/* Soft purple halo behind each panel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1.5 rounded-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(168,85,247,0.26) 0%, rgba(126,34,206,0.12) 55%, rgba(6,9,19,0) 82%)",
          animation: "repomapPanelBreathe 8s ease-in-out infinite",
        }}
      />
      <div className="relative h-full rounded-2xl border border-purple-400/20 bg-[#0b1022]/85 backdrop-blur-xl shadow-[0_0_32px_rgba(147,51,234,0.12)] overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20"
          style={{
            background:
              "radial-gradient(ellipse 85% 100% at 50% 0%, rgba(168,85,247,0.14) 0%, rgba(168,85,247,0) 100%)",
          }}
        />
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
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

  // Trigger silky-smooth purple dissolve when loading starts AND when it finishes
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
    const t = window.setTimeout(() => setShowPurpleFade(false), 3200);
    return () => window.clearTimeout(t);
  }, [showPurpleFade, fadeKey]);

  // Cycle loading stage labels while fetching
  useEffect(() => {
    if (!loading) {
      setLoadingStage(0);
      return;
    }
    const t1 = window.setTimeout(() => setLoadingStage(1), 600);
    const t2 = window.setTimeout(() => setLoadingStage(2), 1400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
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

    setError(null);
    setLoading(true);
    setSelectedNodeId(null);
    setLayerFilter(null);

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 1500));
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 9000);

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
          "Analysis took longer than 9s—try again or pick a smaller public repo."
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
    "Scanning repository file tree & entry points",
    "Grouping modules into architectural layers",
    "Building beginner walkthrough & reading order",
  ];

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-purple-500/30">
      {/* Subtle architectural dot-grid + ambient purple spotlights */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(168,85,247,0.35) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute -top-36 left-1/2 -translate-x-1/2 h-[520px] w-[960px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.22) 0%, rgba(109,40,217,0.10) 48%, rgba(5,8,20,0) 76%)",
            animation: "repomapSoftAura 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-0 right-0 h-[420px] w-[640px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.16) 0%, rgba(126,34,206,0.06) 52%, rgba(5,8,20,0) 76%)",
            animation: "repomapSoftAura 12s ease-in-out 2.5s infinite",
          }}
        />
      </div>

      {/* Silky-smooth purple enter/exit transition veil */}
      {showPurpleFade && (
        <div
          key={fadeKey}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50"
          style={{
            background:
              "radial-gradient(ellipse 85% 65% at 50% 40%, rgba(168,85,247,0.24) 0%, rgba(126,34,206,0.12) 48%, rgba(5,8,20,0) 84%)",
            animation:
              "repomapSilkyFade 3.2s cubic-bezier(0.22, 1, 0.36, 1) forwards",
          }}
        />
      )}

      <style>{`
        @keyframes repomapSilkyFade {
          0% { opacity: 0; }
          38% { opacity: 0.95; }
          68% { opacity: 0.6; }
          100% { opacity: 0; }
        }
        @keyframes repomapSoftAura {
          0%, 100% { opacity: 0.55; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes repomapPanelBreathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.95; }
        }
        @keyframes repomapViewFadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-purple-400/15 bg-[#060916]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-3 text-left group"
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

          {/* Compact header search bar when viewing results */}
          {(analysis || loading) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAnalyze();
              }}
              className="flex items-center gap-2 flex-1 max-w-xl"
            >
              <input
                ref={inputRef}
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="Paste GitHub URL or owner/repo..."
                className="w-full rounded-xl bg-white/[0.04] border border-purple-400/20 px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-400/70"
              />
              <button
                type="submit"
                disabled={loading}
                className="shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
              >
                {loading ? "Mapping..." : "Analyze"}
              </button>
              {analysis && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] px-3 py-2 text-xs text-slate-300 transition-colors"
                >
                  New
                </button>
              )}
            </form>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {error && (
          <div className="max-w-3xl mx-auto rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm text-rose-200 text-center">
            {error}
          </div>
        )}

        {/* Loading View */}
        {loading && (
          <div
            className="max-w-xl mx-auto py-12"
            style={{ animation: "repomapViewFadeIn 0.55s ease-out forwards" }}
          >
            <GlowPanel>
              <div className="p-8 sm:p-10 text-center space-y-6">
                <div className="relative mx-auto h-14 w-14 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-400 border-r-fuchsia-400 animate-spin" />
                  <div className="h-3 w-3 rounded-full bg-purple-300 shadow-[0_0_16px_rgba(192,132,252,0.9)] animate-pulse" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-base sm:text-lg font-semibold text-white">
                    Mapping Repository Architecture
                  </h2>
                  <p className="text-xs text-purple-200/80 font-mono">
                    {repoUrl || "Analyzing repository..."}
                  </p>
                </div>

                <div className="space-y-2 text-left max-w-sm mx-auto pt-2">
                  {loadingSteps.map((label, idx) => {
                    const active = idx === loadingStage;
                    const done = idx < loadingStage;
                    return (
                      <div
                        key={label}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all duration-500 ${
                          active
                            ? "bg-purple-500/15 border border-purple-400/30 text-purple-100"
                            : done
                              ? "text-slate-300"
                              : "text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            done
                              ? "bg-emerald-400"
                              : active
                                ? "bg-purple-400 animate-pulse"
                                : "bg-slate-600"
                          }`}
                        />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </GlowPanel>
          </div>
        )}

        {/* Polished Landing Page */}
        {!loading && !analysis && (
          <section
            className="space-y-12"
            style={{ animation: "repomapViewFadeIn 0.55s ease-out forwards" }}
          >
            {/* Centered Hero */}
            <div className="text-center max-w-3xl mx-auto pt-4 sm:pt-8 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3.5 py-1.5 text-xs text-purple-200 shadow-[0_0_24px_rgba(168,85,247,0.2)]">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
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

              <p className="text-sm sm:text-base text-slate-300/90 max-w-2xl mx-auto leading-relaxed">
                Skip hours of digging through nested folders. Paste a public
                repository to get a clean layer breakdown, module connections,
                and a step-by-step beginner reading order in seconds.
              </p>

              {/* Prominent Hero Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAnalyze();
                }}
                className="relative max-w-2xl mx-auto pt-2"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500/35 via-fuchsia-500/25 to-indigo-500/35 blur-lg opacity-75"
                />
                <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-purple-400/35 bg-[#0a0f22]/95 p-2 shadow-2xl">
                  <div className="flex items-center gap-2.5 flex-1 px-2.5">
                    <svg
                      className="w-4 h-4 text-purple-300 shrink-0"
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
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="github.com/owner/repo or owner/repo"
                      className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(168,85,247,0.45)] transition-all cursor-pointer"
                  >
                    Map Repository
                  </button>
                </div>
              </form>

              {/* 1-Click Example & Recent Repos */}
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
                    className="rounded-lg border border-purple-400/20 bg-purple-500/[0.08] hover:border-purple-400/55 hover:bg-purple-500/20 px-3 py-1.5 font-mono text-xs text-purple-100 transition-all cursor-pointer"
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

            {/* Interactive Visual Preview Showcase */}
            <GlowPanel className="max-w-5xl mx-auto">
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      architecture-preview.map
                    </span>
                  </div>
                  <span className="rounded-md border border-purple-400/25 bg-purple-500/10 px-2.5 py-0.5 font-mono text-[11px] text-purple-200">
                    4 Layers · Auto-Detected
                  </span>
                </div>

                {/* Visual Flow Nodes */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  {[
                    {
                      layer: "Frontend",
                      title: "UI & Pages",
                      path: "src/app/page.tsx",
                      desc: "Interactive views, state, and user flows",
                      badge: "bg-purple-500/20 text-purple-200 border-purple-400/30",
                    },
                    {
                      layer: "API",
                      title: "Route Handlers",
                      path: "src/app/api/analyze",
                      desc: "Request validation & GitHub tree fetch",
                      badge: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30",
                    },
                    {
                      layer: "Logic",
                      title: "Core Engine",
                      path: "src/lib/analyzer.ts",
                      desc: "Dependency graph & module clustering",
                      badge: "bg-violet-500/20 text-violet-200 border-violet-400/30",
                    },
                    {
                      layer: "Guide",
                      title: "Reading Order",
                      path: "#1 → #4 Steps",
                      desc: "Exact files a beginner should open first",
                      badge: "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
                    },
                  ].map((card, i) => (
                    <div key={card.title} className="relative">
                      <div className="rounded-xl border border-purple-400/20 bg-black/35 p-4 space-y-2 hover:border-purple-400/50 transition-colors">
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
                        <p className="font-mono text-[11px] text-purple-300/90 truncate">
                          {card.path}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlowPanel>
          </section>
        )}

        {/* Analysis Results Dashboard */}
        {!loading && analysis && (
          <section
            className="space-y-6"
            style={{ animation: "repomapViewFadeIn 0.55s ease-out forwards" }}
          >
            {/* Project Overview + 2x2 Beginner Walkthrough */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <GlowPanel className="lg:col-span-5" tilt>
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
                      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/[0.08]">
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
              </GlowPanel>

              {/* 2x2 Beginner Walkthrough Grid */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {walkthroughSteps.map((step) => (
                  <GlowPanel key={step.num} tilt>
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
                  </GlowPanel>
                ))}
              </div>
            </div>

            {/* Modules + Inspector + Reading Order */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left / Center: Layer Filter & Module Cards */}
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
                          : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-slate-200"
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
                              : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-slate-200"
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
                              ? "opacity-95"
                              : "opacity-55 group-hover:opacity-90"
                          }`}
                          style={{
                            background:
                              "radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.26) 0%, rgba(126,34,206,0.10) 60%, rgba(5,8,20,0) 85%)",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedNodeId(node.id)}
                          className={`relative w-full h-full text-left rounded-2xl border p-4 backdrop-blur-xl transition-all ${
                            isSelected
                              ? "border-purple-400/70 bg-[#14112c]/95 shadow-[0_0_24px_rgba(168,85,247,0.22)]"
                              : `${st.border} bg-[#0b1022]/85 hover:bg-[#10142c]/90`
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

              {/* Right: Selected Module Details + Onboarding Steps */}
              <aside className="lg:col-span-5 space-y-5">
                {selectedNode && (
                  <GlowPanel>
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
                        <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
                          <p className="font-mono text-[11px] text-slate-400">
                            Files
                          </p>
                          <div className="space-y-1">
                            {getNodeFiles(selectedNode).map((file) => (
                              <div
                                key={file}
                                className="flex items-center justify-between gap-2 rounded-lg bg-black/35 border border-purple-400/15 px-2.5 py-1.5"
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
                        <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
                          <p className="font-mono text-[11px] text-slate-400">
                            Connections ({connectedEdges.length})
                          </p>
                          <div className="space-y-1">
                            {connectedEdges.slice(0, 6).map((edge, idx) => (
                              <div
                                key={edge.id || idx}
                                className="rounded-lg bg-purple-500/[0.06] border border-purple-400/10 px-2.5 py-1.5 font-mono text-[11px] text-slate-200"
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
                  </GlowPanel>
                )}

                {Array.isArray(analysis.onboardingSteps) &&
                  analysis.onboardingSteps.length > 0 && (
                    <GlowPanel>
                      <div className="p-4 space-y-2.5">
                        <h3 className="font-mono text-[11px] uppercase tracking-wider text-purple-300">
                          Where to Start Reading
                        </h3>
                        <div className="space-y-2">
                          {analysis.onboardingSteps.map((item) => (
                            <div
                              key={`${item.step}-${item.filePath}`}
                              className="rounded-xl border border-purple-400/15 bg-black/30 p-3"
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
                    </GlowPanel>
                  )}
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}