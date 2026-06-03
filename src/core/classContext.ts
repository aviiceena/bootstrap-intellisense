// Detection of "class contexts" - the places where Bootstrap class names can
// appear across the supported languages. Kept free of the VS Code API so the
// logic can be unit tested in isolation.

// A single quote character: ", ' or `.
const QUOTE = '["\'`]';
// Any character that is not a quote (used to capture a class string's content).
const NOT_QUOTE = '[^"\'`]';

// Attribute names that hold CSS classes across HTML / JSX / Vue / Angular / Svelte:
// class, className, :class, v-bind:class, [ngClass], [class], class:foo (Svelte directive).
const CLASS_ATTRIBUTE = '(?:class(?:Name)?|:class|v-bind:class|\\[ngClass\\]|\\[class\\]|class:[\\w-]+)';

// Helper functions commonly used to compose class strings.
const CLASS_FUNCTION = '(?:cn|clsx|classNames|classnames|twMerge|cva)';

// Matches an open, not-yet-closed class string ending at the cursor, for both
// attributes (class="...) and helper calls (cn("...).
const CLASS_ATTRIBUTE_OPEN = new RegExp(`${CLASS_ATTRIBUTE}\\s*=\\s*(${QUOTE})(${NOT_QUOTE}*)$`);
const CLASS_FUNCTION_OPEN = new RegExp(`${CLASS_FUNCTION}\\s*\\([^()]*?(${QUOTE})(${NOT_QUOTE}*)$`);

// Matches complete class strings on a line, for locating values under the cursor.
const CLASS_ATTRIBUTE_FULL = new RegExp(`${CLASS_ATTRIBUTE}\\s*=\\s*(${QUOTE})(.*?)\\1`, 'g');
const CLASS_FUNCTION_FULL = new RegExp(`${CLASS_FUNCTION}\\s*\\(\\s*(${QUOTE})(.*?)\\1`, 'g');

/**
 * If the cursor sits inside a class string (an attribute value or a class
 * helper-call string), returns the class text typed so far before the cursor.
 * Otherwise returns undefined.
 *
 * `textBeforeCursor` may span multiple lines so multi-line class attributes are
 * supported (the capture stops at the opening quote, not at line breaks).
 */
export function getClassValueAtCursor(textBeforeCursor: string): string | undefined {
  const match = textBeforeCursor.match(CLASS_ATTRIBUTE_OPEN) ?? textBeforeCursor.match(CLASS_FUNCTION_OPEN);
  return match ? match[2] : undefined;
}

export interface ClassValueRange {
  start: number;
  end: number;
}

/**
 * Returns the character spans [start, end] of class string values on a single
 * line. Used to decide whether a hovered word belongs to a class context.
 */
export function findClassValueRanges(lineText: string): ClassValueRange[] {
  const ranges: ClassValueRange[] = [];

  for (const pattern of [CLASS_ATTRIBUTE_FULL, CLASS_FUNCTION_FULL]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lineText)) !== null) {
      const quote = match[1];
      const value = match[2];
      const start = match.index + match[0].indexOf(quote) + 1;
      ranges.push({ start, end: start + value.length });
    }
  }

  return ranges;
}

/** Whether the given character index on a line is inside a class string value. */
export function isInsideClassContext(lineText: string, charIndex: number): boolean {
  return findClassValueRanges(lineText).some((range) => charIndex >= range.start && charIndex <= range.end);
}
