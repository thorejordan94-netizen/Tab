/**
 * ZIP generation utilities for packaging extension projects
 * Uses fflate for fast, browser-compatible ZIP creation
 */

import { zipSync, strToU8 } from 'fflate';
import type { GeneratedFile } from '@/types';
import { isValidPath } from './utils';

export interface ZipResult {
  blob: Blob;
  size: number;
  fileCount: number;
}

/**
 * Create a ZIP file from generated files
 */
export function createZip(files: GeneratedFile[], projectName: string): ZipResult {
  const zipData: { [path: string]: Uint8Array } = {};
  let fileCount = 0;

  // Sanitize project name for use as root folder
  const rootFolder = sanitizeProjectName(projectName);

  for (const file of files) {
    // Validate path to prevent directory traversal
    if (!isValidPath(file.path)) {
      console.warn(`Skipping file with invalid path: ${file.path}`);
      continue;
    }

    // Create full path with root folder
    const fullPath = `${rootFolder}/${file.path}`;

    // Convert content to Uint8Array
    zipData[fullPath] = strToU8(file.content);
    fileCount++;
  }

  // Create the ZIP
  const zipped = zipSync(zipData, {
    level: 6, // Compression level (0-9)
    mtime: new Date(),
  });

  const blob = new Blob([zipped], { type: 'application/zip' });

  return {
    blob,
    size: blob.size,
    fileCount,
  };
}

/**
 * Sanitize project name for use as folder name
 */
function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'extension';
}

/**
 * Download a ZIP file
 */
export function downloadZip(result: ZipResult, filename: string): void {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate placeholder icon data (PNG)
 * Returns a simple colored square as a placeholder
 */
export function generatePlaceholderIcon(size: number, color: string = '#4285f4'): string {
  // Create a simple SVG that can be used as an icon placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="${color}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="white" font-family="system-ui, sans-serif" font-weight="bold" font-size="${size * 0.5}">E</text>
</svg>`;
  return svg;
}

/**
 * Create icon files and add them to the file list
 * This adds placeholder SVG icons that users can replace later
 */
export function addPlaceholderIcons(files: GeneratedFile[]): GeneratedFile[] {
  const sizes = [16, 32, 48, 128];
  const iconFiles: GeneratedFile[] = [];

  for (const size of sizes) {
    const iconPath = `public/icons/icon${size}.svg`;

    // Check if icon already exists
    if (files.some(f => f.path.includes(`icon${size}`))) {
      continue;
    }

    iconFiles.push({
      path: iconPath,
      content: generatePlaceholderIcon(size),
      language: 'xml',
    });
  }

  // Also add a note file about replacing icons
  const iconNotePath = 'public/icons/REPLACE_ICONS.md';
  if (!files.some(f => f.path === iconNotePath)) {
    iconFiles.push({
      path: iconNotePath,
      content: `# Extension Icons

These are placeholder icons. Replace them with your own icons before publishing.

## Required Sizes
- icon16.png - Toolbar icon (16x16)
- icon32.png - Windows computers (32x32)
- icon48.png - Extensions management page (48x48)
- icon128.png - Chrome Web Store (128x128)

## Tips
- Use PNG format with transparency
- Keep icons simple and recognizable at small sizes
- Follow Chrome's icon design guidelines
`,
      language: 'markdown',
    });
  }

  return [...files, ...iconFiles];
}

/**
 * Calculate total size of all files
 */
export function calculateTotalSize(files: GeneratedFile[]): number {
  return files.reduce((total, file) => {
    return total + new TextEncoder().encode(file.content).length;
  }, 0);
}

/**
 * Get file type statistics
 */
export function getFileStats(files: GeneratedFile[]): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const file of files) {
    const ext = file.path.split('.').pop() || 'unknown';
    stats[ext] = (stats[ext] || 0) + 1;
  }

  return stats;
}
