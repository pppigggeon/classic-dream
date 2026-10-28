import type { Group } from 'three';

export type ItemType = 'plum' | 'citrus' | 'rock' | 'incense' | 'brush' | 'scroll';

export interface ItemData {
  id: string;
  type: ItemType;
  x: number;
  z: number;
  rotation: number;
  scale: number;
}

export interface PlacedItem {
  data: ItemData;
  object: Group;
}

export const ITEM_INFO: Record<ItemType, { name: string; category: string; icon: string; note: string }> = {
  plum: { name: '青瓷梅花瓶', category: '花木', icon: '✿', note: '一枝春信入青瓷' },
  citrus: { name: '柑橘果盘', category: '果品', icon: '◉', note: '金实盈盘，岁岁有余' },
  rock: { name: '太湖石摆件', category: '雅玩', icon: '◈', note: '瘦、皱、漏、透' },
  incense: { name: '铜制香炉', category: '器皿', icon: '♨', note: '一缕清芬伴书香' },
  brush: { name: '文房笔架', category: '文房', icon: '⌁', note: '山形笔搁，墨韵未干' },
  scroll: { name: '书卷', category: '文房', icon: '▤', note: '展卷观古，静坐读书' },
};

export const TABLE = { width: 6.8, depth: 3.35, top: 1.34 };
