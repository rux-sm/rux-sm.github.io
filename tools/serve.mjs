#!/usr/bin/env node
//
// The one local server. This repository's folders ARE the site as GitHub
// Pages serves it -- `/` is index.html here, `/design/` is design/, and so on
// -- so Design's static server in plain mode, rooted here, is the whole thing.
// Loopback only.
//
//   npm run serve                 http://localhost:8640/, offline: no log-in,
//                                 nothing read from or written to the database
//   npm run serve -- --cloud      http://localhost:8641/, the same files with the
//                                 log-in and live data, a fixed address to
//                                 bookmark; account.js and funnel.js know it by
//                                 its port
//
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const SERVER = join(ROOT, 'design', 'tools', 'serve.mjs');
const env = { ...process.env, HOST: process.env.HOST ?? 'localhost' };

if (process.argv.includes('--cloud')) {
  // Always 8641, whatever PORT says: the pages decide by this port alone.
  console.log('  cloud preview: http://localhost:8641/  (live log-in and data)');
  spawn(process.execPath, [SERVER], { cwd: ROOT, stdio: 'inherit', env: { ...env, PORT: '8641' } });
} else {
  spawn(process.execPath, [SERVER], { cwd: ROOT, stdio: 'inherit', env: { ...env, PORT: env.PORT ?? '8640' } });
}
