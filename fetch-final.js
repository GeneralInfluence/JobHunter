const { ImapFlow } = require('/home/node/clawd/workspace/JobHunter/node_modules/imapflow');
const fs = require('fs');

const apps = JSON.parse(fs.readFileSync('/home/node/clawd/workspace/JobHunter/applications.json', 'utf8'));

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
  return (str || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}
function truncate(str, len) {
  if (!str) return '';
  const clean = str.replace(/\s+/g, ' ').trim();
  return clean.length <= len ? clean : clean.substring(0, len) + '...';
}
function qpDecode(str) {
  return str.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
}

async function fetchWithBody(uids, label = '') {
  const results = [];
  const lock = await client.getMailboxLock('[Gmail]/All Mail');
  try {
    for await (const msg of client.fetch(uids, {
      envelope: true,
      source: true
    }, { uid: true })) {
      const subject = msg.envelope?.subject || '';
      const from = msg.envelope?.from?.[0];
      const date = msg.envelope?.date;
      const source = msg.source ? msg.source.toString('utf8') : '';
      
      let body = '';
      
      // Try to get text/plain part
      const plainMatch = source.match(/Content-Type: text\/plain[^\r\n]*\r\n(?:[A-Za-z0-9\-]+:[^\r\n]*\r\n)*\r\n([\s\S]*?)(?=\r\n--|\r\nContent-Type: text\/(html|plain)|$)/i);
      if (plainMatch) {
        body = qpDecode(plainMatch[1]);
        body = stripHtml(body);
      }
      
      // Fallback: HTML body
      if (!body || body.length < 20) {
        const htmlMatch = source.match(/Content-Type: text\/html[^\r\n]*\r\n(?:[A-Za-z0-9\-]+:[^\r\n]*\r\n)*\r\n([\s\S]*?)(?=\r\n--|$)/i);
        if (htmlMatch) {
          body = stripHtml(qpDecode(htmlMatch[1]));
        }
      }
      
      // Final fallback
      if (!body || body.length < 20) {
        const idx = source.indexOf('\r\n\r\n');
        if (idx > -1) body = stripHtml(source.substring(idx + 4, idx + 3000));
      }
      
      const dateObj = date ? new Date(date) : null;
      results.push({
        subject,
        from: from ? (from.name ? `${from.name} <${from.address}>` : (from.address || '')) : '',
        date: dateObj ? dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        body: truncate(body, 500),
        rawDate: dateObj
      });
      
      if (label) {
        console.log(`  [${label}] "${subject.substring(0,80)}" | ${dateObj ? dateObj.toISOString().substring(0,10) : 'n/a'}`);
        console.log(`    Body preview: ${body.substring(0, 150)}`);
      }
    }
  } finally {
    lock.release();
  }
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
  await client.mailboxOpen('[Gmail]/All Mail');
  
  const since2025 = new Date('2025-01-01');
  
  // 1. All Ashby emails since 2025
  console.log('=== Ashby ATS emails ===');
  const ashbyUids = await trySearch({ from: 'ashbyhq.com', since: since2025 });
  console.log(`Found ${ashbyUids.length} Ashby emails`);
  
  if (ashbyUids.length > 0) {
    const msgs = await fetchWithBody(ashbyUids, 'Ashby');
    
    // Match to applications
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
      { name: '0x', keywords: ['0x.org', 'matcha', '0x protocol'] }
    ];
    
    for (const msg of msgs) {
      const combined = (msg.subject + ' ' + msg.from + ' ' + msg.body).toLowerCase();
      for (const co of companyMap) {
        if (co.keywords.some(k => combined.includes(k))) {
          // Prefer rejection email over confirmation (more evidence value), but keep both
          if (!evidence[co.name]) {
            evidence[co.name] = { subject: msg.subject, from: msg.from, date: msg.date, body: truncate(msg.body, 400) };
            console.log(`  => MATCHED: ${co.name}`);
          } else if (
            msg.subject.toLowerCase().includes('unfortunately') ||
            msg.subject.toLowerCase().includes('not moving') ||
            msg.body.toLowerCase().includes('unfortunately') ||
            msg.body.toLowerCase().includes('not moving forward')
          ) {
            // Update with rejection if we only had confirmation
            evidence[co.name] = { subject: msg.subject, from: msg.from, date: msg.date, body: truncate(msg.body, 400) };
            console.log(`  => UPDATED with rejection: ${co.name}`);
          }
        }
      }
    }
  }
  
  // 2. FetLife auto-reply
  console.log('\n=== FetLife email ===');
  const fetUids = [
    ...await trySearch({ to: 'jointheteam+designer@fetlife.com' }),
    ...await trySearch({ from: 'fetlife.com' }),
    ...await trySearch({ subject: 'fetlife' })
  ];
  const uniqueFet = [...new Set(fetUids)];
  console.log(`FetLife UIDs: ${uniqueFet.length}`);
  if (uniqueFet.length > 0) {
    const msgs = await fetchWithBody(uniqueFet.slice(-3), 'FetLife');
    if (msgs.length > 0) {
      evidence['FetLife'] = { subject: msgs[0].subject, from: msgs[0].from, date: msgs[0].date, body: truncate(msgs[0].body, 400) };
    }
  }
  
  // 3. Search by company email domains for key companies
  const domainSearches = [
    { company: 'Algorand Foundation', domain: 'algorand.foundation' },
    { company: 'OKX', domain: 'okx.com' },
    { company: 'BitMEX', domain: 'bitmex.com' },
    { company: 'Across Protocol', domain: 'across.to' },
    { company: 'Moralis Web3', domain: 'moralis.io' },
    { company: 'Stellar Foundation', domain: 'stellar.org' },
    { company: 'Filecoin Foundation', domain: 'fil.org' },
    { company: 'Crypto.com', domain: 'crypto.com' },
    { company: 'GSRMarkets', domain: 'gsrmarkets.com' },
    { company: 'Alpaca', domain: 'alpaca.markets' },
    { company: 'Bitpanda', domain: 'bitpanda.com' }
  ];
  
  console.log('\n=== Company domain searches ===');
  for (const { company, domain } of domainSearches) {
    if (evidence[company]) continue;
    const uids = [
      ...await trySearch({ from: domain, since: since2025 }),
      ...await trySearch({ to: `careers@${domain}`, since: since2025 })
    ];
    const unique = [...new Set(uids)];
    if (unique.length > 0) {
      const msgs = await fetchWithBody(unique.slice(-2), company);
      if (msgs.length > 0) {
        evidence[company] = { subject: msgs[0].subject, from: msgs[0].from, date: msgs[0].date, body: truncate(msgs[0].body, 400) };
      }
    } else {
      console.log(`  - ${company}: no emails from ${domain}`);
    }
  }
  
  await client.logout();
  
  fs.writeFileSync('/home/node/clawd/workspace/JobHunter/gmail-evidence.json', JSON.stringify(evidence, null, 2));
  console.log(`\n=== SUMMARY ===`);
  console.log(`Evidence for ${Object.keys(evidence).length} companies:`);
  for (const [co, ev] of Object.entries(evidence)) {
    console.log(`  ✓ ${co}: "${ev.subject.substring(0,60)}"`);
  }
}

fetchEvidence().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
