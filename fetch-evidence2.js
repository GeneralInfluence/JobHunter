const { ImapFlow } = require('/home/node/clawd/workspace/JobHunter/node_modules/imapflow');
const fs = require('fs');

const apps = JSON.parse(fs.readFileSync('/home/node/clawd/workspace/JobHunter/applications.json', 'utf8'));
const emailApps = apps.applications.filter(a => a.appliedVia === 'email' || a.appliedVia === 'ashby');

const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: 'sean.moore.gonzalez@gmail.com',
    pass: process.env.GMAILPSWD
  },
  logger: false
});

function stripHtml(str) {
  return (str || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function truncate(str, len) {
  if (!str) return '';
  return str.length <= len ? str : str.substring(0, len) + '...';
}

// Extract domain from email address
function getDomain(email) {
  if (!email) return null;
  const m = email.match(/@([^>]+)/);
  return m ? m[1].toLowerCase() : null;
}

async function searchMailbox(mailboxName, query) {
  try {
    await client.mailboxOpen(mailboxName);
    const msgs = await client.search(query, { uid: true });
    return msgs || [];
  } catch(e) {
    return [];
  }
}

async function fetchMessages(uids, count) {
  const results = [];
  const recent = uids.slice(-count);
  for await (const msg of client.fetch(recent, {
    envelope: true,
    source: { start: 0, length: 3000 }
  })) {
    const subject = msg.envelope?.subject || '';
    const from = msg.envelope?.from?.[0];
    const date = msg.envelope?.date;
    const source = msg.source ? msg.source.toString('utf8') : '';
    
    // Extract plain text body (skip headers, find text portion)
    let body = '';
    // Look for Content-Type: text/plain section
    const plainMatch = source.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\nContent-Type:|$)/i);
    if (plainMatch) {
      body = stripHtml(plainMatch[1]);
    } else {
      // Just try to get after double newline
      const bodyMatch = source.match(/\r\n\r\n([\s\S]*)/);
      if (bodyMatch) body = stripHtml(bodyMatch[1]);
    }
    
    results.push({
      subject: truncate(subject, 120),
      from: from ? `${from.name || ''} <${from.address || ''}>`.trim() : '',
      date: date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      body: truncate(body.replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' '), 400)
    });
  }
  return results;
}

async function fetchEvidence() {
  const evidence = {};
  
  await client.connect();
  
  // List all mailboxes
  const mailboxes = [];
  for await (const mb of client.list()) {
    mailboxes.push(mb.path);
  }
  console.log('Available mailboxes:', mailboxes.join(', '));
  
  // Deduplicate companies
  const seen = new Set();
  const toSearch = [];
  for (const app of emailApps) {
    if (!seen.has(app.company)) {
      seen.add(app.company);
      toSearch.push({ 
        company: app.company, 
        emailTo: app.emailTo,
        id: app.id 
      });
    }
  }
  
  console.log(`\nSearching for ${toSearch.length} companies...\n`);
  
  // Find All Mail folder
  const allMailPath = mailboxes.find(m => m.includes('All Mail') || m.includes('All_Mail') || m === '[Gmail]/All Mail');
  const sentPath = mailboxes.find(m => m.includes('Sent') && !m.includes('Trash'));
  
  console.log('All Mail:', allMailPath, '| Sent:', sentPath);
  
  for (const item of toSearch) {
    const { company, emailTo } = item;
    
    // Try multiple search strategies
    let found = null;
    
    // Strategy 1: Search All Mail by text (company name in body or subject)
    if (allMailPath && !found) {
      try {
        const mailbox = allMailPath;
        await client.mailboxOpen(mailbox);
        
        // Search by subject containing company name
        const companyFirst = company.split(/\s+/)[0]; // First word
        let uids = [];
        
        try {
          uids = await client.search({ subject: companyFirst }, { uid: true });
        } catch(e) {}
        
        // Also search for domain from emailTo
        if (emailTo) {
          const domain = getDomain(emailTo);
          if (domain) {
            try {
              const domainUids = await client.search({ from: domain }, { uid: true });
              uids = [...new Set([...uids, ...domainUids])];
            } catch(e) {}
            try {
              const toUids = await client.search({ to: emailTo }, { uid: true });
              uids = [...new Set([...uids, ...toUids])];
            } catch(e) {}
          }
        }
        
        if (uids.length > 0) {
          const msgs = await fetchMessages(uids, 1);
          if (msgs.length > 0) {
            found = msgs[0];
            console.log(`  ✓ [AllMail] ${company}: "${found.subject.substring(0,60)}"`);
          }
        }
      } catch(e) {
        console.log(`  ✗ AllMail search error for ${company}: ${e.message}`);
      }
    }
    
    if (!found) {
      console.log(`  - ${company}: no email found`);
    } else {
      evidence[company] = found;
    }
  }
  
  await client.logout();
  
  fs.writeFileSync('/home/node/clawd/workspace/JobHunter/gmail-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(`\nDone. Evidence for ${Object.keys(evidence).length} companies.`);
}

fetchEvidence().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
