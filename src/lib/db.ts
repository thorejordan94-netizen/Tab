/**
 * IndexedDB utilities for storing generation history locally
 * Uses the idb library for a promise-based API
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { HistoryEntry, UserSettings, GenerationResult } from '@/types';

const DB_NAME = 'extension-foundry';
const DB_VERSION = 1;

interface ExtensionFoundryDB {
  history: HistoryEntry;
  settings: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<ExtensionFoundryDB>> | null = null;

/**
 * Get or create the database connection
 */
async function getDB(): Promise<IDBPDatabase<ExtensionFoundryDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in browser');
  }

  if (!dbPromise) {
    dbPromise = openDB<ExtensionFoundryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create history store
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('status', 'status', { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }

  return dbPromise;
}

// ============================================================================
// History Operations
// ============================================================================

/**
 * Add a new history entry
 */
export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const db = await getDB();
  await db.put('history', entry);
}

/**
 * Update an existing history entry
 */
export async function updateHistoryEntry(
  id: string,
  updates: Partial<HistoryEntry>
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('history', id);

  if (existing) {
    await db.put('history', { ...existing, ...updates });
  }
}

/**
 * Get a history entry by ID
 */
export async function getHistoryEntry(id: string): Promise<HistoryEntry | undefined> {
  const db = await getDB();
  return db.get('history', id);
}

/**
 * Get all history entries, sorted by timestamp (newest first)
 */
export async function getAllHistory(): Promise<HistoryEntry[]> {
  const db = await getDB();
  const entries = await db.getAll('history');
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get history entries with pagination
 */
export async function getHistoryPage(
  offset: number,
  limit: number
): Promise<{ entries: HistoryEntry[]; total: number }> {
  const db = await getDB();
  const all = await getAllHistory();
  return {
    entries: all.slice(offset, offset + limit),
    total: all.length,
  };
}

/**
 * Delete a history entry
 */
export async function deleteHistoryEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('history', id);
}

/**
 * Clear all history
 */
export async function clearAllHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('history');
}

/**
 * Export all history as JSON
 */
export async function exportHistory(): Promise<string> {
  const entries = await getAllHistory();
  return JSON.stringify(entries, null, 2);
}

/**
 * Import history from JSON
 */
export async function importHistory(jsonData: string): Promise<number> {
  const entries: HistoryEntry[] = JSON.parse(jsonData);
  const db = await getDB();

  let imported = 0;
  for (const entry of entries) {
    // Validate entry has required fields
    if (entry.id && entry.timestamp && entry.userDraft) {
      await db.put('history', entry);
      imported++;
    }
  }

  return imported;
}

// ============================================================================
// Settings Operations
// ============================================================================

const DEFAULT_SETTINGS: UserSettings = {
  stage1Model: 'gpt-4o-mini',
  stage2Model: 'gpt-4o',
  preferMinimalPermissions: true,
  preferChromeOnly: true,
  includeContentScriptOverlays: false,
  defaultProvider: 'openai',
  defaultStyling: 'tailwind',
};

/**
 * Get all settings
 */
export async function getSettings(): Promise<UserSettings> {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  const db = await getDB();
  const settings: Partial<UserSettings> = {};

  const allSettings = await db.getAll('settings');
  for (const item of allSettings) {
    (settings as Record<string, unknown>)[item.key] = item.value;
  }

  return { ...DEFAULT_SETTINGS, ...settings };
}

/**
 * Update a single setting
 */
export async function updateSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(updates: Partial<UserSettings>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('settings', 'readwrite');

  for (const [key, value] of Object.entries(updates)) {
    await tx.store.put({ key, value });
  }

  await tx.done;
}

/**
 * Reset all settings to defaults
 */
export async function resetSettings(): Promise<void> {
  const db = await getDB();
  await db.clear('settings');
}

// ============================================================================
// API Key Management (Secure Local Storage)
// ============================================================================

/**
 * Store API key securely in localStorage
 * Note: For true security, consider using the Web Crypto API for encryption
 */
export function storeApiKey(provider: 'openai' | 'anthropic', key: string): void {
  if (typeof window === 'undefined') return;

  // Basic obfuscation (not encryption, but better than plain text)
  const encoded = btoa(key);
  localStorage.setItem(`ef_${provider}_key`, encoded);
}

/**
 * Retrieve API key
 */
export function getApiKey(provider: 'openai' | 'anthropic'): string | null {
  if (typeof window === 'undefined') return null;

  const encoded = localStorage.getItem(`ef_${provider}_key`);
  if (!encoded) return null;

  try {
    return atob(encoded);
  } catch {
    return null;
  }
}

/**
 * Remove API key
 */
export function removeApiKey(provider: 'openai' | 'anthropic'): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`ef_${provider}_key`);
}

/**
 * Check if an API key is stored
 */
export function hasApiKey(provider: 'openai' | 'anthropic'): boolean {
  return getApiKey(provider) !== null;
}

// ============================================================================
// Database Utilities
// ============================================================================

/**
 * Get database statistics
 */
export async function getDBStats(): Promise<{
  historyCount: number;
  estimatedSize: string;
}> {
  const db = await getDB();
  const historyCount = await db.count('history');

  // Estimate size (rough calculation)
  const history = await getAllHistory();
  const jsonSize = JSON.stringify(history).length;
  const estimatedSize = formatBytes(jsonSize);

  return { historyCount, estimatedSize };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Close the database connection
 */
export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
