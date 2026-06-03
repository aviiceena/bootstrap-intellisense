import * as fs from 'fs';
import * as path from 'path';

// Structure of assets/bootstrap-versions.json, e.g. { "v5": ["5.3.8", ...] }.
export interface BootstrapVersions {
  [major: string]: string[];
}

// Used only if the versions file cannot be read for some reason.
export const FALLBACK_VERSION = '5.3.8';

let cachedVersions: BootstrapVersions | null = null;
let cachedLatest: string | null = null;

// Loads (and caches) the bundled list of available Bootstrap versions.
export function loadBootstrapVersions(extensionPath: string): BootstrapVersions | null {
  if (cachedVersions) {
    return cachedVersions;
  }

  try {
    const versionsPath = path.join(extensionPath, 'assets', 'bootstrap-versions.json');
    if (fs.existsSync(versionsPath)) {
      cachedVersions = JSON.parse(fs.readFileSync(versionsPath, 'utf-8')) as BootstrapVersions;
      return cachedVersions;
    }
  } catch (error) {
    console.error('Error loading bootstrap versions:', error);
  }

  return null;
}

// Compares two "a.b.c" version strings. Returns a negative/zero/positive number.
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

// Returns the newest available Bootstrap version across all major versions.
export function getLatestBootstrapVersion(extensionPath: string): string {
  if (cachedLatest) {
    return cachedLatest;
  }

  const versions = loadBootstrapVersions(extensionPath);
  if (!versions) {
    return FALLBACK_VERSION;
  }

  const allVersions = Object.values(versions).flat();
  if (allVersions.length === 0) {
    return FALLBACK_VERSION;
  }

  cachedLatest = allVersions.reduce((latest, current) => (compareVersions(current, latest) > 0 ? current : latest));
  return cachedLatest;
}
