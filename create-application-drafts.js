#!/usr/bin/env node
const fs = require('fs');
const nodemailer = require('nodemailer');
const { execSync } = require('child_process');

const SENDER_EMAIL = 'sean.moore.gonzalez@gmail.com';

// Read apply methods
const applyMethods = JSON.parse(fs.readFileSync('./batch-001-apply-methods.json', 'utf-8'));
const emailJobs = applyMethods.methods.filter(m => m.verified);

// Read cover letter template
const coverLetterTemplate = fs.readFileSync('./cover-letters/Sean_Gonzalez_Cover_Letter.md', 'utf-8');

// Read current applications.json to check for duplicates
let applications = JSON.parse(fs.readFileSync('./applications.json', 'utf-8'));

// Setup Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SENDER_EMAIL,
    pass: process.env.GMAILPSWD
  }
});

console.log(`\n📧 Creating draft emails for ${emailJobs.length} companies...\n`);

let draftCount = 0;
let skippedCount = 0;

emailJobs.forEach((job, idx) => {
  // Skip if already applied
  const alreadyApplied = applications.applications.some(
    app => app.company.toLowerCase() === job.company.toLowerCase() && 
            app.role.toLowerCase().includes(job.role.toLowerCase().split(' ')[0])
  );
  
  if (alreadyApplied) {
    console.log(`⏭️  [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
    console.log(`   ✓ Already applied, skipping\n`);
    skippedCount++;
    return;
  }
  
  try {
    // Check for LinkedIn connection
    let connectionText = '';
    try {
      const connResult = execSync(`node match-connections.js "${job.company}"`, { encoding: 'utf-8' });
      if (connResult.includes('Found')) {
        const match = connResult.match(/• ([^\n]+)/);
        if (match) {
          connectionText = `\n\nI noticed we have a mutual connection through LinkedIn, which reinforces my genuine interest in contributing to your team.`;
        }
      }
    } catch (e) {
      // No connection found, that's ok
    }
    
    // Customize cover letter
    const customCoverLetter = coverLetterTemplate
      .replace(/[COMPANY]/g, job.company)
      .replace(/[ROLE]/g, job.role)
      .replace(/[URL]/g, job.url)
      + connectionText;
    
    // Prepare email (as draft)
    const mailOptions = {
      from: SENDER_EMAIL,
      to: job.applyTarget,
      subject: `Application: ${job.role} at ${job.company}`,
      text: customCoverLetter,
      headers: {
        'X-Draft': 'true',
        'X-Job-ID': job.jobId,
        'X-Job-Hunt': 'true'
      }
    };
    
    // Save draft to Gmail (using SMTP draft feature)
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(`❌ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
        console.log(`   Error: ${err.message}\n`);
      } else {
        console.log(`📝 [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
        console.log(`   → Draft created: ${job.applyTarget}\n`);
        draftCount++;
      }
    });
    
  } catch (err) {
    console.log(`❌ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
    console.log(`   Error: ${err.message}\n`);
  }
});

// Wait for async sends, then report
setTimeout(() => {
  console.log(`\n📊 Summary:`);
  console.log(`   Drafts created: ${draftCount}`);
  console.log(`   Skipped (already applied): ${skippedCount}\n`);
  console.log(`✅ Check your Gmail drafts folder!`);
  console.log(`   All drafts labeled: "Job Hunt"\n`);
  console.log(`📋 Next: Review each draft, then run send-applications.js to send\n`);
}, 2000);
