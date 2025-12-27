import { describe, it, expect } from 'vitest';
import {
  createZip,
  generatePlaceholderIcon,
  addPlaceholderIcons,
  calculateTotalSize,
  getFileStats,
} from '../src/lib/zip';
import type { GeneratedFile } from '../src/types';

describe('createZip', () => {
  it('should create a zip with correct file count', () => {
    const files: GeneratedFile[] = [
      { path: 'manifest.json', content: '{}', language: 'json' },
      { path: 'src/index.ts', content: 'console.log("hello")', language: 'typescript' },
      { path: 'package.json', content: '{"name": "test"}', language: 'json' },
    ];

    const result = createZip(files, 'test-extension');

    expect(result.fileCount).toBe(3);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.type).toBe('application/zip');
    expect(result.size).toBeGreaterThan(0);
  });

  it('should sanitize project name correctly', () => {
    const files: GeneratedFile[] = [
      { path: 'test.txt', content: 'hello', language: 'text' },
    ];

    // Test with special characters
    const result = createZip(files, 'My Extension! (v2.0)');

    expect(result.fileCount).toBe(1);
    expect(result.size).toBeGreaterThan(0);
  });

  it('should skip files with invalid paths', () => {
    const files: GeneratedFile[] = [
      { path: '../../../etc/passwd', content: 'malicious', language: 'text' },
      { path: 'valid.txt', content: 'hello', language: 'text' },
    ];

    const result = createZip(files, 'test');

    // Should only include the valid file
    expect(result.fileCount).toBe(1);
  });

  it('should handle empty file list', () => {
    const result = createZip([], 'empty-project');

    expect(result.fileCount).toBe(0);
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('should handle files with unicode content', () => {
    const files: GeneratedFile[] = [
      { path: 'readme.md', content: '# Hello 你好 🌍', language: 'markdown' },
    ];

    const result = createZip(files, 'unicode-test');

    expect(result.fileCount).toBe(1);
    expect(result.size).toBeGreaterThan(0);
  });
});

describe('generatePlaceholderIcon', () => {
  it('should generate SVG icon with correct dimensions', () => {
    const icon16 = generatePlaceholderIcon(16);
    const icon128 = generatePlaceholderIcon(128);

    expect(icon16).toContain('width="16"');
    expect(icon16).toContain('height="16"');
    expect(icon128).toContain('width="128"');
    expect(icon128).toContain('height="128"');
  });

  it('should use custom color when provided', () => {
    const icon = generatePlaceholderIcon(32, '#ff0000');

    expect(icon).toContain('#ff0000');
  });

  it('should use default color when not provided', () => {
    const icon = generatePlaceholderIcon(32);

    expect(icon).toContain('#4285f4');
  });

  it('should generate valid SVG', () => {
    const icon = generatePlaceholderIcon(48);

    expect(icon).toContain('<svg');
    expect(icon).toContain('</svg>');
    expect(icon).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

describe('addPlaceholderIcons', () => {
  it('should add placeholder icons when missing', () => {
    const files: GeneratedFile[] = [
      { path: 'manifest.json', content: '{}', language: 'json' },
    ];

    const result = addPlaceholderIcons(files);

    // Should have original file plus 4 icons and a readme
    expect(result.length).toBe(6);
    expect(result.some((f) => f.path.includes('icon16'))).toBe(true);
    expect(result.some((f) => f.path.includes('icon32'))).toBe(true);
    expect(result.some((f) => f.path.includes('icon48'))).toBe(true);
    expect(result.some((f) => f.path.includes('icon128'))).toBe(true);
    expect(result.some((f) => f.path.includes('REPLACE_ICONS.md'))).toBe(true);
  });

  it('should not duplicate existing icons', () => {
    const files: GeneratedFile[] = [
      { path: 'manifest.json', content: '{}', language: 'json' },
      { path: 'public/icons/icon16.png', content: 'binary', language: 'binary' },
      { path: 'public/icons/icon128.png', content: 'binary', language: 'binary' },
    ];

    const result = addPlaceholderIcons(files);

    // Should not add icon16 and icon128 since they exist
    const iconFiles = result.filter((f) => f.path.includes('icon'));
    expect(iconFiles.length).toBe(4); // 2 existing + 2 new (32, 48)
  });
});

describe('calculateTotalSize', () => {
  it('should calculate correct total size', () => {
    const files: GeneratedFile[] = [
      { path: 'a.txt', content: 'hello', language: 'text' }, // 5 bytes
      { path: 'b.txt', content: 'world', language: 'text' }, // 5 bytes
    ];

    const size = calculateTotalSize(files);

    expect(size).toBe(10);
  });

  it('should handle empty files', () => {
    const files: GeneratedFile[] = [
      { path: 'empty.txt', content: '', language: 'text' },
    ];

    const size = calculateTotalSize(files);

    expect(size).toBe(0);
  });

  it('should handle unicode correctly', () => {
    const files: GeneratedFile[] = [
      { path: 'unicode.txt', content: '你好', language: 'text' }, // 6 bytes in UTF-8
    ];

    const size = calculateTotalSize(files);

    expect(size).toBe(6);
  });
});

describe('getFileStats', () => {
  it('should count files by extension', () => {
    const files: GeneratedFile[] = [
      { path: 'a.ts', content: '', language: 'typescript' },
      { path: 'b.ts', content: '', language: 'typescript' },
      { path: 'c.tsx', content: '', language: 'tsx' },
      { path: 'd.json', content: '', language: 'json' },
    ];

    const stats = getFileStats(files);

    expect(stats['ts']).toBe(2);
    expect(stats['tsx']).toBe(1);
    expect(stats['json']).toBe(1);
  });

  it('should handle files without extensions', () => {
    const files: GeneratedFile[] = [
      { path: 'Dockerfile', content: '', language: 'dockerfile' },
      { path: '.gitignore', content: '', language: 'text' },
    ];

    const stats = getFileStats(files);

    expect(stats['Dockerfile']).toBe(1);
    expect(stats['gitignore']).toBe(1);
  });
});
