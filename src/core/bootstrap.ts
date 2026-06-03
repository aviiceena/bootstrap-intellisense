import * as https from 'https';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as csstree from 'css-tree';

interface CssClass {
  className: string;
  classProperties: string;
  // Resolved hex color for color-related classes (e.g. bg-primary), used to
  // render a color swatch in the completion list. Undefined for non-color classes.
  color?: string;
}

interface CacheFile {
  schemaVersion: number;
  createdAt: number;
  classes: CssClass[];
}

// Bump this whenever the extraction logic or cache structure changes,
// so previously cached files are considered stale and rebuilt.
const CACHE_SCHEMA_VERSION = 5;

// Maximum age of a cache entry before it is rebuilt (30 days).
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Cache functions
const getCacheDir = (): string => {
  let cachePath: string;

  if (process.platform === 'win32') {
    cachePath = path.join(os.homedir(), 'AppData', 'Local', 'bootstrap-intellisense', 'cache');
  } else if (process.platform === 'darwin') {
    cachePath = path.join(os.homedir(), 'Library', 'Caches', 'bootstrap-intellisense');
  } else {
    cachePath = path.join(os.homedir(), '.cache', 'bootstrap-intellisense');
  }

  try {
    fs.mkdirSync(cachePath, { recursive: true });
  } catch (err: any) {
    if (err.code !== 'EEXIST') {
      console.error(`Error creating cache directory: ${err.message}`);
    }
  }

  return cachePath;
};

const getCachePath = (version: string, isLocalFile: boolean = false, filePath: string = ''): string => {
  const cacheDir = getCacheDir();

  if (isLocalFile && filePath) {
    // For local files we use a hash of the path
    const filePathHash = Buffer.from(filePath).toString('base64').replace(/[/+=]/g, '-');
    return path.join(cacheDir, `bootstrap-classes-local-${filePathHash}.json`);
  }

  return path.join(cacheDir, `bootstrap-classes-${version}.json`);
};

const writeCacheClasses = (
  classes: CssClass[],
  version: string,
  isLocalFile: boolean = false,
  filePath: string = '',
): void => {
  const cachePath = getCachePath(version, isLocalFile, filePath);
  const cacheFile: CacheFile = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    createdAt: Date.now(),
    classes,
  };
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cacheFile));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
};

const getCachedClasses = (version: string, isLocalFile: boolean = false, filePath: string = ''): CssClass[] => {
  const cachePath = getCachePath(version, isLocalFile, filePath);

  try {
    if (fs.existsSync(cachePath)) {
      const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as Partial<CacheFile>;

      // Reject caches with an unknown structure (e.g. older versions of the extension).
      if (parsed.schemaVersion !== CACHE_SCHEMA_VERSION || !Array.isArray(parsed.classes)) {
        return [];
      }

      // Reject caches that have exceeded their TTL.
      if (typeof parsed.createdAt !== 'number' || Date.now() - parsed.createdAt > CACHE_TTL_MS) {
        return [];
      }

      return parsed.classes;
    }
  } catch (error) {
    console.error('Error reading cache:', error);
  }

  return [];
};

// Build a readable, formatted representation of a rule for hover/documentation.
const formatRule = (selector: string, block: csstree.Block): string => {
  const declarations: string[] = [];

  block.children.forEach((child) => {
    if (child.type === 'Declaration') {
      const value = csstree.generate(child.value).trim();
      const important = child.important ? ' !important' : '';
      declarations.push(`  ${child.property}: ${value}${important};`);
    }
  });

  return `${selector} {\n${declarations.join('\n')}\n}`;
};

// CSS properties that carry a color we can preview, in priority order (the
// background usually represents a class best, e.g. for .bg-* and .btn-*).
const COLOR_PROPERTIES = [
  'background-color',
  'background',
  'color',
  'border-color',
  'fill',
  'stroke',
];

const clampChannel = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map((c) => clampChannel(c).toString(16).padStart(2, '0')).join('');

