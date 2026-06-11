#!/usr/bin/env node
const fs = require('fs');
const { sendJobEmail } = require('./gmail-client');

const SENDER = 'sean.moore.gonzalez@gmail.com';
const RESUME = './resumes/Resume_-_General_-_March_2026.pdf';

const applications = [
  {
    company: 'Signal-core AI',
    role: 'AI Engineer / Product Builder',
    email: 'careers@signal-core.ai',
    subject: 'Application: AI Engineer / Product Builder — Sean M. Gonzalez',
    body: `Dear Signal-core Team,

I'm reaching out to apply as an AI engineer and product builder. Your research questions immediately resonated with me — how humans, software, and AI systems should work together inside organizations over time is a problem I've been thinking about and building toward for years.

I bring 23 years of software development experience across full-stack engineering, product design, and decentralized systems. Earlier in my career, I spent 11 years as an algorithm developer for the Department of Defense, where I built systems that had to be reliable, auditable, and human-in-the-loop by design. Since 2013, I've worked independently across Web3, AI, and civic tech — building protocols, products, and communities.

A few things that map directly to what you're building:
- Systems thinking: I've built governance and accountability layers for decentralized protocols (Pharo, DeVox, SiPPP) — the same conceptual challenges as benchmarking AI systems that change over time
- Full-stack depth: React, Node.js, TypeScript, Python, with strong product and design instincts
- Enterprise + institutional context: My DoD experience means I understand what it takes to deploy software where trust and auditability aren't optional

I'm based in Reno, NV and work remotely. I'd love to learn more about the problems you're tackling and explore how I might contribute.

Thank you for your time.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com
https://www.linkedin.com/in/seanmooregonzalez
https://github.com/SeanMGonzalez`
  },
  {
    company: 'Siro',
    role: 'Product / Engineering',
    email: 'careers@siro.ai',
    subject: 'Application: Product / Engineering — Sean M. Gonzalez',
    body: `Dear Siro Team,

I'm reaching out to explore product and engineering roles at Siro. The problem you're solving is genuinely interesting — in-person sales conversations are the richest, most underutilized data in the industry, and you're building the infrastructure to capture and decode it.

I bring 23 years of software experience, including 10 years of product design, 17 years of business development, and 5 years building AI and decentralized systems. I've built full-stack applications from the ground up, led product strategy for early-stage teams, and spent a decade designing for real users with real stakes.

What draws me to Siro specifically:
- The AI infrastructure angle: I've built ML-adjacent systems and understand what it takes to process unstructured, domain-specific data at scale
- Product sense in sales context: 17 years of BD means I understand sales teams from the inside — not just as users to design for, but as people I've worked alongside
- Full-stack capability: React, Node.js, TypeScript, Python — comfortable across the stack and in design (Figma, Tailwind)

I'm remote-based in Reno, NV. I know your HQ is Flatiron and I'm open to discussing what makes sense for the right role.

Thank you for considering my application.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com
https://www.linkedin.com/in/seanmooregonzalez
https://github.com/SeanMGonzalez`
  }
];

(async () => {
  let apps = JSON.parse(fs.readFileSync('./applications.json', 'utf-8'));
  const { execSync } = require('child_process');

  for (const app of applications) {
    try {
      const id = await sendJobEmail({
        from: SENDER,
        to: app.email,
        subject: app.subject,
        text: app.body,
        attachments: [{ filename: 'Resume_-_General_-_March_2026.pdf', path: RESUME }]
      });

      console.log(`✅ ${app.company} — ${app.role} → ${app.email} (${id})`);

      apps.applications.push({
        id: `${app.company.toLowerCase().replace(/\s+/g,'-')}-${Date.now()}`,
        company: app.company,
        role: app.role,
        url: '',
        appliedDate: new Date().toISOString(),
        appliedVia: 'email',
        emailTo: app.email,
        status: 'pending',
        notes: 'Applied via direct email from nextplay.so newsletter lead'
      });
    } catch (err) {
      console.error(`❌ ${app.company}: ${err.message}`);
    }
  }

  apps.metadata.totalApplications = apps.applications.length;
  apps.metadata.lastSynced = new Date().toISOString();
  fs.writeFileSync('./applications.json', JSON.stringify(apps, null, 2));

  execSync('git add applications.json');
  execSync('git commit -m "apply: Signal-core AI + Siro (nextplay.so lead)"');
  execSync('git push origin main');
  console.log('✅ Logged and pushed to GitHub');
})();
