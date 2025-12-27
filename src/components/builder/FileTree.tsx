'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileTreeNode } from '@/types';

interface FileTreeProps {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  compact?: boolean;
}

export function FileTree({ nodes, selectedPath, onSelect, compact }: FileTreeProps) {
  return (
    <div className={cn('font-mono', compact ? 'text-xs' : 'text-sm')}>
      {nodes.map((node) => (
        <FileTreeNodeComponent
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={0}
          compact={compact}
        />
      ))}
    </div>
  );
}

interface FileTreeNodeComponentProps {
  node: FileTreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
  compact?: boolean;
}

function FileTreeNodeComponent({
  node,
  selectedPath,
  onSelect,
  depth,
  compact,
}: FileTreeNodeComponentProps) {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto-expand first 2 levels
  const isFolder = node.type === 'folder';
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelect(node.path);
    }
  };

  const paddingLeft = depth * (compact ? 12 : 16);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted text-foreground',
          compact ? 'py-0.5' : 'py-1'
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {isFolder ? (
          <>
            {isOpen ? (
              <ChevronDown className={cn(compact ? 'w-3 h-3' : 'w-4 h-4')} />
            ) : (
              <ChevronRight className={cn(compact ? 'w-3 h-3' : 'w-4 h-4')} />
            )}
            {isOpen ? (
              <FolderOpen
                className={cn(
                  compact ? 'w-3 h-3' : 'w-4 h-4',
                  'text-amber-500'
                )}
              />
            ) : (
              <Folder
                className={cn(
                  compact ? 'w-3 h-3' : 'w-4 h-4',
                  'text-amber-500'
                )}
              />
            )}
          </>
        ) : (
          <>
            <span className={cn(compact ? 'w-3' : 'w-4')} />
            <FileIcon extension={node.path.split('.').pop() || ''} compact={compact} />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>

      {isFolder && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNodeComponent
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileIcon({ extension, compact }: { extension: string; compact?: boolean }) {
  const size = compact ? 'w-3 h-3' : 'w-4 h-4';

  // Color coding by file type
  let colorClass = 'text-slate-400';

  switch (extension.toLowerCase()) {
    case 'ts':
    case 'tsx':
      colorClass = 'text-blue-400';
      break;
    case 'js':
    case 'jsx':
      colorClass = 'text-yellow-400';
      break;
    case 'json':
      colorClass = 'text-green-400';
      break;
    case 'css':
    case 'scss':
      colorClass = 'text-pink-400';
      break;
    case 'html':
      colorClass = 'text-orange-400';
      break;
    case 'md':
      colorClass = 'text-slate-300';
      break;
    case 'svg':
    case 'png':
    case 'jpg':
      colorClass = 'text-purple-400';
      break;
  }

  return <File className={cn(size, colorClass)} />;
}
