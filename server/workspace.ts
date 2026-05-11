import fs from "fs/promises";
import path from "path";

const IGNORED_NAMES = new Set([
  ".DS_Store",
  ".git",
  ".idea",
  ".next",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "tmp",
]);

const MAX_FOLDERS = 80;
const MAX_PREVIEW_DIRECTORIES = 8;
const MAX_PREVIEW_FILES = 8;
const MAX_TREE_DEPTH = 2;
const MAX_TREE_LINES = 28;
const MAX_DISCOVERY_DEPTH = 3;
const MAX_DISCOVERY_FILES = 120;
const MAX_ANALYSIS_FILES = 6;
const MAX_FILE_SNIPPET_CHARS = 1800;

const TEXT_FILE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".go",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".md",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

export interface WorkspaceFolderItem {
  name: string;
  path: string;
  childDirectoryCount: number;
  fileCount: number;
}

export interface WorkspaceFolderList {
  rootName: string;
  rootPath: string;
  currentPath: string;
  folders: WorkspaceFolderItem[];
}

export interface WorkspaceContext {
  rootName: string;
  rootPath: string;
  selectedPath: string;
  name: string;
  overview: string;
  childDirectories: string[];
  files: string[];
  tree: string[];
  hasReadme: boolean;
}

export interface WorkspaceResolvedPath {
  rootPath: string;
  currentPath: string;
  resolvedPath: string;
}

export interface WorkspaceDocFile {
  path: string;
  content: string;
}

export interface WorkspaceDocsWriteResult {
  readme: {
    path: string;
    created: boolean;
  };
  docs: Array<{
    path: string;
    bytes: number;
  }>;
}

function ensureLocalWorkspaceAvailable() {
  if (process.env.VERCEL) {
    throw new Error("Local workspace browsing is available only in local development.");
  }
}

function getWorkspaceRoot() {
  return path.resolve(process.env.LOCAL_WORKSPACE_ROOT ?? path.dirname(process.cwd()));
}

function normalizeRelativePath(relativePath?: string) {
  if (!relativePath || relativePath === "." || relativePath === "/") {
    return ".";
  }

  return relativePath.replace(/^\/+/, "").replace(/\\/g, path.sep);
}

function resolveWorkspacePath(relativePath?: string) {
  const rootPath = getWorkspaceRoot();
  const normalized = normalizeRelativePath(relativePath);
  const resolved = path.resolve(rootPath, normalized);

  if (resolved !== rootPath && !resolved.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error("Workspace path must stay inside the local workspace root.");
  }

  return {
    rootPath,
    currentPath: path.relative(rootPath, resolved) || ".",
    resolvedPath: resolved,
  };
}

function isVisibleEntry(name: string) {
  return !name.startsWith(".") && !IGNORED_NAMES.has(name);
}

async function readVisibleEntries(directoryPath: string) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => isVisibleEntry(entry.name))
    .sort((left, right) => {
      if (left.isDirectory() && !right.isDirectory()) return -1;
      if (!left.isDirectory() && right.isDirectory()) return 1;
      return left.name.localeCompare(right.name);
    });
}

async function countDirectChildren(directoryPath: string) {
  const entries = await readVisibleEntries(directoryPath);

  return {
    childDirectoryCount: entries.filter((entry) => entry.isDirectory()).length,
    fileCount: entries.filter((entry) => entry.isFile()).length,
  };
}

async function collectTreeLines(
  directoryPath: string,
  depth = 0,
  lines: string[] = [],
) {
  if (depth > MAX_TREE_DEPTH || lines.length >= MAX_TREE_LINES) {
    return lines;
  }

  const entries = await readVisibleEntries(directoryPath);
  const previewEntries = entries.slice(0, depth === 0 ? 10 : 6);

  for (const entry of previewEntries) {
    if (lines.length >= MAX_TREE_LINES) break;

    const prefix = `${"  ".repeat(depth)}- `;
    lines.push(`${prefix}${entry.name}${entry.isDirectory() ? "/" : ""}`);

    if (entry.isDirectory()) {
      await collectTreeLines(path.join(directoryPath, entry.name), depth + 1, lines);
    }
  }

  return lines;
}

function isLikelyTextFile(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);

  return (
    TEXT_FILE_EXTENSIONS.has(extension) ||
    basename === "Dockerfile" ||
    basename === "Makefile"
  );
}

