#!/usr/bin/env node
/**
 * Gmail API client — replaces nodemailer
 * Sends emails and automatically applies the "Job Hunt" label
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

/**
 * Encode email as base64url RFC 2822 message
 */
function buildRawEmail({ from, to, subject, text, attachments = [] }) {
  const boundary = 'boundary_' + Date.now();
  const fs = require('fs');

  let message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    text,
  ].join('\r\n');

  for (const att of attachments) {
    const fileData = fs.readFileSync(att.path).toString('base64');
    message += [
      '',
      `--${boundary}`,
      `Content-Type: application/octet-stream; name="${att.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${att.filename}"`,
      '',
      fileData,
    ].join('\r\n');
  }

  message += `\r\n--${boundary}--`;

  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Send an email and apply the "Job Hunt" label
 */
async function sendJobEmail({ from, to, subject, text, attachments = [] }) {
  const gmail = createGmailClient();
  const raw = buildRawEmail({ from, to, subject, text, attachments });

  // Send the email
  const sent = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  const messageId = sent.data.id;

  // Apply "Job Hunt" label
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: [JOB_HUNT_LABEL_ID],
    },
  });

  return messageId;
}

module.exports = { sendJobEmail };
