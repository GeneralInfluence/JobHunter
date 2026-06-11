#!/usr/bin/env node
/**
 * Send batch-002 applications with multi-email strategy.
 * 
 * For each job:
 * - If confirmedEmail is set → send to that only
 * - Otherwise → send to ALL emailsToTry (spray approach)
 * - ATS jobs → skip (output link for manual apply)
 *
 * Uses Gmail API (OAuth2) so emails get "Job Hunt" label.
 */

const fs = require('fs');
const { google } = require('googleapis');

const SENDER_EMAIL = 'sean.moore.gonzalez@gmail.com';
const JOB_HUNT_LABEL_ID = 'Label_1444622533053672996';
const BATCH_FILE = process.argv[2] || './batch-002-sourced.json';
const RESUME_PATH = './resumes/Resume_-_General_-_March_2026.pdf';

// ── Gmail OAuth2 setup ──────────────────────────────────────────────────────

async function createGmailClient() {
  const tokenJson = process.env.GMAIL_API_TOKEN;
  const credJson = fs.existsSync('./oauth-credentials.json')
    ? fs.readFileSync('./oauth-credentials.json', 'utf-8')
    : process.env.GMAIL_API_CREDENTIALS;

  if (!tokenJson || !credJson) {
    console.error('❌ Missing GMAIL_API_TOKEN or oauth-credentials.json');
    process.exit(1);
  }

  const token = JSON.parse(tokenJson);
  const cred = JSON.parse(credJson);
  const installed = cred.installed || cred.web || cred;

  const auth = new google.auth.OAuth2(
    installed.client_id,
    installed.client_secret,
    (installed.redirect_uris || ['urn:ietf:wg:oauth:2.0:oob'])[0]
  );
  auth.setCredentials({ refresh_token: token.refresh_token });
  return google.gmail({ version: 'v1', auth });
}

// ── Email builder ────────────────────────────────────────────────────────────

function buildCoverLetter(company, role) {
  const roleUpper = role.toUpperCase();
  let techSkills;
  if (roleUpper.includes('DEVREL') || roleUpper.includes('DEVELOPER RELATION'))
    techSkills = 'technical communication, developer advocacy, community building, protocol education';
  else if (roleUpper.includes('PRODUCT MANAGER') || roleUpper.includes(' PM ') || roleUpper.match(/\bPM\b/))
    techSkills = 'product strategy, user research, roadmapping, cross-functional leadership';
  else if (roleUpper.includes('FULL STACK') || roleUpper.includes('FULLSTACK'))
    techSkills = 'React/Next.js, Node.js, TypeScript, GraphQL, REST APIs, cloud infrastructure';
  else if (roleUpper.includes('SOLIDITY') || roleUpper.includes('SMART CONTRACT') || roleUpper.includes('EVM'))
    techSkills = 'Solidity, EVM, smart contracts, decentralized systems, Web3.js/Ethers.js';
  else if (roleUpper.includes('DESIGN') || roleUpper.includes('UX') || roleUpper.includes('UI'))
    techSkills = 'UX/UI design, Figma, design systems, user research, prototyping';
  else if (roleUpper.includes('BACKEND') || roleUpper.includes('NODE'))
    techSkills = 'Node.js, TypeScript, REST APIs, GraphQL, database design, system architecture';
  else if (roleUpper.includes('REACT') || roleUpper.includes('FRONTEND'))
    techSkills = 'React, TypeScript, Tailwind CSS, frontend architecture, responsive design';
  else if (roleUpper.includes('QUANT') || roleUpper.includes('RUST'))
    techSkills = 'Python, Rust, quantitative analysis, financial modeling, algorithmic systems';
  else if (roleUpper.includes('TPM') || roleUpper.includes('TECHNICAL PROGRAM'))
    techSkills = 'technical program management, delivery, cross-team coordination, roadmapping';
  else
    techSkills = 'full-stack development, product design, and Web3 systems';

  return `Dear ${company} Team,

I'm reaching out to apply for the ${role} position. With 23 years of software experience — including 10 years in product design, 5 years building on EVM-compatible chains, and 17 years in business development — I'm well positioned to contribute to your team.

My background includes:
• ${techSkills}
• Full-stack capability across frontend, backend, and protocol layers
• Product thinking rooted in real user outcomes and community needs
• Civic tech and Web3 focus: from DeFi protocols to decentralized governance

I'm excited about what ${company} is building and would welcome the chance to discuss how I can contribute.

Thank you for your time.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | 609-923-3209
https://github.com/SeanMGonzalez | https://linkedin.com/in/seanmooregonzalez
Reno, NV (Remote)
`;
}

