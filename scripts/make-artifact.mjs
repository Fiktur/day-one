// Turns the single-file build into a page fragment for sharing as a hosted artifact
// (the host supplies <html>, <head> and <body>).
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist-single/index.html', 'utf8')
const pick = (re) => [...html.matchAll(re)].map((m) => m[0])
const title = pick(/<title>[\s\S]*?<\/title>/g)
const links = pick(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g)
const styles = pick(/<style[\s\S]*?<\/style>/g)
const scripts = pick(/<script type="module"[\s\S]*?<\/script>/g)
if (!scripts.length) throw new Error('No inline module script found. Run npm run build:single first.')

const out = [
  ...title,
  ...links,
  ...styles,
  '<div id="root"></div>',
  ...scripts,
].join('\n')
writeFileSync('dist-single/day-one.html', out)
console.log(`dist-single/day-one.html written (${(out.length / 1024).toFixed(0)} KB)`)
