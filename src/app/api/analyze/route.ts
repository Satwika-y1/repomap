import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const maxDuration = 60;

type ValidLayer = "frontend" | "api" | "logic" | "database" | "config";

interface ArchNode {
  id: string;
  label: string;
  layer: ValidLayer;
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

interface ArchitectureResult {
  projectName: string;
  summary: string;
  techStack: string[];
  nodes: ArchNode[];
  edges: ArchEdge[];
  onboardingSteps: OnboardingStep[];
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "RepoMap-AI",
    Accept: "application/vnd.github+json",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  try {
    const trimmed = input.trim().replace(/\/+$/, "");
    if (!trimmed) return null;

    if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      const [owner, rawRepo] = trimmed.split("/");
      return { owner, repo: rawRepo.replace(/\.git$/i, "") };
    }

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (!/^(www\.)?github\.com$/i.test(parsed.hostname)) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0].trim();
    const repo = parts[1].replace(/\.git$/i, "").trim();
    if (!owner || !repo) return null;

    return { owner, repo };
  } catch {
    return null;
  }
}

function isNoisePath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  const baseName = lower.split("/").pop() || "";

  const ignoredDirs = [
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
    "__pycache__/",
    ".devcontainer/",
    ".github/",
    ".vscode/",
  ];

  const ignoredExtensions = [
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".ai",
    ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".pdf", ".zip",
    ".lock", ".css", ".scss", ".map", ".min.js",
  ];

  if (ignoredDirs.some((dir) => lower.includes(dir))) return true;
  if (lower.startsWith(".eslint-plugin-local/")) return true;
  if (ignoredExtensions.some((ext) => lower.endsWith(ext))) return true;
  if (
    baseName === "package-lock.json" ||
    baseName === "yarn.lock" ||
    baseName === "pnpm-lock.yaml" ||
    baseName === "license" ||
    baseName === "license.txt" ||
    baseName === "license.md" ||
    baseName === "changelog.md" ||
    baseName === "contributing.md" ||
    baseName === "agents.md"
  ) {
    return true;
  }

  return false;
}

function selectHighSignalFiles(paths: string[]): string[] {
  const validPaths = paths.filter((p) => !isNoisePath(p));

  const scoreFile = (filePath: string): number => {
    const lower = filePath.toLowerCase();
    const fileName = lower.split("/").pop() || "";
    let score = 0;

    if (/^(package\.json|pyproject\.toml|cargo\.toml|go\.mod|requirements\.txt)$/.test(fileName)) {
      score += 90;
    }
    if (/^(index|main|app|server|route|mod|lib)\.(ts|tsx|js|jsx|py|go|rs)$/.test(fileName)) {
      score += 80;
    }
    if (/^(src|app|packages|lib|server|api)\//.test(lower)) {
      score += 45;
    }
    if (/schema\.prisma$/.test(lower)) {
      score += 70;
    }
    if (/\.(ts|tsx|js|jsx|py|go|java|rs|sql)$/.test(fileName)) {
      score += 25;
    }
    if (/^readme\.md$/i.test(fileName)) {
      score += 20;
    }
    return score;
  };

  return [...validPaths]
    .sort((a, b) => scoreFile(b) - scoreFile(a) || a.localeCompare(b))
    .slice(0, 12);
}

function normalizeLayer(raw: string | undefined, fallbackIndex = 0): ValidLayer {
  const lower = (raw || "").toLowerCase().trim();
  if (/(front|ui|web|client|component|page|view)/.test(lower)) return "frontend";
  if (/(api|route|controller|endpoint|graphql|rpc)/.test(lower)) return "api";
  if (/(db|data|prisma|migration|model|schema|store|storage)/.test(lower)) return "database";
  if (/(config|script|infra|deploy|docker|tool)/.test(lower)) return "config";
  if (/(logic|core|src|lib|service|engine|util|pkg|package)/.test(lower)) return "logic";

  const fallbacks: ValidLayer[] = ["logic", "frontend", "api", "config", "database"];
  return fallbacks[fallbackIndex % fallbacks.length];
}

