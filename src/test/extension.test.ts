import * as assert from 'assert';

import { extractCssClasses, extractBootstrapVersion } from '../core/bootstrap';
import { filterClasses } from '../features/completion/completionProvider';
import {
  findClassValueRanges,
  getClassValueAtCursor,
  isInsideClassContext,
  isInsideClassContextAtOffset,
  isInsideJavaScriptString,
} from '../core/classContext';
import { getClassCategory, sortClassNames } from '../core/classSorting';

suite('extractBootstrapVersion', () => {
  test('extracts version from a Bootstrap CSS header comment', () => {
    const css = '/*! Bootstrap v5.3.8 (https://getbootstrap.com/) */ .btn { color: red; }';
    assert.strictEqual(extractBootstrapVersion(css), '5.3.8');
  });

  test('is case insensitive', () => {
    const css = '/* bootstrap V4.6.2 */';
    assert.strictEqual(extractBootstrapVersion(css), '4.6.2');
  });

  test('returns "0" when no version is present', () => {
    assert.strictEqual(extractBootstrapVersion('.btn { color: red; }'), '0');
  });
});

suite('extractCssClasses', () => {
  test('extracts class names and formatted properties', () => {
    const css = '.btn { color: red; background: blue; }';
    const result = extractCssClasses(css);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].className, 'btn');
    assert.ok(result[0].classProperties.includes('color: red;'));
    assert.ok(result[0].classProperties.includes('background: blue;'));
  });

  test('deduplicates repeated class names', () => {
    const css = '.btn { color: red; } .btn { color: blue; } .card { padding: 1rem; }';
    const result = extractCssClasses(css);
    const names = result.map((c) => c.className);

    assert.deepStrictEqual(names, ['btn', 'card']);
  });

  test('returns an empty array when there are no class selectors', () => {
    assert.deepStrictEqual(extractCssClasses('body { margin: 0; }'), []);
  });

  test('does not treat decimal values in declarations as class names', () => {
    const css = '.btn { margin: 0.1875rem; padding: 0.25rem; line-height: 1.5; }';
    const result = extractCssClasses(css);
    const names = result.map((c) => c.className);

    assert.deepStrictEqual(names, ['btn']);
    assert.ok(!names.some((n) => /^\d/.test(n)), 'no class name should start with a digit');
  });
});

suite('extractCssClasses (colors)', () => {
  test('resolves a direct hex color', () => {
    const result = extractCssClasses('.text-custom { color: #0d6efd; }');
    assert.strictEqual(result[0].color, '#0d6efd');
  });

  test('resolves rgb() values to hex', () => {
    const result = extractCssClasses('.bg-custom { background-color: rgb(13, 110, 253); }');
    assert.strictEqual(result[0].color, '#0d6efd');
  });

  test('resolves colors via Bootstrap CSS custom properties', () => {
    const css =
      ':root { --bs-primary-rgb: 13, 110, 253; --bs-bg-opacity: 1; }' +
      '.bg-primary { background-color: rgba(var(--bs-primary-rgb), var(--bs-bg-opacity)); }';
    const bg = extractCssClasses(css).find((c) => c.className === 'bg-primary');

    assert.strictEqual(bg?.color, '#0d6efd');
  });

  test('leaves non-color classes without a color', () => {
    const result = extractCssClasses('.mt-3 { margin-top: 1rem; }');
    assert.strictEqual(result[0].color, undefined);
  });

  test('ignores gradients and transparent', () => {
    const result = extractCssClasses('.x { background: linear-gradient(#fff, #000); } .y { color: transparent; }');
    assert.strictEqual(result.find((c) => c.className === 'x')?.color, undefined);
    assert.strictEqual(result.find((c) => c.className === 'y')?.color, undefined);
  });
});

