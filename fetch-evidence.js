const { ImapFlow } = require('/home/node/clawd/workspace/JobHunter/node_modules/imapflow');
const fs = require('fs');
const path = require('path');

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
  return (str || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
}

async function fetchEvidence() {
  const evidence = {};
  
  await client.connect();
  await client.mailboxOpen('INBOX');
  
  // Deduplicate companies
  const seen = new Set();
  const toSearch = [];
  for (const app of emailApps) {
    if (!seen.has(app.company)) {
      seen.add(app.company);
      toSearch.push({ company: app.company, id: app.id });
    }
  }
  
  console.log(`Searching Gmail for ${toSearch.length} companies...`);
  
  for (const item of toSearch) {
    const companyName = item.company;
    // Clean up company name for search
    const searchName = companyName.replace(/['"]/g, '').replace(/\s+/g, ' ').trim();
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      
      const searchPromise = async () => {
        let msgs = [];
        try {
          msgs = await client.search({ subject: searchName }, { uid: true });
        } catch(e) {
          // try simpler search
          const words = searchName.split(' ');
          if (words.length > 1) {
            try {
              msgs = await client.search({ subject: words[0] }, { uid: true });
            } catch(e2) { /* ignore */ }
          }
        }
        
        if (!msgs || msgs.length === 0) {
          // Try searching sent folder or by text
          return null;
        }
        
        // Take most recent message
        const recentMsgs = msgs.slice(-3);
        let bestMsg = null;
        
        for await (const msg of client.fetch(recentMsgs, { 
          envelope: true, 
          bodyStructure: true,
          source: { start: 0, length: 2000 }
        })) {
          const subject = msg.envelope?.subject || '';
          const from = msg.envelope?.from?.[0]?.address || '';
          const date = msg.envelope?.date || '';
          const source = msg.source ? msg.source.toString('utf8') : '';
          
          // Extract text from raw source - look for plain text after headers
          let body = '';
          const bodyMatch = source.match(/\r\n\r\n([\s\S]{0,800})/);
          if (bodyMatch) {
            body = stripHtml(bodyMatch[1]);
          }
          
          bestMsg = {
            subject: truncate(subject, 100),
            from,
            date: date ? new Date(date).toLocaleDateString() : '',
            body: truncate(body, 400)
          };
          break; // use first match
        }
        
        return bestMsg;
      };
      
      const result = await Promise.race([searchPromise(), timeoutPromise]);
      if (result) {
        evidence[companyName] = result;
        console.log(`  ✓ ${companyName}: "${result.subject}"`);
      } else {
        console.log(`  - ${companyName}: no match`);
      }
    } catch (err) {
      console.log(`  ✗ ${companyName}: ${err.message}`);
    }
  }
  
  await client.logout();
  
  fs.writeFileSync('/home/node/clawd/workspace/JobHunter/gmail-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(`\nDone. Evidence for ${Object.keys(evidence).length} companies saved.`);
}

fetchEvidence().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