// ── Send via Gmail API ────────────────────────────────────────────────────────

async function sendEmail(gmail, { to, subject, body }) {
  const boundary = `boundary_${Date.now()}`;
  const resume = fs.readFileSync(RESUME_PATH);
  const resumeB64 = resume.toString('base64');

  const rawParts = [
    `From: <${SENDER_EMAIL}>`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    body,
    `--${boundary}`,
    `Content-Type: application/pdf; name="Resume_-_General_-_March_2026.pdf"`,
    `Content-Disposition: attachment; filename="Resume_-_General_-_March_2026.pdf"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    resumeB64,
    `--${boundary}--`,
  ].join('\n');

  const encoded = Buffer.from(rawParts).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });

  // Label it
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: res.data.id,
      requestBody: { addLabelIds: [JOB_HUNT_LABEL_ID] },
    });
  } catch (e) {
    // label failure is non-fatal
  }

  return res.data;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📋 Loading batch: ${BATCH_FILE}\n`);
  const batch = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf-8'));

  const appsFile = './applications.json';
  const appsData = JSON.parse(fs.readFileSync(appsFile, 'utf-8'));
  const existing = new Set(
    appsData.applications.map(a => `${a.company.toLowerCase()}|${a.role.toLowerCase().split(' ')[0]}`)
  );

  const gmail = await createGmailClient();

  let sentCount = 0;
  let skippedCount = 0;
  const manualList = [];

  for (const job of batch) {
    const key = `${job.company.toLowerCase()}|${job.role.toLowerCase().split(' ')[0]}`;
    if (existing.has(key)) {
      console.log(`⏭️  ${job.company} — ${job.role} (already applied)`);
      skippedCount++;
      continue;
    }

    // ATS-only: skip email, queue for manual
    if (['ashby', 'greenhouse', 'lever', 'linkedin'].includes(job.applyMethod) && !job.confirmedEmail && (!job.emailsToTry || job.emailsToTry.length === 0)) {
      console.log(`🌐 ${job.company} — ${job.role} → ATS only (${job.applyMethod})`);
      manualList.push({ company: job.company, role: job.role, url: job.atsLink || job.url, method: job.applyMethod });
      continue;
    }

    // Build target email list
    const targets = job.confirmedEmail
      ? [job.confirmedEmail]
      : (job.emailsToTry || []);

    if (targets.length === 0) {
      console.log(`⚠️  ${job.company} — ${job.role} → No email targets, skipping`);
      continue;
    }

    const subject = `Application: ${job.role} — Sean M. Gonzalez`;
    const body = buildCoverLetter(job.company, job.role);

    let anySent = false;
    for (const to of targets) {
      try {
        await sendEmail(gmail, { to, subject, body });
        console.log(`  ✅ Sent to ${to}`);
        anySent = true;
        await new Promise(r => setTimeout(r, 1200)); // rate limit
      } catch (err) {
        console.log(`  ❌ Failed to ${to}: ${err.message}`);
      }
    }

    if (anySent) {
      sentCount++;
      const slug = `${job.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${job.role.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 25)}-2026-05`;
      appsData.applications.push({
        id: slug,
        company: job.company,
        role: job.role,
        url: job.url || '',
        appliedDate: new Date().toISOString(),
        appliedVia: 'email',
        emailTo: targets.join(', '),
        status: 'pending',
        notes: job.confirmedEmail
          ? `Sent to confirmed email: ${job.confirmedEmail}`
          : `Multi-email spray to: ${targets.join(', ')}`,
      });
      existing.add(key);
    }
    console.log('');
  }

  // Save + commit
  appsData.metadata.totalApplications = appsData.applications.length;
  appsData.metadata.lastSynced = new Date().toISOString();
  fs.writeFileSync(appsFile, JSON.stringify(appsData, null, 2));

  const { execSync } = require('child_process');
  try {
    execSync('git add applications.json');
    execSync(`git commit -m "apply: batch-002 via multi-email (${sentCount} sent)"`);
    execSync('git push origin main');
    console.log('✅ Committed to GitHub\n');
  } catch (e) {
    console.log(`⚠️  Git: ${e.message}\n`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Applied (email): ${sentCount}`);
  console.log(`   ⏭️  Skipped (already applied): ${skippedCount}`);
  console.log(`   📈 Total applications: ${appsData.metadata.totalApplications}`);

  if (manualList.length > 0) {
    console.log(`\n🌐 Manual ATS applications needed (${manualList.length}):`);
    manualList.forEach(m => console.log(`   • ${m.company} — ${m.role}\n     ${m.url}`));
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
