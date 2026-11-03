#!/usr/bin/env node
/**
 * Runs after `astro build` for the Vercel target (see "build:vercel" in package.json).
 * Vercel serves static files from its CDN, outside our middleware, so this adds the
 * security headers to every route in the generated Build Output config, the same way
 * the adapter adds its own cache header. Pages get them twice (here and from the
 * middleware); identical values, no harm.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { SECURITY_HEADERS } from '../security-headers.mjs';

const file = new URL('../.vercel/output/config.json', import.meta.url);
const config = JSON.parse(readFileSync(file, 'utf8'));

const headers = Object.fromEntries(Object.entries(SECURITY_HEADERS).map(([k, v]) => [k.toLowerCase(), v]));
const ours = { src: '/(.*)', headers, continue: true };

const routes = (config.routes ?? []).filter((r) => !(r.continue && r.headers && 'content-security-policy' in r.headers));
config.routes = [ours, ...routes];
writeFileSync(file, JSON.stringify(config, null, 2));
console.log(`[tea-talks] added ${Object.keys(headers).length} security headers to every Vercel route`);
