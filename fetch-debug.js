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

async function main() {
  await client.connect();
  await client.mailboxOpen('[Gmail]/All Mail');
  console.log('Opened All Mail\n');

  // Search for Ashby with since date
  const since = new Date('2025-01-01');
  const uids = await client.search({ from: 'ashbyhq.com', since }, { uid: true });
  console.log('Ashby UIDs:', uids);
  
  if (uids.length > 0) {
    console.log('\nFetching details for UIDs:', uids.slice(0, 5));
    const fetchUids = uids.slice(0, 5);
    
    // Try fetch with lock
    const lock = await client.getMailboxLock('[Gmail]/All Mail');
    try {
      for await (const msg of client.fetch(fetchUids, { envelope: true }, { uid: true })) {
        console.log(`UID ${msg.uid}: "${msg.envelope?.subject?.substring(0,80)}" from ${msg.envelope?.from?.[0]?.address}`);
      }
    } finally {
      lock.release();
    }
  }
  
  // Also try Nethermind
  console.log('\n--- Nethermind search ---');
  const nmUids = await client.search({ from: 'nethermind' }, { uid: true });
  console.log('Nethermind UIDs:', nmUids);
  if (nmUids.length > 0) {
    const lock2 = await client.getMailboxLock('[Gmail]/All Mail');
    try {
      for await (const msg of client.fetch(nmUids.slice(-3), { envelope: true }, { uid: true })) {
        console.log(`  UID ${msg.uid}: "${msg.envelope?.subject?.substring(0,80)}" [${msg.envelope?.date}]`);
      }
    } finally {
      lock2.release();
    }
  }
  
  await client.logout();
}

main().catch(e => console.error('Error:', e.message));
