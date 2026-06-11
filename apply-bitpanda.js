#!/usr/bin/env node
const fs = require('fs');
const { sendJobEmail } = require('./gmail-client');
const { execSync } = require('child_process');

const SENDER_EMAIL = 'sean.moore.gonzalez@gmail.com';

// Read Bitpanda batch
const bitpandaBatch = JSON.parse(fs.readFileSync('./batch-002-bitpanda.json', 'utf-8'));
const jobs = bitpandaBatch.jobs;

// Read cover letter template
const baseTemplate = `Dear Bitpanda Team,

I'm excited to apply for the [ROLE] position at Bitpanda. With 23 years of software development experience, including 10 years in product design and 5 years working with decentralized applications, I'm confident I can contribute meaningfully to your team.

Your work reinventing finance through blockchain and regulated digital assets aligns perfectly with my career focus. I bring:

- **Technical depth:** [TECH_SKILLS] with experience building scalable, user-focused systems
- **Product mindset:** Understanding how technology serves real users and communities
- **Web3 experience:** 5+ years in blockchain, DeFi, and protocol development
- **Full-stack capability:** Frontend, backend, product design, and business strategy

I'd welcome the opportunity to discuss how I can help shape the future of investing at Bitpanda.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com
`;

// Read current applications.json
let applications = JSON.parse(fs.readFileSync('./applications.json', 'utf-8'));

// Gmail API client (OAuth2 + auto-labels with "Job Hunt")

console.log(`\n📧 Applying to ${jobs.length} Bitpanda roles...\n`);

let sentCount = 0;
let failedCount = 0;

jobs.forEach((job, idx) => {
  // Skip if already applied to this role at Bitpanda
  const alreadyApplied = applications.applications.some(
    app => app.company === 'Bitpanda' && app.role === job.role
  );
  
  if (alreadyApplied) {
    console.log(`⏭️  [${idx + 1}/${jobs.length}] ${job.role}`);
    console.log(`   ✓ Already applied, skipping\n`);
    return;
  }
  
  try {
    // Map tech skills based on role
    let techSkills = '';
    if (job.role.includes('React')) {
      techSkills = 'React, TypeScript, Node.js, GraphQL, REST APIs, modern frontend architecture';
    } else if (job.role.includes('Angular')) {
      techSkills = 'Angular, TypeScript, Node.js, REST APIs, and modern web architecture';
    } else if (job.role.includes('Golang')) {
      techSkills = 'Go/Golang, distributed systems, backend infrastructure, and cloud-native development';
    } else if (job.role.includes('Java')) {
      techSkills = 'Java, Spring Boot, microservices, and enterprise systems';
    } else if (job.role.includes('Python')) {
      techSkills = 'Python, quantitative analysis, financial modeling, and data engineering';
    } else if (job.role.includes('Design')) {
      techSkills = 'Design systems, Figma, user research, and creating scalable design patterns';
    } else {
      techSkills = 'full-stack development, system design, and scalable architecture';
    }
    
    // Customize cover letter
    const customCoverLetter = baseTemplate
      .replace(/\[ROLE\]/g, job.role)
      .replace(/\[TECH_SKILLS\]/g, techSkills)
      .replace(/\[LOCATION\]/g, job.location);
    
    // Prepare email
    const mailOptions = {
      from: SENDER_EMAIL,
      to: job.applyTarget,
      subject: `Application: ${job.role}`,
      text: customCoverLetter,
      attachments: [
        {
          filename: 'Resume_-_General_-_March_2026.pdf',
          path: './resumes/Resume_-_General_-_March_2026.pdf'
        }
      ]
    };
    
    // Send email via Gmail API (auto-labels with "Job Hunt")
    sendJobEmail(mailOptions).then(messageId => {
      console.log(`✅ [${idx + 1}/${jobs.length}] ${job.role} (${job.location})`);
      console.log(`   → Sent to ${job.applyTarget} (id: ${messageId})\n`);
      sentCount++;

      // Log to applications.json
      applications.applications.push({
        id: `bitpanda-${job.jobId.toLowerCase()}-2026-05`,
        company: 'Bitpanda',
        role: job.role,
        url: job.url,
        appliedDate: new Date().toISOString(),
        appliedVia: 'email',
        emailTo: job.applyTarget,
        status: 'pending',
        notes: `${job.location}. Match score: ${job.matchScore}`
      });
    }).catch(err => {
      console.log(`❌ [${idx + 1}/${jobs.length}] ${job.role} (${job.location})`);
      console.log(`   Error: ${err.message}\n`);
      failedCount++;
    });
    
  } catch (err) {
    console.log(`❌ [${idx + 1}/${jobs.length}] ${job.role}`);
    console.log(`   Error: ${err.message}\n`);
    failedCount++;
  }
});

// Wait for async sends to complete, then save
setTimeout(() => {
  // Update metadata
  applications.metadata.totalApplications = applications.applications.length;
  applications.metadata.lastSynced = new Date().toISOString();
  
  // Save applications.json
  fs.writeFileSync('./applications.json', JSON.stringify(applications, null, 2));
  
  // Commit to GitHub
  try {
    execSync('git add applications.json batch-002-bitpanda.json');
    execSync(`git commit -m "apply: Bitpanda batch (${sentCount} roles)"`);
    execSync('git push origin main');
    console.log(`✅ Committed to GitHub\n`);
  } catch (e) {
    console.log(`⚠️  Git commit failed: ${e.message}\n`);
  }
  
  console.log(`📊 Summary:`);
  console.log(`   ✅ Sent: ${sentCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   ⏭️  Skipped: ${jobs.length - sentCount - failedCount}`);
  console.log(`   📈 Total applications: ${applications.applications.length}\n`);
  
}, 2000);