function describeOnboardingStep(filePath: string, stepIndex: number): string {
  const lower = filePath.toLowerCase();
  const base = filePath.split("/").pop() || filePath;

  if (base === "package.json") {
    return "Inspect dependencies, scripts, and entry exports to see how the project runs and builds.";
  }
  if (/^(pyproject\.toml|cargo\.toml|go\.mod|requirements\.txt)$/.test(base)) {
    return "Check project dependencies, runtime requirements, and core package setup.";
  }
  if (/schema\.prisma$/.test(lower)) {
    return "Review data models and database relations before tracing queries.";
  }
  if (/(index|main|app|server|route)\.(ts|tsx|js|jsx|py|go|rs)$/.test(base)) {
    return "Trace the primary execution entrypoint and public exports/routes from here.";
  }
  if (/^readme\.md$/i.test(base)) {
    return "Read the high-level project overview, setup steps, and usage examples.";
  }
  return stepIndex === 0
    ? "Start here to see core types, main logic, or key module structure."
    : "Follow this file next to see how supporting modules connect and share data.";
}

function buildFallbackArchitecture(
  owner: string,
  repo: string,
  allPaths: string[],
  selectedFiles: string[],
  reasonNote?: string
): ArchitectureResult {
  const cleanPaths = allPaths.filter((p) => !isNoisePath(p));
  const sourcePaths = cleanPaths.length > 0 ? cleanPaths : allPaths;

  const folderCounts = new Map<string, string[]>();
  for (const filePath of sourcePaths) {
    const parts = filePath.split("/").filter(Boolean);
    if (parts.length > 1) {
      const top = parts[0];
      if (!top.startsWith(".")) {
        const list = folderCounts.get(top) || [];
        list.push(filePath);
        folderCounts.set(top, list);
      }
    }
  }

  const rankedFolders = Array.from(folderCounts.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  const nodes: ArchNode[] = rankedFolders.map(([folder, files], idx) => {
    const layer = normalizeLayer(folder, idx);
    return {
      id: `node-${idx + 1}`,
      label: folder,
      layer,
      description: `${files.length} files under ${folder}/ — inspect this area for ${
        layer === "frontend"
          ? "UI components, pages, or client state"
          : layer === "api"
          ? "request handlers, routes, or external interfaces"
          : layer === "database"
          ? "schemas, models, or data persistence"
          : layer === "config"
          ? "build scripts, environment setup, or tooling"
          : "core implementation logic and helpers"
      }.`,
      files: files.slice(0, 6),
      x: 80 + (idx % 3) * 290,
      y: 90 + Math.floor(idx / 3) * 240,
    };
  });

  const edges: ArchEdge[] = nodes.slice(1).map((node, idx) => ({
    id: `edge-${idx + 1}`,
    source: nodes[idx].id,
    target: node.id,
    label: "connects to",
  }));

  const stepsSource = (selectedFiles.length > 0 ? selectedFiles : sourcePaths)
    .filter(Boolean)
    .slice(0, 3);

  const note = reasonNote
    ? `AI note: ${reasonNote.slice(0, 140)}`
    : "GEMINI_API_KEY not found in environment";

  return {
    projectName: `${owner}/${repo}`,
    summary: `Structural map of ${owner}/${repo} across ${allPaths.length} files (${note}).`,
    techStack: ["GitHub Repository", "Multi-File Codebase"],
    nodes:
      nodes.length > 0
        ? nodes
        : [
            {
              id: "root",
              label: repo,
              layer: "logic",
              description: `Core files in ${owner}/${repo}.`,
              files: stepsSource,
              x: 200,
              y: 150,
            },
          ],
    edges,
    onboardingSteps: stepsSource.map((filePath, i) => ({
      step: i + 1,
      filePath,
      reason: describeOnboardingStep(filePath, i),
    })),
  };
}

function sanitizeArchitecture(
  raw: unknown,
  owner: string,
  repo: string,
  selectedFiles: string[]
): ArchitectureResult | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<ArchitectureResult>;

  if (!Array.isArray(data.nodes) || data.nodes.length === 0) return null;

  const seenNodeIds = new Set<string>();
  const nodes: ArchNode[] = data.nodes.map((node, idx) => {
    let id = String(node.id || `node-${idx + 1}`).trim();
    if (!id || seenNodeIds.has(id)) id = `node-${idx + 1}`;
    seenNodeIds.add(id);

    return {
      id,
      label: String(node.label || `Module ${idx + 1}`),
      layer: normalizeLayer(node.layer, idx),
      description: String(node.description || "Core repository module."),
      files: Array.isArray(node.files) ? node.files.map(String).filter(Boolean).slice(0, 8) : [],
      x: typeof node.x === "number" && Number.isFinite(node.x) ? node.x : 80 + (idx % 3) * 290,
      y: typeof node.y === "number" && Number.isFinite(node.y) ? node.y : 90 + Math.floor(idx / 3) * 240,
    };
  });

  const seenEdges = new Set<string>();
  const edges: ArchEdge[] = Array.isArray(data.edges)
    ? data.edges
        .filter((e) => {
          if (!e) return false;
          const src = String(e.source);
          const tgt = String(e.target);
          const pair = `${src}->${tgt}`;
          if (!seenNodeIds.has(src) || !seenNodeIds.has(tgt) || src === tgt || seenEdges.has(pair)) {
            return false;
          }
          seenEdges.add(pair);
          return true;
        })
        .map((e, idx) => ({
          id: String(e.id || `edge-${idx + 1}`),
          source: String(e.source),
          target: String(e.target),
          label: String(e.label || "connects to"),
        }))
    : [];

  const rawSteps =
    Array.isArray(data.onboardingSteps) && data.onboardingSteps.length > 0
      ? data.onboardingSteps.slice(0, 3).map((s, idx) => ({
          filePath: String(s.filePath || selectedFiles[idx] || "").trim(),
          reason: String(s.reason || describeOnboardingStep(String(s.filePath || ""), idx)),
        }))
      : selectedFiles.slice(0, 3).map((filePath, idx) => ({
          filePath: filePath.trim(),
          reason: describeOnboardingStep(filePath, idx),
        }));

  const onboardingSteps: OnboardingStep[] = rawSteps
    .filter((s) => s.filePath.length > 0)
    .map((s, idx) => ({
      step: idx + 1,
      filePath: s.filePath,
      reason: s.reason,
    }));

  return {
    projectName: String(data.projectName || `${owner}/${repo}`),
    summary: String(data.summary || `Architectural overview of ${owner}/${repo}.`),
    techStack:
      Array.isArray(data.techStack) && data.techStack.length > 0
        ? data.techStack.map(String).filter(Boolean).slice(0, 8)
        : ["GitHub Repository"],
    nodes,
    edges,
    onboardingSteps,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const repoUrl = typeof body?.repoUrl === "string" ? body.repoUrl : "";

    if (!repoUrl.trim()) {
      return NextResponse.json({ error: "Repository URL is required." }, { status: 400 });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid GitHub URL. Use https://github.com/owner/repo or owner/repo." },
        { status: 400 }
      );
    }

    const { owner, repo } = parsed;
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    const ghHeaders = getGitHubHeaders();

    const repoMetaRes = await fetch(
      `https://api.github.com/repos/${encodedOwner}/${encodedRepo}`,
      {
        headers: ghHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!repoMetaRes.ok) {
      const status = repoMetaRes.status === 403 || repoMetaRes.status === 429 ? 429 : 404;
      const message =
        status === 429
          ? "GitHub API rate limit reached. Add GITHUB_TOKEN in Vercel environment variables."
          : "Repository not found or is private. Please use a public GitHub URL.";
      return NextResponse.json({ error: message }, { status });
    }

    const repoMeta = await repoMetaRes.json();
    const defaultBranch = repoMeta.default_branch || "main";

    const treeRes = await fetch(
      `https://api.github.com/repos/${encodedOwner}/${encodedRepo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
      {
        headers: ghHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!treeRes.ok) {
      return NextResponse.json({ error: "Failed to fetch repository file tree." }, { status: 500 });
    }

    const treeData = await treeRes.json();
    const allFilePaths: string[] = (treeData.tree || [])
      .filter((item: { type?: string; path?: string }) => item.type === "blob" && typeof item.path === "string")
      .map((item: { path: string }) => item.path);

    const selectedFiles = selectHighSignalFiles(allFilePaths);

    const fileContents = await Promise.all(
      selectedFiles.map(async (filePath) => {
        try {
          const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
          const rawUrl = `https://raw.githubusercontent.com/${encodedOwner}/${encodedRepo}/${encodeURIComponent(defaultBranch)}/${encodedPath}`;
          const res = await fetch(rawUrl, {
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) return null;
          const text = await res.text();
          return `--- FILE: ${filePath} ---\n${text.slice(0, 2500)}`;
        } catch {
          return null;
        }
      })
    );

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        buildFallbackArchitecture(owner, repo, allFilePaths, selectedFiles)
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const codeContext = fileContents.filter(Boolean).join("\n\n");
    const directoryOverview = allFilePaths
      .filter((p) => !isNoisePath(p))
      .slice(0, 120)
      .join("\n");

    const prompt = `You are a Principal Software Architect analyzing a GitHub repository (${owner}/${repo}) to onboard a new software engineering intern.

Directory Tree (up to 120 non-noise files):
${directoryOverview}

Key File Contents:
${codeContext}

Analyze this codebase and generate:
1. A "summary" written as a crisp 4-step mini-tutorial for a developer opening this repo for the first time. Put each step on a new line starting with "Step 1:", "Step 2:", "Step 3:", "Step 4:" covering: (1) What the app does & core stack, (2) How a user action or request flows through the code, (3) Where core logic & data live, and (4) Fastest way to run or modify it. Keep each step to 1-2 short sentences. Also include the detected tech stack.
2. Architectural nodes representing logical modules/layers (strictly one of: frontend, api, logic, database, config). Position them cleanly on a 2D canvas (x between 50 and 900, y between 50 and 600) so nodes do not overlap.
3. Directed edges showing how data or requests flow between those nodes.
4. The top 3 entry-point files a new developer should read first, in order, with concrete "reason" guidance on what to look for in each file.`;

    const modelsToTry = Array.from(
      new Set([
        process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
      ])
    );

    let lastGeminiError = "";

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                projectName: { type: Type.STRING },
                summary: { type: Type.STRING },
                techStack: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING },
                      layer: {
                        type: Type.STRING,
                        description: "One of: frontend, api, logic, database, config",
                      },
                      description: { type: Type.STRING },
                      files: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                    },
                    required: ["id", "label", "layer", "description", "files", "x", "y"],
                  },
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      source: { type: Type.STRING },
                      target: { type: Type.STRING },
                      label: { type: Type.STRING },
                    },
                    required: ["id", "source", "target", "label"],
                  },
                },
                onboardingSteps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      step: { type: Type.NUMBER },
                      filePath: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ["step", "filePath", "reason"],
                  },
                },
              },
              required: ["projectName", "summary", "techStack", "nodes", "edges", "onboardingSteps"],
            },
          },
        });

        const rawText = (response.text || "{}")
          .replace(/^```json\s*/i, "")
          .replace(/```$/i, "")
          .trim();

        const parsedJson = JSON.parse(rawText);
        const sanitized = sanitizeArchitecture(parsedJson, owner, repo, selectedFiles);
        if (!sanitized) {
          throw new Error("Invalid architecture JSON returned by model.");
        }

        return NextResponse.json(sanitized);
      } catch (apiErr) {
        lastGeminiError = apiErr instanceof Error ? apiErr.message : String(apiErr);
        console.warn(`Model ${modelName} failed:`, lastGeminiError);
      }
    }

    return NextResponse.json(
      buildFallbackArchitecture(owner, repo, allFilePaths, selectedFiles, lastGeminiError)
    );
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error analyzing repository.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
