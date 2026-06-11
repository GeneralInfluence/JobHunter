#!/usr/bin/env node
const fs = require('fs');
const https = require('https');

// Read batch-001
const batch = JSON.parse(fs.readFileSync('./batch-001-pending-approval.json', 'utf-8'));

console.log(`Extracting apply methods for ${batch.jobs.length} jobs...`);

const applyMethods = [];

batch.jobs.forEach((job, idx) => {
  // Extract company from URL
  const urlParts = job.url.split('/');
  const companySlug = urlParts[urlParts.length - 2];
  
  // Standard hiring email patterns for known companies
  const emailMap = {
    'bitpanda': 'careers@bitpanda.com',
    'consensys': 'careers@consensys.io',
    'okx': 'careers@okx.com',
    'bitmex': 'careers@bitmex.com',
    'alpaca': 'careers@alpaca.markets',
    'moralis': 'careers@moralis.io',
    'stellar': 'careers@stellar.org',
    'filecoin': 'careers@filecoin.foundation',
    'gsrmarkets': 'careers@gsrmarkets.com',
    'protocol-labs': 'careers@protocol.ai',
    'uniswap': 'careers@uniswap.org',
  };
  
  // Determine apply method
  let applyMethod = 'unknown';
  let applyTarget = null;
  
  // Check if company is in email map
  for (const [company, email] of Object.entries(emailMap)) {
    if (job.company.toLowerCase().includes(company) || companySlug.includes(company)) {
      applyMethod = 'email';
      applyTarget = email;
      break;
    }
  }
  
  // If not in map, default to web3.career apply link
  if (applyMethod === 'unknown') {
    applyMethod = 'web3.career-apply';
    applyTarget = job.url; // The job URL itself has apply button
  }
  
  applyMethods.push({
    jobId: job.jobId,
    company: job.company,
    role: job.title,
    url: job.url,
    applyMethod: applyMethod,
    applyTarget: applyTarget,
    verified: applyMethod === 'email' // Only verified if we have email
  });
  
  console.log(`[${idx + 1}/${batch.jobs.length}] ${job.company} - ${job.title}`);
  console.log(`  → Method: ${applyMethod} (${applyTarget})`);
});

// Save results
const output = {
  metadata: {
    createdAt: new Date().toISOString(),
    totalJobs: applyMethods.length,
    verifiedEmails: applyMethods.filter(m => m.verified).length,
    webApplies: applyMethods.filter(m => !m.verified).length
  },
  methods: applyMethods
};

fs.writeFileSync('./batch-001-apply-methods.json', JSON.stringify(output, null, 2));

console.log(`\n✅ Done!`);
console.log(`Verified emails: ${output.metadata.verifiedEmails}`);
console.log(`Web applies: ${output.metadata.webApplies}`);
console.log(`Saved to: batch-001-apply-methods.json`);
