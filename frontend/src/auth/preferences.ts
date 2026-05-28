import type { FontSizePreference, ThemePreference } from './auth';

export const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'soft', label: 'Soft' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'dark', label: 'Dark' },
];

export const FONT_SIZE_OPTIONS: Array<{ value: FontSizePreference; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];
