const { ImapFlow } = require('/home/node/clawd/workspace/JobHunter/node_modules/imapflow');
const fs = require('fs');

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
  return (str || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function truncate(str, len) {
  if (!str) return '';
  return str.length <= len ? str : str.substring(0, len) + '...';
}

async function trySearch(query) {
  try {
    return await client.search(query, { uid: true }) || [];
  } catch(e) { return []; }
}

async function fetchMsgDetails(uids, maxCount = 5) {
  const results = [];
  const recent = uids.slice(-maxCount);
  try {
    for await (const msg of client.fetch(recent, {
      envelope: true,
      source: { start: 0, length: 4000 }
    })) {
      const subject = msg.envelope?.subject || '';
      const from = msg.envelope?.from?.[0];
      const to = msg.envelope?.to?.[0];
      const date = msg.envelope?.date;
      const source = msg.source ? msg.source.toString('utf8') : '';
      
      let body = '';
      // Try to extract text/plain part
      const plainMatch = source.match(/Content-Type: text\/plain[^\r\n]*\r\n(?:[^\r\n]+\r\n)*\r\n([\s\S]*?)(?=\r\n--|\r\nContent-Type: text\/html|$)/i);
      if (plainMatch) {
        body = plainMatch[1].replace(/=\r?\n/g, '').replace(/=[0-9A-Fa-f]{2}/g, '?');
        body = stripHtml(body);
      } else {
        // Fallback: get everything after headers
        const idx = source.indexOf('\r\n\r\n');
        if (idx > -1) {
          body = stripHtml(source.substring(idx + 4, idx + 2000));
        }
      }
      
      results.push({
        subject: subject,
        from: from ? (from.name ? `${from.name} <${from.address}>` : from.address || '') : '',
        to: to ? (to.address || '') : '',
        date: date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        body: truncate(body, 500)
      });
    }
  } catch(e) {
    console.log('  fetch error:', e.message);
  }
  return results;
}

async function fetchEvidence() {
  const evidence = {};
  
  await client.connect();
  await client.mailboxOpen('[Gmail]/All Mail');
  console.log('Opened All Mail\n');
  
  // 1. Find Ashby confirmation emails
  console.log('=== Searching for Ashby ATS confirmations ===');
  const ashbyUids = [
    ...await trySearch({ from: 'ashbyhq.com' }),
    ...await trySearch({ subject: 'application' })
  ];
  const uniqueAshby = [...new Set(ashbyUids)];
  console.log(`Found ${uniqueAshby.length} potential Ashby/application emails`);
  
  if (uniqueAshby.length > 0) {
    const msgs = await fetchMsgDetails(uniqueAshby, 20);
    for (const msg of msgs) {
      console.log(`  [${msg.date}] ${msg.from.substring(0,40)} | "${msg.subject.substring(0,60)}"`);
      // Check if subject or from contains company names we care about
      const subjectLower = msg.subject.toLowerCase();
      const fromLower = msg.from.toLowerCase();
      const bodyLower = msg.body.toLowerCase();
      
      // Known companies in ashby apps
      const companies = [
        { name: 'Nethermind', keywords: ['nethermind'] },
        { name: 'Goldsky', keywords: ['goldsky'] },
        { name: 'Chainlink Labs', keywords: ['chainlink'] },
        { name: 'Monad Foundation', keywords: ['monad'] },
        { name: 'Trust Wallet', keywords: ['trust wallet', 'trustwallet'] },
        { name: 'ETHGlobal', keywords: ['ethglobal'] },
        { name: '0x', keywords: ['0x protocol', '0x.org', '@0x'] },
        { name: 'Dynamic', keywords: ['dynamic.xyz', 'dynamic labs'] },
        { name: 'Biconomy', keywords: ['biconomy'] },
        { name: 'FetLife', keywords: ['fetlife'] },
        { name: 'Algorand Foundation', keywords: ['algorand'] },
        { name: 'Phantom', keywords: ['phantom'] },
        { name: 'Berachain', keywords: ['berachain'] },
        { name: 'Fairblock', keywords: ['fairblock'] },
        { name: 'Alchemy', keywords: ['alchemy'] }
      ];
      
      for (const co of companies) {
        if (!evidence[co.name]) {
          const combined = subjectLower + ' ' + fromLower + ' ' + bodyLower;
          if (co.keywords.some(k => combined.includes(k))) {
            evidence[co.name] = {
              subject: msg.subject,
              from: msg.from,
              date: msg.date,
              body: truncate(msg.body, 400)
            };
            console.log(`  => MATCHED: ${co.name}`);
          }
        }
      }
    }
  }
  
  // 2. Search for specific application confirmation emails
  console.log('\n=== Searching for application confirmation emails ===');
  const confirmUids = [
    ...await trySearch({ subject: 'thank you for applying' }),
    ...await trySearch({ subject: 'application received' }),
    ...await trySearch({ subject: 'application confirmation' }),
    ...await trySearch({ subject: 'we received your application' }),
    ...await trySearch({ subject: 'your application to' }),
    ...await trySearch({ subject: 'application for' }),
  ];
  const uniqueConfirm = [...new Set(confirmUids)];
  console.log(`Found ${uniqueConfirm.length} confirmation-style emails`);
  
  if (uniqueConfirm.length > 0) {
    const msgs = await fetchMsgDetails(uniqueConfirm, 30);
    for (const msg of msgs) {
      console.log(`  [${msg.date}] "${msg.subject.substring(0,80)}" | from: ${msg.from.substring(0,40)}`);
    }
  }
  
  // 3. Search for rejection emails
  console.log('\n=== Searching for rejection emails ===');
  const rejUids = [
    ...await trySearch({ subject: 'unfortunately' }),
    ...await trySearch({ subject: 'not moving forward' }),
    ...await trySearch({ subject: 'after careful' }),
    ...await trySearch({ subject: 'we have decided' }),
  ];
  const uniqueRej = [...new Set(rejUids)];
  console.log(`Found ${uniqueRej.length} potential rejection emails`);
  
  if (uniqueRej.length > 0) {
    const msgs = await fetchMsgDetails(uniqueRej, 20);
    for (const msg of msgs) {
      console.log(`  [${msg.date}] "${msg.subject.substring(0,80)}" | from: ${msg.from.substring(0,40)}`);
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
