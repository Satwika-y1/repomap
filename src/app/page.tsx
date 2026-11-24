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

const LAYER_STYLES: Record<
  string,
  { badge: string; border: string; pillActive: string }
> = {
  frontend: {
    badge: "bg-purple-500/15 text-purple-200 border-purple-400/25",
    border: "border-purple-400/20 hover:border-purple-300/45",
    pillActive: "bg-purple-500/25 text-purple-100 border-purple-400/50",
  },
  api: {
    badge: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/25",
    border: "border-fuchsia-400/20 hover:border-fuchsia-300/45",
    pillActive: "bg-fuchsia-500/25 text-fuchsia-100 border-fuchsia-400/50",
  },
  logic: {
    badge: "bg-violet-500/15 text-violet-200 border-violet-400/25",
    border: "border-violet-400/20 hover:border-violet-300/45",
    pillActive: "bg-violet-500/25 text-violet-100 border-violet-400/50",
  },
  database: {
    badge: "bg-indigo-500/15 text-indigo-200 border-indigo-400/25",
    border: "border-indigo-400/20 hover:border-indigo-300/45",
    pillActive: "bg-indigo-500/25 text-indigo-100 border-indigo-400/50",
  },
  config: {
    badge: "bg-slate-500/15 text-slate-200 border-slate-400/25",
    border: "border-slate-400/20 hover:border-slate-300/45",
    pillActive: "bg-slate-500/25 text-slate-100 border-slate-400/50",
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

function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateY(-2px)`;
  };

  const handleLeave = () => {
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
      className={`transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
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
          saved.filter((x): x is string => typeof x === "string").slice(0, 5)
        );
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Trigger soft purple fade both when loading appears AND when it disappears
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
    const t = window.setTimeout(() => setShowPurpleFade(false), 2600);
    return () => window.clearTimeout(t);
  }, [showPurpleFade, fadeKey]);

  const saveRecentRepo = (url: string) => {
    setRecentRepos((prev) => {
      const next = [url, ...prev.filter((item) => item !== url)].slice(0, 5);
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
      return `${analysis.projectName} maps ${count} core modules across its codebase—start with Step 1 below to see how requests flow from entry to logic.`;
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

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-purple-500/30">
      {/* Soft purple ambient light behind panels that gently breathes/reappears */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 h-[440px] w-[820px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.14) 0%, rgba(109,40,217,0.06) 52%, rgba(6,9,19,0) 78%)",
            animation: "repomapSoftAura 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-8 right-10 h-[360px] w-[540px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.11) 0%, rgba(126,34,206,0.04) 55%, rgba(6,9,19,0) 76%)",
            animation: "repomapSoftAura 11s ease-in-out 2.5s infinite",
          }}
        />
      </div>

      {/* Smooth, soft purple fade-in & fade-out on loading appear and disappear */}
      {showPurpleFade && (
        <div
          key={fadeKey}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            background:
              "radial-gradient(ellipse 78% 58% at 50% 38%, rgba(168,85,247,0.13) 0%, rgba(126,34,206,0.06) 48%, rgba(6,9,19,0) 82%)",
            animation: "repomapGentleFade 2.6s ease-in-out forwards",
          }}
        />
      )}

      <style>{`
        @keyframes repomapGentleFade {
          0% { opacity: 0; }
          32% { opacity: 1; }
          68% { opacity: 0.45; }
          100% { opacity: 0; }
        }
        @keyframes repomapSoftAura {
          0%, 100% { opacity: 0.35; transform: scale(0.98); }
          50% { opacity: 0.9; transform: scale(1.04); }
        }
      `}</style>

      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#070b16]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center font-mono text-xs font-bold text-purple-200">
              RM
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white">
                RepoMap AI
              </h1>
              <p className="text-[11px] text-slate-400">
                Visual architecture &amp; beginner walkthrough
              </p>
            </div>
          </div>

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
              placeholder="Paste GitHub URL or owner/repo (e.g. shadcn-ui/taxonomy)"
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.1] px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-400/60"
            />
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 text-xs sm:text-sm font-medium text-white transition-colors"
            >
              {loading ? "Mapping..." : "Analyze"}
            </button>
            {analysis && (
              <button
                type="button"
                onClick={handleReset}
                className="shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.07] px-3 py-2 text-xs text-slate-300 transition-colors"
              >
                Reset
              </button>
            )}
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-purple-400/20 bg-white/[0.025] backdrop-blur-md p-10 text-center space-y-2.5">
            <div className="inline-block h-6 w-6 rounded-full border-2 border-purple-400/30 border-t-purple-300 animate-spin" />
            <p className="text-sm font-medium text-purple-100">
              Mapping repository structure...
            </p>
            <p className="text-xs text-slate-400">
              Organizing modules, layers, and beginner walkthrough steps
            </p>
          </div>
        )}

        {!loading && !analysis && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 via-white/[0.02] to-transparent backdrop-blur-md p-6 sm:p-8">
              <span className="inline-block rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1 font-mono text-[11px] text-purple-200 mb-3">
                Beginner-Friendly Repo Explorer
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Understand any codebase before reading every file
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed mb-5">
                Enter a public GitHub repository to generate a module map, layer
                breakdown, starter reading order, and a 2×2 orientation guide.
              </p>

              {recentRepos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mr-1">
                    Recent:
                  </span>
                  {recentRepos.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setRepoUrl(item);
                        void handleAnalyze(item);
                      }}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] hover:border-purple-400/40 hover:bg-purple-500/10 px-2.5 py-1 text-xs text-slate-200 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {walkthroughSteps.map((step) => (
                <TiltCard
                  key={step.num}
                  className="rounded-2xl border border-purple-400/15 bg-white/[0.025] backdrop-blur-md p-4"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="h-6 min-w-6 px-1.5 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center font-mono text-[11px] font-semibold text-purple-200">
                      {step.num}
                    </span>
                    <h3 className="text-sm font-medium text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.detail}
                  </p>
                </TiltCard>
              ))}
            </div>
          </section>
        )}

        {!loading && analysis && (
          <section className="space-y-6">
            {/* Project Overview + 2x2 Beginner Walkthrough */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <TiltCard className="lg:col-span-5 rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-500/12 via-violet-500/[0.05] to-transparent backdrop-blur-md p-5 flex flex-col justify-between">
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
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.07]">
                      {analysis.techStack.slice(0, 8).map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 font-mono text-[11px] text-purple-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
              </TiltCard>

              {/* 2x2 Beginner Walkthrough Grid */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {walkthroughSteps.map((step) => (
                  <TiltCard
                    key={step.num}
                    className="rounded-2xl border border-purple-400/15 bg-white/[0.025] hover:border-purple-400/35 backdrop-blur-md p-4"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="h-5 min-w-5 px-1.5 rounded-md bg-purple-500/20 border border-purple-400/30 flex items-center justify-center font-mono text-[10px] font-semibold text-purple-200">
                        {step.num}
                      </span>
                      <h3 className="text-xs sm:text-sm font-medium text-white">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300/90 leading-relaxed">
                      {step.detail}
                    </p>
                  </TiltCard>
                ))}
              </div>
            </div>

            {/* Modules + Inspector + Reading Order */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left / Center: Layer Filter & Module Cards */}
              <div className="lg:col-span-7 space-y-3">
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
                          ? "bg-purple-500/25 text-purple-100 border-purple-400/50"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredNodes.map((node) => {
                    const st = getLayerStyle(node.layer);
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`text-left rounded-2xl border p-4 backdrop-blur-md transition-all ${
                          isSelected
                            ? "border-purple-400/60 bg-purple-500/12"
                            : `${st.border} bg-white/[0.025] hover:bg-white/[0.04]`
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
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {node.role ||
                            node.description ||
                            "Core repository module"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Selected Module Details + Onboarding Steps */}
              <aside className="lg:col-span-5 space-y-4">
                {selectedNode && (
                  <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] backdrop-blur-md p-4 space-y-3">
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
                      <div className="space-y-1.5 pt-2 border-t border-white/[0.07]">
                        <p className="font-mono text-[11px] text-slate-400">
                          Files
                        </p>
                        <div className="space-y-1">
                          {getNodeFiles(selectedNode).map((file) => (
                            <div
                              key={file}
                              className="flex items-center justify-between gap-2 rounded-lg bg-black/30 border border-white/[0.06] px-2.5 py-1.5"
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
                      <div className="space-y-1.5 pt-2 border-t border-white/[0.07]">
                        <p className="font-mono text-[11px] text-slate-400">
                          Connections ({connectedEdges.length})
                        </p>
                        <div className="space-y-1">
                          {connectedEdges.slice(0, 6).map((edge, idx) => (
                            <div
                              key={edge.id || idx}
                              className="rounded-lg bg-white/[0.02] px-2.5 py-1.5 font-mono text-[11px] text-slate-300"
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
                )}

                {Array.isArray(analysis.onboardingSteps) &&
                  analysis.onboardingSteps.length > 0 && (
                    <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] backdrop-blur-md p-4 space-y-2.5">
                      <h3 className="font-mono text-[11px] uppercase tracking-wider text-purple-300">
                        Where to Start Reading
                      </h3>
                      <div className="space-y-2">
                        {analysis.onboardingSteps.map((item) => (
                          <div
                            key={`${item.step}-${item.filePath}`}
                            className="rounded-xl border border-white/[0.06] bg-black/25 p-3"
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
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {item.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
