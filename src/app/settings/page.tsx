'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Key,
  Eye,
  EyeOff,
  Trash2,
  Save,
  AlertTriangle,
  Sparkles,
  Shield,
  Download,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useSettingsStore } from '@/lib/store';
import {
  storeApiKey,
  getApiKey,
  removeApiKey,
  hasApiKey,
  clearAllHistory,
  exportHistory,
  importHistory,
} from '@/lib/db';

export default function SettingsPage() {
  const { toast } = useToast();
  const settings = useSettingsStore();

  // API Key state
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  // Load existing keys on mount
  useEffect(() => {
    setHasOpenaiKey(hasApiKey('openai'));
    setHasAnthropicKey(hasApiKey('anthropic'));
    setHasGeminiKey(hasApiKey('gemini'));
  }, []);

  const handleSaveOpenaiKey = () => {
    if (!openaiKey.trim()) {
      toast({
        title: 'API key required',
        description: 'Please enter an OpenAI API key.',
        variant: 'destructive',
      });
      return;
    }

    if (!openaiKey.startsWith('sk-')) {
      toast({
        title: 'Invalid API key format',
        description: 'OpenAI API keys should start with "sk-".',
        variant: 'destructive',
      });
      return;
    }

    storeApiKey('openai', openaiKey);
    setHasOpenaiKey(true);
    setOpenaiKey('');
    toast({
      title: 'API key saved',
      description: 'Your OpenAI API key has been saved locally.',
    });
  };

  const handleSaveAnthropicKey = () => {
    if (!anthropicKey.trim()) {
      toast({
        title: 'API key required',
        description: 'Please enter an Anthropic API key.',
        variant: 'destructive',
      });
      return;
    }

    if (!anthropicKey.startsWith('sk-ant-')) {
      toast({
        title: 'Invalid API key format',
        description: 'Anthropic API keys should start with "sk-ant-".',
        variant: 'destructive',
      });
      return;
    }

    storeApiKey('anthropic', anthropicKey);
    setHasAnthropicKey(true);
    setAnthropicKey('');
    toast({
      title: 'API key saved',
      description: 'Your Anthropic API key has been saved locally.',
    });
  };

  const handleRemoveOpenaiKey = () => {
    removeApiKey('openai');
    setHasOpenaiKey(false);
    toast({
      title: 'API key removed',
      description: 'Your OpenAI API key has been removed.',
    });
  };

  const handleRemoveAnthropicKey = () => {
    removeApiKey('anthropic');
    setHasAnthropicKey(false);
    toast({
      title: 'API key removed',
      description: 'Your Anthropic API key has been removed.',
    });
  };

  const handleSaveGeminiKey = () => {
    if (!geminiKey.trim()) {
      toast({
        title: 'API key required',
        description: 'Please enter a Gemini API key.',
        variant: 'destructive',
      });
      return;
    }

    storeApiKey('gemini', geminiKey);
    setHasGeminiKey(true);
    setGeminiKey('');
    toast({
      title: 'API key saved',
      description: 'Your Gemini API key has been saved locally.',
    });
  };

  const handleRemoveGeminiKey = () => {
    removeApiKey('gemini');
    setHasGeminiKey(false);
    toast({
      title: 'API key removed',
      description: 'Your Gemini API key has been removed.',
    });
  };

  const handleClearHistory = async () => {
    try {
      await clearAllHistory();
      toast({
        title: 'History cleared',
        description: 'All generation history has been deleted.',
      });
    } catch {
      toast({
        title: 'Failed to clear history',
        variant: 'destructive',
      });
    }
  };

  const handleExportHistory = async () => {
    try {
      const data = await exportHistory();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extension-foundry-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: 'History exported',
        description: 'Your history has been downloaded.',
      });
    } catch {
      toast({
        title: 'Export failed',
        variant: 'destructive',
      });
    }
  };

  const handleImportHistory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await importHistory(text);
      toast({
        title: 'History imported',
        description: `Imported ${count} entries.`,
      });
    } catch {
      toast({
        title: 'Import failed',
        description: 'Invalid file format.',
        variant: 'destructive',
      });
    }

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Extension Foundry</span>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted-foreground">Settings</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Your API keys are stored locally in your browser and never sent to our servers.
                They are only used to make direct requests to the AI providers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OpenAI */}
              <div className="space-y-3">
                <Label>OpenAI API Key</Label>
                {hasOpenaiKey ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-muted rounded-md text-sm text-muted-foreground">
                      sk-••••••••••••••••
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveOpenaiKey}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showOpenaiKey ? 'text' : 'password'}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      >
                        {showOpenaiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <Button onClick={handleSaveOpenaiKey}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>

              {/* Anthropic */}
              <div className="space-y-3">
                <Label>Anthropic API Key</Label>
                {hasAnthropicKey ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-muted rounded-md text-sm text-muted-foreground">
                      sk-ant-••••••••••••••••
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAnthropicKey}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showAnthropicKey ? 'text' : 'password'}
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder="sk-ant-..."
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                      >
                        {showAnthropicKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <Button onClick={handleSaveAnthropicKey}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>

              {/* Gemini */}
              <div className="space-y-3">
                <Label>Gemini API Key</Label>
                {hasGeminiKey ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-muted rounded-md text-sm text-muted-foreground">
                      AI••••••••••••••••
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveGeminiKey}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showGeminiKey ? 'text' : 'password'}
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="AI..."
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                      >
                        {showGeminiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <Button onClick={handleSaveGeminiKey}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    aistudio.google.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Model Preferences</CardTitle>
              <CardDescription>
                Choose which models to use for each stage of generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default AI Provider</Label>
                <Select
                  value={settings.defaultProvider}
                  onValueChange={(v) =>
                    settings.updateSettings({
                      defaultProvider: v as 'openai' | 'anthropic' | 'gemini',
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Stage 1 Model (Prompt Architect)</Label>
                <Select
                  value={settings.stage1Model}
                  onValueChange={(v) =>
                    settings.updateSettings({ stage1Model: v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (fast)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">
                      Claude 3.5 Haiku (fast)
                    </SelectItem>
                    <SelectItem value="claude-sonnet-4-20250514">
                      Claude Sonnet 4
                    </SelectItem>
                    <SelectItem value="gemini-2.0-flash">
                      Gemini 2.0 Flash (fast)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Fast models work well for prompt refinement.
                </p>
              </div>

              <div>
                <Label>Stage 2 Model (Principal Engineer)</Label>
                <Select
                  value={settings.stage2Model}
                  onValueChange={(v) =>
                    settings.updateSettings({ stage2Model: v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="claude-sonnet-4-20250514">
                      Claude Sonnet 4
                    </SelectItem>
                    <SelectItem value="claude-opus-4-20250514">
                      Claude Opus 4
                    </SelectItem>
                    <SelectItem value="gemini-2.0-flash">
                      Gemini 2.0 Flash
                    </SelectItem>
                    <SelectItem value="gemini-2.5-pro-preview-06-05">
                      Gemini 2.5 Pro
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Stronger models produce better code quality.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Output Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Output Preferences
              </CardTitle>
              <CardDescription>
                Configure default behaviors for generated extensions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Prefer Minimal Permissions</Label>
                  <p className="text-xs text-muted-foreground">
                    Request only necessary permissions for better store approval.
                  </p>
                </div>
                <Switch
                  checked={settings.preferMinimalPermissions}
                  onCheckedChange={(v) =>
                    settings.updateSettings({ preferMinimalPermissions: v })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Prefer Chrome-Only</Label>
                  <p className="text-xs text-muted-foreground">
                    Generate Chrome-specific code (simpler, but less portable).
                  </p>
                </div>
                <Switch
                  checked={settings.preferChromeOnly}
                  onCheckedChange={(v) =>
                    settings.updateSettings({ preferChromeOnly: v })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Include Content Script Overlays</Label>
                  <p className="text-xs text-muted-foreground">
                    Add React-based overlay components for content scripts.
                  </p>
                </div>
                <Switch
                  checked={settings.includeContentScriptOverlays}
                  onCheckedChange={(v) =>
                    settings.updateSettings({ includeContentScriptOverlays: v })
                  }
                />
              </div>

              <Separator />

              <div>
                <Label>Default Styling</Label>
                <Select
                  value={settings.defaultStyling}
                  onValueChange={(v) =>
                    settings.updateSettings({
                      defaultStyling: v as 'tailwind' | 'css-modules' | 'plain-css',
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
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Export, import, or clear your generation history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportHistory}>
                  <Download className="w-4 h-4 mr-2" />
                  Export History
                </Button>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Import History
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportHistory}
                    />
                  </label>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                These actions are irreversible. Please proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your generation history.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearHistory}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear History
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-destructive text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset All Settings
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all settings to their default values and
                      remove your stored API keys.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        settings.resetSettings();
                        removeApiKey('openai');
                        removeApiKey('anthropic');
                        removeApiKey('gemini');
                        setHasOpenaiKey(false);
                        setHasAnthropicKey(false);
                        setHasGeminiKey(false);
                        toast({
                          title: 'Settings reset',
                          description: 'All settings have been reset to defaults.',
                        });
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reset Settings
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Privacy Policy */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-sm text-muted-foreground">
                <strong>What we store:</strong> Generation history is stored
                locally in your browser using IndexedDB. API keys are stored in
                your browser&apos;s localStorage with basic encoding.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>What we don&apos;t store:</strong> We do not store your
                extension ideas, generated code, or API keys on our servers. All
                AI requests are made directly from your browser to the AI
                provider.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>How to delete your data:</strong> Use the &quot;Clear All
                History&quot; and &quot;Reset All Settings&quot; buttons above to remove all
                locally stored data.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
