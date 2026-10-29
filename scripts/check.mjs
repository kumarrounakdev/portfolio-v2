#!/usr/bin/env node
/**
 * Local sanity checks for this project (not part of the app, no dependencies):
 *   1. every icon imported from lucide-react exists in the installed version
 *   2. every relative import path resolves to a file
 *   3. every static className used in JSX is defined in a stylesheet
 *   4. no import is left unused
 *   5. no module export is referenced without being imported
 *   6. interpolated class-name prefixes have at least one matching rule
 *   7. no export is left that nothing imports
 *   8. no stylesheet rule is left for a class the app no longer names
 *   9. no custom property is left defined and unread
 * Run with: node scripts/check.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const files = walk(join(root, 'src'));
const jsxFiles = files.filter((f) => /\.jsx?$/.test(f));
const cssFiles = files.filter((f) => /\.css$/.test(f));

const definedClasses = new Set();
for (const sheet of cssFiles) {
  for (const match of readFileSync(sheet, 'utf8').matchAll(/\.([a-zA-Z][\w-]*)/g)) definedClasses.add(match[1]);
}

const dts = readFileSync(join(root, 'node_modules/lucide-react/dist/lucide-react.d.ts'), 'utf8');
const availableIcons = new Set([...dts.matchAll(/declare const ([A-Za-z0-9_]+):/g)].map((m) => m[1]));

const problems = [];

/* Tokens: every var(--name) must be defined by a stylesheet or set inline in JSX. */
const definedTokens = new Set();
for (const sheet of cssFiles) {
  for (const m of readFileSync(sheet, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)) definedTokens.add(m[1]);
}
for (const file of jsxFiles) {
  for (const m of readFileSync(file, 'utf8').matchAll(/'(--[a-z0-9-]+)'|"(--[a-z0-9-]+)"/g)) definedTokens.add(m[1] ?? m[2]);
}
const fallbackFree = /var\((--[a-z0-9-]+)\)/g;
for (const file of [...cssFiles, ...jsxFiles]) {
  const rel = file.replace(`${root}/`, '');
  for (const m of readFileSync(file, 'utf8').matchAll(fallbackFree)) {
    if (!definedTokens.has(m[1])) problems.push(`${rel}: var(${m[1]}) is never defined`);
  }
}

for (const file of jsxFiles) {
  const code = readFileSync(file, 'utf8');
  const rel = file.replace(`${root}/`, '');
  const importBlock = code.match(/^import[\s\S]*?\n(?=\n|\/\*|export|const|function)/);
  const body = importBlock ? code.slice(importBlock[0].length) : code;

  for (const match of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/gs)) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0];
      if (name && !availableIcons.has(name)) problems.push(`${rel}: lucide-react has no export named "${name}"`);
    }
  }

  for (const match of code.matchAll(/from\s*['"](\.[^'"]+)['"]/g)) {
    if (!existsSync(resolve(dirname(file), match[1]))) problems.push(`${rel}: cannot resolve "${match[1]}"`);
  }

  for (const match of code.matchAll(/className="([^"{}$]+)"/g)) {
    for (const cls of match[1].split(/\s+/).filter(Boolean)) {
      if (!definedClasses.has(cls)) problems.push(`${rel}: ".${cls}" is not defined in any stylesheet`);
    }
  }

  for (const match of code.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop();
      if (name && !new RegExp(`\\b${name}\\b`).test(body)) problems.push(`${rel}: unused import "${name}"`);
    }
  }
  for (const match of code.matchAll(/import\s+([A-Za-z0-9_]+)\s+from/g)) {
    if (!new RegExp(`\\b${match[1]}\\b`).test(body)) problems.push(`${rel}: unused import "${match[1]}"`);
  }
}


/* 5. Missing imports. A bare identifier only blows up when the code path runs, so a
   data or util export used without an import passes a build and then throws inside a
   component. Every named export of every module in src/ is therefore checked against
   the import list of every other module that mentions it. */
const moduleExports = new Map(); // name -> declaring file
for (const file of files) {
  if (!/\.(js|jsx)$/.test(file) || file.includes('/styles/')) continue;
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_$]+)/g)) {
    if (!moduleExports.has(m[1])) moduleExports.set(m[1], file);
  }
}

