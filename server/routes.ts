import type { Express } from "express";
import { createServer, type Server } from "http";
import { getSupabase, getSupabaseEnvStatus } from "./supabase.js";
import { getStorage } from "./storage.js";
import {
  getWorkspaceContext,
  getWorkspacePromptContext,
  listWorkspaceFolders,
  writeWorkspaceDocs,
} from "./workspace.js";

const ollamaHost = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const preferredOllamaModel = process.env.OLLAMA_MODEL;
let ollamaClientPromise: Promise<{
  chat: (options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    format: string;
  }) => Promise<{ message: { content: string } }>;
}> | null = null;
let cachedOllamaModel: string | null = null;

async function getOllamaClient() {
  if (!ollamaClientPromise) {
    ollamaClientPromise = import("ollama").then(
      ({ Ollama }) => new Ollama({ host: ollamaHost }),
    );
  }

  return ollamaClientPromise;
}

async function resolveOllamaModel() {
  if (cachedOllamaModel) return cachedOllamaModel;

  const response = await fetch(new URL("/api/tags", ollamaHost));
  if (!response.ok) {
    throw new Error(`Failed to load Ollama models from ${ollamaHost}`);
  }

  const body = (await response.json()) as {
    models?: Array<{ name?: string }>;
  };
  const modelNames = (body.models ?? [])
    .map((model) => model.name)
    .filter((name): name is string => !!name);

  if (modelNames.length === 0) {
    throw new Error(`No Ollama models are installed at ${ollamaHost}`);
  }

  if (preferredOllamaModel) {
    const matched = modelNames.find((name) => name === preferredOllamaModel);
    if (!matched) {
      throw new Error(
        `OLLAMA_MODEL is set to "${preferredOllamaModel}", but that model is not installed. Available models: ${modelNames.join(", ")}`,
      );
    }
    cachedOllamaModel = matched;
    return matched;
  }

  const preferredPatterns = [
    /^exaone3\.5(?::|$)/i,
    /^llama3\.1(?::|$)/i,
    /^qwen2\.5-coder(?::|$)/i,
  ];

  for (const pattern of preferredPatterns) {
    const matched = modelNames.find((name) => pattern.test(name));
    if (matched) {
      cachedOllamaModel = matched;
      return matched;
    }
  }

  cachedOllamaModel = modelNames[0];
  return cachedOllamaModel;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;

  if (/row-level security|permission denied/i.test(message)) {
    return `${message} Add SUPABASE_SERVICE_ROLE_KEY in Vercel or update the RLS policy for anon access.`;
  }

  return message;
}

function sendMissingSupabaseEnv(res: Express["response"], action: string) {
  const status = getSupabaseEnvStatus();
  console.error("[Vercel] Supabase env check:", status);

  return res.status(503).json({
    message: `Failed to ${action}`,
    error:
      "SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY must be set in Vercel Environment Variables. Redeploy after saving.",
    debug: status,
  });
}

const WORKSPACE_ANALYSIS_SECTIONS = [
  { key: "features", label: "주요 기능" },
  { key: "userValue", label: "사용자 가치" },
  { key: "monetization", label: "수익화 전략" },
  { key: "implementation", label: "구현 구조" },
  { key: "roadmap", label: "고도화 로드맵" },
  { key: "risks", label: "리스크/검증" },
] as const;

function sanitizeNodeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "node";
}

