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

async function fetchMsgDetails(uids) {
  const results = [];
  try {
    for await (const msg of client.fetch(uids, {
      envelope: true,
      source: { start: 0, length: 5000 }
    })) {
      const subject = msg.envelope?.subject || '';
      const from = msg.envelope?.from?.[0];
      const date = msg.envelope?.date;
      const source = msg.source ? msg.source.toString('utf8') : '';
      
      let body = '';
      const plainMatch = source.match(/Content-Type: text\/plain[^\r\n]*\r\n(?:[A-Za-z0-9\-]+:[^\r\n]*\r\n)*\r\n([\s\S]*?)(?=\r\n--[^\r\n]+|\r\nContent-Type: text\/html|$)/i);
      if (plainMatch) {
        body = plainMatch[1].replace(/=\r?\n/g, '').replace(/=[0-9A-Fa-f]{2}/g, '?');
        body = stripHtml(body);
      } else {
        const idx = source.indexOf('\r\n\r\n');
        if (idx > -1) body = stripHtml(source.substring(idx + 4, idx + 3000));
      }
      
      results.push({
        subject,
        from: from ? (from.name ? `${from.name} <${from.address}>` : (from.address || '')) : '',
        date: date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        body: truncate(body, 500),
        rawDate: date ? new Date(date) : null
      });
    }
  } catch(e) {
    console.log('fetch error:', e.message);
  }
  return results;
}

async function fetchEvidence() {
  const evidence = {};
  
  await client.connect();
  await client.mailboxOpen('[Gmail]/All Mail');
  
  // Search for recent Ashby emails (since Jan 2025)
  console.log('Searching for recent Ashby emails since 2025...');
  const since = new Date('2025-01-01');
  const ashbyUids = await trySearch({ from: 'ashbyhq.com', since });
  console.log(`Found ${ashbyUids.length} Ashby emails since 2025`);
  
  if (ashbyUids.length > 0) {
    const msgs = await fetchMsgDetails(ashbyUids);
    console.log('\nAshby emails:');
    for (const msg of msgs.sort((a,b) => (b.rawDate||0) - (a.rawDate||0))) {
      const s = msg.subject.substring(0, 100);
      const f = msg.from.substring(0, 50);
      const bodyPrev = msg.body.substring(0, 120);
      console.log(`  [${msg.date}] "${s}"`);
      console.log(`    From: ${f}`);
      console.log(`    Body: ${bodyPrev}`);
      console.log('');
      
      // Try to match to company
      const combined = (msg.subject + ' ' + msg.from + ' ' + msg.body).toLowerCase();
      const companyMap = [
        { name: 'Nethermind', keywords: ['nethermind'] },
        { name: 'Goldsky', keywords: ['goldsky'] },
        { name: 'Chainlink Labs', keywords: ['chainlink'] },
        { name: 'Monad Foundation', keywords: ['monad'] },
        { name: 'Trust Wallet', keywords: ['trust wallet', 'trustwallet'] },
        { name: 'ETHGlobal', keywords: ['ethglobal'] },
        { name: 'Dynamic', keywords: ['dynamic.xyz', 'dynamic labs'] },
        { name: 'Biconomy', keywords: ['biconomy'] },
        { name: 'Phantom', keywords: ['phantom'] },
        { name: 'Berachain', keywords: ['berachain'] },
        { name: 'Fairblock', keywords: ['fairblock'] },
        { name: 'Alchemy', keywords: ['alchemy'] },
        { name: '0x', keywords: ['0x.org', 'matcha'] }
      ];
      for (const co of companyMap) {
        if (!evidence[co.name] && co.keywords.some(k => combined.includes(k))) {
          evidence[co.name] = { subject: msg.subject, from: msg.from, date: msg.date, body: truncate(msg.body, 400) };
          console.log(`    => MATCHED: ${co.name}`);
        }
      }
    }
  }
  
  // Search for FetLife specifically (email application)
  console.log('\nSearching for FetLife...');
  const fetLifeUids = [
    ...await trySearch({ to: 'jointheteam+designer@fetlife.com', since: new Date('2025-01-01') }),
    ...await trySearch({ from: 'fetlife.com', since: new Date('2025-01-01') })
  ];
  const uniqueFetLife = [...new Set(fetLifeUids)];
  if (uniqueFetLife.length > 0) {
    const msgs = await fetchMsgDetails(uniqueFetLife);
    if (msgs.length > 0) {
      const msg = msgs[0];
      evidence['FetLife'] = { subject: msg.subject, from: msg.from, date: msg.date, body: truncate(msg.body, 400) };
      console.log(`  FetLife: "${msg.subject.substring(0,60)}"`);
    }
  }
  
  // Search Nethermind specifically
  console.log('\nSearching for Nethermind rejection...');
  const nmUids = await trySearch({ from: 'nethermind', since: new Date('2025-01-01') });
  console.log(`  Nethermind UIDs: ${nmUids.length}`);
  if (nmUids.length > 0) {
    const msgs = await fetchMsgDetails(nmUids);
    for (const msg of msgs) {
      console.log(`  [${msg.date}] "${msg.subject.substring(0, 80)}"`);
    }
    if (msgs[0]) {
      evidence['Nethermind'] = { subject: msgs[0].subject, from: msgs[0].from, date: msgs[0].date, body: truncate(msgs[0].body, 400) };
    }
  }
  
  await client.logout();
  
  fs.writeFileSync('/home/node/clawd/workspace/JobHunter/gmail-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(`\nTotal evidence gathered: ${Object.keys(evidence).length} companies`);
  console.log('Companies with evidence:', Object.keys(evidence).join(', '));
}

fetchEvidence().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
