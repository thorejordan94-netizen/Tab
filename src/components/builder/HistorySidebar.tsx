'use client';

import { useEffect, useState } from 'react';
import { X, Download, Trash2, FolderOpen, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
import { getAllHistory, deleteHistoryEntry } from '@/lib/db';
import { createZip, downloadZip } from '@/lib/zip';
import { formatTimestamp, truncate } from '@/lib/utils';
import type { HistoryEntry } from '@/types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistorySidebar({ isOpen, onClose }: HistorySidebarProps) {
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadFromHistory = useBuilderStore((state) => state.loadFromHistory);
  const setCurrentStep = useBuilderStore((state) => state.setCurrentStep);

  // Load history on mount
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const entries = await getAllHistory();
      setHistory(entries);
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
    onClose();
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
    downloadZip(result, `${entry.extensionName.toLowerCase().replace(/\s+/g, '-')}.zip`);

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
    } catch (error) {
      toast({
        title: 'Failed to delete',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Generation History</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse text-muted-foreground">
                Loading...
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Clock className="w-12 h-12 mb-2 opacity-50" />
              <p>No history yet</p>
              <p className="text-sm">Generated extensions will appear here</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {entry.extensionName || 'Untitled'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </p>
                    </div>
                    {getStatusBadge(entry.status)}
                  </div>

                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {truncate(entry.userDraft, 100)}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpen(entry)}
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      Open
                    </Button>
                    {entry.status === 'complete' && entry.result?.files && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(entry)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        ZIP
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

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
    </>
  );
}
