import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export interface BootstrapVersions {
  v5: string[];
  v4: string[];
  v3: string[];
  [key: string]: string[]; // Index signature für dynamischen Zugriff
}

/**
 * Gets the Bootstrap versions from the bootstrap-versions.json file using VS Code Extension API
 * @returns Object with all available versions or null if loading fails
 */
export function getBootstrapVersions(): BootstrapVersions | null {
  try {
    // Use VS Code Extension API to get the correct extension path
    const extension = vscode.extensions.getExtension('hossaini.bootstrap-intellisense');
    if (!extension) {
      console.error('Could not determine extension path. Bootstrap versions cannot be loaded.');
      return null;
    }

    const versionsPath = path.join(extension.extensionPath, 'assets', 'bootstrap-versions.json');

    if (!fs.existsSync(versionsPath)) {
      console.error(`bootstrap-versions.json not found at ${versionsPath}`);
      return null;
    }

    const fileContent = fs.readFileSync(versionsPath, 'utf-8');
    return JSON.parse(fileContent) as BootstrapVersions;
  } catch (error) {
    console.error('Error loading bootstrap versions:', error);
    return null;
  }
}

/**
 * Gets the latest Bootstrap version from the bootstrap-versions.json file
 * @returns The latest Bootstrap version string (e.g., "5.3.7")
 */
export function getLatestBootstrapVersion(): string {
  try {
    const versions = getBootstrapVersions();
    return versions?.v5[0] || '5.3.7'; // fallback to 5.3.7 if something goes wrong
  } catch (error) {
    console.error('Error loading Bootstrap versions:', error);
    return '5.3.7'; // fallback version
  }
}

/**
 * Gets all available Bootstrap versions
 * @returns Object with all available versions
 */
export function getAllBootstrapVersions(): BootstrapVersions {
  const versions = getBootstrapVersions();

  if (versions) {
    return versions;
  }

  // Fallback versions if loading fails
  return {
    v5: ['5.3.7'],
    v4: ['4.6.1'],
    v3: ['3.4.1'],
  };
}
