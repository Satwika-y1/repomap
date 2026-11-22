import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, "");
    const match = cleaned.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

function selectHighSignalFiles(paths: string[]): string[] {
  const ignoredExtensions = [
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".pdf", ".zip",
    ".lock", ".css", ".scss", ".map"
  ];
  const ignoredDirs = ["node_modules/", ".git/", "dist/", "build/", ".next/", "coverage/", "__pycache__/"];

  const validPaths = paths.filter((p) => {
    const lower = p.toLowerCase();
    if (ignoredDirs.some((dir) => lower.includes(dir))) return false;
    if (ignoredExtensions.some((ext) => lower.endsWith(ext))) return false;
    if (lower.endsWith("package-lock.json") || lower.endsWith("yarn.lock")) return false;
    return true;
  });

  const priorityPatterns = [
    /^readme\.md$/i,
    /^package\.json$/i,
    /^requirements\.txt$/i,
    /^pyproject\.toml$/i,
    /^go\.mod$/i,
    /^cargo\.toml$/i,
    /schema\.prisma$/i,
    /(index|main|app|server|route)\.(ts|tsx|js|jsx|py|go)$/i,
  ];

  const prioritized: string[] = [];
  const secondary: string[] = [];

  for (const file of validPaths) {
    if (priorityPatterns.some((regex) => regex.test(file.split("/").pop() || ""))) {
      prioritized.push(file);
    } else if (/\.(ts|tsx|js|jsx|py|go|java|rs|sql)$/i.test(file)) {
      secondary.push(file);
    }
  }

  return [...prioritized, ...secondary].slice(0, 12);
}

function buildFallbackArchitecture(owner: string, repo: string, allPaths: string[], selectedFiles: string[]) {
  const topFolders = Array.from(
    new Set(
      allPaths
        .map((p) => p.split("/")[0])
        .filter((part) => part && !part.startsWith("."))
    )
  ).slice(0, 5);

  const nodes = topFolders.map((folder, idx) => ({
    id: `node-${idx + 1}`,
    label: folder,
    layer: idx === 0 ? "frontend" : idx === 1 ? "api" : idx === 2 ? "logic" : "config",
    description: `Modules and files organized under ${folder}/ in ${owner}/${repo}.`,
    files: allPaths.filter((p) => p.startsWith(`${folder}/`)).slice(0, 5),
    x: 80 + (idx % 3) * 290,
    y: 90 + Math.floor(idx / 3) * 240,
  }));

  const edges = nodes.slice(1).map((node, idx) => ({
    id: `edge-${idx + 1}`,
    source: nodes[idx].id,
    target: node.id,
    label: "relates to",
  }));

  return {
    projectName: `${owner}/${repo}`,
    summary: `Structural overview of ${owner}/${repo} generated from ${allPaths.length} repository files (fallback graph used due to temporary API demand).`,
    techStack: ["GitHub Repository", "Multi-File Codebase"],
    nodes: nodes.length
      ? nodes
      : [
          {
            id: "root",
            label: repo,
            layer: "config",
            description: "Repository root structure.",
            files: selectedFiles.slice(0, 5),
            x: 200,
            y: 150,
          },
        ],
    edges,
    onboardingSteps: selectedFiles.slice(0, 3).map((filePath, i) => ({
      step: i + 1,
      filePath,
      reason: "High-signal entry or configuration file in the repository.",
    })),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { repoUrl } = await req.json();
    if (!repoUrl) {
      return NextResponse.json({ error: "Repository URL is required." }, { status: 400 });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid GitHub repository URL." }, { status: 400 });
    }

    const { owner, repo } = parsed;

    const repoMetaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { "User-Agent": "RepoMap-AI" },
    });

    if (!repoMetaRes.ok) {
      return NextResponse.json(
        { error: "Repository not found or is private. Please use a public GitHub URL." },
        { status: 404 }
      );
    }

    const repoMeta = await repoMetaRes.json();
    const defaultBranch = repoMeta.default_branch || "main";

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers: { "User-Agent": "RepoMap-AI" } }
    );

    if (!treeRes.ok) {
      return NextResponse.json({ error: "Failed to fetch repository file tree." }, { status: 500 });
    }

    const treeData = await treeRes.json();
    const allFilePaths: string[] = (treeData.tree || [])
      .filter((item: { type: string }) => item.type === "blob")
      .map((item: { path: string }) => item.path);

    const selectedFiles = selectHighSignalFiles(allFilePaths);
    const fileContents = await Promise.all(
      selectedFiles.map(async (filePath) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${filePath}`;
          const res = await fetch(rawUrl);
          if (!res.ok) return null;
          const text = await res.text();
          return `--- FILE: ${filePath} ---\n${text.slice(0, 2500)}`;
        } catch {
          return null;
        }
      })
    );

    const codeContext = fileContents.filter(Boolean).join("\n\n");
    const directoryOverview = allFilePaths.slice(0, 120).join("\n");

    const prompt = `You are a Principal Software Architect analyzing a GitHub repository (${owner}/${repo}) to onboard a new software engineering intern.

Directory Tree (up to 120 files):
${directoryOverview}

Key File Contents:
${codeContext}

Analyze this codebase and generate:
1. A clear project summary and detected tech stack.
2. Architectural nodes representing logical modules/layers (UI/Frontend, API/Routes, Services/Logic, Database/Storage, Config/External). Position them cleanly on a 2D canvas (x between 50 and 900, y between 50 and 600) so nodes do not overlap.
3. Directed edges showing how data or requests flow between those nodes.
4. The top 3 entry-point files a new developer should read first, in order.`;

    const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    for (let attempt = 1; attempt <= 2; attempt++) {
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

        const architectureData = JSON.parse(response.text || "{}");
        return NextResponse.json(architectureData);
      } catch (apiErr) {
        if (attempt === 2) {
          console.warn("Gemini API temporarily unavailable, returning fallback graph:", apiErr);
          return NextResponse.json(
            buildFallbackArchitecture(owner, repo, allFilePaths, selectedFiles)
          );
        }
        await new Promise((r) => setTimeout(r, 700));
      }
    }

    return NextResponse.json(
      buildFallbackArchitecture(owner, repo, allFilePaths, selectedFiles)
    );
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error analyzing repository.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