const stripCommentsAndStrings = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g, "''")
    // Prose between tags ("…and in the Dock.") is not a reference; JSX expressions
    // contain a brace, so those survive.
    .replace(/>([^<>{}]*)</g, '><');

for (const file of jsxFiles) {
  const raw = readFileSync(file, 'utf8');
  const body = stripCommentsAndStrings(raw);
  const known = new Set();
  for (const m of raw.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) known.add(name);
    }
  }
  for (const m of raw.matchAll(/import\s+([A-Za-z0-9_$]+)\s*[,{]/g)) known.add(m[1]);
  for (const m of body.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(':').pop().trim();
      if (name) known.add(name);
    }
  }
  for (const m of body.matchAll(/(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) known.add(m[1]);

  const rel = file.replace(`${root}/`, '');
  for (const [name, owner] of moduleExports) {
    if (owner === file || known.has(name)) continue;
    const escape = name.replace(/\$/g, '\\$');
    /* Only real references count. A bare word in prose ("the Dock", "projects") is a
       false positive, so the name has to be called, dereferenced, rendered as an
       element, interpolated in a JSX expression, or read as a value. */
    /* A leading `.` or word character means this is a property of something else —
       `resume.projects` is not the module `projects` — so the lookbehind keeps the
       rule honest about data fields it happens to share a name with. */
    const guarded = `(?<![.\\w$])`;
    const patterns = [
      new RegExp(`${guarded}${escape}\\s*\\(`), // call
      new RegExp(`${guarded}${escape}\\s*\\.\\s*[A-Za-z_$]`), // member access
      new RegExp(`[{,([]\\s*${escape}\\s*[},)]`), // JSX expression / shorthand value
      new RegExp(`<\\s*\\/?${escape}\\b`), // JSX element
      new RegExp(`\\breturn\\s+${escape}\\b`), // returned
      /* the shorthand-value pattern below already requires a delimiter in front */
      new RegExp(`=\\s*${escape}\\s*[;,)]`), // assigned from
    ];
    if (patterns.some((pattern) => pattern.test(body))) {
      problems.push(`${rel}: uses "${name}" (exported by ${owner.replace(`${root}/`, '')}) without importing it`);
    }
  }
}

/* `.window--<id>` is an identity hook, not a style target: every window shares the
   same chrome and styles its own content through component classes. Whitelisted so
   the check below does not demand a rule for a class that deliberately has none. */
const HOOK_CLASS_PREFIXES = ['window--'];

/* 6. Dynamic class names. `className={`term__line term__line--${kind}`}` cannot be
   matched literally, so every static prefix in an interpolated class name has to
   have at least one real rule starting with it — otherwise a state silently
   renders unstyled. */
for (const file of jsxFiles) {
  const text = readFileSync(file, 'utf8');
  const rel = file.replace(`${root}/`, '');
  for (const match of text.matchAll(/className=\{`([^`]*)`\}/g)) {
    const template = match[1];
    if (!template.includes('${')) continue;
    for (const chunk of template.split(/\$\{[^}]*\}/)) {
      const prefixes = chunk.match(/[a-z][\w-]*--/g) ?? [];
      for (const prefix of prefixes) {
        const head = prefix.slice(0, -2);
        if (HOOK_CLASS_PREFIXES.includes(`${head}--`)) continue;
        const any = [...definedClasses].some((name) => name.startsWith(`${head}--`));
        if (!any) problems.push(`${rel}: dynamic class "${prefix}*" is not defined in any stylesheet`);
      }
    }
  }
}

/* 7. Dead exports. An export nobody imports is an API the project has to keep
   compatible for no reader at all, and — worse here — a lie about what a module is
   for. Every named export is therefore looked for in every other module and in the
   harness, which loads modules directly. A name used only inside its own file is
   reported as such: the symbol is real, the export is not. */
const scripts = readdirSync(join(root, 'scripts'))
  .map((entry) => join(root, 'scripts', entry))
  .filter((file) => /\.mjs$/.test(file));
const consumers = [...jsxFiles, ...scripts].filter((file) => !file.includes('/styles/'));
const consumerText = new Map(consumers.map((file) => [file, stripCommentsAndStrings(readFileSync(file, 'utf8'))]));
const htmlText = readFileSync(join(root, 'index.html'), 'utf8');

/* A module reached by `import('./ProjectsWindow.jsx')` is consumed by path, not by
   name — which is exactly what a deferred window looks like from the registry. Its
   exports are the contract the loader binds to, so those files are exempt, and the
   smoke suite proves the promise resolves to a component. */
const fetchedByPath = new Set();
const lazyContracts = [];
for (const file of jsxFiles) {
  for (const m of readFileSync(file, 'utf8').matchAll(/import\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
    if (!m[1].startsWith('.')) continue;
    const target = resolve(dirname(file), m[1].replace(/\$\{.*$/, ''));
    const found = [target, `${target}.jsx`, `${target}.js`].find((candidate) => existsSync(candidate));
    if (!found) {
      problems.push(`${file.replace(`${root}/`, '')}: import('${m[1]}') resolves to no file`);
      continue;
    }
    fetchedByPath.add(found);
    lazyContracts.push([file, found]);
  }
}

for (const file of jsxFiles) {
  if (/(main|App)\.jsx$/.test(file) || fetchedByPath.has(file)) continue;
  const rel = file.replace(`${root}/`, '');
  const text = readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of text.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  for (const m of text.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  for (const name of names) {
    const escape = name.replace(/\$/g, '\\$');
    const reference = new RegExp(`(?<![.\\w$])${escape}(?![\\w$])`);
    const usedElsewhere = consumerText.get(file)
      ? [...consumerText.entries()].some(([other, body]) => other !== file && reference.test(body))
      : false;
    if (usedElsewhere || reference.test(htmlText)) continue;
    const ownUses = (stripCommentsAndStrings(text).match(new RegExp(`(?<![.\\w$])${escape}(?![\\w$])`, 'g')) ?? []).length;
    problems.push(
      ownUses > 1
        ? `${rel}: "${name}" is exported but only ever used in this file — drop the export`
        : `${rel}: "${name}" is exported and read by nothing`,
    );
  }
}

/* React's lazy() binds to a module's default export, so a file that can be fetched
   by path has to carry one — otherwise the failure is a render error in whichever
   browser happens to open that window. Checked here because it is invisible to a
   build, a type-check and every static pass above. */
for (const [file, target] of lazyContracts) {
  const text = readFileSync(target, 'utf8');
  if (!/export default /.test(text)) {
    problems.push(
      `${file.replace(`${root}/`, '')}: lazy-loads ${target.replace(`${root}/`, '')}, which has no default export for React to bind to`,
    );
  }
}
/* 8. The mirror of rule 3: a rule for a class no element ever carries. Modifiers
   built at runtime (`btn--${variant}`) are exempt, because the string cannot be
   matched — that is what rule 6 checks from the other side. */
const usedText = [...jsxFiles, join(root, 'index.html')].map((file) => readFileSync(file, 'utf8')).join('\n');
for (const sheet of cssFiles) {
  const rel = sheet.replace(`${root}/`, '');
  const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const m of css.matchAll(/(^|[\s,{:>])(\.[a-zA-Z][\w-]*)/g)) {
    const name = m[2].slice(1);
    if (HOOK_CLASS_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
    if (new RegExp(`(^|[^\\w-])${name.replace(/\$/g, '\\$')}([^\\w-]|$)`).test(usedText)) continue;
    const family = name.includes('--') ? name.slice(0, name.indexOf('--')) : null;
    if (family && (usedText.includes(`${family}--$`) || usedText.includes(`${family}--\${`))) continue;
    problems.push(`${rel}: rule for "${m[2]}" — no element in the app carries that class`);
  }
}

/* 9. A token defined and never read is a value nobody can change and a designer
   will keep matching against. Same logic as before, one direction further. */
const readTokens = new Set();
for (const file of [...cssFiles, ...jsxFiles]) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/var\((--[a-z0-9-]+)/g)) readTokens.add(m[1]);
  for (const m of text.matchAll(/getPropertyValue\(\s*['"](--[a-z0-9-]+)/g)) readTokens.add(m[1]);
}
for (const sheet of cssFiles) {
  const rel = sheet.replace(`${root}/`, '');
  const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const m of css.matchAll(/(^|[\s;{])(--[a-z0-9-]+)\s*:/g)) {
    if (!readTokens.has(m[2])) problems.push(`${rel}: "${m[2]}" is defined and never read by var()`);
  }
}

/* 10. The contribution ramp has to be visible, in both appearances. This exists
   because the first version of it looked correct and was not: five shades built as
   `color-mix(accent X%, transparent)` are five transparencies of one colour, and
   18% of a blue over a near-white sheet is 1.09 : 1 against the empty square
   beside it — a grid that reads as blank while containing 200-odd commits. A
   colour cannot be reviewed by eye in a diff, so it is measured here: every level
   must clear 1.3 : 1 against an empty day, and each step must be stronger than the
   one below it. */
const hexToRgb = (hex) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const body = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(body.slice(i, i + 2), 16));
};
const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (rgb) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/* Resolves what a ramp token actually paints: a literal hex, another token, or a
   color-mix of the accent into a literal or a token. Anything else is a shape this
   check refuses to guess about, and says so. */
const resolveColour = (value, scope) => {
  const text = String(value).trim();
  const literal = hexToRgb(text);
  if (literal) return literal;
  const alias = /^var\((--[a-z0-9-]+)\)$/.exec(text);
  if (alias) return hexToRgb(scope.get(alias[1]));
  const mixed = /color-mix\(\s*in srgb\s*,\s*var\(--accent\)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/.exec(text);
  if (!mixed) return null;
  const accent = hexToRgb(scope.get('--accent'));
  const into = resolveColour(mixed[2], scope);
  if (!accent || !into) return null;
  const t = Number(mixed[1]) / 100;
  return [0, 1, 2].map((i) => accent[i] * t + into[i] * (1 - t));
};
const themes = readFileSync(join(root, 'src/styles/themes.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
const blockAfter = (marker) => {
  const at = themes.indexOf(marker);
  if (at === -1) return '';
  const open = themes.indexOf('{', at);
  const close = themes.indexOf('\n}', open);
  return themes.slice(open, close === -1 ? undefined : close);
};
for (const [appearance, marker] of [
  ['light', ":root,\n[data-theme='light']"],
  ['dark', "[data-theme='dark']"],
]) {
  const block = blockAfter(marker);
  const scope = new Map();
  for (const m of block.matchAll(/(^|[;\s])(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) scope.set(m[2], m[3].trim());
  const empty = hexToRgb(scope.get('--contrib-empty'));
  if (!scope.has('--contrib-1')) {
    problems.push(`themes.css: the ${appearance} appearance defines no contribution ramp of its own`);
    continue;
  }
  if (!empty) {
    problems.push(`themes.css: --contrib-empty in the ${appearance} appearance is not a literal colour this check can measure`);
    continue;
  }
  let previousRatio = 1;
  [1, 2, 3, 4].forEach((level) => {
    const raw = scope.get(`--contrib-${level}`);
    if (!raw) {
      problems.push(`themes.css: the ${appearance} appearance is missing --contrib-${level}`);
      return;
    }
    if (/\btransparent\b/.test(raw)) {
      problems.push(
        `themes.css: --contrib-${level} (${appearance}) is mixed with transparent — a transparency of the accent on a light sheet is not a colour`,
      );
      return;
    }
    const colour = resolveColour(raw, scope);
    if (!colour) {
      problems.push(`themes.css: --contrib-${level} (${appearance}) is a shape this check cannot measure: ${raw}`);
      return;
    }
    const againstEmpty = contrast(colour, empty);
    if (previousRatio > 1 && againstEmpty < 1.3) {
      problems.push(
        `themes.css: --contrib-${level} (${appearance}) is ${againstEmpty.toFixed(2)} : 1 against an empty day — under the 1.3 : 1 floor, so that step cannot be seen`,
      );
    }
    if (againstEmpty < previousRatio) {
      problems.push(
        `themes.css: --contrib-${level} (${appearance}) is weaker than the step below it (${againstEmpty.toFixed(2)} : 1 against ${previousRatio.toFixed(2)} : 1)`,
      );
    }
    previousRatio = againstEmpty;
  });
}

const unique = [...new Set(problems)];
if (unique.length) {
  console.log(`FOUND ${unique.length} problem(s):`);
  unique.forEach((problem) => console.log(`  x ${problem}`));
  process.exitCode = 1;
} else {
  console.log(`checks passed across ${jsxFiles.length} modules: icons, imports, class names, unused imports, missing imports, dead exports, unreachable rules, unread tokens, visible ramps`);
}
