/*
 * Check that the site hangs together: every tool is reachable from everywhere
 * it should be, every file a page asks for exists, and every check is run.
 *
 * Adding a tool means touching half a dozen files by hand (the nav on every
 * page, the home page, the 404, the sitemap, the README, the link-preview
 * generator). Forgetting one of them fails silently: the tool works, and
 * nobody can find it. This turns each of those into a failure.
 *
 *   1. every tools/*.html is in the nav of every page that has one, on the
 *      home page, on the 404, in sitemap.xml, in the README's tool table and
 *      in the PAGES list of assets/build_og.py;
 *   2. every page's og:image and twitter:image point to a file that exists;
 *   3. every local src and href on every page resolves to a file;
 *   4. no page loads anything from another domain (the README promises no
 *      dependencies and no tracking);
 *   5. every validation/check_*.js is on the `bateria:` line of CLAUDE.md and
 *      in the CI workflow, and everything on that line exists.
 *
 * Usage: node check_site.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const exists = p => fs.existsSync(path.join(root, p)) &&
                    fs.statSync(path.join(root, p)).isFile();

/* The published address, and the path GitHub Pages serves the repo under. */
const SITE = 'https://igorlima-py.github.io/experiment-calculators/';
const BASE_PATH = '/experiment-calculators/';

const tools = fs.readdirSync(path.join(root, 'tools'))
  .filter(f => f.endsWith('.html')).sort()
  .map(f => 'tools/' + f);
const pages = ['index.html', '404.html'].concat(tools, ['validation/index.html']);

const results = [];
function check(name, problems) {
  results.push({ name, problems });
}

/* A link as written on `page`, as a path from the repository root, or null
 * when it points off the site or only within the page. */
function resolve(page, ref) {
  if (/^[a-z]+:/i.test(ref) || ref.startsWith('//') || ref.startsWith('#')) {
    return null;
  }
  let p = ref.split('#')[0].split('?')[0];
  if (p === '') return null;
  if (p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length);
  else if (p.startsWith('/')) p = p.slice(1);
  else p = path.posix.join(path.posix.dirname(page), p);
  p = path.posix.normalize(p);
  if (p === '.' || p.endsWith('/')) p = path.posix.join(p, 'index.html');
  return p;
}

function attributes(html, name) {
  const re = new RegExp('\\s' + name + '="([^"]*)"', 'g');
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function block(html, openRe, close) {
  const m = openRe.exec(html);
  if (!m) return null;
  const end = html.indexOf(close, m.index);
  return end === -1 ? null : html.slice(m.index, end);
}

const html = {};
for (const p of pages) html[p] = read(p);

/* ---- 1. every tool, everywhere ---- */

const missing = (where, have) => tools
  .filter(t => !have.has(t))
  .map(t => t + ' is not in ' + where);

{
  const problems = [];
  const navPages = tools.concat(['validation/index.html']);
  for (const page of navPages) {
    const nav = block(html[page], /<nav class="site-nav">/, '</nav>');
    if (nav === null) {
      problems.push(page + ' has no site-nav');
      continue;
    }
    const have = new Set(attributes(nav, 'href').map(h => resolve(page, h)));
    problems.push(...missing('the nav of ' + page, have));
  }
  check('Every tool in the nav of every page', problems);
}

for (const page of ['index.html', '404.html']) {
  const list = block(html[page], /<nav class="tool-list">/, '</nav>');
  const have = new Set(list === null ? [] :
    attributes(list, 'href').map(h => resolve(page, h)));
  check('Every tool on ' + page, list === null ? [page + ' has no tool list'] :
    missing('the tool list of ' + page, have));
}

{
  const locs = new Set();
  const re = /<loc>([^<]*)<\/loc>/g;
  const xml = read('sitemap.xml');
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[1].startsWith(SITE)) locs.add(m[1].slice(SITE.length));
  }
  check('Every tool in sitemap.xml', missing('sitemap.xml', locs));
}

{
  const readme = read('README.md');
  const at = readme.indexOf('## The tools');
  const next = readme.indexOf('\n## ', at + 1);
  const section = at === -1 ? '' : readme.slice(at, next === -1 ? undefined : next);
  const have = new Set();
  const re = /^\|\s*\[[^\]]+\]\(([^)]+)\)/gm;
  let m;
  while ((m = re.exec(section)) !== null) have.add(resolve('README.md', m[1]));
  check('Every tool in the README table', at === -1 ?
    ['README.md has no "## The tools" section'] : missing('the README table', have));
}

