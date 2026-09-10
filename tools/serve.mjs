#!/usr/bin/env node
// This site's server: rux-ds's workspace server, from the checkout beside
// this repository (or DS=<dir>), on 8640 -- every site on one origin, laid
// out as they are live: `/` this hub, `/<app>/` each app, `/rux-ds/` the
// design system. Both pages link /rux-ds/…, so a server that serves this
// folder alone shows them unstyled; that is why this stopped being a
// standalone static server on 2026-09-10 (rux-ds roadmap §8.4 step 5).
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;
const DS = resolve(root, process.env.DS ?? '../rux-ds');
if (!existsSync(join(DS, 'tools/serve.mjs'))) {
  console.error(`  no rux-ds at ${DS} -- clone it beside this repository, or set DS=<dir>`);
  process.exit(1);
}
process.argv.push('--workspace', resolve(root, '..'));
console.log(`  this hub: http://localhost:${process.env.PORT ?? 8640}/`);
await import(pathToFileURL(join(DS, 'tools/serve.mjs')).href);
