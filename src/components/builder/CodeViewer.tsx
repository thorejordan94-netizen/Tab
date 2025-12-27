'use client';

import { useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard, getLanguageFromPath } from '@/lib/utils';
import type { GeneratedFile } from '@/types';
import { useState } from 'react';

interface CodeViewerProps {
  files: GeneratedFile[];
  selectedPath: string | null;
}

export function CodeViewer({ files, selectedPath }: CodeViewerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const selectedFile = useMemo(() => {
    if (!selectedPath) return files[0] || null;
    return files.find((f) => f.path === selectedPath) || files[0] || null;
  }, [files, selectedPath]);

  const handleCopy = async () => {
    if (!selectedFile) return;
    const success = await copyToClipboard(selectedFile.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    toast({
      title: success ? 'Copied!' : 'Copy failed',
      description: success ? selectedFile.path : 'Could not copy to clipboard',
    });
  };

  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-lg border bg-slate-950 text-slate-400">
        <p>No file selected</p>
      </div>
    );
  }

  const language = getLanguageFromPath(selectedFile.path);

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
        <span className="text-sm text-slate-300 font-mono">
          {selectedFile.path}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="text-slate-400 hover:text-white"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      <ScrollArea className="h-[500px]">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            background: '#0f172a',
            minHeight: '500px',
          }}
          showLineNumbers
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#64748b',
          }}
        >
          {selectedFile.content}
        </SyntaxHighlighter>
      </ScrollArea>
    </div>
  );
}
