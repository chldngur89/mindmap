import type { Edge, Node } from "@xyflow/react";

export interface MindMapTemplate {
  id: string;
  name: string;
  description: string;
  rootLabel: string;
  rootDescription: string;
  nodes: Node[];
  edges: Edge[];
}

function makeTemplateNode(
  id: string,
  label: string,
  x: number,
  y: number,
  description: string,
  level = 1,
) {
  return {
    id,
    type: "custom",
    position: { x, y },
    data: {
      label,
      description,
      level,
    },
  } satisfies Node;
}

function makeTemplateEdge(source: string, target: string) {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    animated: true,
    style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
  } satisfies Edge;
}

export const mindMapTemplates: MindMapTemplate[] = [
  {
    id: "blank",
    name: "빈 캔버스",
    description: "아무 구조 없이 루트 토픽 하나만 두고 시작합니다.",
    rootLabel: "New Mind Map",
    rootDescription: "핵심 주제를 정의하고 필요한 방향으로 직접 확장하세요.",
    nodes: [],
    edges: [],
  },
  {
    id: "project-planning",
    name: "프로젝트 기획",
    description: "목표, 범위, 사용자, 일정, 리스크를 빠르게 잡는 구조입니다.",
    rootLabel: "Project Planning",
    rootDescription: "프로젝트의 큰 방향과 실행 범위를 빠르게 정리합니다.",
    nodes: [
      makeTemplateNode("scope", "Scope", 860, 180, "포함/제외 범위 정리"),
      makeTemplateNode("users", "Users", 920, 300, "누가 쓰는지와 핵심 니즈"),
      makeTemplateNode("timeline", "Timeline", 860, 420, "마일스톤과 일정"),
      makeTemplateNode("risks", "Risks", 980, 520, "예상 리스크와 대응"),
    ],
    edges: [
      makeTemplateEdge("root", "scope"),
      makeTemplateEdge("root", "users"),
      makeTemplateEdge("root", "timeline"),
      makeTemplateEdge("root", "risks"),
    ],
  },
  {
    id: "study-notes",
    name: "학습 노트",
    description: "핵심 개념, 예시, 질문, 복습 포인트로 정리합니다.",
    rootLabel: "Study Topic",
    rootDescription: "학습 내용을 이해, 적용, 복습 관점으로 분해합니다.",
    nodes: [
      makeTemplateNode("concepts", "Core Concepts", 860, 190, "핵심 개념 요약"),
      makeTemplateNode("examples", "Examples", 930, 290, "예시와 케이스"),
      makeTemplateNode("questions", "Questions", 850, 410, "이해가 안 된 부분"),
      makeTemplateNode("review", "Review Plan", 970, 510, "복습 포인트와 액션"),
    ],
    edges: [
      makeTemplateEdge("root", "concepts"),
      makeTemplateEdge("root", "examples"),
      makeTemplateEdge("root", "questions"),
      makeTemplateEdge("root", "review"),
    ],
  },
  {
    id: "strategy",
    name: "전략 수립",
    description: "목표, 현황, 옵션, 실행으로 전략 흐름을 잡습니다.",
    rootLabel: "Strategy Map",
    rootDescription: "현재 상태에서 실행 가능한 전략 옵션을 좁혀갑니다.",
    nodes: [
      makeTemplateNode("goal", "Goal", 860, 180, "무엇을 달성할지"),
      makeTemplateNode("context", "Current Context", 940, 290, "현재 상황과 제약"),
      makeTemplateNode("options", "Options", 860, 410, "가능한 전략 옵션"),
      makeTemplateNode("execution", "Execution", 980, 520, "실행 순서와 지표"),
    ],
    edges: [
      makeTemplateEdge("root", "goal"),
      makeTemplateEdge("root", "context"),
      makeTemplateEdge("root", "options"),
      makeTemplateEdge("root", "execution"),
    ],
  },
  {
    id: "retrospective",
    name: "회고 프레임워크",
    description: "잘한 점, 문제, 배운 점, 다음 액션을 회고합니다.",
    rootLabel: "Retrospective",
    rootDescription: "작업이나 프로젝트를 회고하고 다음 개선 액션을 정리합니다.",
    nodes: [
      makeTemplateNode("went-well", "Went Well", 860, 180, "잘된 점"),
      makeTemplateNode("problems", "Problems", 930, 290, "막혔던 점"),
      makeTemplateNode("learnings", "Learnings", 860, 410, "배운 점"),
      makeTemplateNode("actions", "Next Actions", 980, 520, "바로 실행할 액션"),
    ],
    edges: [
      makeTemplateEdge("root", "went-well"),
      makeTemplateEdge("root", "problems"),
      makeTemplateEdge("root", "learnings"),
      makeTemplateEdge("root", "actions"),
    ],
  },
];

export function buildTemplateMap(templateId: string) {
  const template =
    mindMapTemplates.find((candidate) => candidate.id === templateId) ??
    mindMapTemplates[0];

  const rootNode: Node = {
    id: "root",
    type: "custom",
    position: { x: 620, y: 320 },
    data: {
      label: template.rootLabel,
      description: template.rootDescription,
      isRoot: true,
      level: 0,
    },
  };

  return {
    template,
    nodes: [rootNode, ...template.nodes],
    edges: template.edges,
  };
}