function normalizeGeneratedMindMapData(raw: any, rootLabel: string) {
  const rawNodes = Array.isArray(raw?.nodes) ? raw.nodes : [];
  const nodes: Array<{
    id: string;
    type: string;
    position?: { x?: number; y?: number };
    data: Record<string, unknown>;
    parent?: string;
  }> = rawNodes.map((node: any, index: number) => {
    const label =
      node?.data?.label ??
      node?.data?.text ??
      node?.data?.title ??
      node?.label ??
      node?.text ??
      node?.title ??
      `Node ${index + 1}`;
    const description =
      node?.data?.description ??
      node?.description ??
      node?.data?.summary ??
      "";

    return {
      ...node,
      id: String(node?.id ?? `node-${index + 1}`),
      type: "custom",
      position: node?.position ?? undefined,
      data: {
        ...node?.data,
        label: String(label),
        description: description ? String(description) : undefined,
        isRoot: Boolean(node?.data?.isRoot) || index === 0 || node?.id === "root",
      },
      parent: node?.parent ? String(node.parent) : undefined,
    };
  });

  const normalizedNodes =
    nodes.length > 0
      ? nodes
      : [
          {
            id: "root",
            type: "custom",
            position: { x: 620, y: 320 },
            data: {
              label: rootLabel,
              isRoot: true,
            },
          },
        ];

  const rootNode =
    normalizedNodes.find((node: (typeof nodes)[number]) => node.data?.isRoot) ??
    normalizedNodes[0];
  rootNode.id = "root";
  rootNode.data = {
    ...rootNode.data,
    label: String(rootNode.data?.label ?? rootLabel),
    isRoot: true,
  };

  const explicitEdges = Array.isArray(raw?.edges) ? raw.edges : [];
  const parentEdges = normalizedNodes
    .filter((node: (typeof nodes)[number]) => node.id !== "root" && !!node.parent)
    .map((node: (typeof nodes)[number]) => ({
      id: `e-${node.parent}-${node.id}`,
      source: node.parent,
      target: node.id,
    }));

  const allEdges = [...explicitEdges, ...parentEdges];
  const seenEdges = new Set<string>();
  const normalizedEdges = allEdges
    .map((edge: any, index: number) => ({
      id: String(edge?.id ?? `e-${index + 1}`),
      source: String(edge?.source ?? ""),
      target: String(edge?.target ?? ""),
      animated: true,
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
    }))
    .filter((edge) => edge.source && edge.target)
    .filter((edge) => {
      const dedupeKey = `${edge.source}->${edge.target}`;
      if (seenEdges.has(dedupeKey)) return false;
      seenEdges.add(dedupeKey);
      return true;
    });

  return {
    nodes: normalizedNodes.map(
      ({ parent, ...node }: (typeof nodes)[number]) => node,
    ),
    edges: normalizedEdges,
  };
}

function buildWorkspaceAnalysisMindMap(
  rootLabel: string,
  analysis: Record<string, { summary?: string; items?: Array<{ label?: string; description?: string }> }>,
) {
  const rootX = 620;
  const rootY = 320;
  const branchRows = [150, 320, 490];
  const leftBranchX = 330;
  const rightBranchX = 910;
  const leftChildX = 80;
  const rightChildX = 1160;

  const nodes: any[] = [
    {
      id: "root",
      type: "custom",
      position: { x: rootX, y: rootY },
      data: {
        label: rootLabel,
        isRoot: true,
        description: "선택한 소스 폴더를 분석한 프로젝트 개요",
      },
    },
  ];
  const edges: any[] = [];

  WORKSPACE_ANALYSIS_SECTIONS.forEach((section, index) => {
    const row = index % branchRows.length;
    const isRight = index >= branchRows.length;
    const branchId = `${section.key}-branch`;
    const branchData = analysis[section.key] ?? {};
    const branchY = branchRows[row];
    const branchX = isRight ? rightBranchX : leftBranchX;
    const childX = isRight ? rightChildX : leftChildX;
    const items = Array.isArray(branchData.items) ? branchData.items.slice(0, 4) : [];
    const childStartY = branchY - Math.max(0, items.length - 1) * 44;

    nodes.push({
      id: branchId,
      type: "custom",
      position: { x: branchX, y: branchY },
      data: {
        label: section.label,
        description: branchData.summary ?? `${section.label} 관점의 분석`,
      },
    });
    edges.push({
      id: `e-root-${branchId}`,
      source: "root",
      target: branchId,
      animated: true,
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
    });

    items.forEach((item, itemIndex) => {
      const childId = `${branchId}-${sanitizeNodeId(item.label ?? `${section.key}-${itemIndex + 1}`)}-${itemIndex + 1}`;
      nodes.push({
        id: childId,
        type: "custom",
        position: {
          x: childX,
          y: childStartY + itemIndex * 88,
        },
        data: {
          label: item.label ?? `${section.label} 항목 ${itemIndex + 1}`,
          description: item.description ?? "",
        },
      });
      edges.push({
        id: `e-${branchId}-${childId}`,
        source: branchId,
        target: childId,
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2, opacity: 0.65 },
      });
    });
  });

  return { nodes, edges };
}

function isAnalysisSectionPopulated(section?: {
  summary?: string;
  items?: Array<{ label?: string; description?: string }>;
}) {
  if (!section) return false;
  if (section.summary?.trim()) return true;

  return Array.isArray(section.items)
    ? section.items.some((item) => item.label?.trim() || item.description?.trim())
    : false;
}

