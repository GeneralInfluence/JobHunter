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
function getDomain(email) {
  if (!email) return null;
  const m = email.match(/@([^>]+)/);
  return m ? m[1].toLowerCase() : null;
}

async function fetchMsgs(uids, count = 1) {
  const results = [];
  const recent = uids.slice(-count);
  try {
    for await (const msg of client.fetch(recent, {
      envelope: true,
      source: { start: 0, length: 3000 }
    })) {
      const subject = msg.envelope?.subject || '';
      const from = msg.envelope?.from?.[0];
      const date = msg.envelope?.date;
      const source = msg.source ? msg.source.toString('utf8') : '';
      
      let body = '';
      const plainMatch = source.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\nContent-Type:|$)/i);
      if (plainMatch) {
        body = stripHtml(plainMatch[1]);
      } else {
        const bodyMatch = source.match(/\r\n\r\n([\s\S]*)/);
        if (bodyMatch) body = stripHtml(bodyMatch[1]);
      }
      
      results.push({
        subject: truncate(subject, 120),
        from: from ? `${from.name || ''} <${from.address || ''}>`.trim().replace(/^</, '') : '',
        date: date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        body: truncate(body.replace(/=[\r\n]/g, '').replace(/=[0-9A-Fa-f]{2}/g, ' '), 400)
      });
    }
  } catch(e) { /* ignore fetch errors */ }
  return results;
}

async function trySearch(query) {
  try {
    return await client.search(query, { uid: true }) || [];
  } catch(e) { return []; }
}

async function fetchEvidence() {
  const evidence = {};
  
  await client.connect();
  
  // Try to list mailboxes
  let allMailPath = '[Gmail]/All Mail';
  try {
    const list = await client.listMailboxes();
    console.log('Mailbox tree available');
    // Walk tree to find All Mail
    function walkTree(nodes) {
      for (const node of (nodes || [])) {
        if (node.name && node.name.includes('All')) allMailPath = node.path;
        if (node.children) walkTree(node.children);
      }
    }
    walkTree(list?.tree?.children || []);
  } catch(e) {
    console.log('listMailboxes not available, using default paths');
  }
  
  console.log('Using All Mail path:', allMailPath);
  
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
  
  // Open All Mail 
  let mailboxOpened = false;
  for (const mailbox of [allMailPath, 'INBOX', '[Gmail]/Sent Mail', 'Sent']) {
    try {
      await client.mailboxOpen(mailbox);
      console.log('Opened:', mailbox);
      mailboxOpened = true;
      break;
    } catch(e) {
      console.log('Cannot open:', mailbox, e.message.substring(0, 50));
    }
  }
  
  if (!mailboxOpened) {
    console.log('Could not open any mailbox');
    await client.logout();
    return;
  }
  
  for (const item of toSearch) {
    const { company, emailTo } = item;
    let allUids = [];
    
    // Search by emailTo domain (from field)
    if (emailTo) {
      const domain = getDomain(emailTo);
      if (domain) {
        const u1 = await trySearch({ from: domain });
        const u2 = await trySearch({ to: emailTo });
        allUids = [...new Set([...allUids, ...u1, ...u2])];
      }
    }
    
    // Search by company name in subject (first significant word)
    const words = company.replace(/['".,]/g, '').split(/\s+/);
    const searchWord = words.find(w => w.length > 3) || words[0];
    const u3 = await trySearch({ subject: searchWord });
    // Filter to likely matches
    allUids = [...new Set([...allUids, ...u3])];
    
    if (allUids.length > 0) {
      const msgs = await fetchMsgs(allUids, 1);
      if (msgs.length > 0) {
        evidence[company] = msgs[0];
        console.log(`  ✓ ${company}: "${msgs[0].subject.substring(0, 60)}" (from: ${msgs[0].from.substring(0, 40)})`);
        continue;
      }
    }
    
    console.log(`  - ${company}: no email found (searched ${allUids.length} uids)`);
  }
  
  await client.logout();
  
  fs.writeFileSync('/home/node/clawd/workspace/JobHunter/gmail-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(`\nDone. Evidence for ${Object.keys(evidence).length} companies.`);
}

fetchEvidence().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