suite('filterClasses', () => {
  const classes = [
    { className: 'btn', classProperties: '' },
    { className: 'btn-primary', classProperties: '' },
    { className: 'card', classProperties: '' },
    { className: 'd-flex', classProperties: '' },
  ];

  test('returns all unused classes when prefix is empty', () => {
    const result = filterClasses(classes, [], '');
    assert.strictEqual(result.length, 4);
  });

  test('filters by substring prefix (case insensitive)', () => {
    const result = filterClasses(classes, [], 'BTN').map((c) => c.className);
    assert.deepStrictEqual(result, ['btn', 'btn-primary']);
  });

  test('excludes already-used classes', () => {
    const result = filterClasses(classes, ['btn'], '').map((c) => c.className);
    assert.deepStrictEqual(result, ['btn-primary', 'card', 'd-flex']);
  });

  test('combines used-class exclusion with prefix filtering', () => {
    const result = filterClasses(classes, ['btn'], 'btn').map((c) => c.className);
    assert.deepStrictEqual(result, ['btn-primary']);
  });
});

suite('getClassValueAtCursor', () => {
  test('detects HTML class attribute', () => {
    assert.strictEqual(getClassValueAtCursor('<div class="btn btn-pr'), 'btn btn-pr');
  });

  test('detects JSX className', () => {
    assert.strictEqual(getClassValueAtCursor('<div className="d-flex '), 'd-flex ');
  });

  test('detects Vue :class and v-bind:class', () => {
    assert.strictEqual(getClassValueAtCursor('<div :class="text-'), 'text-');
    assert.strictEqual(getClassValueAtCursor('<div v-bind:class="bg-'), 'bg-');
  });

  test('detects Angular [ngClass]', () => {
    assert.strictEqual(getClassValueAtCursor("<div [ngClass]='btn"), 'btn');
  });

  test('detects Svelte class: directive', () => {
    assert.strictEqual(getClassValueAtCursor('<div class:active="cond'), 'cond');
  });

  test('detects class helper calls (cn/clsx)', () => {
    assert.strictEqual(getClassValueAtCursor('cn("btn '), 'btn ');
    assert.strictEqual(getClassValueAtCursor('clsx(`text-'), 'text-');
  });

  test('supports multi-line class attributes', () => {
    assert.strictEqual(getClassValueAtCursor('<div class="btn\n  text-center bg-'), 'btn\n  text-center bg-');
  });

  test('returns undefined outside a class context', () => {
    assert.strictEqual(getClassValueAtCursor('<div id="header'), undefined);
    assert.strictEqual(getClassValueAtCursor('const foo = "bar'), undefined);
  });
});

suite('getClassCategory', () => {
  test('classifies layout classes', () => {
    assert.strictEqual(getClassCategory('container'), 'layout');
    assert.strictEqual(getClassCategory('row'), 'layout');
    assert.strictEqual(getClassCategory('col-md-6'), 'layout');
    assert.strictEqual(getClassCategory('d-flex'), 'layout');
    assert.strictEqual(getClassCategory('d-md-flex'), 'layout');
  });

  test('classifies spacing classes incl. side and responsive variants', () => {
    assert.strictEqual(getClassCategory('m-0'), 'spacing');
    assert.strictEqual(getClassCategory('mt-3'), 'spacing');
    assert.strictEqual(getClassCategory('px-2'), 'spacing');
    assert.strictEqual(getClassCategory('mt-md-3'), 'spacing');
    assert.strictEqual(getClassCategory('gap-2'), 'spacing');
  });

  test('classifies components', () => {
    assert.strictEqual(getClassCategory('btn'), 'components');
    assert.strictEqual(getClassCategory('btn-primary'), 'components');
    assert.strictEqual(getClassCategory('card'), 'components');
    assert.strictEqual(getClassCategory('navbar-nav'), 'components');
  });

  test('classifies utilities', () => {
    assert.strictEqual(getClassCategory('text-center'), 'utilities');
    assert.strictEqual(getClassCategory('bg-primary'), 'utilities');
    assert.strictEqual(getClassCategory('rounded'), 'utilities');
    assert.strictEqual(getClassCategory('shadow-sm'), 'utilities');
  });

  test('treats auto-margin alignment helpers as utilities, not spacing', () => {
    assert.strictEqual(getClassCategory('ms-auto'), 'utilities');
    assert.strictEqual(getClassCategory('me-auto'), 'utilities');
    assert.strictEqual(getClassCategory('mx-auto'), 'utilities');
  });

  test('falls back to other for unknown classes', () => {
    assert.strictEqual(getClassCategory('totally-custom'), 'other');
  });

  test('does not misclassify common non-Bootstrap tokens', () => {
    assert.strictEqual(getClassCategory('color-red'), 'other');
    assert.strictEqual(getClassCategory('flexible'), 'other');
    assert.strictEqual(getClassCategory('listener'), 'other');
    assert.strictEqual(getClassCategory('format-date'), 'other');
  });
});

