import type { FullConfig } from '@playwright/test';
import { runE2eCleanup } from './e2eCleanup';

export default async function globalTeardown(_config: FullConfig) {
  runE2eCleanup('after');
}
