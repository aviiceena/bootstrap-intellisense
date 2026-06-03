import * as assert from 'assert';

import { extractCssClasses, extractBootstrapVersion } from '../core/bootstrap';
import { filterClasses } from '../features/completion/completionProvider';
import { getClassValueAtCursor, isInsideClassContext } from '../core/classContext';

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