function getFallbackAnalysisSection(sectionKey: string, projectName: string) {
  switch (sectionKey) {
    case "userValue":
      return {
        summary: `${projectName}가 시장 변화와 경쟁 상황을 빠르게 파악하도록 돕는 의사결정 지원 도구 (추정)`,
        items: [
          {
            label: "의사결정 속도",
            description: "CEO나 전략 담당자가 시장/경쟁사 변화를 빠르게 읽고 대응하도록 지원",
          },
          {
            label: "정보 압축",
            description: "여러 신호를 브리프와 대시보드 형태로 묶어 핵심만 보게 해줌",
          },
        ],
      };
    case "monetization":
      return {
        summary: `${projectName}는 B2B 구독형 인텔리전스 서비스로 수익화할 가능성이 높음 (추정)`,
        items: [
          {
            label: "팀 구독",
            description: "기업 전략팀이나 경영진 대상 좌석 기반 월 구독 모델 (추정)",
          },
          {
            label: "프리미엄 리포트",
            description: "심층 경쟁사 분석이나 산업 리포트를 유료 부가 서비스로 판매 (추정)",
          },
          {
            label: "엔터프라이즈 온보딩",
            description: "고객사별 키워드/시나리오 셋업과 커스텀 대시보드를 컨설팅 형태로 제공 (추정)",
          },
        ],
      };
    case "implementation":
      return {
        summary: "프론트엔드 화면, 분석 API, 데이터 수집/정리 로직이 결합된 웹 서비스 구조",
        items: [
          {
            label: "대시보드 UI",
            description: "브리프, 신호, 비교 결과를 화면에서 탐색하는 인터페이스",
          },
          {
            label: "분석 API",
            description: "토픽 브리프 생성, 경쟁사 탐지, 구조화된 응답 생성을 담당하는 서버 레이어",
          },
          {
            label: "데이터 파이프라인",
            description: "외부 웹/사이트 신호를 수집하고 요약 가능한 형태로 정리하는 흐름",
          },
        ],
      };
    case "roadmap":
      return {
        summary: "초기 데모를 반복 사용 가능한 제품으로 전환하는 고도화가 다음 단계",
        items: [
          {
            label: "개인화 고도화",
            description: "업종별 키워드, 관심 경쟁사, 알림 규칙을 더 정교하게 설정",
          },
          {
            label: "협업 기능",
            description: "팀 공유, 코멘트, 히스토리 저장으로 반복 활용성을 높임",
          },
          {
            label: "정확도 개선",
            description: "신호 품질 검증, 요약 근거 표시, 모델 평가 체계를 추가",
          },
        ],
      };
    case "risks":
      return {
        summary: "데이터 신뢰도와 실제 반복 사용성을 먼저 검증해야 함",
        items: [
          {
            label: "정확도 리스크",
            description: "AI 요약과 시장 해석이 경영 판단에 충분히 신뢰할 만한지 검증 필요",
          },
          {
            label: "데이터 품질",
            description: "수집 신호가 끊기거나 노이즈가 많으면 인사이트 품질이 흔들릴 수 있음",
          },
          {
            label: "사용 빈도",
            description: "데모성 사용을 넘어 경영진이 반복적으로 찾는 워크플로우인지 확인 필요",
          },
        ],
      };
    default:
      return {
        summary: `${projectName} 분석 항목`,
        items: [],
      };
  }
}

type AnalysisSection = {
  summary?: string;
  items?: Array<{ label?: string; description?: string }>;
};

type AnalysisRecord = Record<string, AnalysisSection>;

function buildWorkspaceAnalysisPrompt() {
  return `You are analyzing a local software project from its source code.
Return strictly valid JSON with this exact structure:
{
  "rootLabel": "project name in Korean or original product name",
  "features": {
    "summary": "summary",
    "items": [{ "label": "item", "description": "detail" }]
  },
  "userValue": {
    "summary": "summary",
    "items": [{ "label": "item", "description": "detail" }]
  },
  "monetization": {
    "summary": "summary",
    "items": [{ "label": "item", "description": "detail" }]
  },
  "implementation": {
    "summary": "summary",
    "items": [{ "label": "item", "description": "detail" }]
  },
  "roadmap": {
    "summary": "summary",
    "items": [{ "label": "item", "description": "detail" }]
  },
  "risks": {
    "summary": "summary",
    "items": [{ "label": "item", "description": "detail" }]
  }
}
Rules:
- Use Korean.
- Each items array must contain 2 to 4 concrete items.
- Ground every summary and item in the codebase, README, scripts, routes, or directories provided.
- features: describe what the product already appears to do.
- userValue: describe the user outcome or decision support value.
- monetization: describe who pays, what they pay for, and a plausible revenue model. Do not put engineering tasks here. If not explicit in the repo, infer and mark it as 추정.
- implementation: describe architecture, major modules, APIs, flows, or infra.
- roadmap: describe specific next upgrades or product improvements, not current features.
- risks: describe missing validation, data quality, accuracy, adoption, or ops risks.
- Keep labels short and descriptions practical.`;
}

