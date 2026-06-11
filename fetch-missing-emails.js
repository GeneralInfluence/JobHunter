#!/usr/bin/env node
/**
 * Fetch FetLife and Filecoin Foundation emails from Gmail "Job Hunt" label
 */
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'oauth-credentials.json');
const JOB_HUNT_LABEL_ID = 'Label_1444622533053672996';

function createGmailClient() {
  const creds = require(CREDENTIALS_PATH);
  const { client_id, client_secret } = creds.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_API_TOKEN });
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

function decodeBase64(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function getBody(payload) {
  if (payload.body && payload.body.size > 0 && payload.body.data) {
    return decodeBase64(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const result = getBody(part);
      if (result) return result;
    }
  }
  return null;
}

async function main() {
  const gmail = createGmailClient();

  // Search for FetLife and Filecoin emails in sent mail
  const searches = [
    { query: 'to:jointheteam+designer@fetlife.com', label: 'FetLife — Senior Product Designer' },
    { query: 'to:careers@fil.org', label: 'Filecoin Foundation — General Application' },
  ];

  for (const search of searches) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FETCHING: ${search.label}`);
    console.log(`Query: ${search.query}`);
    console.log('='.repeat(60));

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `in:sent ${search.query}`,
      maxResults: 5,
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) {
      console.log('No messages found.');
      continue;
    }

    for (const msg of messages) {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = full.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value;
      const to = headers.find(h => h.name === 'To')?.value;
      const date = headers.find(h => h.name === 'Date')?.value;
      const body = getBody(full.data.payload);

      console.log(`\nDate: ${date}`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`\nBody:\n${body || '(could not decode body)'}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
