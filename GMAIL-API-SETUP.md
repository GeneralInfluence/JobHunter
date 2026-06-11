# Gmail API Setup

This guide walks through setting up OAuth2 authentication for the Gmail API.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"New Project"** (top left, next to project name)
3. Name: `Job Hunter`
4. Click **Create**
5. Wait for the project to be created

## Step 2: Enable Gmail API

1. In the Google Cloud Console, go to **APIs & Services > Library**
2. Search for **"Gmail API"**
3. Click on **Gmail API**
4. Click **Enable**

## Step 3: Create OAuth2 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. If asked to configure OAuth consent screen first:
   - Click **Configure Consent Screen**
   - Select **External** user type
   - Click **Create**
   - Fill in:
     - **App name:** Job Hunter
     - **User support email:** sean.moore.gonzalez@gmail.com
     - **Developer contact:** sean.moore.gonzalez@gmail.com
   - Click **Save and Continue** (skip optional scopes)
   - Click **Save and Continue** again
4. Back to credentials, click **Create Credentials > OAuth 2.0 Client ID**
5. Select **Desktop application**
6. Name: `Job Hunter CLI`
7. Click **Create**
8. Click **Download JSON** — this is your credentials file

**Save this file as:** `/home/node/clawd/workspace/JobHunter/oauth-credentials.json`

## Step 4: Generate Initial Auth Token

Run this script once to get an auth token:

```bash
cd /home/node/clawd/workspace/JobHunter
node get-gmail-token.js
```

This will:
1. Open a browser to Google login
2. Ask you to authorize "Job Hunter" to access your Gmail
3. Generate `gmail-token.json` with refresh token

## Step 5: Store in Gateway Secrets

After getting the token, store these in OpenClaw gateway secrets:

1. **GMAIL_API_CREDENTIALS** — Contents of `oauth-credentials.json`
2. **GMAIL_API_TOKEN** — Contents of `gmail-token.json` (the refresh token)

How to add to gateway:
```bash
# In OpenClaw dashboard or via CLI:
openclaw config set secrets.GMAIL_API_CREDENTIALS "$(cat oauth-credentials.json)"
openclaw config set secrets.GMAIL_API_TOKEN "$(cat gmail-token.json)"
```

Or copy-paste the JSON into the OpenClaw UI under Settings > Secrets.

## Step 6: Update Send Scripts

The `apply-batch-*.js` scripts will now use Gmail API instead of SMTP:

```bash
node apply-batch-001-cleaned.js
```

Emails will be:
- Sent from your Gmail account
- Auto-labeled with **"Job Hunt"**
- Tracked in applications.json

---

**Notes:**

- OAuth credentials are safe to commit to git (they don't contain secrets)
- The refresh token is sensitive — keep it in gateway secrets only
- The script will auto-refresh tokens as needed
- Gmail API rate limit: 250 quota units per day (we have plenty)
