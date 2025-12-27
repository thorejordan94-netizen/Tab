// Core types for Extension Foundry

export type AIProvider = 'openai' | 'anthropic' | 'gemini';
export type StylingChoice = 'tailwind' | 'css-modules' | 'plain-css';
export type TargetBrowser = 'chrome' | 'edge' | 'firefox';
export type BuilderStep = 'input' | 'architect' | 'build' | 'complete';
export type GenerationStatus = 'idle' | 'architecting' | 'building' | 'packaging' | 'complete' | 'error';

export interface AdvancedOptions {
  extensionName?: string;
  targetBrowsers: TargetBrowser[];
  hostPermissions?: string;
  aiProvider: AIProvider;
  specialRequirements?: string;
  stylingChoice: StylingChoice;
}

export interface BuilderInput {
  userDraft: string;
  advancedOptions: AdvancedOptions;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface GenerationResult {
  id: string;
  timestamp: number;
  userDraft: string;
  outputPrompt: string;
  extensionName: string;
  files: GeneratedFile[];
  overview: string;
  runInstructions: string;
  status: 'success' | 'partial' | 'error';
  error?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  extensionName: string;
  userDraft: string;
  outputPrompt: string;
  result?: GenerationResult;
  status: 'pending' | 'architecting' | 'building' | 'complete' | 'error';
}

export interface UserSettings {
  // API Key management (stored in localStorage, never sent to server logs)
  openaiApiKey?: string;
  anthropicApiKey?: string;

  // Model preferences
  stage1Model: string;
  stage2Model: string;

  // Output preferences
  preferMinimalPermissions: boolean;
  preferChromeOnly: boolean;
  includeContentScriptOverlays: boolean;

  // Default advanced options
  defaultProvider: AIProvider;
  defaultStyling: StylingChoice;
}

export interface ArchitectRequest {
  userDraft: string;
  advancedOptions: AdvancedOptions;
}

export interface ArchitectResponse {
  outputPrompt: string;
  suggestedName: string;
}

export interface BuildRequest {
  outputPrompt: string;
  extensionName: string;
}

export interface BuildResponse {
  files: GeneratedFile[];
  overview: string;
  runInstructions: string;
  storeReadinessChecklist: string[];
}

export interface StreamChunk {
  type: 'text' | 'file' | 'complete' | 'error';
  content: string;
  file?: GeneratedFile;
}

// Rate limiting types
export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

// File tree types for UI
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  language?: string;
}
