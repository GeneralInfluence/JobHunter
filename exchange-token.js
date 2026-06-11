#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'gmail-token.json');
const REDIRECT_URI = 'http://localhost:4321';

const code = process.argv[2];
if (!code) { console.error('Usage: node exchange-token.js <code>'); process.exit(1); }

const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret } = creds.installed;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

oAuth2Client.getToken(code).then(({ tokens }) => {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('✅ Token saved to gmail-token.json');
  console.log('refresh_token:', tokens.refresh_token);
}).catch(err => {
  console.error('❌ Error:', err.message);
});