function buildAnalysisReadme(rootLabel: string, analysis: AnalysisRecord) {
  const sectionBlocks = WORKSPACE_ANALYSIS_SECTIONS.map((section) => {
    const sectionData = analysis[section.key];
    const items = Array.isArray(sectionData?.items) ? sectionData.items : [];

    return [
      `## ${section.label}`,
      "",
      sectionData?.summary ?? "",
      "",
      ...items.map((item) => `- ${item.label}: ${item.description}`),
      "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    `# ${rootLabel}`,
    "",
    "> Generated by mindMap workspace analysis.",
    "",
    "## 프로젝트 개요",
    "",
    analysis.features?.summary ?? `${rootLabel} 분석 문서`,
    "",
    ...sectionBlocks,
  ].join("\n");
}

function buildAnalysisDocs(rootLabel: string, analysis: AnalysisRecord) {
  const overviewContent = [
    `# ${rootLabel} Overview`,
    "",
    "## 핵심 요약",
    "",
    analysis.features?.summary ?? "",
    "",
    "## 사용자 가치",
    "",
    analysis.userValue?.summary ?? "",
    "",
    "## 수익화 전략",
    "",
    analysis.monetization?.summary ?? "",
    "",
    "## 구현 구조",
    "",
    analysis.implementation?.summary ?? "",
    "",
    "## 고도화 로드맵",
    "",
    analysis.roadmap?.summary ?? "",
    "",
    "## 리스크/검증",
    "",
    analysis.risks?.summary ?? "",
    "",
  ].join("\n");

  const sectionDocs = WORKSPACE_ANALYSIS_SECTIONS.map((section, index) => {
    const sectionData = analysis[section.key];
    const items = Array.isArray(sectionData?.items) ? sectionData.items : [];
    const content = [
      `# ${section.label}`,
      "",
      sectionData?.summary ?? "",
      "",
      "## 세부 항목",
      "",
      ...items.flatMap((item) => [
        `### ${item.label ?? section.label}`,
        "",
        item.description ?? "",
        "",
      ]),
    ].join("\n");

    return {
      path: `docs/mindmap-analysis/${String(index + 1).padStart(2, "0")}-${section.key}.md`,
      content,
    };
  });

  return {
    readmeContent: buildAnalysisReadme(rootLabel, analysis),
    docs: [
      {
        path: "docs/mindmap-analysis/00-overview.md",
        content: overviewContent,
      },
      ...sectionDocs,
    ],
  };
}

async function generateWorkspaceAnalysis(
  projectName: string,
  workspaceContext: string,
  ollama: Awaited<ReturnType<typeof getOllamaClient>>,
  model: string,
) {
  const response = await ollama.chat({
    model,
    messages: [
      { role: "system", content: buildWorkspaceAnalysisPrompt() },
      {
        role: "user",
        content: [
          `Selected project: ${projectName}`,
          `Please analyze what this product does, what value it provides, how it could monetize, how it is implemented, and what should be improved next.`,
          `Workspace context:\n${workspaceContext}`,
        ].join("\n\n"),
      },
    ],
    format: "json",
  });

  const parsed = JSON.parse(response.message.content) as Record<
    string,
    AnalysisSection | string
  >;
  const analysis = Object.fromEntries(
    WORKSPACE_ANALYSIS_SECTIONS.map((section) => [
      section.key,
      typeof parsed[section.key] === "object" && parsed[section.key] !== null
        ? parsed[section.key]
        : { summary: "", items: [] },
    ]),
  ) as AnalysisRecord;
  const rootLabel =
    typeof parsed.rootLabel === "string" && parsed.rootLabel.trim()
      ? parsed.rootLabel.trim()
      : projectName;
  const missingSections = WORKSPACE_ANALYSIS_SECTIONS
    .filter((section) => !isAnalysisSectionPopulated(analysis[section.key]))
    .map((section) => section.key);

  if (missingSections.length > 0) {
    const refillPrompt = `Return strictly valid JSON for these missing sections only: ${missingSections.join(", ")}.
Each section must follow this structure:
{
  "sectionKey": {
    "summary": "summary",
    "items": [{ "label": "item", "description": "detail" }]
  }
}
Use Korean.
For monetization, focus on revenue model and payer, not technical tasks.
For roadmap, focus on next product/technical upgrades.
For risks, focus on validation, data quality, adoption, and operations.
Infer when needed and mark uncertain claims as 추정.`;
    const refillResponse = await ollama.chat({
      model,
      messages: [
        { role: "system", content: refillPrompt },
        {
          role: "user",
          content: [
            `Selected project: ${projectName}`,
            `Known sections:\n${JSON.stringify(analysis, null, 2)}`,
            `Workspace context:\n${workspaceContext}`,
          ].join("\n\n"),
        },
      ],
      format: "json",
    });
    const refillParsed = JSON.parse(refillResponse.message.content) as Record<
      string,
      AnalysisSection
    >;

    for (const sectionKey of missingSections) {
      if (isAnalysisSectionPopulated(refillParsed[sectionKey])) {
        analysis[sectionKey] = refillParsed[sectionKey];
      }
    }
  }

  for (const section of WORKSPACE_ANALYSIS_SECTIONS) {
    const fallbackSection = getFallbackAnalysisSection(section.key, rootLabel);
    const currentSection = analysis[section.key];
    const currentItems = Array.isArray(currentSection?.items)
      ? currentSection.items.filter(
          (item) => item.label?.trim() || item.description?.trim(),
        )
      : [];
    const mergedItems = [...currentItems];

    for (const fallbackItem of fallbackSection.items ?? []) {
      if (mergedItems.length >= 4) break;
      const alreadyExists = mergedItems.some(
        (item) => item.label?.trim() === fallbackItem.label?.trim(),
      );
      if (!alreadyExists) {
        mergedItems.push(fallbackItem);
      }
    }

    analysis[section.key] = {
      summary: currentSection?.summary?.trim() || fallbackSection.summary,
      items: mergedItems.slice(0, 4),
    };
  }

  return {
    rootLabel,
    analysis,
  };
}

type AssistantNodeSummary = {
  id: string;
  label?: string;
  description?: string;
  level?: number;
};

type AssistantEdgeSummary = {
  source: string;
  target: string;
};

function collectUniqueStrings(values: Array<string | undefined>, limit: number) {
  const unique: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || unique.includes(normalized)) continue;
    unique.push(normalized);
    if (unique.length >= limit) break;
  }

  return unique;
}