{
  const py = read('assets/build_og.py');
  const list = block(py, /^PAGES = \[/m, '\n]');
  const have = new Set();
  if (list !== null) {
    const re = /^\s{4}\("([a-z0-9-]+)",/gm;
    let m;
    while ((m = re.exec(list)) !== null) have.add('tools/' + m[1] + '.html');
  }
  check('Every tool in the PAGES of build_og.py', list === null ?
    ['assets/build_og.py has no PAGES list'] :
    missing('PAGES in assets/build_og.py', have));
}

/* ---- 2. link-preview images exist ---- */

{
  const problems = [];
  for (const page of pages) {
    const metas = html[page].match(/<meta (?:property|name)="(?:og|twitter):image" content="[^"]*">/g) || [];
    /* The 404 is noindex and never shared; every other page must have both. */
    if (page !== '404.html' && metas.length < 2) {
      problems.push(page + ' is missing og:image or twitter:image');
    }
    for (const meta of metas) {
      const url = /content="([^"]*)"/.exec(meta)[1];
      if (!url.startsWith(SITE)) {
        problems.push(page + ': preview image is not on this site: ' + url);
      } else if (!exists(url.slice(SITE.length))) {
        problems.push(page + ': preview image does not exist: ' + url.slice(SITE.length));
      }
    }
  }
  check('Every preview image exists', problems);
}

/* ---- 3. every local reference resolves ---- */

{
  const problems = [];
  let count = 0;
  for (const page of pages) {
    for (const ref of attributes(html[page], 'src').concat(attributes(html[page], 'href'))) {
      const target = resolve(page, ref);
      if (target === null) continue;
      count++;
      if (!exists(target)) problems.push(page + ': ' + ref + ' does not exist');
    }
  }
  check('Every local src and href resolves (' + count + ' of them)', problems);
}

/* ---- 4. nothing loaded from another domain ---- */

{
  const problems = [];
  for (const page of pages) {
    for (const src of attributes(html[page], 'src')) {
      if (resolve(page, src) === null) problems.push(page + ' loads ' + src);
    }
    const links = html[page].match(/<link [^>]*>/g) || [];
    for (const link of links) {
      if (/rel="canonical"/.test(link)) continue;
      const href = /href="([^"]*)"/.exec(link);
      if (href && resolve(page, href[1]) === null) {
        problems.push(page + ' loads ' + href[1]);
      }
    }
  }
  for (const css of fs.readdirSync(path.join(root, 'assets')).filter(f => f.endsWith('.css'))) {
    const text = read('assets/' + css);
    const refs = text.match(/@import[^;]*|url\([^)]*\)/g) || [];
    for (const r of refs) {
      if (/(https?:)?\/\//.test(r)) problems.push('assets/' + css + ' loads ' + r);
    }
  }
  check('Nothing loaded from another domain', problems);
}

/* ---- 5. every check runs ---- */

{
  const checks = fs.readdirSync(__dirname)
    .filter(f => /^check_.*\.js$/.test(f)).sort();

  const line = /^bateria: (.*)$/m.exec(read('CLAUDE.md'));
  const onLine = line === null ? [] :
    (line[1].match(/validation[\\/](check_[a-z0-9_]+\.js)/g) || [])
      .map(s => s.replace(/^validation[\\/]/, ''));
  const workflow = read('.github/workflows/validation.yml');

  const problems = [];
  if (line === null) problems.push('CLAUDE.md has no bateria: line');
  for (const c of checks) {
    if (onLine.indexOf(c) === -1) problems.push(c + ' is not on the bateria: line');
    if (!new RegExp('node (validation/)?' + c.replace('.', '\\.') + '\\b').test(workflow)) {
      problems.push(c + ' is not in .github/workflows/validation.yml');
    }
  }
  for (const c of onLine) {
    if (checks.indexOf(c) === -1) problems.push('the bateria: line runs ' + c + ', which does not exist');
  }
  check('Every check on the bateria line and in CI (' + checks.length + ' of them)', problems);
}

/* ---- report ---- */

console.log('');
console.log('Tools found: ' + tools.join(', '));
console.log('');
console.log('| Check | Result |');
console.log('|---|---|');
for (const r of results) {
  console.log(`| ${r.name} | ${r.problems.length ? 'FAIL' : 'ok'} |`);
}
console.log('');

const failed = results.filter(r => r.problems.length);
for (const r of failed) {
  for (const p of r.problems) console.error(`${r.name}: ${p}`);
}
if (failed.length) {
  console.error(`${failed.length} of ${results.length} site check(s) FAILED`);
  process.exit(1);
}
console.log(`All ${results.length} site checks pass.`);
