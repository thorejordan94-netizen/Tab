import { describe, it, expect } from 'vitest';
import {
  parseEngineerOutput,
  buildFileTree,
  validateParsedOutput,
  generateRepairPrompt,
} from '../src/lib/parser';

describe('parseEngineerOutput', () => {
  it('should extract overview section', () => {
    const output = `### OVERVIEW
- A tab manager extension
- Allows grouping tabs by domain
- Quick search functionality

### FILE_TREE
\`\`\`
my-extension/
└── manifest.json
\`\`\`

### FILES
#### FILE: manifest.json
\`\`\`json
{ "name": "test" }
\`\`\``;

    const result = parseEngineerOutput(output);
    expect(result.overview).toContain('tab manager');
  });

  it('should extract files with correct paths', () => {
    const output = `### OVERVIEW
Test extension

### FILES
#### FILE: manifest.json
\`\`\`json
{
  "manifest_version": 3,
  "name": "Test"
}
\`\`\`

#### FILE: src/background/service-worker.ts
\`\`\`typescript
console.log('Hello');
\`\`\`

#### FILE: package.json
\`\`\`json
{
  "name": "test"
}
\`\`\`

### RUN_INSTRUCTIONS
\`\`\`
npm install
\`\`\``;

    const result = parseEngineerOutput(output);
    expect(result.files).toHaveLength(3);
    expect(result.files.map((f) => f.path)).toEqual([
      'manifest.json',
      'src/background/service-worker.ts',
      'package.json',
    ]);
  });

  it('should extract file content correctly', () => {
    const output = `### FILES
#### FILE: test.ts
\`\`\`typescript
function hello() {
  return 'world';
}

export default hello;
\`\`\``;

    const result = parseEngineerOutput(output);
    expect(result.files[0].content).toContain("return 'world'");
    expect(result.files[0].language).toBe('typescript');
  });

  it('should handle missing sections gracefully', () => {
    const output = `### FILES
#### FILE: manifest.json
\`\`\`json
{}
\`\`\``;

    const result = parseEngineerOutput(output);
    expect(result.overview).toBeDefined();
    expect(result.runInstructions).toBeDefined();
    expect(result.storeReadinessChecklist).toEqual([]);
  });

  it('should extract store readiness checklist', () => {
    const output = `### STORE_READINESS_CHECKLIST
- [ ] Create proper icons
- [ ] Write privacy policy
- [ ] Test on Chrome`;

    const result = parseEngineerOutput(output);
    expect(result.storeReadinessChecklist).toHaveLength(3);
    expect(result.storeReadinessChecklist[0]).toBe('Create proper icons');
  });

  it('should add warnings for missing required files', () => {
    const output = `### FILES
#### FILE: src/index.ts
\`\`\`typescript
console.log('hello');
\`\`\``;

    const result = parseEngineerOutput(output);
    expect(result.warnings).toContain('Missing required file: manifest.json');
    expect(result.warnings).toContain('Missing required file: package.json');
    expect(result.warnings).toContain('Missing required file: tsconfig.json');
  });

  it('should handle various file header formats', () => {
    const output = `### FILES
#### FILE: file1.ts
\`\`\`typescript
code1
\`\`\`

**FILE:** file2.ts
\`\`\`typescript
code2
\`\`\`

FILE: \`file3.ts\`
\`\`\`typescript
code3
\`\`\``;

    const result = parseEngineerOutput(output);
    expect(result.files.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject paths with directory traversal', () => {
    const output = `### FILES
#### FILE: ../../../etc/passwd
\`\`\`
malicious content
\`\`\`

#### FILE: safe.ts
\`\`\`typescript
console.log('safe');
\`\`\``;

    const result = parseEngineerOutput(output);
    expect(result.files.map((f) => f.path)).not.toContain('../../../etc/passwd');
    expect(result.files.some((f) => f.path === 'safe.ts')).toBe(true);
    expect(result.warnings.some((w) => w.includes('invalid path'))).toBe(true);
  });
});

describe('buildFileTree', () => {
  it('should build a correct tree structure', () => {
    const files = [
      { path: 'src/index.ts', content: '', language: 'typescript' },
      { path: 'src/utils/helper.ts', content: '', language: 'typescript' },
      { path: 'package.json', content: '', language: 'json' },
    ];

    const tree = buildFileTree(files);

    // Root level should have src folder and package.json
    expect(tree.length).toBe(2);

    // Find src folder
    const srcFolder = tree.find((n) => n.name === 'src');
    expect(srcFolder).toBeDefined();
    expect(srcFolder?.type).toBe('folder');
    expect(srcFolder?.children?.length).toBe(2); // index.ts and utils folder
  });

  it('should sort folders before files', () => {
    const files = [
      { path: 'a.ts', content: '', language: 'typescript' },
      { path: 'z-folder/file.ts', content: '', language: 'typescript' },
      { path: 'b.ts', content: '', language: 'typescript' },
    ];

    const tree = buildFileTree(files);

    // Folder should come first
    expect(tree[0].type).toBe('folder');
    expect(tree[0].name).toBe('z-folder');
  });
});

describe('validateParsedOutput', () => {
  it('should validate complete output', () => {
    const parsed = {
      overview: 'Test',
      files: [
        { path: 'manifest.json', content: '{}', language: 'json' },
        { path: 'package.json', content: '{}', language: 'json' },
        { path: 'tsconfig.json', content: '{}', language: 'json' },
        { path: 'src/index.ts', content: '', language: 'typescript' },
      ],
      fileTree: '',
      runInstructions: '',
      storeReadinessChecklist: [],
      warnings: [],
    };

    const result = validateParsedOutput(parsed);
    expect(result.isValid).toBe(true);
    expect(result.missingFiles).toHaveLength(0);
    expect(result.score).toBeGreaterThan(50);
  });

  it('should identify missing required files', () => {
    const parsed = {
      overview: 'Test',
      files: [{ path: 'src/index.ts', content: '', language: 'typescript' }],
      fileTree: '',
      runInstructions: '',
      storeReadinessChecklist: [],
      warnings: [],
    };

    const result = validateParsedOutput(parsed);
    expect(result.isValid).toBe(false);
    expect(result.missingFiles).toContain('manifest.json');
    expect(result.missingFiles).toContain('package.json');
  });

  it('should give bonus points for tests and docs', () => {
    const parsedWithoutExtras = {
      overview: 'Test',
      files: [
        { path: 'manifest.json', content: '{}', language: 'json' },
        { path: 'package.json', content: '{}', language: 'json' },
        { path: 'tsconfig.json', content: '{}', language: 'json' },
      ],
      fileTree: '',
      runInstructions: '',
      storeReadinessChecklist: [],
      warnings: [],
    };

    const parsedWithExtras = {
      ...parsedWithoutExtras,
      files: [
        ...parsedWithoutExtras.files,
        { path: 'tests/index.test.ts', content: '', language: 'typescript' },
        { path: 'README.md', content: '', language: 'markdown' },
        { path: 'PRIVACY.md', content: '', language: 'markdown' },
      ],
    };

    const resultWithout = validateParsedOutput(parsedWithoutExtras);
    const resultWith = validateParsedOutput(parsedWithExtras);

    expect(resultWith.score).toBeGreaterThan(resultWithout.score);
  });
});

describe('generateRepairPrompt', () => {
  it('should generate repair prompt for missing files', () => {
    const missingFiles = ['manifest.json', 'package.json'];
    const originalPrompt = 'Build a tab manager extension...';

    const repairPrompt = generateRepairPrompt(missingFiles, originalPrompt);

    expect(repairPrompt).toContain('manifest.json');
    expect(repairPrompt).toContain('package.json');
    expect(repairPrompt).toContain('Build a tab manager');
  });
});
