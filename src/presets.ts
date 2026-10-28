import type { ItemData, ItemType } from './types';

type Seed = [ItemType, number, number, number, number];

const presets: Record<string, Seed[]> = {
  spring: [
    ['plum', -1.95, -.48, .1, .91], ['citrus', .05, .52, -.16, .91],
    ['incense', 1.94, -.57, .42, .9], ['scroll', 1.5, .68, -.22, .91],
  ],
  gathering: [
    ['plum', -2.18, -.53, -.24, .89], ['rock', 1.65, -.65, .34, .95],
    ['brush', -.46, .58, -.18, 1], ['scroll', 1.25, .65, .15, .92],
  ],
  leisure: [
    ['rock', -1.95, -.4, -.34, .96], ['incense', .16, -.54, 0, .9],
    ['citrus', 1.85, .35, .15, .88], ['brush', -.8, .62, .13, .94],
    ['scroll', .42, .78, -.12, .86],
  ],
};

export function getPreset(key: string): ItemData[] {
  return (presets[key] ?? presets.spring).map(([type, x, z, rotation, scale]) => ({
    id: crypto.randomUUID(), type, x, z, rotation, scale,
  }));
}
