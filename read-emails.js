const { ImapFlow } = require('imapflow');

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

async function readJobHuntEmails() {
  await client.connect();

  // List all mailboxes to find the exact label name
  const mailboxes = await client.list();
  const jobHuntMailbox = mailboxes.find(m =>
    m.name.toLowerCase().includes('job hunt') ||
    m.path.toLowerCase().includes('job hunt') ||
    m.path.toLowerCase().includes('job_hunt')
  );

  if (!jobHuntMailbox) {
    console.log('Available mailboxes:');
    mailboxes.forEach(m => console.log(' -', m.path));
    await client.logout();
    return;
  }

  console.log('Found mailbox:', jobHuntMailbox.path);

  await client.mailboxOpen(jobHuntMailbox.path);

  const emails = [];
  for await (let msg of client.fetch('1:*', { envelope: true, bodyParts: ['1'] })) {
    const part = msg.bodyParts?.get('1');
    const rawBody = part ? part.toString() : '';
    // Decode quoted-printable, strip MIME noise, truncate
    const body = rawBody
      .replace(/=\r?\n/g, '')
      .replace(/=[0-9A-F]{2}/gi, m => String.fromCharCode(parseInt(m.slice(1), 16)))
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);

    emails.push({
      uid: msg.uid,
      subject: msg.envelope.subject,
      from: msg.envelope.from?.[0]?.address,
      to: msg.envelope.to?.[0]?.address,
      date: msg.envelope.date,
      snippet: body
    });
  }

  await client.logout();

  console.log(JSON.stringify(emails, null, 2));

  return emails;
}

readJobHuntEmails().catch(console.error);
