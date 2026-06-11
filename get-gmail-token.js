#!/usr/bin/env node
/**
 * Generate Gmail OAuth2 token
 * Prints an auth URL for you to visit, then waits for you to paste the code back.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

const CREDENTIALS_PATH = path.join(__dirname, 'oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'gmail-token.json');
const REDIRECT_PORT = 4321;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ oauth-credentials.json not found');
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret } = creds.installed;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n🔐 Gmail OAuth2 Token Generator\n');
  console.log('1. Open this URL in your browser:\n');
  console.log('   ' + authUrl);
  console.log('\n2. Authorize the app with your Google account.');
  console.log('3. You\'ll be redirected to localhost — waiting for it now...\n');

  // Start a local server to capture the redirect
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get('code');
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>✅ Authorized! You can close this tab.</h2>');
        server.close();
        resolve(code);
      } else {
        res.writeHead(400);
        res.end('No code found.');
        reject(new Error('No code in redirect'));
      }
    });
    server.listen(REDIRECT_PORT, () => {
      console.log(`⏳ Listening on http://localhost:${REDIRECT_PORT} for Google's redirect...\n`);
    });
    server.on('error', reject);
  });

  console.log('✅ Got auth code, exchanging for token...\n');

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  console.log('✅ Token saved to gmail-token.json\n');
  console.log('Next: add contents of gmail-token.json to OpenClaw secrets as GMAIL_API_TOKEN\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
