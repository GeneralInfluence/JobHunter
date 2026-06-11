#!/usr/bin/env node
/**
 * Send job applications via Gmail API
 * Features:
 * - Sends from your Gmail account
 * - Auto-labels with "Job Hunt"
 * - Respects Gmail rate limits
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const SENDER_EMAIL = 'sean.moore.gonzalez@gmail.com';
const JOB_HUNT_LABEL = 'Job Hunt';

/**
 * Create Gmail client with OAuth2
 */
async function createGmailClient() {
  // Check for API token in environment
  const tokenJson = process.env.GMAIL_API_TOKEN;
  const credentialsJson = process.env.GMAIL_API_CREDENTIALS;

  if (!tokenJson || !credentialsJson) {
    console.error('\n❌ Gmail API credentials not found in environment');
    console.error('Please set: GMAIL_API_TOKEN and GMAIL_API_CREDENTIALS');
    console.error('\nSetup instructions: See GMAIL-API-SETUP.md\n');
    process.exit(1);
  }

  const token = JSON.parse(tokenJson);
  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uris[0]
  );

  auth.setCredentials({
    refresh_token: token.refresh_token,
  });

  return google.gmail({ version: 'v1', auth });
}

/**
 * Get or create "Job Hunt" label
 */
async function getOrCreateLabel(gmail) {
  try {
    // List existing labels
    const res = await gmail.users.labels.list({ userId: 'me' });
    const labels = res.data.labels || [];

    let jobHuntLabel = labels.find(l => l.name === JOB_HUNT_LABEL);

    if (!jobHuntLabel) {
      // Create label if it doesn't exist
      const createRes = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: JOB_HUNT_LABEL,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });
      jobHuntLabel = createRes.data;
    }

    return jobHuntLabel.id;
  } catch (err) {
    console.error('Warning: Could not get/create Job Hunt label:', err.message);
    return null;
  }
}

/**
 * Send email via Gmail API and add label
 */