// Resolve a CSS value to a concrete hex color, following Bootstrap's CSS custom
// properties (e.g. "rgba(var(--bs-primary-rgb), var(--bs-bg-opacity))"). Returns
// undefined for values that cannot be rendered as a single swatch (gradients,
// transparent, currentColor, unresolved variables, ...).
const resolveColor = (rawValue: string, variables: Map<string, string>, depth = 0): string | undefined => {
  if (depth > 5) {
    return undefined;
  }

  const value = rawValue.replace(/!important/gi, '').trim();
  if (!value || /gradient|transparent|inherit|currentcolor|none/i.test(value)) {
    return undefined;
  }

  // Already a hex color.
  if (/^#([0-9a-fA-F]{3,8})$/.test(value)) {
    return value;
  }

  // rgb()/rgba() whose channels come from a custom property: rgba(var(--x-rgb), a)
  const rgbVarMatch = value.match(/^rgba?\(\s*var\((--[\w-]+)\)/i);
  if (rgbVarMatch) {
    const resolved = variables.get(rgbVarMatch[1]);
    if (resolved) {
      const parts = resolved.split(',').map((p) => parseInt(p.trim(), 10));
      if (parts.length >= 3 && parts.slice(0, 3).every((n) => !isNaN(n))) {
        return rgbToHex(parts[0], parts[1], parts[2]);
      }
    }
    return undefined;
  }

  // Plain rgb()/rgba() with numeric channels.
  const rgbMatch = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgbMatch) {
    return rgbToHex(parseFloat(rgbMatch[1]), parseFloat(rgbMatch[2]), parseFloat(rgbMatch[3]));
  }

  // A single var(--x) reference: resolve it recursively.
  const varMatch = value.match(/^var\(\s*(--[\w-]+)/);
  if (varMatch) {
    const resolved = variables.get(varMatch[1]);
    if (resolved) {
      return resolveColor(resolved, variables, depth + 1);
    }
  }

  return undefined;
};

// Collect all CSS custom properties (e.g. from :root) so color variables can be
// resolved. First definition wins, which keeps Bootstrap's light theme (defined
// before the dark theme overrides).
const collectCustomProperties = (ast: csstree.CssNode): Map<string, string> => {
  const variables = new Map<string, string>();

  csstree.walk(ast, {
    visit: 'Declaration',
    enter(node: csstree.Declaration) {
      if (node.property.startsWith('--') && !variables.has(node.property)) {
        variables.set(node.property, csstree.generate(node.value).trim());
      }
    },
  });

  return variables;
};

// Find the most representative color of a rule, if any.
const findRuleColor = (block: csstree.Block, variables: Map<string, string>): string | undefined => {
  const colorsByProperty = new Map<string, string>();

  block.children.forEach((child) => {
    if (child.type === 'Declaration') {
      const property = child.property.toLowerCase();
      if (COLOR_PROPERTIES.includes(property) && !colorsByProperty.has(property)) {
        const color = resolveColor(csstree.generate(child.value), variables);
        if (color) {
          colorsByProperty.set(property, color);
        }
      }
    }
  });

  for (const property of COLOR_PROPERTIES) {
    const color = colorsByProperty.get(property);
    if (color) {
      return color;
    }
  }

  return undefined;
};

export const extractCssClasses = (css: string): CssClass[] => {
  const classes: CssClass[] = [];
  const uniqueClasses = new Set<string>();

  let ast: csstree.CssNode;
  try {
    // Parse the stylesheet into an AST. This correctly understands selectors,
    // declaration blocks, @media/@supports rules, comments and escapes, so we
    // never mistake values like "0.1875rem" for class names.
    ast = csstree.parse(css);
  } catch (error) {
    console.error('Error parsing CSS:', error);
    return [];
  }

  // Resolve color custom properties (e.g. --bs-primary-rgb) up front so each
  // rule's color can be derived even when it references CSS variables.
  const variables = collectCustomProperties(ast);

  csstree.walk(ast, {
    visit: 'Rule',
    enter(node: csstree.Rule) {
      if (node.prelude.type !== 'SelectorList') {
        return;
      }

      // Collect every class selector that appears in this rule's selector list.
      const classNames: string[] = [];
      csstree.walk(node.prelude, {
        visit: 'ClassSelector',
        enter(selector: csstree.ClassSelector) {
          classNames.push(selector.name);
        },
      });

      if (classNames.length === 0) {
        return;
      }

      const selectorText = csstree.generate(node.prelude);
      const classProperties = formatRule(selectorText, node.block);
      const color = findRuleColor(node.block, variables);

      for (const className of classNames) {
        if (!uniqueClasses.has(className)) {
          uniqueClasses.add(className);
          classes.push({ className, classProperties, color });
        }
      }
    },
  });

  return classes;
};

const fetchBootstrapCss = async (version: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = `https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/css/bootstrap.css`;

    const request = https.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        const error = `HTTP Error: ${res.statusCode}`;
        reject(new Error(error));
        return;
      }

      const contentType = res.headers['content-type'];
      if (!contentType || !contentType.includes('text/css')) {
        reject(new Error('Invalid content type'));
        return;
      }

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (!data) {
          reject(new Error('Empty response'));
          return;
        }
        resolve(data);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// Extract Bootstrap version from CSS comment
export const extractBootstrapVersion = (css: string): string => {
  const versionRegex = /Bootstrap\s+v(\d+\.\d+\.\d+)/i;
  const match = css.match(versionRegex);
  if (match && match[1]) {
    return match[1];
  }
  return '0';
};

// Read CSS from local file
export const readLocalCssFile = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(new Error(`Error reading CSS file: ${err.message}`));
        return;
      }
      resolve(data);
    });
  });
};

