import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

export function runE2eCleanup(stage: 'before' | 'after') {
  if (process.env.PLAYWRIGHT_SKIP_E2E_CLEANUP === '1') {
    console.warn(`[playwright:${stage}] skipping E2E cleanup because PLAYWRIGHT_SKIP_E2E_CLEANUP=1`);
    return;
  }

  try {
    const output = execFileSync(
      'docker',
      ['exec', 'procuratio-api-prod', 'php', 'bin/console', 'app:cleanup-e2e-data', '--no-interaction'],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    if (output.trim() !== '') {
      console.log(`[playwright:${stage}] ${output.trim()}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`E2E cleanup failed ${stage} the Playwright run. ${reason}`);
  }
}
