#!/usr/bin/env node
const fs = require('fs');
const { sendJobEmail } = require('./gmail-client');
const { execSync } = require('child_process');

const SENDER_EMAIL = 'sean.moore.gonzalez@gmail.com';

// Read cleaned batch
const cleanedBatch = JSON.parse(fs.readFileSync('./batch-001-cleaned.json', 'utf-8'));
const emailJobs = cleanedBatch.methods.filter(m => m.verified && m.applyMethod === 'email');

// Read cover letter template
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

// Gmail API client (OAuth2 + auto-labels with "Job Hunt")

console.log(`\n📧 Applying to ${emailJobs.length} positions from cleaned batch...\n`);

let sentCount = 0;
let failedCount = 0;

emailJobs.forEach((job, idx) => {
  // Skip if already applied to this role at this company
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
    
    // Map tech skills based on role
    let techSkills = '';
    const roleUpper = job.role.toUpperCase();
    if (roleUpper.includes('FULL STACK')) {
      techSkills = 'React, Node.js, TypeScript, GraphQL, REST APIs, cloud infrastructure';
    } else if (roleUpper.includes('REACT') || roleUpper.includes('FRONTEND')) {
      techSkills = 'React, TypeScript, Tailwind CSS, modern frontend architecture, responsive design';
    } else if (roleUpper.includes('SOLIDITY') || roleUpper.includes('BLOCKCHAIN')) {
      techSkills = 'Solidity, EVM, smart contracts, decentralized systems, Web3.js, Ethers.js';
    } else if (roleUpper.includes('BACKEND') || roleUpper.includes('NODE')) {
      techSkills = 'Node.js, TypeScript, REST APIs, GraphQL, database design, system architecture';
    } else if (roleUpper.includes('DEVREL') || roleUpper.includes('DEVELOPER RELATIONS')) {
      techSkills = 'Technical communication, developer advocacy, community building, protocol education';
    } else if (roleUpper.includes('PRODUCT MANAGER') || roleUpper.includes('PM')) {
      techSkills = 'product strategy, user research, technical leadership, cross-functional collaboration';
    } else if (roleUpper.includes('QUANT') || roleUpper.includes('QUANTITATIVE')) {
      techSkills = 'Python, Rust, quantitative analysis, financial modeling, algorithmic development';
    } else if (roleUpper.includes('SECURITY')) {
      techSkills = 'security engineering, cryptography, system hardening, threat analysis';
    } else {
      techSkills = 'full-stack development, system design, and scalable architecture';
    }
    
    // Customize cover letter
    const customCoverLetter = baseTemplate
      .replace(/\[COMPANY\]/g, job.company)
      .replace(/\[ROLE\]/g, job.role)
      .replace(/\[TECH_SKILLS\]/g, techSkills)
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
    
    // Send email via Gmail API (auto-labels with "Job Hunt")
    sendJobEmail(mailOptions).then(messageId => {
      console.log(`✅ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
      console.log(`   → Sent to ${job.applyTarget} (id: ${messageId})\n`);
      sentCount++;

      // Log to applications.json
      applications.applications.push({
        id: `${job.company.toLowerCase().replace(/\s+/g, '-')}-${job.role.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}-2026-05`,
        company: job.company,
        role: job.role,
        url: job.url,
        appliedDate: new Date().toISOString(),
        appliedVia: 'email',
        emailTo: job.applyTarget,
        status: 'pending',
        notes: `Applied from batch-001-cleaned on ${new Date().toLocaleDateString()}`
      });
    }).catch(err => {
      console.log(`❌ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
      console.log(`   Error: ${err.message}\n`);
      failedCount++;
    });
    
  } catch (err) {
    console.log(`❌ [${idx + 1}/${emailJobs.length}] ${job.company} - ${job.role}`);
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
    execSync('git add applications.json');
    execSync(`git commit -m "apply: batch-001-cleaned (${sentCount} applications sent)"`);
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
  
}, 2000);
