import fs from 'fs';
import path from 'path';

/**
 * Product-wide rules that are easy to break one screen at a time, so they are
 * pinned here instead: every dropdown is searchable, every waiting state comes
 * from the one shared GIF, and every outcome is reported through the one toast
 * stack rather than a browser dialog or a page of its own.
 *
 * The walk starts at `src/`, not the repo root, so build output and config are
 * out of scope.
 */
const SRC = path.resolve(__dirname, '..', '..');

function sourceFiles(dir: string = SRC): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

/** A readable `path/to/file.tsx:12` instead of a bare boolean, so failures explain themselves. */
function offenders(files: string[], pattern: RegExp): string[] {
  return files.flatMap((file) =>
    hits(file, pattern).map(
      (number) => `${path.relative(SRC, file).split(path.sep).join('/')}:${number}`,
    ),
  );
}

/** The 1-based line numbers in one file where `pattern` matches. */
function hits(file: string, pattern: RegExp): number[] {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index) => (pattern.test(line) ? [index + 1] : []));
}

const files = sourceFiles();

describe('dropdowns', () => {
  it('never renders a native select', () => {
    // `<select` or `<Select` would both be a dropdown that cannot be typed into.
    expect(offenders(files, /<(select|Select)[\s>]/)).toEqual([]);
  });

  it('no longer imports the removed native wrappers', () => {
    expect(
      offenders(files, /from '@\/components\/(ui\/select|onboarding\/select-field)'/),
    ).toEqual([]);
  });

  it('routes every existing dropdown through the shared component', () => {
    // Every screen that had a dropdown at the time of the audit; reverting one
    // to a native control fails here by name.
    const expected = [
      'components/imports/column-mapping-table.tsx',
      'components/pharmacy/movement-form.tsx',
      'features/onboarding/pharmacy-profile-step.tsx',
      'features/onboarding/staff-invite-panel.tsx',
      'features/pharmacy/bulk-medicines.tsx',
      'features/pharmacy/record-sale.tsx',
      'features/pharmacy/stock-receipts.tsx',
    ];
    const users = files
      .filter((file) =>
        /from '@\/components\/ui\/searchable-select'/.test(fs.readFileSync(file, 'utf8')),
      )
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'))
      .sort();

    expect(users).toEqual(expected);
  });
});

describe('loading states', () => {
  it('references the loading GIF from a single module', () => {
    expect(offenders(files, /loading\.gif/)).toEqual(['components/ui/loading.tsx:8']);
  });

  it('does not reintroduce per-page spinners or pulse skeletons', () => {
    expect(offenders(files, /Loader2|animate-pulse|<Skeleton/)).toEqual([]);
  });

  it('gives each top-level section a route-level fallback', () => {
    for (const fallback of [
      path.join(SRC, 'app', 'products', 'loading.tsx'),
      path.join(SRC, 'app', '(platform)', 'loading.tsx'),
    ]) {
      expect(fs.existsSync(fallback)).toBe(true);
    }
  });
});

describe('notifications', () => {
  it('never falls back to a browser dialog', () => {
    // `alert`/`confirm` block the page and cannot be styled; the toast stack is
    // the only channel for an outcome.
    expect(offenders(files, /(?<![\w.])(alert|confirm|prompt)\(/)).toEqual([]);
  });

  it('mounts the toast stack once, at the root', () => {
    const mounts = files.filter((file) => hits(file, /<Toaster\b/).length > 0);
    expect(mounts.map((file) => path.relative(SRC, file).split(path.sep).join('/'))).toEqual([
      'app/layout.tsx',
    ]);
  });

  it('declares what each write announces, so no screen has to invent it', () => {
    // Without `meta` the shared caches fall back to generic copy, which is
    // exactly the drift this feature replaced.
    const missing: string[] = [];
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (!/useMutation\(\{/.test(line)) return;
        // The declaration may sit below a comment explaining the copy, so look a
        // little further than the opening line.
        const block = lines.slice(index, index + 8).join('\n');
        if (!/^\s*meta:/m.test(block)) {
          missing.push(`${path.relative(SRC, file).split(path.sep).join('/')}:${index + 1}`);
        }
      });
    }
    expect(missing).toEqual([]);
  });

  it('keeps error text out of handlers that could print internals', () => {
    // Raw error objects carry stack traces and database detail; only the safe
    // copy helpers may turn one into a sentence.
    expect(offenders(files, /toast\.(success|error)\(\s*(error|err|thrown)\.message/)).toEqual([]);
  });
});
