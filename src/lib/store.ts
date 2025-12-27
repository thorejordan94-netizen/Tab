/**
 * Global state management using Zustand
 * Manages builder state, history, and settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BuilderStep,
  GenerationStatus,
  AdvancedOptions,
  GeneratedFile,
  HistoryEntry,
  UserSettings,
  AIProvider,
} from '@/types';

// ============================================================================
// Builder Store
// ============================================================================

interface BuilderState {
  // Current step
  currentStep: BuilderStep;
  setCurrentStep: (step: BuilderStep) => void;

  // User input
  userDraft: string;
  setUserDraft: (draft: string) => void;

  // Advanced options
  advancedOptions: AdvancedOptions;
  setAdvancedOptions: (options: Partial<AdvancedOptions>) => void;
  resetAdvancedOptions: () => void;

  // Stage 1 output
  outputPrompt: string;
  setOutputPrompt: (prompt: string) => void;
  isPromptEdited: boolean;
  setIsPromptEdited: (edited: boolean) => void;

  // Stage 2 output
  extensionName: string;
  setExtensionName: (name: string) => void;
  generatedFiles: GeneratedFile[];
  setGeneratedFiles: (files: GeneratedFile[]) => void;
  overview: string;
  setOverview: (overview: string) => void;
  runInstructions: string;
  setRunInstructions: (instructions: string) => void;
  storeReadinessChecklist: string[];
  setStoreReadinessChecklist: (checklist: string[]) => void;

  // Generation status
  status: GenerationStatus;
  setStatus: (status: GenerationStatus) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Current generation ID
  currentGenerationId: string | null;
  setCurrentGenerationId: (id: string | null) => void;

  // Reset the builder to initial state
  resetBuilder: () => void;

  // Load from history entry
  loadFromHistory: (entry: HistoryEntry) => void;
}

const defaultAdvancedOptions: AdvancedOptions = {
  extensionName: '',
  targetBrowsers: ['chrome'],
  hostPermissions: '',
  aiProvider: 'openai',
  specialRequirements: '',
  stylingChoice: 'tailwind',
};

export const useBuilderStore = create<BuilderState>()((set) => ({
  // Current step
  currentStep: 'input',
  setCurrentStep: (step) => set({ currentStep: step }),

  // User input
  userDraft: '',
  setUserDraft: (draft) => set({ userDraft: draft }),

  // Advanced options
  advancedOptions: { ...defaultAdvancedOptions },
  setAdvancedOptions: (options) =>
    set((state) => ({
      advancedOptions: { ...state.advancedOptions, ...options },
    })),
  resetAdvancedOptions: () => set({ advancedOptions: { ...defaultAdvancedOptions } }),

  // Stage 1 output
  outputPrompt: '',
  setOutputPrompt: (prompt) => set({ outputPrompt: prompt }),
  isPromptEdited: false,
  setIsPromptEdited: (edited) => set({ isPromptEdited: edited }),

  // Stage 2 output
  extensionName: '',
  setExtensionName: (name) => set({ extensionName: name }),
  generatedFiles: [],
  setGeneratedFiles: (files) => set({ generatedFiles: files }),
  overview: '',
  setOverview: (overview) => set({ overview: overview }),
  runInstructions: '',
  setRunInstructions: (instructions) => set({ runInstructions: instructions }),
  storeReadinessChecklist: [],
  setStoreReadinessChecklist: (checklist) =>
    set({ storeReadinessChecklist: checklist }),

  // Generation status
  status: 'idle',
  setStatus: (status) => set({ status }),
  error: null,
  setError: (error) => set({ error }),

  // Current generation ID
  currentGenerationId: null,
  setCurrentGenerationId: (id) => set({ currentGenerationId: id }),

  // Reset
  resetBuilder: () =>
    set({
      currentStep: 'input',
      userDraft: '',
      advancedOptions: { ...defaultAdvancedOptions },
      outputPrompt: '',
      isPromptEdited: false,
      extensionName: '',
      generatedFiles: [],
      overview: '',
      runInstructions: '',
      storeReadinessChecklist: [],
      status: 'idle',
      error: null,
      currentGenerationId: null,
    }),

  // Load from history
  loadFromHistory: (entry) =>
    set({
      userDraft: entry.userDraft,
      outputPrompt: entry.outputPrompt,
      extensionName: entry.extensionName,
      generatedFiles: entry.result?.files || [],
      overview: entry.result?.overview || '',
      runInstructions: entry.result?.runInstructions || '',
      currentStep: entry.status === 'complete' ? 'complete' : 'input',
      status: entry.status === 'complete' ? 'complete' : 'idle',
      currentGenerationId: entry.id,
    }),
}));

// ============================================================================
// Settings Store (persisted)
// ============================================================================

interface SettingsState extends UserSettings {
  updateSettings: (settings: Partial<UserSettings>) => void;
  setApiKey: (provider: AIProvider, key: string) => void;
  removeApiKey: (provider: AIProvider) => void;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  stage1Model: 'gpt-4o-mini',
  stage2Model: 'gpt-4o',
  preferMinimalPermissions: true,
  preferChromeOnly: true,
  includeContentScriptOverlays: false,
  defaultProvider: 'openai',
  defaultStyling: 'tailwind',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),

      setApiKey: (provider, key) =>
        set((state) => ({
          ...state,
          [`${provider}ApiKey`]: key,
        })),

      removeApiKey: (provider) =>
        set((state) => ({
          ...state,
          [`${provider}ApiKey`]: undefined,
        })),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'extension-foundry-settings',
      partialize: (state) => ({
        // Don't persist API keys in the store - they go to localStorage separately
        stage1Model: state.stage1Model,
        stage2Model: state.stage2Model,
        preferMinimalPermissions: state.preferMinimalPermissions,
        preferChromeOnly: state.preferChromeOnly,
        includeContentScriptOverlays: state.includeContentScriptOverlays,
        defaultProvider: state.defaultProvider,
        defaultStyling: state.defaultStyling,
      }),
    }
  )
);

// ============================================================================
// UI Store (for modals, sidebars, etc.)
// ============================================================================

interface UIState {
  isSampleModalOpen: boolean;
  setIsSampleModalOpen: (open: boolean) => void;

  isHistorySidebarOpen: boolean;
  setIsHistorySidebarOpen: (open: boolean) => void;

  selectedFile: string | null;
  setSelectedFile: (path: string | null) => void;

  activeResultTab: string;
  setActiveResultTab: (tab: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isSampleModalOpen: false,
  setIsSampleModalOpen: (open) => set({ isSampleModalOpen: open }),

  isHistorySidebarOpen: false,
  setIsHistorySidebarOpen: (open) => set({ isHistorySidebarOpen: open }),

  selectedFile: null,
  setSelectedFile: (path) => set({ selectedFile: path }),

  activeResultTab: 'overview',
  setActiveResultTab: (tab) => set({ activeResultTab: tab }),
}));
