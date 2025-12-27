'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Trash2,
  FolderOpen,
  Clock,
  Search,
  Sparkles,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useBuilderStore } from '@/lib/store';
import { getAllHistory, deleteHistoryEntry, clearAllHistory } from '@/lib/db';
import { createZip, downloadZip } from '@/lib/zip';
import { formatTimestamp, truncate } from '@/lib/utils';
import type { HistoryEntry } from '@/types';

export default function HistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

  const loadFromHistory = useBuilderStore((state) => state.loadFromHistory);
  const setCurrentStep = useBuilderStore((state) => state.setCurrentStep);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Filter history when search changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredHistory(
        history.filter(
          (entry) =>
            entry.extensionName.toLowerCase().includes(query) ||
            entry.userDraft.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, history]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const entries = await getAllHistory();
      setHistory(entries);
      setFilteredHistory(entries);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast({
        title: 'Failed to load history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (entry: HistoryEntry) => {
    loadFromHistory(entry);
    if (entry.status === 'complete' && entry.result) {
      setCurrentStep('complete');
    } else if (entry.outputPrompt) {
      setCurrentStep('architect');
    } else {
      setCurrentStep('input');
    }
    router.push('/builder');
  };

  const handleDownload = (entry: HistoryEntry) => {
    if (!entry.result?.files || entry.result.files.length === 0) {
      toast({
        title: 'No files to download',
        description: 'This generation does not have any files.',
        variant: 'destructive',
      });
      return;
    }

    const result = createZip(entry.result.files, entry.extensionName);
    downloadZip(
      result,
      `${entry.extensionName.toLowerCase().replace(/\s+/g, '-')}.zip`
    );

    toast({
      title: 'Download started',
      description: `${result.fileCount} files`,
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteHistoryEntry(deleteId);
      setHistory((prev) => prev.filter((e) => e.id !== deleteId));
      toast({
        title: 'Entry deleted',
      });
    } catch {
      toast({
        title: 'Failed to delete',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllHistory();
      setHistory([]);
      setFilteredHistory([]);
      toast({
        title: 'History cleared',
        description: 'All generation history has been deleted.',
      });
    } catch {
      toast({
        title: 'Failed to clear history',
        variant: 'destructive',
      });
    } finally {
      setShowClearAll(false);
    }
  };

  const getStatusBadge = (status: HistoryEntry['status']) => {
    switch (status) {
      case 'complete':
        return <Badge variant="success">Complete</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'architecting':
      case 'building':
        return <Badge variant="warning">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
          <span className="text-sm text-muted-foreground">History</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Generation History</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadHistory}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearAll(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or description..."
            className="pl-10"
          />
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Clock className="w-12 h-12 mb-2 opacity-50" />
            {searchQuery ? (
              <>
                <p>No results found</p>
                <p className="text-sm">Try a different search term</p>
              </>
            ) : (
              <>
                <p>No history yet</p>
                <p className="text-sm">Generated extensions will appear here</p>
                <Link href="/builder" className="mt-4">
                  <Button>Start Building</Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className="p-6 rounded-lg border bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg truncate">
                        {entry.extensionName || 'Untitled'}
                      </h3>
                      {getStatusBadge(entry.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatTimestamp(entry.timestamp)}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {truncate(entry.userDraft, 200)}
                    </p>
                    {entry.result?.files && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {entry.result.files.length} files generated
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpen(entry)}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                    {entry.status === 'complete' && entry.result?.files && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(entry)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpen(entry)}>
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Open in Builder
                        </DropdownMenuItem>
                        {entry.status === 'complete' && entry.result?.files && (
                          <DropdownMenuItem
                            onClick={() => handleDownload(entry)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download ZIP
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setDeleteId(entry.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this generation from your history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={showClearAll} onOpenChange={setShowClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {history.length} generations from
              your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
