import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 35;

interface AskNodeSummary {
  id: string;
  label?: string;
  name?: string;
  layer?: string;
  role?: string;
  description?: string;
  files?: string[];
  filePath?: string;
}

interface AskEdgeSummary {
  source?: string;
  target?: string;
  from?: string;
  to?: string;
  label?: string;
}

interface AskOnboardingSummary {
  step: number;
  filePath: string;
  reason: string;
}

interface AskRequestBody {
  question?: string;
  analysis?: {
    projectName?: string;
    summary?: string;
    techStack?: string[];
    nodes?: AskNodeSummary[];
    edges?: AskEdgeSummary[];
    onboardingSteps?: AskOnboardingSummary[];
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AskRequestBody;
    const question = String(body.question || "").trim();
    const analysis = body.analysis;

    if (!question) {
      return NextResponse.json(
        { error: "Please enter a question about the repository." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      "";

    const nodes = Array.isArray(analysis?.nodes) ? analysis.nodes.slice(0, 24) : [];
    const edges = Array.isArray(analysis?.edges) ? analysis.edges.slice(0, 30) : [];
    const steps = Array.isArray(analysis?.onboardingSteps)
      ? analysis.onboardingSteps.slice(0, 8)
      : [];
    const projectName = analysis?.projectName || "this repository";

    if (!apiKey) {
      const matched = nodes.filter((n) => {
        const hay = `${n.label || ""} ${n.name || ""} ${n.layer || ""} ${n.role || ""} ${n.description || ""} ${(n.files || []).join(" ")}`.toLowerCase();
        return question
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 3)
          .some((w) => hay.includes(w));
      });

      const topMatches = (matched.length > 0 ? matched : nodes).slice(0, 2);
      const answerText =
        topMatches.length > 0
          ? `Based on ${projectName}'s architecture map, start with ${topMatches
              .map((m) => `**${m.label || m.name || m.id}** (${m.layer || "module"}): ${m.role || m.description || "core repository area"}`)
              .join("; ")}.${steps[0] ? ` For a beginner walkthrough, check \`${steps[0].filePath}\` first.` : ""}`
          : `${projectName} has ${nodes.length} mapped modules. Select any module card to inspect its files and connections.`;

      return NextResponse.json({
        answer: answerText,
        referencedNodeIds: topMatches.map((m) => m.id).filter(Boolean),
        referencedFiles: topMatches
          .flatMap((m) => m.files || (m.filePath ? [m.filePath] : []))
          .slice(0, 4),
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const compactContext = {
      projectName,
      summary: analysis?.summary || "",
      techStack: Array.isArray(analysis?.techStack) ? analysis.techStack.slice(0, 12) : [],
      nodes: nodes.map((n) => ({
        id: n.id,
        title: n.label || n.name || n.id,
        layer: n.layer || "logic",
        role: n.role || n.description || "",
        files: (n.files || (n.filePath ? [n.filePath] : [])).slice(0, 5),
      })),
      edges: edges.map((e) => ({
        from: e.source || e.from || "",
        to: e.target || e.to || "",
        label: e.label || "",
      })),
      onboardingSteps: steps,
    };

    const prompt = `You are RepoMap AI's friendly codebase assistant helping a developer or student understand ${projectName}.
Answer the user's question clearly, concisely, and accurately using ONLY the provided repository architecture context.
If a module or file is relevant, mention its exact name or path. Keep the answer to 2-4 crisp sentences.

Also return valid JSON with this exact shape:
{
  "answer": "string",
  "referencedNodeIds": ["node-id-1"],
  "referencedFiles": ["path/to/file.ts"]
}

Repository Context:
${JSON.stringify(compactContext)}

User Question:
${question}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = (response.text || "").trim();
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as {
        answer?: string;
        referencedNodeIds?: string[];
        referencedFiles?: string[];
      };

      const validIds = new Set(nodes.map((n) => n.id));
      const safeNodeIds = Array.isArray(parsed.referencedNodeIds)
        ? parsed.referencedNodeIds.filter((id) => validIds.has(id)).slice(0, 3)
        : [];

      const safeFiles = Array.isArray(parsed.referencedFiles)
        ? parsed.referencedFiles.filter((f): f is string => typeof f === "string").slice(0, 4)
        : [];

      return NextResponse.json({
        answer:
          parsed.answer?.trim() ||
          "I reviewed the mapped architecture, though I couldn't form a detailed answer. Try asking about a specific layer or feature.",
        referencedNodeIds: safeNodeIds,
        referencedFiles: safeFiles,
      });
    } catch {
      return NextResponse.json({
        answer: cleaned || "I couldn't parse a structured answer for that question.",
        referencedNodeIds: [],
        referencedFiles: [],
      });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to answer question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
