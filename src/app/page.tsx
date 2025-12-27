'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Sparkles, Code2, Download, ChevronRight, FolderTree, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Sample output for the demo modal
const SAMPLE_FILE_TREE = `my-tab-manager/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── popup/
│   │   ├── Popup.tsx
│   │   ├── index.tsx
│   │   └── popup.html
│   ├── components/
│   │   ├── TabList.tsx
│   │   ├── TabItem.tsx
│   │   └── SearchBar.tsx
│   ├── hooks/
│   │   └── useTabs.ts
│   ├── utils/
│   │   └── storage.ts
│   └── types/
│       └── index.ts
├── public/
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   └── PRIVACY.md
└── tests/
    └── utils.test.ts`;

const SAMPLE_CODE = `// src/popup/Popup.tsx
import React, { useState } from 'react';
import { useTabs } from '../hooks/useTabs';
import { TabList } from '../components/TabList';
import { SearchBar } from '../components/SearchBar';

export function Popup() {
  const { tabs, isLoading, closeTab, switchToTab } = useTabs();
  const [search, setSearch] = useState('');

  const filteredTabs = tabs.filter(tab =>
    tab.title?.toLowerCase().includes(search.toLowerCase()) ||
    tab.url?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-[400px] p-4 bg-white">
      <h1 className="text-xl font-bold mb-4">Tab Manager</h1>
      <SearchBar value={search} onChange={setSearch} />
      <TabList
        tabs={filteredTabs}
        isLoading={isLoading}
        onClose={closeTab}
        onSwitch={switchToTab}
      />
    </div>
  );
}`;

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Extension Foundry</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/history"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              History
            </Link>
            <Link
              href="/settings"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
            <Link href="/builder">
              <Button size="sm">Start Building</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Extension Builder</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Build Chrome Extensions
            <br />
            <span className="text-primary">with Natural Language</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Describe your extension idea in plain English and get a complete,
            production-ready Manifest V3 TypeScript/React extension as a downloadable ZIP.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/builder">
              <Button size="lg" className="gap-2 text-lg px-8">
                Start Building
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2 text-lg px-8">
                  View Sample Output
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Sample Generated Extension</DialogTitle>
                  <DialogDescription>
                    This is what you get when you describe a "Tab Manager" extension
                  </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      <FolderTree className="w-4 h-4" />
                      File Structure
                    </div>
                    <ScrollArea className="h-[400px] rounded-md border bg-slate-950 p-4">
                      <pre className="text-xs text-slate-300 font-mono">
                        {SAMPLE_FILE_TREE}
                      </pre>
                    </ScrollArea>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      <FileCode className="w-4 h-4" />
                      Sample Code
                    </div>
                    <ScrollArea className="h-[400px] rounded-md border bg-slate-950 p-4">
                      <pre className="text-xs text-green-400 font-mono">
                        {SAMPLE_CODE}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <StepCard
              number={1}
              icon={<Sparkles className="w-6 h-6" />}
              title="Describe Your Idea"
              description="Write a plain language description of what you want your extension to do. No technical knowledge required."
            />
            <StepCard
              number={2}
              icon={<Code2 className="w-6 h-6" />}
              title="AI Generates Code"
              description="Our 2-stage AI pipeline transforms your idea into optimized prompts, then generates production-ready code."
            />
            <StepCard
              number={3}
              icon={<Download className="w-6 h-6" />}
              title="Download & Deploy"
              description="Get a complete extension project with TypeScript, React, tests, and documentation ready for the Chrome Web Store."
            />
          </div>
        </div>

        {/* Features Section */}
        <section className="max-w-5xl mx-auto mt-24">
          <h2 className="text-2xl font-bold text-center mb-12">
            Everything You Need for Store-Ready Extensions
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Manifest V3"
              description="Modern extensions using Chrome's latest manifest version with service workers."
            />
            <FeatureCard
              title="TypeScript + React"
              description="Type-safe code with React components for popup, options, and content scripts."
            />
            <FeatureCard
              title="Minimal Permissions"
              description="Security-first approach with only the permissions your extension needs."
            />
            <FeatureCard
              title="Complete Documentation"
              description="README, architecture docs, and privacy policy ready for store submission."
            />
            <FeatureCard
              title="Test Coverage"
              description="Unit tests included for core functionality to ensure reliability."
            />
            <FeatureCard
              title="Cross-Browser Ready"
              description="Optional support for Edge and Firefox with minimal changes."
            />
          </div>
        </section>

        {/* Privacy Note */}
        <section className="max-w-2xl mx-auto mt-24 text-center">
          <p className="text-sm text-muted-foreground">
            <strong>Privacy First:</strong> Your ideas and generated code stay on your device.
            We don&apos;t store or log your extension ideas. API keys are stored locally
            in your browser and never sent to our servers.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">
                Extension Foundry
              </span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/settings" className="hover:text-foreground transition-colors">
                Settings
              </Link>
              <Link href="/history" className="hover:text-foreground transition-colors">
                History
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative p-6 rounded-xl border bg-white shadow-sm">
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
      {number < 3 && (
        <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground/30" />
      )}
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-lg border bg-white hover:shadow-md transition-shadow">
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
