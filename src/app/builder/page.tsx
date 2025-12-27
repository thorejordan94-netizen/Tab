'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Edit,
  Loader2,
  RefreshCw,
  Sparkles,
  History,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useBuilderStore, useUIStore, useSettingsStore } from '@/lib/store';
import { parseEngineerOutput, buildFileTree, validateParsedOutput } from '@/lib/parser';
import { createZip, downloadZip, addPlaceholderIcons } from '@/lib/zip';
import { copyToClipboard, generateId } from '@/lib/utils';
import { addHistoryEntry, updateHistoryEntry, getApiKey } from '@/lib/db';
import type { BuilderStep, TargetBrowser, GeneratedFile, FileTreeNode } from '@/types';
import { CodeViewer } from '@/components/builder/CodeViewer';
import { FileTree } from '@/components/builder/FileTree';
import { HistorySidebar } from '@/components/builder/HistorySidebar';

// Rotating placeholder examples
const PLACEHOLDER_EXAMPLES = [
  'A tab manager that groups tabs by domain and lets me search across all open tabs quickly...',
  'An extension that saves articles for later reading and syncs across my devices...',
  'A productivity timer with Pomodoro technique, showing time in the badge...',
];

const STEPS: { id: BuilderStep; label: string }[] = [
  { id: 'input', label: 'Describe' },
  { id: 'architect', label: 'Refine Prompt' },
  { id: 'build', label: 'Generate' },
  { id: 'complete', label: 'Download' },
];

