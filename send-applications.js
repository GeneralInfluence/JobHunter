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

// Read current applications.json
let applications = JSON.parse(fs.readFileSync('./applications.json', 'utf-8'));

// Setup Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SENDER_EMAIL,
    pass: process.env.GMAILPSWD
  }
});

console.log(`\n📧 Sending applications to ${emailJobs.length} companies via email...\n`);

let sentCount = 0;
let failedCount = 0;

emailJobs.forEach((job, idx) => {
  // Skip if already applied
  const alreadyApplied = applications.applications.some(
    app => app.company.toLowerCase() === job.company.toLowerCase() && 
            app.role.toLowerCase().includes(job.role.toLowerCase().split(' ')[0])
  );
  
  if (alreadyApplied) {
    console.log(`⏭️  [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
    console.log(`   ✓ Already applied, skipping\n`);
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
    
    // Prepare email
    const mailOptions = {
      from: SENDER_EMAIL,
      to: job.applyTarget,
      subject: `Application: ${job.role} at ${job.company}`,
      text: customCoverLetter,
      attachments: [
        {
          filename: 'Resume_-_General_-_March_2026.pdf',
          path: './resumes/Resume_-_General_-_March_2026.pdf'
        }
      ]
    };
    
    // Send (synchronously for demo, but in production would use async)
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(`❌ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
        console.log(`   Error: ${err.message}\n`);
        failedCount++;
      } else {
        console.log(`✅ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
        console.log(`   → Sent to ${job.applyTarget}\n`);
        sentCount++;
        
        // Log to applications.json
        applications.applications.push({
          id: `${job.company.toLowerCase()}-${job.role.toLowerCase().replace(/\s+/g, '-')}-2026-05`,
          company: job.company,
          role: job.role,
          url: job.url,
          appliedDate: new Date().toISOString(),
          appliedVia: 'email',
          emailTo: job.applyTarget,
          status: 'applied',
          notes: `Applied via email on ${new Date().toLocaleDateString()}`
        });
      }
    });
    
  } catch (err) {
    console.log(`❌ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
    console.log(`   Error: ${err.message}\n`);
    failedCount++;
  }
});

// Wait a moment for async sends to complete, then save
setTimeout(() => {
  // Update metadata
  applications.metadata.totalApplications = applications.applications.length;
  applications.metadata.lastSynced = new Date().toISOString();
  
  // Save applications.json
  fs.writeFileSync('./applications.json', JSON.stringify(applications, null, 2));
  
  // Commit to GitHub
  try {
    execSync('git add applications.json');
    execSync(`git commit -m "apply: batch-001 email applications (${sentCount} sent)"`);
    execSync('git push origin main');
    console.log(`\n✅ Committed to GitHub\n`);
  } catch (e) {
    console.log(`⚠️  Git commit failed: ${e.message}\n`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Sent: ${sentCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Already applied: ${emailJobs.length - sentCount - failedCount}\n`);
  
}, 2000);
