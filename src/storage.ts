import type { ItemData, ItemType } from './types';
import { ITEM_INFO } from './types';

const KEY = 'yi-an-si-shi-layout-v1';

export function saveLayout(data: ItemData[]) {
  localStorage.setItem(KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), items: data }));
}

export function loadLayout(): ItemData[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('items' in parsed) || !Array.isArray(parsed.items)) return null;
    return parsed.items.filter((v: unknown): v is ItemData => {
      if (!v || typeof v !== 'object') return false;
      const item = v as Record<string, unknown>;
      return typeof item.id === 'string' && typeof item.type === 'string' && item.type in ITEM_INFO &&
        ['x', 'z', 'rotation', 'scale'].every(k => typeof item[k] === 'number' && Number.isFinite(item[k])) &&
        (item.type as ItemType) !== undefined;
    });
  } catch { return null; }
}