export default function BuilderPage() {
  const { toast } = useToast();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [streamedOutput, setStreamedOutput] = useState('');

  const {
    currentStep,
    setCurrentStep,
    userDraft,
    setUserDraft,
    advancedOptions,
    setAdvancedOptions,
    outputPrompt,
    setOutputPrompt,
    extensionName,
    setExtensionName,
    generatedFiles,
    setGeneratedFiles,
    setOverview,
    setRunInstructions,
    setStoreReadinessChecklist,
    status,
    setStatus,
    error,
    setError,
    currentGenerationId,
    setCurrentGenerationId,
    resetBuilder,
    overview,
    runInstructions,
    storeReadinessChecklist,
  } = useBuilderStore();

  const {
    isHistorySidebarOpen,
    setIsHistorySidebarOpen,
    selectedFile,
    setSelectedFile,
    activeResultTab,
    setActiveResultTab,
  } = useUIStore();

  const { defaultProvider, preferMinimalPermissions } = useSettingsStore();

  // Rotate placeholder examples
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Stage 1: Generate refined prompt
  const handleArchitect = useCallback(async () => {
    if (!userDraft.trim()) {
      toast({
        title: 'Please describe your extension',
        description: 'Enter your extension idea in the text area.',
        variant: 'destructive',
      });
      return;
    }

    const id = generateId();
    setCurrentGenerationId(id);
    setStatus('architecting');
    setError(null);
    setCurrentStep('architect');

    try {
      // Save to history
      await addHistoryEntry({
        id,
        timestamp: Date.now(),
        extensionName: advancedOptions.extensionName || 'New Extension',
        userDraft,
        outputPrompt: '',
        status: 'architecting',
      });

      const apiKey = getApiKey(advancedOptions.aiProvider);

      const response = await fetch('/api/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userDraft,
          advancedOptions: {
            ...advancedOptions,
            // Apply settings preferences
            aiProvider: advancedOptions.aiProvider || defaultProvider,
          },
          apiKey,
          provider: advancedOptions.aiProvider || defaultProvider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate prompt');
      }

      const data = await response.json();
      setOutputPrompt(data.outputPrompt);
      setExtensionName(data.suggestedName || advancedOptions.extensionName || 'My Extension');
      setStatus('idle');

      // Update history
      await updateHistoryEntry(id, {
        outputPrompt: data.outputPrompt,
        extensionName: data.suggestedName,
        status: 'pending',
      });

      toast({
        title: 'Prompt generated',
        description: 'Review and edit the refined prompt before building.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus('error');
      toast({
        title: 'Generation failed',
        description: message,
        variant: 'destructive',
      });
    }
  }, [userDraft, advancedOptions, defaultProvider, toast, setCurrentGenerationId, setStatus, setError, setCurrentStep, setOutputPrompt, setExtensionName]);

  // Stage 2: Build extension
  const handleBuild = useCallback(async () => {
    const promptToUse = isEditingPrompt ? editedPrompt : outputPrompt;

    if (!promptToUse.trim()) {
      toast({
        title: 'No prompt available',
        description: 'Please generate or enter a prompt first.',
        variant: 'destructive',
      });
      return;
    }

    setStatus('building');
    setError(null);
    setCurrentStep('build');
    setStreamedOutput('');

    try {
      const apiKey = getApiKey(advancedOptions.aiProvider);

      // Use streaming for real-time updates
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outputPrompt: promptToUse,
          extensionName,
          apiKey,
          provider: advancedOptions.aiProvider || defaultProvider,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to build extension');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullOutput = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                fullOutput += parsed.text;
                setStreamedOutput(fullOutput);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Parse the complete output
      setStatus('packaging');
      const parsed = parseEngineerOutput(fullOutput);
      const validation = validateParsedOutput(parsed);

      // Add placeholder icons if missing
      const filesWithIcons = addPlaceholderIcons(parsed.files);

      setGeneratedFiles(filesWithIcons);
      setOverview(parsed.overview);
      setRunInstructions(parsed.runInstructions);
      setStoreReadinessChecklist(parsed.storeReadinessChecklist);

      // Update history with result
      if (currentGenerationId) {
        await updateHistoryEntry(currentGenerationId, {
          status: 'complete',
          result: {
            id: currentGenerationId,
            timestamp: Date.now(),
            userDraft,
            outputPrompt: promptToUse,
            extensionName,
            files: filesWithIcons,
            overview: parsed.overview,
            runInstructions: parsed.runInstructions,
            status: validation.isValid ? 'success' : 'partial',
          },
        });
      }

      setStatus('complete');
      setCurrentStep('complete');

      if (parsed.warnings.length > 0) {
        toast({
          title: 'Extension generated with warnings',
          description: parsed.warnings.join(', '),
        });
      } else {
        toast({
          title: 'Extension built successfully',
          description: `Generated ${filesWithIcons.length} files.`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus('error');
      toast({
        title: 'Build failed',
        description: message,
        variant: 'destructive',
      });
    }
  }, [
    outputPrompt,
    isEditingPrompt,
    editedPrompt,
    extensionName,
    advancedOptions,
    defaultProvider,
    currentGenerationId,
    userDraft,
    toast,
    setStatus,
    setError,
    setCurrentStep,
    setGeneratedFiles,
    setOverview,
    setRunInstructions,
    setStoreReadinessChecklist,
  ]);

  // Download ZIP
  const handleDownload = useCallback(() => {
    if (generatedFiles.length === 0) return;

    const result = createZip(generatedFiles, extensionName);
    downloadZip(result, `${extensionName.toLowerCase().replace(/\s+/g, '-')}.zip`);

    toast({
      title: 'Download started',
      description: `${result.fileCount} files (${(result.size / 1024).toFixed(1)} KB)`,
    });
  }, [generatedFiles, extensionName, toast]);

  // Copy prompt
  const handleCopyPrompt = useCallback(async () => {
    const success = await copyToClipboard(outputPrompt);
    toast({
      title: success ? 'Copied to clipboard' : 'Copy failed',
      description: success ? 'The refined prompt has been copied.' : 'Could not copy to clipboard.',
    });
  }, [outputPrompt, toast]);

  // Get current step index
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold">Extension Foundry</span>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm text-muted-foreground">Builder</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistorySidebarOpen(true)}
            >
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
            <Button variant="ghost" size="sm" onClick={resetBuilder}>
              <RefreshCw className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    index <= currentStepIndex
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="w-4 h-4 flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 md:w-16 h-0.5 mx-2 transition-colors ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Step A: Input */}
          {currentStep === 'input' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="userDraft" className="text-lg font-medium">
                  Describe your extension idea
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Be as specific as possible about what you want your extension to do.
                </p>
                <Textarea
                  id="userDraft"
                  value={userDraft}
                  onChange={(e) => setUserDraft(e.target.value)}
                  placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
                  className="min-h-[200px] text-base"
                />
              </div>

              {/* Advanced Options */}
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isAdvancedOpen ? 'rotate-180' : ''
                      }`}
                    />
                    Advanced Options
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4 p-4 border rounded-lg bg-white">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="extensionName">Extension Name (optional)</Label>
                      <Input
                        id="extensionName"
                        value={advancedOptions.extensionName}
                        onChange={(e) =>
                          setAdvancedOptions({ extensionName: e.target.value })
                        }
                        placeholder="My Awesome Extension"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>AI Provider</Label>
                      <Select
                        value={advancedOptions.aiProvider}
                        onValueChange={(v) =>
                          setAdvancedOptions({ aiProvider: v as 'openai' | 'anthropic' })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Target Browsers</Label>
                    <div className="flex gap-4 mt-2">
                      {(['chrome', 'edge', 'firefox'] as TargetBrowser[]).map(
                        (browser) => (
                          <label
                            key={browser}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={advancedOptions.targetBrowsers.includes(browser)}
                              onCheckedChange={(checked) => {
                                const browsers = checked
                                  ? [...advancedOptions.targetBrowsers, browser]
                                  : advancedOptions.targetBrowsers.filter(
                                      (b) => b !== browser
                                    );
                                setAdvancedOptions({ targetBrowsers: browsers });
                              }}
                            />
                            <span className="text-sm capitalize">{browser}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="hostPermissions">
                      Target Sites / Host Permissions (optional)
                    </Label>
                    <Input
                      id="hostPermissions"
                      value={advancedOptions.hostPermissions}
                      onChange={(e) =>
                        setAdvancedOptions({ hostPermissions: e.target.value })
                      }
                      placeholder="e.g., *://*.github.com/*"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="specialRequirements">
                      Special UX Requirements (optional)
                    </Label>
                    <Textarea
                      id="specialRequirements"
                      value={advancedOptions.specialRequirements}
                      onChange={(e) =>
                        setAdvancedOptions({ specialRequirements: e.target.value })
                      }
                      placeholder="e.g., Dark mode support, keyboard shortcuts..."
                      className="mt-1 min-h-[80px]"
                    />
                  </div>

                  <div>
                    <Label>Styling Choice</Label>
                    <Select
                      value={advancedOptions.stylingChoice}
                      onValueChange={(v) =>
                        setAdvancedOptions({
                          stylingChoice: v as 'tailwind' | 'css-modules' | 'plain-css',
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tailwind">TailwindCSS</SelectItem>
                        <SelectItem value="css-modules">CSS Modules</SelectItem>
                        <SelectItem value="plain-css">Plain CSS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Privacy Note */}
              <p className="text-xs text-muted-foreground">
                Your extension idea is processed by AI and is not stored on our servers.
                API keys are stored locally in your browser.
              </p>

              {/* Generate Button */}
              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={handleArchitect}
                  disabled={status === 'architecting' || !userDraft.trim()}
                  className="gap-2"
                >
                  {status === 'architecting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Architecting Prompt...
                    </>
                  ) : (
                    <>
                      Generate
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step B: Architect Output */}
          {currentStep === 'architect' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">Refined Engineering Prompt</h2>
                  <p className="text-sm text-muted-foreground">
                    Review and optionally edit the AI-generated prompt before building.
                  </p>
                </div>
                <Badge variant="secondary">{extensionName}</Badge>
              </div>

              {isEditingPrompt ? (
                <div className="space-y-4">
                  <Textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingPrompt(false);
                        setEditedPrompt('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        setOutputPrompt(editedPrompt);
                        setIsEditingPrompt(false);
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <ScrollArea className="h-[400px] rounded-lg border bg-slate-950 p-4">
                    <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono">
                      {outputPrompt}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {!isEditingPrompt && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleCopyPrompt}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Prompt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditedPrompt(outputPrompt);
                      setIsEditingPrompt(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Prompt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleArchitect}
                    disabled={status === 'architecting'}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setCurrentStep('input')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleBuild}
                  disabled={status === 'building' || status === 'packaging'}
                  className="gap-2"
                >
                  {status === 'building' || status === 'packaging' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {status === 'building' ? 'Building Extension...' : 'Packaging...'}
                    </>
                  ) : (
                    <>
                      Build Extension
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Streaming output preview */}
              {(status === 'building' || status === 'packaging') && streamedOutput && (
                <div className="mt-6">
                  <Label>Build Progress</Label>
                  <ScrollArea className="h-[200px] mt-2 rounded-lg border bg-slate-950 p-4">
                    <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">
                      {streamedOutput.slice(-2000)}...
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Step C: Build Progress */}
          {currentStep === 'build' && status !== 'complete' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center">
                <h2 className="text-xl font-medium">
                  {status === 'building'
                    ? 'Building your extension...'
                    : 'Packaging files...'}
                </h2>
                <p className="text-muted-foreground mt-2">
                  This may take a minute. Please don&apos;t close this page.
                </p>
              </div>
              {streamedOutput && (
                <ScrollArea className="h-[300px] w-full max-w-2xl rounded-lg border bg-slate-950 p-4">
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">
                    {streamedOutput}
                  </pre>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Step D: Complete */}
          {currentStep === 'complete' && status === 'complete' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-medium">{extensionName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {generatedFiles.length} files generated
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleBuild}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download ZIP
                  </Button>
                </div>
              </div>

              <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="files">File Tree</TabsTrigger>
                  <TabsTrigger value="code">Code</TabsTrigger>
                  <TabsTrigger value="docs">Docs</TabsTrigger>
                  <TabsTrigger value="tests">Tests</TabsTrigger>
                  <TabsTrigger value="run">Run</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="p-4 rounded-lg border bg-white space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Summary</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {overview || 'Extension generated successfully.'}
                      </p>
                    </div>
                    {storeReadinessChecklist.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Store Readiness Checklist</h3>
                        <ul className="space-y-1">
                          {storeReadinessChecklist.map((item, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-center gap-2"
                            >
                              <Checkbox id={`check-${i}`} />
                              <label
                                htmlFor={`check-${i}`}
                                className="cursor-pointer"
                              >
                                {item}
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="files" className="mt-4">
                  <div className="rounded-lg border bg-white p-4">
                    <FileTree
                      nodes={buildFileTree(generatedFiles)}
                      selectedPath={selectedFile}
                      onSelect={(path) => {
                        setSelectedFile(path);
                        setActiveResultTab('code');
                      }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="code" className="mt-4">
                  <div className="grid lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1 rounded-lg border bg-white p-2 max-h-[600px] overflow-auto">
                      <FileTree
                        nodes={buildFileTree(generatedFiles)}
                        selectedPath={selectedFile}
                        onSelect={setSelectedFile}
                        compact
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <CodeViewer
                        files={generatedFiles}
                        selectedPath={selectedFile || generatedFiles[0]?.path}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="docs" className="mt-4">
                  <div className="space-y-4">
                    {generatedFiles
                      .filter((f) => f.path.includes('docs/') || f.path.endsWith('.md'))
                      .map((file) => (
                        <div
                          key={file.path}
                          className="rounded-lg border bg-white p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">{file.path}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(file.content)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <ScrollArea className="h-[300px]">
                            <pre className="text-sm whitespace-pre-wrap">
                              {file.content}
                            </pre>
                          </ScrollArea>
                        </div>
                      ))}
                    {generatedFiles.filter(
                      (f) => f.path.includes('docs/') || f.path.endsWith('.md')
                    ).length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        No documentation files generated.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tests" className="mt-4">
                  <div className="space-y-4">
                    {generatedFiles
                      .filter(
                        (f) =>
                          f.path.includes('test') ||
                          f.path.includes('spec') ||
                          f.path.endsWith('.test.ts') ||
                          f.path.endsWith('.test.tsx')
                      )
                      .map((file) => (
                        <div
                          key={file.path}
                          className="rounded-lg border bg-white p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">{file.path}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(file.content)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <CodeViewer files={[file]} selectedPath={file.path} />
                        </div>
                      ))}
                    {generatedFiles.filter(
                      (f) =>
                        f.path.includes('test') ||
                        f.path.includes('spec')
                    ).length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        No test files generated.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="run" className="mt-4">
                  <div className="rounded-lg border bg-white p-4">
                    <h3 className="font-medium mb-4">Run Instructions</h3>
                    <div className="bg-slate-950 rounded-lg p-4">
                      <pre className="text-sm text-slate-200 whitespace-pre-wrap">
                        {runInstructions || `1. Unzip the downloaded file
2. Open Chrome and go to chrome://extensions
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the unzipped folder
5. The extension should now appear in your toolbar`}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setCurrentStep('architect')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Prompt
                </Button>
                <Button variant="outline" onClick={resetBuilder}>
                  Start New Extension
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && error && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-medium">Something went wrong</h2>
              <p className="text-muted-foreground text-center max-w-md">{error}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetBuilder}>
                  Start Over
                </Button>
                <Button
                  onClick={
                    currentStep === 'architect' ? handleArchitect : handleBuild
                  }
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistorySidebarOpen}
        onClose={() => setIsHistorySidebarOpen(false)}
      />
    </div>
  );
}
