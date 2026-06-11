#!/usr/bin/env node
/**
 * research-jobs.js
 * Fetches job URLs and extracts only the essentials.
 * Use this instead of web_fetch in chat — keeps context lean.
 *
 * Usage:
 *   node research-jobs.js <url1> [url2] [url3] ...
 *   node research-jobs.js --query "devrel web3 remote"
 *
 * Output: clean JSON array, one object per job
 */

const https = require('https');
const http = require('http');

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const APPLY_RE = /careers@|jobs@|hiring@|apply@|talent@/i;

function fetch(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => { body += chunk; if (body.length > 50000) res.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000);
}

function extractEmails(text) {
  const found = text.match(EMAIL_RE) || [];
  return [...new Set(found)].filter(e => !e.includes('example') && !e.includes('sentry'));
}

function detectApplyMethod(url, text) {
  if (url.includes('ashbyhq.com')) return 'ashby-form';
  if (url.includes('greenhouse.io')) return 'greenhouse-form';
  if (url.includes('lever.co')) return 'lever-form';
  if (url.includes('linkedin.com')) return 'linkedin';
  const emails = extractEmails(text).filter(e => APPLY_RE.test(e));
  if (emails.length) return `email:${emails[0]}`;
  const allEmails = extractEmails(text);
  if (allEmails.length) return `email:${allEmails[0]}`;
  return 'form-unknown';
}

function extractTitle(text) {
  const m = text.match(/(?:Senior|Staff|Lead|Principal|Junior)?\s*(?:Software|Full.?Stack|Product|UX|UI|Frontend|Backend|DevRel|Developer|Engineer|Designer|Manager|PM|TPM)[^|.\n]{0,60}/i);
  return m ? m[0].trim().slice(0, 80) : 'Unknown role';
}

async function analyzeUrl(url) {
  try {
    const { status, body } = await fetch(url);
    if (status >= 400) return { url, error: `HTTP ${status}` };
    const text = extractText(body);
    const emails = extractEmails(text);
    const applyMethod = detectApplyMethod(url, text);
    const title = extractTitle(text);
    return { url, title, applyMethod, emails, snippet: text.slice(0, 300) };
  } catch (e) {
    return { url, error: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('Usage: node research-jobs.js <url1> [url2] ...');
    process.exit(1);
  }

  const results = [];
  for (const url of args) {
    process.stderr.write(`Fetching ${url}...\n`);
    results.push(await analyzeUrl(url));
  }

  console.log(JSON.stringify(results, null, 2));
}

main();
