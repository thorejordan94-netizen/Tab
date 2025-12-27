/**
 * Parser for extracting structured data from Stage 2 (Principal Engineer) output
 * Extracts file tree, code files, documentation, and run instructions
 */

import type { GeneratedFile, FileTreeNode } from '@/types';
import { isValidPath, normalizePath, getLanguageFromPath } from './utils';

export interface ParsedOutput {
  overview: string;
  files: GeneratedFile[];
  fileTree: string;
  runInstructions: string;
  storeReadinessChecklist: string[];
  warnings: string[];
}

/**
 * Parse the complete output from the Principal Engineer agent
 */
export function parseEngineerOutput(output: string): ParsedOutput {
  const warnings: string[] = [];

  // Extract overview
  const overview = extractSection(output, 'OVERVIEW', 'FILE_TREE') ||
                   extractSection(output, 'OVERVIEW', 'FILES') ||
                   'Extension generated successfully.';

  // Extract file tree
  const fileTree = extractCodeBlock(extractSection(output, 'FILE_TREE', 'FILES') || '');

  // Extract files
  const files = extractFiles(output, warnings);

  // Extract documentation files (they might be under DOCS section or in FILES)
  const docsSection = extractSection(output, 'DOCS', 'TESTS') ||
                      extractSection(output, 'DOCS', 'RUN_INSTRUCTIONS');
  if (docsSection) {
    const docFiles = extractFiles(docsSection, warnings);
    for (const docFile of docFiles) {
      if (!files.some(f => f.path === docFile.path)) {
        files.push(docFile);
      }
    }
  }

  // Extract test files
  const testsSection = extractSection(output, 'TESTS', 'RUN_INSTRUCTIONS') ||
                       extractSection(output, 'TESTS', 'STORE_READINESS');
  if (testsSection) {
    const testFiles = extractFiles(testsSection, warnings);
    for (const testFile of testFiles) {
      if (!files.some(f => f.path === testFile.path)) {
        files.push(testFile);
      }
    }
  }

  // Extract run instructions
  const runInstructionsSection = extractSection(output, 'RUN_INSTRUCTIONS', 'STORE_READINESS') ||
                                  extractSection(output, 'RUN_INSTRUCTIONS', null);
  const runInstructions = extractCodeBlock(runInstructionsSection || '') ||
                          extractMarkdownContent(runInstructionsSection || '') ||
                          'See README.md for instructions.';

  // Extract store readiness checklist
  const checklistSection = extractSection(output, 'STORE_READINESS_CHECKLIST', null) ||
                           extractSection(output, 'STORE_READINESS', null);
  const storeReadinessChecklist = extractChecklist(checklistSection || '');

  // Validate required files
  const requiredFiles = ['manifest.json', 'package.json', 'tsconfig.json'];
  for (const required of requiredFiles) {
    if (!files.some(f => f.path.endsWith(required))) {
      warnings.push(`Missing required file: ${required}`);
    }
  }

  return {
    overview: cleanMarkdown(overview),
    files,
    fileTree,
    runInstructions,
    storeReadinessChecklist,
    warnings,
  };
}

/**
 * Extract a section between two headers
 */
function extractSection(text: string, startHeader: string, endHeader: string | null): string | null {
  // Match headers with various markdown formats (##, ###, etc.)
  const startPattern = new RegExp(`#{1,4}\\s*${startHeader}[^\\n]*\\n`, 'i');
  const startMatch = text.match(startPattern);

  if (!startMatch || startMatch.index === undefined) {
    return null;
  }

  const startIndex = startMatch.index + startMatch[0].length;

  if (endHeader === null) {
    return text.slice(startIndex);
  }

  const endPattern = new RegExp(`#{1,4}\\s*${endHeader}`, 'i');
  const remainingText = text.slice(startIndex);
  const endMatch = remainingText.match(endPattern);

  if (endMatch && endMatch.index !== undefined) {
    return remainingText.slice(0, endMatch.index);
  }

  return remainingText;
}

/**
 * Extract code block content
 */
