// Categorisation and ordering of Bootstrap class names. Kept free of the VS Code
// API so the logic can be unit tested in isolation and shared between the
// completion provider (for the item detail label) and the on-save class sorter.

// The canonical order classes are sorted into, mirroring Tailwind's
// prettier-plugin idea: structure first (layout), then spacing, then component
// classes, then fine-grained utilities, with anything unknown kept at the end.
export const CATEGORY_ORDER = ['layout', 'spacing', 'components', 'utilities', 'other'] as const;

export type ClassCategory = (typeof CATEGORY_ORDER)[number];

// Spacing: margins/paddings (incl. side variants mt-, mx-, ps-, ...) and gaps.
// Responsive variants (e.g. mt-md-3, m-lg-0) are covered as well.
const SPACING = /^(?:[mp][tbsexy]?-|gap-)/;

// Layout: containers, grid, flexbox, display, ordering and offsets.
const LAYOUT =
  /^(?:container(?:-fluid)?|row|col(?:$|-\w)|grid|d-|flex-|order-|offset-|g[xy]?-|vstack|hstack)/;

// Components: the higher-level Bootstrap building blocks.
const COMPONENTS =
  /^(?:btn|card|nav|navbar|modal|form(?:-|$)|input-group|dropdown|alert|badge|list(?:-|$)|table(?:-|$)|carousel|accordion|breadcrumb|pagination|page-|progress|spinner|toast|tooltip|popover|offcanvas|collapse|close|figure|blockquote|ratio)/;

// Utilities: fine-grained single-purpose helpers.
const UTILITIES =
  /^(?:text-|bg-|border|rounded|shadow|w-|h-|mw-|mh-|vw-|vh-|min-|max-|position-|top-|bottom-|start-|end-|translate-|float-|align-|justify-|fw-|fs-|fst-|lh-|font-|opacity-|overflow-|user-select|pe-none|pe-auto|visible|invisible|z-|object-|clearfix|sticky-|fixed-|link-|ms-auto|me-auto|mx-auto)/;

export function getClassCategory(className: string): ClassCategory {
  // Order matters: spacing is checked before layout/utilities so that side
  // variants like `mt-`/`px-` are not accidentally captured elsewhere, and
  // `mx-auto`/`ms-auto` style alignment helpers stay in utilities.
  if (/^m[sex]-auto$/.test(className) || className === 'mx-auto') {
    return 'utilities';
  }
  if (SPACING.test(className)) {
    return 'spacing';
  }
  if (LAYOUT.test(className)) {
    return 'layout';
  }
  if (COMPONENTS.test(className)) {
    return 'components';
  }
  if (UTILITIES.test(className)) {
    return 'utilities';
  }
  return 'other';
}

export function getCategoryRank(className: string): number {
  return CATEGORY_ORDER.indexOf(getClassCategory(className));
}

/**
 * Sorts the class names inside a class string into the canonical category order
 * (layout → spacing → components → utilities → other). The sort is stable, so
 * the original relative order within a single category is preserved.
 *
 * Leading and trailing whitespace of the value is preserved; whitespace between
 * class names is collapsed to a single space.
 */
export function sortClassNames(value: string): string {
  const leading = /^\s*/.exec(value)?.[0] ?? '';
  const trailing = /\s*$/.exec(value)?.[0] ?? '';

  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) {
    return value;
  }

  const sorted = tokens
    .map((token, index) => ({ token, index, rank: getCategoryRank(token) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.token);

  return leading + sorted.join(' ') + trailing;
}