function buildAssistantFallback(
  title: string,
  nodes: AssistantNodeSummary[],
  edges: AssistantEdgeSummary[],
) {
  const rootNode =
    nodes.find((node) => node.id === "root") ??
    nodes.find((node) => node.label?.trim() === title.trim()) ??
    nodes[0];
  const topLevelNodes = rootNode
    ? edges
        .filter((edge) => edge.source === rootNode.id)
        .map((edge) => nodes.find((node) => node.id === edge.target))
        .filter((node): node is AssistantNodeSummary => !!node)
    : [];
  const topLabels = collectUniqueStrings(
    topLevelNodes.map((node) => node.label),
    4,
  );
  const summary =
    topLabels.length > 0
      ? `${title} 맵은 ${topLabels.join(", ")} 중심으로 정리되어 있습니다. 다음 단계는 각 가지를 실제 사용자 흐름, 데이터 근거, 검증 지표 기준으로 더 구체화하는 것입니다.`
      : `${title} 맵의 핵심 구조가 정리되어 있습니다. 다음 단계는 우선순위가 높은 노드를 사용자 가치, 구현 흐름, 검증 계획 기준으로 더 구체화하는 것입니다.`;

  const questionSuggestions = collectUniqueStrings(
    [
      topLabels[0]
        ? `${topLabels[0]}에서 가장 먼저 검증할 사용자 문제와 성공 지표는 무엇인가?`
        : `${title}에서 가장 먼저 검증할 사용자 문제와 성공 지표는 무엇인가?`,
      topLabels[1]
        ? `${topLabels[1]}를 실제 사용 흐름으로 연결하면 어떤 단계가 필요한가?`
        : `현재 맵을 실제 사용 흐름으로 연결하려면 어떤 단계가 필요한가?`,
      topLabels[2]
        ? `${topLabels[2]}를 구현하려면 어떤 데이터, API, 화면이 필요한가?`
        : `핵심 기능을 구현하려면 어떤 데이터, API, 화면이 필요한가?`,
      "다음 2주 안에 우선 구현하거나 조사할 항목은 무엇인가?",
    ],
    4,
  );

  const researchTopics = collectUniqueStrings(
    [
      topLabels[0]
        ? `${title}의 ${topLabels[0]} 관련 경쟁 서비스 사례`
        : `${title}와 유사한 서비스 벤치마크`,
      topLabels[1]
        ? `${title}의 ${topLabels[1]} 관련 사용자 인터뷰 질문`
        : `${title} 초기 사용자 인터뷰 질문`,
      `${title} 구현에 필요한 데이터 소스와 품질 검증 방식`,
      `${title}에 맞는 B2B 구독 또는 리포트형 수익화 모델 사례`,
    ],
    4,
  );

  return {
    summary,
    questionSuggestions,
    researchTopics,
  };
}