function scoreCandidateFile(relativeFilePath: string) {
  const normalized = relativeFilePath.replace(/\\/g, "/");
  const basename = path.basename(normalized);
  const lower = normalized.toLowerCase();
  let score = 0;

  if (/^(readme|business_readme|product|roadmap)/i.test(basename)) score += 200;
  if (basename === "package.json") score += 180;
  if (basename === "pyproject.toml" || basename === "Cargo.toml" || basename === "go.mod") {
    score += 160;
  }
  if (basename === "middleware.ts" || basename === "middleware.js") score += 150;
  if (/(app|src)\/.*(page|layout|route|api|server|index|main)\./i.test(lower)) score += 120;
  if (/(feature|service|controller|model|schema|store|hook|dashboard|agent|search|billing|payment)/i.test(lower)) {
    score += 80;
  }
  if (/(test|spec|mock|fixture|lock|dist|build|min\.)/i.test(lower)) score -= 120;

  const extension = path.extname(lower);
  if (extension === ".md") score += 30;
  if (extension === ".tsx" || extension === ".ts" || extension === ".jsx" || extension === ".js") score += 20;
  if (extension === ".json" || extension === ".toml" || extension === ".yaml" || extension === ".yml") score += 10;

  return score;
}

async function collectCandidateFiles(
  directoryPath: string,
  relativeDirectory = "",
  depth = 0,
  files: string[] = [],
): Promise<string[]> {
  if (depth > MAX_DISCOVERY_DEPTH || files.length >= MAX_DISCOVERY_FILES) {
    return files;
  }

  const entries = await readVisibleEntries(directoryPath);

  for (const entry of entries) {
    if (files.length >= MAX_DISCOVERY_FILES) break;

    const relativePath = relativeDirectory
      ? path.join(relativeDirectory, entry.name)
      : entry.name;
    const absolutePath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      await collectCandidateFiles(absolutePath, relativePath, depth + 1, files);
      continue;
    }

    if (entry.isFile() && isLikelyTextFile(relativePath)) {
      files.push(relativePath);
    }
  }

  return files;
}