function extractCodeBlock(text: string): string {
  const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

/**
 * Extract markdown content (removing code block markers if present)
 */
function extractMarkdownContent(text: string): string {
  return text.replace(/```(?:markdown|md)?\n?/g, '').replace(/```\n?$/g, '').trim();
}

/**
 * Clean markdown formatting for display
 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .trim();
}

/**
 * Extract files from the FILES section or similar
 */
function extractFiles(text: string, warnings: string[]): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Pattern to match file headers: "#### FILE: path/to/file" or "### FILE: path" or "**FILE:** path"
  const filePatterns = [
    /#{1,4}\s*FILE:\s*([^\n]+)\n```(\w+)?\n([\s\S]*?)```/gi,
    /\*\*FILE:\*\*\s*([^\n]+)\n```(\w+)?\n([\s\S]*?)```/gi,
    /FILE:\s*`([^`]+)`\n```(\w+)?\n([\s\S]*?)```/gi,
    /`([^`]+)`:\n```(\w+)?\n([\s\S]*?)```/gi,
  ];

  for (const pattern of filePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const rawPath = match[1].trim().replace(/^`|`$/g, '');
      const language = match[2] || '';
      const content = match[3];

      // Normalize and validate path
      const normalizedPath = normalizePath(rawPath);

      if (!isValidPath(normalizedPath)) {
        warnings.push(`Skipped file with invalid path: ${rawPath}`);
        continue;
      }

      // Skip duplicates
      if (files.some(f => f.path === normalizedPath)) {
        continue;
      }

      files.push({
        path: normalizedPath,
        content: content.trimEnd(),
        language: language || getLanguageFromPath(normalizedPath),
      });
    }
  }

  // Also try a more lenient pattern for any remaining code blocks with path-like headers
  const lenientPattern = /(?:^|\n)([a-zA-Z][a-zA-Z0-9_\-./]*\.[a-zA-Z]+):?\s*\n```(\w+)?\n([\s\S]*?)```/gi;
  let match;
  while ((match = lenientPattern.exec(text)) !== null) {
    const rawPath = match[1].trim();
    const language = match[2] || '';
    const content = match[3];

    const normalizedPath = normalizePath(rawPath);

    if (!isValidPath(normalizedPath)) {
      continue;
    }

    if (files.some(f => f.path === normalizedPath)) {
      continue;
    }

    files.push({
      path: normalizedPath,
      content: content.trimEnd(),
      language: language || getLanguageFromPath(normalizedPath),
    });
  }

  return files;
}

/**
 * Extract checklist items
 */
function extractChecklist(text: string): string[] {
  const items: string[] = [];
  const pattern = /[-*]\s*\[[ x]?\]\s*(.+)/gi;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    items.push(match[1].trim());
  }

  // If no checkbox items found, try regular list items
  if (items.length === 0) {
    const listPattern = /[-*]\s+(.+)/g;
    while ((match = listPattern.exec(text)) !== null) {
      items.push(match[1].trim());
    }
  }

  return items;
}

/**
 * Build a file tree structure from a list of files
 */
export function buildFileTree(files: GeneratedFile[]): FileTreeNode[] {
  const root: Map<string, FileTreeNode> = new Map();

  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      if (!currentLevel.has(part)) {
        const node: FileTreeNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          language: isFile ? file.language : undefined,
          children: isFile ? undefined : [],
        };
        currentLevel.set(part, node);
      }

      const currentNode = currentLevel.get(part)!;

      if (!isFile && currentNode.children) {
        const childMap = new Map<string, FileTreeNode>();
        for (const child of currentNode.children) {
          childMap.set(child.name, child);
        }
        currentLevel = childMap;

        // Update children array from map
        const existingNode = currentLevel.get(part);
        if (existingNode) {
          currentNode.children = Array.from(childMap.values());
        }
      }
    }
  }

  // Convert map to sorted array
  return sortFileTree(Array.from(root.values()));
}

/**
 * Sort file tree (folders first, then alphabetically)
 */
function sortFileTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.sort((a, b) => {
    // Folders come first
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    // Then sort alphabetically
    return a.name.localeCompare(b.name);
  }).map(node => {
    if (node.children) {
      node.children = sortFileTree(node.children);
    }
    return node;
  });
}

/**
 * Validate the parsed output and identify missing required files
 */
export function validateParsedOutput(parsed: ParsedOutput): {
  isValid: boolean;
  missingFiles: string[];
  score: number;
} {
  const requiredFiles = [
    'manifest.json',
    'package.json',
    'tsconfig.json',
  ];

  const recommendedPatterns = [
    /src\/.*\.(ts|tsx)$/,
    /README\.md$/i,
    /.*(webpack|vite)\.config\.(js|ts)$/,
  ];

  const missingFiles: string[] = [];
  let score = 0;

  // Check required files
  for (const required of requiredFiles) {
    if (parsed.files.some(f => f.path.endsWith(required))) {
      score += 20;
    } else {
      missingFiles.push(required);
    }
  }

  // Check recommended patterns
  for (const pattern of recommendedPatterns) {
    if (parsed.files.some(f => pattern.test(f.path))) {
      score += 10;
    }
  }

  // Bonus for having tests
  if (parsed.files.some(f => f.path.includes('test') || f.path.includes('spec'))) {
    score += 10;
  }

  // Bonus for documentation
  if (parsed.files.some(f => /README\.md$/i.test(f.path))) {
    score += 5;
  }
  if (parsed.files.some(f => /PRIVACY\.md$/i.test(f.path))) {
    score += 5;
  }

  return {
    isValid: missingFiles.length === 0,
    missingFiles,
    score: Math.min(score, 100),
  };
}

/**
 * Generate a repair prompt for missing files
 */
export function generateRepairPrompt(missingFiles: string[], originalPrompt: string): string {
  return `The previous generation was missing some required files. Please generate ONLY the following missing files:

${missingFiles.map(f => `- ${f}`).join('\n')}

Use the same format as before:

#### FILE: [path]
\`\`\`[language]
[content]
\`\`\`

Context from original request:
${originalPrompt.slice(0, 500)}...`;
}