function normalizeAssistantResponse(
  raw: {
    summary?: string;
    questionSuggestions?: string[];
    researchTopics?: string[];
  } | null | undefined,
  title: string,
  nodes: AssistantNodeSummary[],
  edges: AssistantEdgeSummary[],
) {
  const fallback = buildAssistantFallback(title, nodes, edges);
  const parsedSummary = raw?.summary?.trim();
  const parsedQuestions = collectUniqueStrings(raw?.questionSuggestions ?? [], 4);
  const parsedTopics = collectUniqueStrings(raw?.researchTopics ?? [], 4);

  return {
    summary: parsedSummary || fallback.summary,
    questionSuggestions: collectUniqueStrings(
      [...parsedQuestions, ...fallback.questionSuggestions],
      4,
    ),
    researchTopics: collectUniqueStrings(
      [...parsedTopics, ...fallback.researchTopics],
      4,
    ),
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // prefix all routes with /api
  
  app.get("/api/local/workspaces", async (req, res) => {
    try {
      const requestedPath =
        typeof req.query.path === "string" ? req.query.path : undefined;
      const folders = await listWorkspaceFolders(requestedPath);
      res.json(folders);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to list local workspaces");
      console.error("List local workspaces error:", message, error);
      res.status(500).json({
        message: "Failed to list local workspaces",
        error: message,
      });
    }
  });

  app.get("/api/local/workspace-context", async (req, res) => {
    try {
      const requestedPath =
        typeof req.query.path === "string" ? req.query.path : undefined;
      const context = await getWorkspaceContext(requestedPath);
      res.json(context);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load workspace context");
      console.error("Workspace context error:", message, error);
      res.status(500).json({
        message: "Failed to load workspace context",
        error: message,
      });
    }
  });

  app.post("/api/local/workspace-docs/generate", async (req, res) => {
    try {
      if (process.env.VERCEL && ollamaHost.includes("localhost")) {
        return res.status(503).json({
          message: "Workspace documentation is unavailable on this Vercel deployment",
          error:
            "This route is configured to call a local Ollama server at http://localhost:11434. Run locally or set OLLAMA_HOST to a reachable remote Ollama server.",
        });
      }

      const { workspacePath } = req.body ?? {};
      if (!workspacePath || typeof workspacePath !== "string") {
        return res.status(400).json({
          message: "workspacePath is required",
        });
      }

      const workspaceContext = await getWorkspacePromptContext(workspacePath);
      const workspace = await getWorkspaceContext(workspacePath);
      const ollama = await getOllamaClient();
      const model = await resolveOllamaModel();
      const { rootLabel, analysis } = await generateWorkspaceAnalysis(
        workspace.name,
        workspaceContext,
        ollama,
        model,
      );
      const { readmeContent, docs } = buildAnalysisDocs(rootLabel, analysis);
      const writeResult = await writeWorkspaceDocs(
        workspacePath,
        docs,
        readmeContent,
      );

      res.json({
        projectName: rootLabel,
        modelUsed: model,
        ...writeResult,
      });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to generate workspace docs");
      console.error("Workspace docs generation error:", message, error);
      res.status(500).json({
        message: "Failed to generate workspace docs",
        error: message,
      });
    }
  });

  // --- Mind map CRUD ---
  app.get("/api/maps", async (_req, res) => {
    try {
      const supabaseClient = getSupabase();
      if (process.env.VERCEL && !supabaseClient) {
        return sendMissingSupabaseEnv(res, "list mind maps");
      }
      const list = await getStorage().listMindMaps();
      res.json(list);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to list mind maps");
      console.error("List maps error:", message, error);
      res.status(500).json({
        message: "Failed to list mind maps",
        error: message,
      });
    }
  });

  app.get("/api/maps/:id", async (req, res) => {
    try {
      if (process.env.VERCEL && !getSupabase()) {
        return sendMissingSupabaseEnv(res, "load mind map");
      }
      const map = await getStorage().getMindMap(req.params.id);
      if (!map) {
        return res.status(404).json({ message: "Mind map not found" });
      }
      res.json(map);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load mind map");
      console.error("Get map error:", message, error);
      res.status(500).json({ message: "Failed to load mind map", error: message });
    }
  });

  app.post("/api/maps", async (req, res) => {
    try {
      if (process.env.VERCEL && !getSupabase()) {
        return sendMissingSupabaseEnv(res, "create mind map");
      }
      const { title, nodes = [], edges = [] } = req.body ?? {};
      const map = await getStorage().createMindMap({ title, nodes, edges });
      if (!map?.id) {
        console.error("Create map: storage returned map without id", map);
        return res.status(500).json({ message: "Failed to create mind map (no id returned)" });
      }
      res.status(201).setHeader("Content-Type", "application/json").json(map);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create mind map");
      console.error("Create map error:", message, error);
      res.status(500).json({ message: "Failed to create mind map", error: message });
    }
  });

  app.put("/api/maps/:id", async (req, res) => {
    try {
      if (process.env.VERCEL && !getSupabase()) {
        return sendMissingSupabaseEnv(res, "save mind map");
      }
      const { title, nodes, edges } = req.body ?? {};
      if (!nodes || !edges) {
        return res.status(400).json({ message: "nodes and edges are required" });
      }
      const map = await getStorage().updateMindMap(req.params.id, { title, nodes, edges });
      if (!map) {
        return res.status(404).json({ message: "Mind map not found" });
      }
      res.json(map);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save mind map");
      console.error("Update map error:", message, error);
      res.status(500).json({ message: "Failed to save mind map", error: message });
    }
  });

  app.delete("/api/maps/:id", async (req, res) => {
    try {
      if (process.env.VERCEL && !getSupabase()) {
        return sendMissingSupabaseEnv(res, "delete mind map");
      }
      await getStorage().deleteMindMap(req.params.id);
      res.status(204).send();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete mind map");
      console.error("Delete map error:", message, error);
      res.status(500).json({ message: "Failed to delete mind map", error: message });
    }
  });

  app.post("/api/generate-map", async (req, res) => {
    try {
      if (process.env.VERCEL && ollamaHost.includes("localhost")) {
        return res.status(503).json({
          message: "AI generation is unavailable on this Vercel deployment",
          error:
            "This route is configured to call a local Ollama server at http://localhost:11434. Vercel Serverless Functions cannot reach that local process. Run locally or set OLLAMA_HOST to a reachable remote Ollama server.",
        });
      }

      const {
        prompt,
        workspacePath,
        parentLevel = 0,
        currentMapTitle,
      } = req.body ?? {};
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const numericLevel =
        typeof parentLevel === "number" ? parentLevel : Number(parentLevel) || 0;
      const hasWorkspaceContext = !!workspacePath;
      const workspaceContext = workspacePath
        ? await getWorkspacePromptContext(workspacePath)
        : "";
      const ollama = await getOllamaClient();
      const model = await resolveOllamaModel();

      if (hasWorkspaceContext && numericLevel <= 0) {
        const { rootLabel, analysis } = await generateWorkspaceAnalysis(
          String(prompt),
          workspaceContext,
          ollama,
          model,
        );
        const mindMapData = buildWorkspaceAnalysisMindMap(rootLabel, analysis);

        return res.json({
          ...mindMapData,
          modelUsed: model,
        });
      }

      const depthInstruction =
        numericLevel <= 0
          ? hasWorkspaceContext
            ? "Generate a workspace analysis map. The first-level branches should explicitly cover: 주요 기능, 사용자 가치, 수익화 전략, 구현 구조, 고도화 로드맵, 리스크/검증 포인트. Base each branch on actual source files, directories, scripts, and README evidence. If something is an inference rather than explicit, mark it as 추정 in the description."
            : "Generate strategic first-level branches that explain the topic's product areas, architecture, or modules."
          : `Generate the next level down from the current topic. Make the ideas more concrete, implementation-oriented, and specific than level ${numericLevel}. If workspace context exists, ground the ideas in actual files, APIs, modules, flows, and naming from the codebase.`;

      const systemPrompt = `You are an expert mind map generator. Transform the user's prompt into a JSON structure representing nodes and edges for a mind map diagram.
Output strictly valid JSON with no markdown formatting or extra text.
The JSON must have this exact structure:
{
  "nodes": [
    {
      "id": "root", // Use string IDs
      "type": "custom",
      "position": { "x": 400, "y": 300 }, // Keep root centered
      "data": { "label": "ROOT_TOPIC", "isRoot": true, "description": "Short description" }
    },
    {
      "id": "child1",
      "type": "custom",
      "position": { "x": number, "y": number }, // Spread nodes out nicely around the root (e.g. x: 100-700, y: 100-500)
      "data": { "label": "Subtopic Name", "description": "Optional details" }
    }
  ],
  "edges": [
    {
      "id": "e_root-child1",
      "source": "root",
      "target": "child1"
    }
  ]
}
Generate 5 to 10 nodes capturing the essence of the prompt.
When workspace context exists, anchor the ideas to the actual folder structure, module names, and likely responsibilities.
When workspace context exists and current level is 0, produce a source-analysis mind map for the selected project rather than a generic brainstorm.
For a workspace analysis map, prefer concrete branches like product features, target user value, monetization, technical implementation, growth roadmap, and validation/risk.
Descriptions should mention evidence from files or directories whenever possible.
When expanding a deeper-level node, make the children more detailed and practical than the parent.
`;
      const response = await ollama.chat({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: "user",
            content: [
              `Topic: ${String(prompt)}`,
              currentMapTitle ? `Current map title: ${String(currentMapTitle)}` : "",
              `Current level: ${numericLevel}`,
              depthInstruction,
              workspaceContext ? `Workspace context:\n${workspaceContext}` : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          }
        ],
        format: 'json',
      });

      let mindMapData;
      try {
        mindMapData = normalizeGeneratedMindMapData(
          JSON.parse(response.message.content),
          String(prompt),
        );
      } catch (e) {
        console.error("Failed to parse Ollama response as JSON:", response.message.content);
        throw new Error("Invalid output format from LLM");
      }

      res.json({
        ...mindMapData,
        modelUsed: model,
      });

    } catch (error) {
      const message = getErrorMessage(error, "Failed to generate mind map");
      console.error("Generation error:", message, error);
      res.status(500).json({ message: "Failed to generate mind map", error: message });
    }
  });

  app.post("/api/assistant/insights", async (req, res) => {
    try {
      if (process.env.VERCEL && ollamaHost.includes("localhost")) {
        return res.status(503).json({
          message: "AI assistant is unavailable on this Vercel deployment",
          error:
            "This route is configured to call a local Ollama server at http://localhost:11434. Vercel Serverless Functions cannot reach that local process. Run locally or set OLLAMA_HOST to a reachable remote Ollama server.",
        });
      }

      const { title, workspacePath, nodes = [], edges = [] } = req.body ?? {};

      if (!title || !Array.isArray(nodes) || !Array.isArray(edges)) {
        return res.status(400).json({
          message: "title, nodes, and edges are required",
        });
      }

      const workspaceContext = workspacePath
        ? await getWorkspacePromptContext(workspacePath)
        : "";
      const simplifiedNodes = nodes.slice(0, 40).map((node: any) => ({
        id: node.id,
        label: node.data?.label,
        description: node.data?.description,
        level: node.data?.level,
      }));
      const simplifiedEdges = edges.slice(0, 60).map((edge: any) => ({
        source: edge.source,
        target: edge.target,
      }));
      const systemPrompt = `You are an AI assistant for a mind map editor.
Return strictly valid JSON with this exact structure:
{
  "summary": "Short summary in Korean",
  "questionSuggestions": ["question 1", "question 2", "question 3"],
  "researchTopics": ["topic 1", "topic 2", "topic 3"]
}
Keep the summary concise and practical.
Questions should help the user deepen or clarify the current map.
Research topics should be concrete things worth looking up or validating next.`;

      const ollama = await getOllamaClient();
      const model = await resolveOllamaModel();
      const response = await ollama.chat({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              `Map title: ${String(title)}`,
              workspaceContext ? `Workspace context:\n${workspaceContext}` : "",
              `Nodes:\n${JSON.stringify(simplifiedNodes, null, 2)}`,
              `Edges:\n${JSON.stringify(simplifiedEdges, null, 2)}`,
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
        format: "json",
      });

      let parsed:
        | {
            summary?: string;
            questionSuggestions?: string[];
            researchTopics?: string[];
          }
        | null = null;

      try {
        parsed = JSON.parse(response.message.content) as {
          summary?: string;
          questionSuggestions?: string[];
          researchTopics?: string[];
        };
      } catch (parseError) {
        console.warn(
          "Assistant insights returned invalid JSON, using fallback response",
          parseError,
        );
      }
      const normalized = normalizeAssistantResponse(
        parsed,
        String(title),
        simplifiedNodes,
        simplifiedEdges,
      );

      res.json({
        ...normalized,
        modelUsed: model,
      });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to generate assistant insights");
      console.error("Assistant insights error:", message, error);
      res.status(500).json({
        message: "Failed to generate assistant insights",
        error: message,
      });
    }
  });

  return httpServer;
}
