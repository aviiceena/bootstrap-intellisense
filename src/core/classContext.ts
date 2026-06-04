// Detection of "class contexts" - the places where Bootstrap class names can
// appear across the supported languages. Kept free of the VS Code API so the
// logic can be unit tested in isolation.

// A single quote character: ", ' or `.
const QUOTE_CHARS = '"\'`';

// Must not be preceded by a word character or hyphen (blocks data-class, meta-class, …).
const NOT_MID_IDENTIFIER = '(?<![-\\w])';

// HTML / JSX / React
const CLASS_ATTR = `${NOT_MID_IDENTIFIER}class(?:Name)?`;
// Vue
const VUE_CLASS_ATTR = `${NOT_MID_IDENTIFIER}(?::class|v-bind:class)`;
// Angular
const ANGULAR_CLASS_ATTR = `${NOT_MID_IDENTIFIER}\\[(?:ngClass|class)\\]`;
// Svelte class:directive (boolean/expression values — still scanned for completion)
const SVELTE_CLASS_ATTR = `${NOT_MID_IDENTIFIER}class:[\\w-]+`;

const CLASS_ATTRIBUTE = `(?:${CLASS_ATTR}|${VUE_CLASS_ATTR}|${ANGULAR_CLASS_ATTR}|${SVELTE_CLASS_ATTR})`;

// Helper functions commonly used to compose class strings.
const CLASS_FUNCTION = '(?:cn|clsx|classNames|classnames|twMerge|cva)';

const CLASS_ATTRIBUTE_OPEN = new RegExp(`${CLASS_ATTRIBUTE}\\s*=\\s*(["'\`])([^"'\`]*)$`);
const CLASS_FUNCTION_OPEN = new RegExp(`${CLASS_FUNCTION}\\s*\\([^()]*?(["'\`])([^"'\`]*)$`);

const CLASS_ATTRIBUTE_FULL = new RegExp(`${CLASS_ATTRIBUTE}\\s*=\\s*(["'\`])([\\s\\S]*?)\\1`, 'g');

/**
 * If the cursor sits inside a class string (an attribute value or a class
 * helper-call string), returns the class text typed so far before the cursor.
 * Otherwise returns undefined.
 */
export function getClassValueAtCursor(textBeforeCursor: string): string | undefined {
  const match = textBeforeCursor.match(CLASS_ATTRIBUTE_OPEN) ?? textBeforeCursor.match(CLASS_FUNCTION_OPEN);
  return match ? match[2] : undefined;
}

export interface ClassValueRange {
  start: number;
  end: number;
}

function isEscaped(lineText: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && lineText[i] === '\\'; i--) {
    backslashes++;
  }
  return backslashes % 2 === 1;
}

/**
 * Whether `index` sits inside a JS/TS string or template literal (not in markup).
 * Used to ignore `class="..."` that only appears inside e.g. `const s = '<div class="x">';`.
 */
export function isInsideJavaScriptString(lineText: string, index: number): boolean {
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let templateDepth = 0;

  for (let i = 0; i < index; i++) {
    const ch = lineText[i];

    if (inTemplate && ch === '$' && lineText[i + 1] === '{' && !isEscaped(lineText, i)) {
      templateDepth++;
      i++;
      continue;
    }

    if (templateDepth > 0) {
      if (ch === '}' && !isEscaped(lineText, i)) {
        templateDepth--;
      }
      continue;
    }

    if (inSingle) {
      if (ch === "'" && !isEscaped(lineText, i)) {
        inSingle = false;
      }
      continue;
    }

    if (inDouble) {
      if (ch === '"' && !isEscaped(lineText, i)) {
        inDouble = false;
      }
      continue;
    }

    if (inTemplate) {
      if (ch === '`' && !isEscaped(lineText, i)) {
        inTemplate = false;
      }
      continue;
    }

    if (ch === "'" && !isEscaped(lineText, i)) {
      inSingle = true;
    } else if (ch === '"' && !isEscaped(lineText, i)) {
      inDouble = true;
    } else if (ch === '`' && !isEscaped(lineText, i)) {
      inTemplate = true;
    }
  }

  return inSingle || inDouble || (inTemplate && templateDepth === 0);
}

/** Reads a quoted string starting at `openQuoteIndex` (the opening quote char). */
function readQuotedString(
  lineText: string,
  openQuoteIndex: number,
): { value: string; start: number; end: number } | undefined {
  const quote = lineText[openQuoteIndex];
  if (!QUOTE_CHARS.includes(quote)) {
    return undefined;
  }

  let i = openQuoteIndex + 1;
  while (i < lineText.length) {
    if (lineText[i] === quote && !isEscaped(lineText, i)) {
      return {
        value: lineText.slice(openQuoteIndex + 1, i),
        start: openQuoteIndex + 1,
        end: i,
      };
    }
    i++;
  }

  return undefined;
}

const CLASS_HELPER_CALL = new RegExp(`${CLASS_FUNCTION}\\s*\\(`, 'g');

/**
 * All quoted string literals inside cn()/clsx()/… calls on one line (every argument).
 */
function findClassHelperStringRanges(text: string): ClassValueRange[] {
  const ranges: ClassValueRange[] = [];
  CLASS_HELPER_CALL.lastIndex = 0;
  let callMatch: RegExpExecArray | null;

  while ((callMatch = CLASS_HELPER_CALL.exec(text)) !== null) {
    let depth = 1;
    let i = callMatch.index + callMatch[0].length;

    while (i < text.length && depth > 0) {
      const ch = text[i];

      if (ch === '(' && !isInsideJavaScriptString(text, i)) {
        depth++;
        i++;
        continue;
      }

      if (ch === ')' && !isInsideJavaScriptString(text, i)) {
        depth--;
        i++;
        continue;
      }

      if (depth === 1 && QUOTE_CHARS.includes(ch) && !isInsideJavaScriptString(text, i)) {
        const str = readQuotedString(text, i);
        if (str) {
          ranges.push({ start: str.start, end: str.end });
          i = str.end + 1;
          continue;
        }
      }

      i++;
    }
  }

  return ranges;
}

function rangesOverlap(a: ClassValueRange, b: ClassValueRange): boolean {
  return a.start < b.end && b.start < a.end;
}

function mergeRanges(ranges: ClassValueRange[]): ClassValueRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: ClassValueRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && rangesOverlap(last, range)) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

/**
 * Returns the character spans [start, end] of class string values in `text`.
 * Offsets are relative to the start of `text` (use the full document string
 * for multi-line class attributes). Attribute values are skipped when they
 * appear inside JS string literals. Helper calls collect every quoted argument.
 */
export function findClassValueRanges(text: string): ClassValueRange[] {
  const ranges: ClassValueRange[] = [];

  CLASS_ATTRIBUTE_FULL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CLASS_ATTRIBUTE_FULL.exec(text)) !== null) {
    const attrStart = match.index;
    if (isInsideJavaScriptString(text, attrStart)) {
      continue;
    }

    const value = match[2];
    const start = match.index + match[0].indexOf(match[1]) + 1;
    ranges.push({ start, end: start + value.length });
  }

  ranges.push(...findClassHelperStringRanges(text));

  return mergeRanges(ranges);
}

/** Whether `offset` in `text` sits inside a class string value. */
export function isInsideClassContextAtOffset(text: string, offset: number): boolean {
  return findClassValueRanges(text).some((range) => offset >= range.start && offset <= range.end);
}

/** Whether the given character index on a line is inside a class string value. */
export function isInsideClassContext(lineText: string, charIndex: number): boolean {
  return findClassValueRanges(lineText).some((range) => charIndex >= range.start && charIndex <= range.end);
}