async function sendEmail(gmail, labelId, mailOptions) {
  try {
    // Create RFC 2822 formatted message
    const message = [
      `From: <${mailOptions.from}>`,
      `To: <${mailOptions.to}>`,
      `Subject: ${mailOptions.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="utf-8"',
      '',
      mailOptions.text,
    ].join('\n');

    // For attachments, use multipart/mixed (simplified - just base64 the PDF)
    let fullMessage = message;
    if (mailOptions.attachments && mailOptions.attachments.length > 0) {
      const boundary = '===============' + Date.now() + '==';
      const contentType = `multipart/mixed; boundary="${boundary}"`;

      const messageParts = [
        `From: <${mailOptions.from}>`,
        `To: <${mailOptions.to}>`,
        `Subject: ${mailOptions.subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: ${contentType}`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset="utf-8"`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        mailOptions.text,
        `--${boundary}`,
      ];

      // Add attachments
      for (const attachment of mailOptions.attachments) {
        const fileContent = fs.readFileSync(attachment.path);
        const base64File = fileContent.toString('base64');

        messageParts.push(
          `Content-Type: application/octet-stream; name="${attachment.filename}"`,
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          `Content-Transfer-Encoding: base64`,
          ``,
          base64File,
          `--${boundary}`
        );
      }

      messageParts.push('--');
      fullMessage = messageParts.join('\n');
    }

    // Encode to base64url
    const encodedMessage = Buffer.from(fullMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send message
    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    // Add label to sent message
    if (labelId) {
      await gmail.users.messages.modify({
        userId: 'me',
        id: sendRes.data.id,
        requestBody: {
          addLabelIds: [labelId],
        },
      });
    }

    return sendRes.data;
  } catch (err) {
    throw err;
  }
}

/**
 * Main send function
 */
async function main() {
  console.log('\n📧 Setting up Gmail API...\n');

  const gmail = await createGmailClient();
  const labelId = await getOrCreateLabel(gmail);

  if (labelId) {
    console.log(`✅ Using label: "${JOB_HUNT_LABEL}"\n`);
  } else {
    console.log('⚠️  Warning: Could not get/create label. Emails will still be sent.\n');
  }

  // Read batch
  const batchFile = process.argv[2] || 'batch-001-cleaned.json';
  const batch = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));
  const emailJobs = batch.methods.filter(m => m.verified && m.applyMethod === 'email');

  const baseTemplate = `Dear [COMPANY] Team,

I'm excited to apply for the [ROLE] position. With 23 years of software development experience, including 10 years in product design and 5 years working with decentralized applications and Web3, I bring a comprehensive skill set aligned with your team's needs.

My background includes:
- **Technical expertise:** [TECH_SKILLS]
- **Product mindset:** Understanding how technology serves users and communities
- **Web3 & blockchain experience:** 5+ years in protocol development, DeFi, and decentralized systems
- **Full-stack capability:** Frontend, backend, product design, and strategic thinking

I'm passionate about contributing to the future of finance and technology at [COMPANY], and would welcome the opportunity to discuss how my experience can add value to your team.

Thank you for your consideration.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com
`;

  // Read current applications.json
  let applications = JSON.parse(fs.readFileSync('./applications.json', 'utf-8'));

  console.log(`📧 Applying to ${emailJobs.length} positions...\n`);

  let sentCount = 0;
  let failedCount = 0;
  const delays = [];

  // Send with rate limiting (1 email per second)
  for (let idx = 0; idx < emailJobs.length; idx++) {
    const job = emailJobs[idx];

    // Skip if already applied
    const alreadyApplied = applications.applications.some(
      app =>
        app.company.toLowerCase() === job.company.toLowerCase() &&
        app.role.toLowerCase().includes(job.role.toLowerCase().split(' ')[0])
    );

    if (alreadyApplied) {
      console.log(`⏭️  [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
      console.log(`   ✓ Already applied, skipping\n`);
      continue;
    }

    try {
      // Map tech skills
      let techSkills = '';
      const roleUpper = job.role.toUpperCase();
      if (roleUpper.includes('FULL STACK')) {
        techSkills =
          'React, Node.js, TypeScript, GraphQL, REST APIs, cloud infrastructure';
      } else if (roleUpper.includes('REACT') || roleUpper.includes('FRONTEND')) {
        techSkills =
          'React, TypeScript, Tailwind CSS, modern frontend architecture, responsive design';
      } else if (roleUpper.includes('SOLIDITY') || roleUpper.includes('BLOCKCHAIN')) {
        techSkills =
          'Solidity, EVM, smart contracts, decentralized systems, Web3.js, Ethers.js';
      } else if (roleUpper.includes('BACKEND') || roleUpper.includes('NODE')) {
        techSkills =
          'Node.js, TypeScript, REST APIs, GraphQL, database design, system architecture';
      } else if (
        roleUpper.includes('DEVREL') ||
        roleUpper.includes('DEVELOPER RELATIONS')
      ) {
        techSkills =
          'Technical communication, developer advocacy, community building, protocol education';
      } else if (roleUpper.includes('PRODUCT MANAGER') || roleUpper.includes('PM')) {
        techSkills =
          'product strategy, user research, technical leadership, cross-functional collaboration';
      } else if (roleUpper.includes('QUANT') || roleUpper.includes('QUANTITATIVE')) {
        techSkills =
          'Python, Rust, quantitative analysis, financial modeling, algorithmic development';
      } else if (roleUpper.includes('SECURITY')) {
        techSkills = 'security engineering, cryptography, system hardening, threat analysis';
      } else {
        techSkills = 'full-stack development, system design, and scalable architecture';
      }

      // Customize cover letter
      const customCoverLetter = baseTemplate
        .replace(/\[COMPANY\]/g, job.company)
        .replace(/\[ROLE\]/g, job.role)
        .replace(/\[TECH_SKILLS\]/g, techSkills);

      // Prepare email
      const mailOptions = {
        from: SENDER_EMAIL,
        to: job.applyTarget,
        subject: `Application: ${job.role} at ${job.company}`,
        text: customCoverLetter,
        attachments: [
          {
            filename: 'Resume_-_General_-_March_2026.pdf',
            path: './resumes/Resume_-_General_-_March_2026.pdf',
          },
        ],
      };

      // Send email
      await sendEmail(gmail, labelId, mailOptions);

      console.log(`✅ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
      console.log(`   → Sent to ${job.applyTarget}\n`);
      sentCount++;

      // Log to applications.json
      applications.applications.push({
        id: `${job.company.toLowerCase().replace(/\s+/g, '-')}-${job.role
          .toLowerCase()
          .replace(/\s+/g, '-')
          .substring(0, 30)}-2026-05`,
        company: job.company,
        role: job.role,
        url: job.url,
        appliedDate: new Date().toISOString(),
        appliedVia: 'email',
        emailTo: job.applyTarget,
        status: 'pending',
        notes: `Applied via Gmail API on ${new Date().toLocaleDateString()}. Labeled: Job Hunt`,
      });

      // Rate limit: 1 second between emails
      if (idx < emailJobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.log(`❌ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
      console.log(`   Error: ${err.message}\n`);
      failedCount++;
    }
  }

  // Save applications.json
  applications.metadata.totalApplications = applications.applications.length;
  applications.metadata.lastSynced = new Date().toISOString();
  fs.writeFileSync('./applications.json', JSON.stringify(applications, null, 2));

  // Commit to GitHub
  try {
    const { execSync } = require('child_process');
    execSync('git add applications.json');
    execSync(
      `git commit -m "apply: ${batchFile} via Gmail API (${sentCount} sent)"`
    );
    execSync('git push origin main');
    console.log(`✅ Committed to GitHub\n`);
  } catch (e) {
    console.log(`⚠️  Git commit failed: ${e.message}\n`);
  }

  console.log(`📊 Summary:`);
  console.log(`   ✅ Sent: ${sentCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   ⏭️  Skipped: ${emailJobs.length - sentCount - failedCount}`);
  console.log(`   📈 Total applications: ${applications.applications.length}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
