#!/usr/bin/env node
/**
 * Batch 003 — Web3/AI/DevRel job applications
 * Runs: May 2026
 */
const fs = require('fs');
const path = require('path');
const { sendJobEmail } = require('./gmail-client');

const SENDER = 'sean.moore.gonzalez@gmail.com';
const RESUME_GENERAL = path.join(__dirname, 'resumes/Resume_-_General_-_March_2026.pdf');
const RESUME_WEB3    = path.join(__dirname, 'resumes/Arbitrum_Resume.pdf');

const jobs = [
  {
    company: 'Across Protocol',
    role: 'Developer Relations (DevRel)',
    email: 'careers@across.to',
    url: 'https://cryptocurrencyjobs.co/engineering/across-developer-relations-devrel/',
    resume: RESUME_WEB3,
    subject: 'Application: Developer Relations (DevRel) — Sean M. Gonzalez',
    body: `Dear Across Protocol Team,

I'm excited to apply for the Developer Relations role. Across's cross-chain bridge infrastructure is some of the most critical plumbing in the DeFi ecosystem, and I'd love to help developers build on top of it. I've spent five years working at the intersection of protocol design, developer tooling, and community — building on Ethereum, understanding EVM deeply, and communicating complex systems to technical audiences through my work founding Data Community DC (now 12+ years running).

My background spans full-stack development (React, Node.js, TypeScript, Python), smart contracts (Solidity), and product design, which gives me the rare ability to go deep with developers while also helping shape the DX narrative. I've built decentralized applications including Pharo (on-chain insurance), SiPPP (photo provenance), and DeVox (civic governance protocol).

I'm fully remote in Reno, NV and available to start immediately. I'd love to discuss how I can help grow the Across developer ecosystem.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Berachain',
    role: 'Developer Relations Engineer',
    email: 'careers@berachain.com',
    url: 'https://careers.berachain.com/29602',
    resume: RESUME_WEB3,
    subject: 'Application: Developer Relations Engineer — Sean M. Gonzalez',
    body: `Dear Berachain Team,

I'm applying for the Developer Relations Engineer role. The Proof-of-Liquidity model is one of the more genuinely novel economic designs in L1s right now, and I want to help developers understand and build on it. I've followed Berachain's growth from early testnet and appreciate the care put into both technical architecture and community design.

I bring five years of hands-on Web3 and EVM development (Solidity, React, TypeScript, Node.js, Python), 23 years of full-stack software experience, and a decade of community-building through Data Community DC. I'm comfortable writing technical documentation, building sample dApps, speaking at events, and working closely with founders and devs to understand what they actually need. My projects — including Pharo, SiPPP, and DeVox — all required deep protocol understanding and developer-facing communication.

I'm 100% remote from Reno, NV and genuinely excited about what Berachain is building. I'd love to explore how I can contribute.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Berachain',
    role: 'Product Manager, Core Protocol',
    email: 'careers@berachain.com',
    url: 'https://blockchain.works-hub.com/jobs/remote-product-manager-core-protocol-93f',
    resume: RESUME_WEB3,
    subject: 'Application: Product Manager, Core Protocol — Sean M. Gonzalez',
    body: `Dear Berachain Team,

I'm applying for the Product Manager, Core Protocol role. Berachain's Proof-of-Liquidity model represents a fundamental rethinking of how validator incentives and DeFi liquidity interact — and getting the product experience right at the protocol layer requires someone who can bridge deep technical understanding with user and ecosystem needs. That's what I do.

I've spent 10 years in product design and management, 5 years building EVM-based applications, and 17 years in business development — all of which I've applied to building decentralized protocols including Pharo (parametric insurance on-chain), DeVox (civic governance), and SiPPP (provenance infrastructure). Earlier in my career I spent 11 years as a DoD algorithm developer, which gave me rigorous instincts for systems design and accountability. I understand how to work with protocol engineers, align stakeholder needs, define roadmaps, and ship.

I'm fully remote from Reno, NV. This role is a great fit and I'd welcome the chance to discuss it.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Fairblock',
    role: 'Developer Relations Engineer',
    email: 'careers@fairblock.network',
    url: 'https://cryptocurrencyjobs.co/engineering/fairblock-developer-relations-engineer-devrel/',
    resume: RESUME_WEB3,
    subject: 'Application: Developer Relations Engineer — Sean M. Gonzalez',
    body: `Dear Fairblock Team,

I'm excited to apply for the Developer Relations Engineer role. Fairblock's approach to conditional encryption and programmable privacy addresses one of the hardest unsolved UX problems in Web3 — and communicating that nuanced value proposition to developers is exactly the kind of challenge I thrive on. Cryptographic primitives that change what's possible require clear, compelling developer education, and that's a craft I've built over many years.

My background: 23 years of software development (React, Node.js, TypeScript, Python, Solidity), 5 years building EVM dApps, and 12+ years growing developer communities through Data Community DC. I've written documentation, built demos, run workshops, and helped technical teams communicate complex ideas accessibly. My projects include Pharo (on-chain insurance), SiPPP (cryptographic photo provenance), and DeVox (decentralized civic governance).

I'm 100% remote from Reno, NV and would love to help Fairblock build out its developer ecosystem. Happy to share specific writing samples or demo work.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Trust Wallet',
    role: 'Senior Full Stack Engineer',
    email: 'careers@trustwallet.com',
    url: 'https://jobs.ashbyhq.com/trust-wallet/bb177863-fd26-407f-9f4a-bf24586b7d02',
    resume: RESUME_WEB3,
    subject: 'Application: Senior Full Stack Engineer — Sean M. Gonzalez',
    body: `Dear Trust Wallet Team,

I'm applying for the Senior Full Stack Engineer position. Trust Wallet is one of the most widely used crypto wallets in the world, and building features that 200M+ users interact with daily requires engineering judgment at every layer — not just code that works, but code that's fast, secure, and intuitive. That's how I've always built.

I have 23 years of software development experience, with deep expertise in React, Next.js, Node.js, TypeScript, and Python, plus 5 years building production dApps on EVM chains (Solidity). My projects include consumer-facing Web3 products with wallet integrations, on-chain smart contracts, and full backend infrastructure. I'm comfortable owning features end-to-end, collaborating with design and protocol teams, and contributing to engineering standards.

I'm 100% remote from Reno, NV. I've also applied via Ashby at the link above. Looking forward to learning more about the team.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Monad Foundation',
    role: 'Senior Software Engineer, Full Stack',
    email: 'jobs@monad.xyz',
    url: 'https://jobs.ashbyhq.com/monad.foundation/2242c712-d2cf-4fe5-8cc4-eae0ce2bc4f5',
    resume: RESUME_WEB3,
    subject: 'Application: Senior Software Engineer, Full Stack — Sean M. Gonzalez',
    body: `Dear Monad Foundation Team,

I'm applying for the Senior Software Engineer, Full Stack role. A parallelized EVM L1 is one of the more technically ambitious bets in the current ecosystem, and I want to help build the ecosystem and tooling layer that makes Monad easy to build on. Scaling without sacrificing developer experience is hard — and it's exactly the kind of challenge I've been working on across my career.

I bring 23 years of software development experience including React, Next.js, Node.js, TypeScript, Python, and Solidity. I've built full-stack decentralized applications from protocol to interface — including Pharo (parametric insurance), SiPPP (provenance), and DeVox (governance) — and I understand both the builder and user perspectives on what makes a blockchain ecosystem thrive. I also have 12+ years building developer communities, which means I understand what developers need and how to advocate for them internally.

I'm remote-first in Reno, NV. I've also applied via Ashby at the link above. Would love to talk about what you're building.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Phantom',
    role: 'Software Engineer, Frontend / Full Stack (Trading)',
    email: 'careers@phantom.app',
    url: 'https://jobs.ashbyhq.com/phantom/e213be58-ba98-486d-93bc-a7716f33003e',
    resume: RESUME_WEB3,
    subject: 'Application: Software Engineer, Frontend / Full Stack (Trading) — Sean M. Gonzalez',
    body: `Dear Phantom Team,

I'm applying for the Frontend/Full Stack Software Engineer (Trading) role. Phantom is one of the best product experiences in crypto — clean, fast, and genuinely user-obsessed — and I want to help build what comes next. The trading features in particular are a space where performance and UX both have to be excellent, and I have a track record in both.

My stack is React, Next.js, TypeScript, and Node.js, with strong product instincts honed over 10 years of product design and 4 years of UX/UI work. I've built full-stack crypto applications including exchange integrations, wallet UIs, and on-chain smart contract interactions (Solidity). I care deeply about performance, accessibility, and the kind of polish that makes users trust a product. My 11 years at DoD taught me to build for high stakes; my product work since then taught me to build for delight.

I'm 100% remote from Reno, NV. Also applying via Ashby. Would love to talk.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'ETHGlobal',
    role: 'Full Stack Software Engineer',
    email: 'jobs@ethglobal.com',
    url: 'https://jobs.ashbyhq.com/ethglobal/de9716ba-cf9f-4d62-88eb-3cf91c7b6886',
    resume: RESUME_WEB3,
    subject: 'Application: Full Stack Software Engineer — Sean M. Gonzalez',
    body: `Dear ETHGlobal Team,

I'm applying for the Full Stack Software Engineer position. ETHGlobal's hackathons and developer programs have shaped the Ethereum ecosystem more than any other organization I can think of — and building the infrastructure and products that power those events at scale is exactly the kind of meaningful technical work I want to be doing.

I bring 23 years of full-stack development (React, Next.js, Node.js, TypeScript, Python, GraphQL) and 5 years of Web3-specific engineering (Solidity, wallet integrations, smart contract tooling). I understand developer needs from the inside — I've been building in Web3 since 2019, run hackathon projects, and spent 12+ years building technical communities through Data Community DC. I can ship clean, scalable code and contribute to technical infrastructure from day one.

I'm fully remote from Reno, NV. Also applying via Ashby. Very excited about this one.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: '0x',
    role: 'Senior Full Stack Engineer, Matcha',
    email: 'careers@0x.org',
    url: 'https://jobs.ashbyhq.com/0x/1bbe3800-0079-4a4d-8554-5a7b5cd8c6ac',
    resume: RESUME_WEB3,
    subject: 'Application: Senior Full Stack Engineer, Matcha — Sean M. Gonzalez',
    body: `Dear 0x Team,

I'm applying for the Senior Full Stack Engineer position on the Matcha team. Matcha is one of the cleanest DEX aggregator UIs in the space — and building fast, reliable trading interfaces that abstract away liquidity complexity requires both deep technical skill and strong product taste. I have both.

My stack: React, Next.js, TypeScript, Node.js, Python, with strong GraphQL and REST API experience. I've built production Web3 applications including DeFi UIs with DEX integrations, on-chain smart contracts (Solidity), and backend services. I'm comfortable with performance optimization, complex state management, and the kind of real-time data challenges that trading UIs demand. 10 years of product design means I also think about the user experience at every layer.

I'm 100% remote from Reno, NV and have also applied via Ashby. I'd love to discuss the Matcha roadmap.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Dynamic',
    role: 'Senior Frontend Software Engineer',
    email: 'careers@dynamic.xyz',
    url: 'https://jobs.ashbyhq.com/dynamic/67f33df3-3aec-494d-adec-6f9d5af9fd03',
    resume: RESUME_WEB3,
    subject: 'Application: Senior Frontend Software Engineer — Sean M. Gonzalez',
    body: `Dear Dynamic Team,

I'm applying for the Senior Frontend Software Engineer role. Dynamic's authentication and wallet infrastructure is becoming foundational plumbing for Web3 UX — and I want to help build it. The challenge of making multi-chain, multi-wallet authentication feel seamless is a genuinely hard UX and engineering problem, and it's one I've thought deeply about.

I have 23 years of software experience with deep expertise in React, Next.js, TypeScript, and Node.js. The Ashby job description mentions building full-stack features including APIs (Node.js), infrastructure (CDK), and frontend interfaces (React) — that's the exact stack I work in daily. I've integrated wallet auth flows into my own dApps, understand the pain points developers face, and can contribute to both the product and the SDK that makes it work. 4 years of UX/UI work gives me the instincts to keep the developer experience clean.

I'm 100% remote from Reno, NV and have also applied via Ashby. Would love to connect.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Biconomy',
    role: 'Senior Fullstack Engineer',
    email: 'careers@biconomy.io',
    url: 'https://jobs.ashbyhq.com/biconomy/da791f0f-1670-4688-a035-696c96ad3adb',
    resume: RESUME_WEB3,
    subject: 'Application: Senior Fullstack Engineer — Sean M. Gonzalez',
    body: `Dear Biconomy Team,

I'm applying for the Senior Fullstack Engineer position. Biconomy's modular account abstraction stack is solving one of the most important UX challenges in Web3 — making dApps feel like real apps rather than crypto experiments. I've built on top of account abstraction frameworks and understand from first-hand experience what a difference gasless transactions and batched operations make for end users.

I bring 23 years of full-stack engineering (React, Node.js, TypeScript, Python), 5 years of EVM and smart contract work (Solidity), and deep experience building multi-chain dApps. I've integrated Biconomy's SDK in personal projects and understand the developer ergonomics you're optimizing for. I can contribute across the stack — from smart contract logic to React-based dashboards and APIs — and bring strong product instincts from 10 years of product design.

Remote in Reno, NV. Also applying via Ashby. Would love to learn more about what the engineering team is working on.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Crypto.com',
    role: 'Senior Product Manager, API',
    email: 'careers@crypto.com',
    url: 'https://jobs.lever.co/crypto/5bb16711-a863-4ded-9e89-20a0be9eae1e',
    resume: RESUME_WEB3,
    subject: 'Application: Senior Product Manager, API — Sean M. Gonzalez',
    body: `Dear Crypto.com Team,

I'm applying for the Senior Product Manager, API role. Crypto.com's API platform powers an enormous amount of trading and institutional activity, and getting the product experience right for developers and partners is both critical and complex. I've spent 10 years managing products and 17 years in business development — and I've built and consumed APIs extensively as a developer, so I approach API product work from both the builder and user perspective.

My background: 23 years of software development (React, TypeScript, Node.js, Python), 10 years product design, and 5 years building on EVM chains. I've defined technical roadmaps, worked closely with engineering on API design, and communicated complex capabilities to enterprise customers. Earlier in my career I spent 11 years at the DoD building high-stakes systems where reliability and clear specs were non-negotiable — that discipline carries directly into API product work.

I'm fully remote from Reno, NV. Also applied via Lever. Looking forward to discussing this role.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
  {
    company: 'Alchemy',
    role: 'Senior Product Designer',
    email: 'careers@alchemy.com',
    url: 'https://www.alchemy.com/careers',
    resume: RESUME_GENERAL,
    subject: 'Application: Senior Product Designer — Sean M. Gonzalez',
    body: `Dear Alchemy Team,

I'm applying for the Senior Product Designer role. Alchemy powers more of the Web3 developer stack than any other platform, and designing the tools that developers use every day — dashboards, APIs, debugging interfaces — requires someone who understands both deep technical complexity and clean, intuitive UX. That's exactly the intersection I've lived in for the past decade.

I bring 4 years of dedicated UX/UI design work, 10 years of product design, and 23 years of full-stack engineering across React, TypeScript, Node.js, and Python. I work in Figma fluently and can ship Tailwind/HTML implementations alongside design files. My projects — including Pharo (DeFi insurance), SiPPP (provenance), and DeVox (civic governance) — all required designing for developer and non-developer audiences simultaneously. I understand the Alchemy developer persona because I'm in that persona.

I'm remote in Reno, NV. Very excited about Alchemy's mission and would love to contribute to how developers experience Web3 infrastructure.

Sincerely,
Sean M. Gonzalez
sean.moore.gonzalez@gmail.com | https://github.com/SeanMGonzalez | https://www.linkedin.com/in/seanmooregonzalez`
  },
];

async function main() {
  const appDataPath = path.join(__dirname, 'applications.json');
  const appData = JSON.parse(fs.readFileSync(appDataPath, 'utf-8'));

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];

  for (const job of jobs) {
    // Check if already applied
    const alreadyApplied = appData.applications.some(
      a => a.company.toLowerCase() === job.company.toLowerCase() &&
           a.role.toLowerCase() === job.role.toLowerCase()
    );
    if (alreadyApplied) {
      console.log(`⏭️  SKIP: ${job.company} — ${job.role} (already applied)`);
      skipped++;
      continue;
    }

    const id = `${job.company.toLowerCase().replace(/[\s.]/g, '-').replace(/[^a-z0-9-]/g, '')}-${job.role.toLowerCase().replace(/[\s,./()]/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 40)}-2026-05`;

    try {
      console.log(`📧 Sending: ${job.company} — ${job.role} → ${job.email}`);
      const msgId = await sendJobEmail({
        from: 'sean.moore.gonzalez@gmail.com',
        to: job.email,
        subject: job.subject,
        text: job.body,
        attachments: [{ filename: path.basename(job.resume), path: job.resume }]
      });
      console.log(`   ✅ Sent (msgId: ${msgId})`);
      sent++;

      // Log to applications
      appData.applications.push({
        id,
        company: job.company,
        role: job.role,
        url: job.url,
        appliedDate: new Date().toISOString(),
        appliedVia: 'email',
        emailTo: job.email,
        status: 'pending',
        notes: `Applied via direct email. Form URL: ${job.url}`
      });
      appData.metadata.totalApplications++;
      appData.metadata.lastSynced = new Date().toISOString();

      results.push({ company: job.company, role: job.role, status: '✅ sent', email: job.email });
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      failed++;

      // Still log as attempted
      appData.applications.push({
        id,
        company: job.company,
        role: job.role,
        url: job.url,
        appliedDate: new Date().toISOString(),
        appliedVia: 'email',
        emailTo: job.email,
        status: 'pending',
        notes: `Email send error: ${err.message}. Form URL: ${job.url}`
      });
      appData.metadata.totalApplications++;
      appData.metadata.lastSynced = new Date().toISOString();

      results.push({ company: job.company, role: job.role, status: `❌ error: ${err.message}`, email: job.email });
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }

  // Write updated applications.json
  fs.writeFileSync(appDataPath, JSON.stringify(appData, null, 2));
  console.log(`\n✅ Done. Sent: ${sent} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log('\n📋 Results:');
  results.forEach(r => console.log(`  ${r.status} | ${r.company} | ${r.role} | ${r.email}`));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