async function buildPackageSummary(directoryPath: string) {
  const packageJsonPath = path.join(directoryPath, "package.json");

  try {
    const raw = await fs.readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as {
      name?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const scripts = Object.keys(parsed.scripts ?? {}).slice(0, 8);
    const runtimeDeps = Object.keys(parsed.dependencies ?? {}).slice(0, 12);
    const devDeps = Object.keys(parsed.devDependencies ?? {}).slice(0, 8);

    return [
      `package.json name: ${parsed.name ?? path.basename(directoryPath)}`,
      scripts.length > 0 ? `scripts: ${scripts.join(", ")}` : "",
      runtimeDeps.length > 0 ? `dependencies: ${runtimeDeps.join(", ")}` : "",
      devDeps.length > 0 ? `devDependencies: ${devDeps.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

async function collectRepresentativeFileSnippets(
  directoryPath: string,
  currentPath: string,
) {
  const packageSummary = await buildPackageSummary(directoryPath);
  const candidateFiles = await collectCandidateFiles(directoryPath);
  const rankedFiles = candidateFiles
    .map((relativePath) => ({
      relativePath,
      score: scoreCandidateFile(relativePath),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_ANALYSIS_FILES);

  const snippets = await Promise.all(
    rankedFiles.map(async ({ relativePath }) => {
      const absolutePath = path.join(directoryPath, relativePath);

      try {
        const raw = await fs.readFile(absolutePath, "utf8");
        const compact = raw.replace(/\r\n/g, "\n").trim();
        const snippet =
          compact.length > MAX_FILE_SNIPPET_CHARS
            ? `${compact.slice(0, MAX_FILE_SNIPPET_CHARS)}\n...`
            : compact;

        return `FILE: ${path.join(currentPath, relativePath)}\n${snippet}`;
      } catch {
        return "";
      }
    }),
  );

  return [packageSummary, ...snippets].filter(Boolean).join("\n\n");
}

async function findReadmeName(directoryPath: string) {
  const entries = await readVisibleEntries(directoryPath);
  const readmeEntry = entries.find(
    (entry) => entry.isFile() && /^readme(\..+)?$/i.test(entry.name),
  );

  return readmeEntry?.name ?? null;
}

export function getWorkspaceResolvedPath(relativePath?: string): WorkspaceResolvedPath {
  ensureLocalWorkspaceAvailable();
  return resolveWorkspacePath(relativePath);
}

export async function listWorkspaceFolders(relativePath?: string): Promise<WorkspaceFolderList> {
  ensureLocalWorkspaceAvailable();

  const { rootPath, currentPath, resolvedPath } = resolveWorkspacePath(relativePath);
  const rootName = path.basename(rootPath);
  const entries = await readVisibleEntries(resolvedPath);
  const folders = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .slice(0, MAX_FOLDERS)
      .map(async (entry) => {
        const childPath =
          currentPath === "."
            ? entry.name
            : path.join(currentPath, entry.name);
        const childCounts = await countDirectChildren(path.join(resolvedPath, entry.name));

        return {
          name: entry.name,
          path: childPath,
          childDirectoryCount: childCounts.childDirectoryCount,
          fileCount: childCounts.fileCount,
        } satisfies WorkspaceFolderItem;
      }),
  );

  return {
    rootName,
    rootPath,
    currentPath,
    folders,
  };
}

export async function getWorkspaceContext(relativePath?: string): Promise<WorkspaceContext> {
  ensureLocalWorkspaceAvailable();

  const { rootPath, currentPath, resolvedPath } = resolveWorkspacePath(relativePath);
  const rootName = path.basename(rootPath);
  const stat = await fs.stat(resolvedPath);

  if (!stat.isDirectory()) {
    throw new Error("Selected workspace path is not a directory.");
  }

  const entries = await readVisibleEntries(resolvedPath);
  const childDirectories = entries
    .filter((entry) => entry.isDirectory())
    .slice(0, MAX_PREVIEW_DIRECTORIES)
    .map((entry) => entry.name);
  const files = entries
    .filter((entry) => entry.isFile())
    .slice(0, MAX_PREVIEW_FILES)
    .map((entry) => entry.name);
  const tree = await collectTreeLines(resolvedPath);
  const folderName = path.basename(resolvedPath);
  const readmeName = await findReadmeName(resolvedPath);
  const overviewParts = [
    `${folderName} 폴더를 기준으로 아이디어를 확장합니다.`,
    childDirectories.length > 0
      ? `주요 디렉터리: ${childDirectories.join(", ")}`
      : "하위 디렉터리가 많지 않은 구조입니다.",
    files.length > 0
      ? `대표 파일: ${files.join(", ")}`
      : "대표 파일은 별도로 보이지 않았습니다.",
  ];

  return {
    rootName,
    rootPath,
    selectedPath: currentPath,
    name: folderName,
    overview: overviewParts.join(" "),
    childDirectories,
    files,
    tree,
    hasReadme: !!readmeName,
  };
}

export async function getWorkspacePromptContext(relativePath?: string) {
  const context = await getWorkspaceContext(relativePath);
  const { resolvedPath, currentPath } = resolveWorkspacePath(relativePath);
  const fileSnippets = await collectRepresentativeFileSnippets(resolvedPath, currentPath);

  return [
    `Workspace root: ${context.rootName}`,
    `Selected folder: ${context.selectedPath}`,
    `Overview: ${context.overview}`,
    context.childDirectories.length > 0
      ? `Directories: ${context.childDirectories.join(", ")}`
      : "",
    context.files.length > 0
      ? `Files: ${context.files.join(", ")}`
      : "",
    context.tree.length > 0 ? `Tree:\n${context.tree.join("\n")}` : "",
    fileSnippets ? `Representative source excerpts:\n${fileSnippets}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function writeWorkspaceDocs(
  relativePath: string | undefined,
  files: WorkspaceDocFile[],
  readmeContent?: string,
): Promise<WorkspaceDocsWriteResult> {
  ensureLocalWorkspaceAvailable();

  const { resolvedPath, currentPath } = resolveWorkspacePath(relativePath);
  const readmeName = await findReadmeName(resolvedPath);
  const readmePath = path.join(
    currentPath === "." ? path.basename(resolvedPath) : currentPath,
    readmeName ?? "README.md",
  );

  if (!readmeName && readmeContent) {
    await fs.writeFile(path.join(resolvedPath, "README.md"), readmeContent, "utf8");
  }

  const writtenDocs: Array<{ path: string; bytes: number }> = [];

  for (const file of files) {
    const absolutePath = path.join(resolvedPath, file.path);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.content, "utf8");
    writtenDocs.push({
      path: path.join(
        currentPath === "." ? path.basename(resolvedPath) : currentPath,
        file.path,
      ),
      bytes: Buffer.byteLength(file.content, "utf8"),
    });
  }

  return {
    readme: {
      path: readmePath,
      created: !readmeName && !!readmeContent,
    },
    docs: writtenDocs,
  };
}