suite('findClassValueRanges', () => {
  function values(line: string): string[] {
    return findClassValueRanges(line).map((r) => line.slice(r.start, r.end));
  }

  test('finds real class and className attributes', () => {
    assert.deepStrictEqual(values('<div class="btn d-flex">'), ['btn d-flex']);
    assert.deepStrictEqual(values('<Component className="text-center">'), ['text-center']);
  });

  test('ignores data-class and similar false attribute names', () => {
    assert.deepStrictEqual(values('<div data-class="x y" class="a b">'), ['a b']);
  });

  test('ignores class= inside JavaScript string literals', () => {
    assert.deepStrictEqual(values("const s = '<div class=\"btn d-flex\">';"), []);
    assert.deepStrictEqual(values('const s = "<div class=\\"btn\\">";'), []);
  });

  test('collects every string argument in class helper calls', () => {
    assert.deepStrictEqual(values("cn('d-flex btn', isOpen && 'mt-2')"), ['d-flex btn', 'mt-2']);
    assert.deepStrictEqual(values('clsx("text-center", "p-2")'), ['text-center', 'p-2']);
  });

  test('does not treat class= inside a helper string as a separate attribute', () => {
    const line = 'cn(\'<div class="btn">\')';
    assert.strictEqual(values(line).length, 1);
    assert.strictEqual(values(line)[0], '<div class="btn">');
  });

  test('finds class values that span multiple lines', () => {
    const text = '<div class="bg-primary\n  text-white">';
    const ranges = findClassValueRanges(text);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(text.slice(ranges[0].start, ranges[0].end), 'bg-primary\n  text-white');
  });

  test('detects cursor on second line of a multi-line class attribute', () => {
    const text = '<div class="bg-primary\n  text-white">';
    const textWhiteOffset = text.indexOf('text-white') + 2;
    assert.strictEqual(isInsideClassContextAtOffset(text, textWhiteOffset), true);
  });
});

suite('isInsideJavaScriptString', () => {
  test('true inside quoted JS strings', () => {
    const line = "const s = '<div class=\"x\">';";
    const classIndex = line.indexOf('class');
    assert.strictEqual(isInsideJavaScriptString(line, classIndex), true);
  });

  test('false in markup on the same line', () => {
    const line = '<div class="x">';
    const classIndex = line.indexOf('class');
    assert.strictEqual(isInsideJavaScriptString(line, classIndex), false);
  });
});

suite('sortClassNames', () => {
  test('orders layout → spacing → components → utilities', () => {
    assert.strictEqual(sortClassNames('text-center btn mt-3 d-flex'), 'd-flex mt-3 btn text-center');
  });

  test('is stable within a category', () => {
    assert.strictEqual(sortClassNames('btn-primary btn card'), 'btn-primary btn card');
  });

  test('keeps unknown classes at the end', () => {
    assert.strictEqual(sortClassNames('custom-thing d-flex'), 'd-flex custom-thing');
  });

  test('returns single tokens and empty strings unchanged', () => {
    assert.strictEqual(sortClassNames('btn'), 'btn');
    assert.strictEqual(sortClassNames(''), '');
  });

  test('preserves leading and trailing whitespace', () => {
    assert.strictEqual(sortClassNames(' text-center d-flex '), ' d-flex text-center ');
  });

  test('collapses internal whitespace to single spaces', () => {
    assert.strictEqual(sortClassNames('text-center   d-flex'), 'd-flex text-center');
  });
});

suite('isInsideClassContext', () => {
  const line = '<div class="btn btn-primary" id="x">';

  test('true when the index is within the class value', () => {
    const index = line.indexOf('btn-primary') + 2;
    assert.strictEqual(isInsideClassContext(line, index), true);
  });

  test('false when the index is in another attribute', () => {
    const index = line.indexOf('"x"') + 1;
    assert.strictEqual(isInsideClassContext(line, index), false);
  });
});