// Find Bootstrap CSS files in workspace
export const findBootstrapCssFiles = async (): Promise<string[]> => {
  const result: string[] = [];

  // Search in workspace folders
  if (vscode.workspace.workspaceFolders) {
    for (const folder of vscode.workspace.workspaceFolders) {
      // Check for node_modules bootstrap
      const nodeModulesPath = path.join(
        folder.uri.fsPath,
        'node_modules',
        'bootstrap',
        'dist',
        'css',
        'bootstrap.min.css',
      );
      if (fs.existsSync(nodeModulesPath)) {
        result.push(nodeModulesPath);
      }

      // Find *.bootstrap*.css or *bootstrap*.min.css files
      const files = await vscode.workspace.findFiles('**/*bootstrap*.{css,min.css}', '**/node_modules/**');

      for (const file of files) {
        result.push(file.fsPath);
      }
    }
  }

  return [...new Set(result)]; // Remove duplicates
};

export const getClasses = async (
  version: string,
  useLocalFile: boolean = false,
  cssFilePath: string = '',
): Promise<CssClass[]> => {
  // First check in cache
  const cachedClasses = getCachedClasses(version, useLocalFile, cssFilePath);

  if (cachedClasses.length > 0) {
    return cachedClasses;
  }

  // If nothing found in cache, get and process CSS
  let rawCss: string;

  if (useLocalFile && cssFilePath) {
    try {
      rawCss = await readLocalCssFile(cssFilePath);
    } catch (err) {
      return [];
    }
  } else {
    try {
      rawCss = await fetchBootstrapCss(version);
    } catch (err) {
      return [];
    }
  }

  if (!rawCss) {
    return [];
  }

  const classes = extractCssClasses(rawCss);

  // Save to cache
  writeCacheClasses(classes, version, useLocalFile, cssFilePath);

  return classes;
};

// Helper function to delete all Bootstrap class caches
export const deleteAllBootstrapCaches = (): boolean => {
  const cacheDir = getCacheDir();

  if (!fs.existsSync(cacheDir)) {
    return false;
  }

  try {
    const files = fs.readdirSync(cacheDir);
    let deletedCount = 0;

    for (const file of files) {
      if (file.startsWith('bootstrap-classes-')) {
        try {
          const filePath = path.join(cacheDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting file: ${file}`, err);
        }
      }
    }

    return deletedCount > 0;
  } catch (error) {
    console.error('Error deleting all Bootstrap caches:', error);
    return false;
  }
};
