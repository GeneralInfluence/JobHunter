# Job Hunter Playbook

This file is the source of truth for how the Job Hunter agent behaves.
Read this every session before doing anything job-hunt related.

---

## 1. On Every Wake

1. `git pull origin main` the JobHunter repo to get the latest `applications.json`
2. Check `applications.json` for current state — never apply to a company/role already listed
3. Follow this playbook for all actions

---

## 2. Gmail Access — Rate Limit Rules

**The problem:** Dumping raw email content into the chat context burns tokens fast and triggers Anthropic's 30k input tokens/minute rate limit.

**The rules:**
- NEVER output raw MIME content to chat
- ALWAYS process emails internally in the Node.js script
- ONLY report a clean summary (subject, from, date, 1-line snippet) to the user
- Fetch emails at most once per session unless explicitly asked again
- Use `read-emails.js` which outputs clean JSON — do not revert to raw source fetching

**Gmail credentials:**
- User: `sean.moore.gonzalez@gmail.com`
- Read via IMAP: `process.env.GMAILPSWD` (app password) — for `read-emails.js` only
- Send via Gmail API OAuth2: `process.env.GMAIL_API_TOKEN` (refresh token) + `oauth-credentials.json`
- Job Hunt label: `Job Hunt` (id: `Label_1444622533053672996`)

**Script location:** `JobHunter/read-emails.js`

**How to read emails correctly:**
```bash
cd /home/node/clawd/workspace/JobHunter && node read-emails.js
```
Parse the JSON output internally. Report only a clean table to Sean.

---

## 3. Application Tracking

**File:** `JobHunter/applications.json`
**Repo:** `https://github.com/GeneralInfluence/JobHunter.git`
**Auth:** `process.env.GITHUB_PERSONAL_ACCESS_TOKEN`

**Before applying to any job:**
1. Pull latest `applications.json`
2. Check if `company` + `role` combo already exists
3. If yes — skip, do not apply again
4. If no — proceed with application

**After applying:**
1. Add entry to `applications.json`
2. Increment `metadata.totalApplications`
3. Update `metadata.lastSynced` to current UTC timestamp
4. `git add applications.json && git commit -m "apply: <company> — <role>" && git push origin main`

**Application entry schema:**
```json
{
  "id": "<company-slug>-<role-slug>-<YYYY-MM>",
  "company": "Company Name",
  "role": "Job Title",
  "url": "link to posting or company site",
  "appliedDate": "ISO 8601 UTC timestamp",
  "appliedVia": "email|ashby|linkedin|greenhouse|direct",
  "emailTo": "hiring email if applicable",
  "status": "pending|interviewing|rejected|closed|offer",
  "notes": "any relevant context"
}
```

**Status definitions:**
- `pending` — applied, awaiting response
- `interviewing` — active interview process
- `rejected` — explicitly rejected
- `closed` — opportunity no longer exists (contract cancelled, role filled, etc.)
- `offer` — offer received

---

## 4. Sending Applications - Simple Workflow

**Goal:** Apply to jobs with minimal token burn, no web scraping.

**Method:** Gmail API via OAuth2 (`gmail-client.js`) — auto-applies "Job Hunt" label to every sent email

**Workflow (Approved Batches Only):**

1. **For each job in approved batch:**
   - Extract: Company name, Role, Job URL
   - Look up standard hiring email: `careers@company.com` or `jobs@company.com`
   - If not found, use LinkedIn company page contact info

2. **Check LinkedIn connections:**
   ```bash
   node match-connections.js "Company Name"
   ```
   If match found → mention connection in email

3. **Draft cover letter:**
   - Base: `cover-letters/Sean_Gonzalez_Cover_Letter.md`
   - Customize: 1-2 sentences about company/role
   - Add connection mention if applicable
   - Sign with your name

4. **Attach resume:**
   - General roles → `resumes/Resume_-_General_-_March_2026.pdf`
   - Web3/protocol → `resumes/Arbitrum_Resume.pdf`
   - Product/Design → `resumes/Sean_Gonzalez_Resume_Full.md`

5. **Send via Gmail:**
   ```bash
   node send-application.js --company "Company" --email "hiring@company.com" --role "Role" --url "job-url"
   ```

6. **Log to applications.json:**
   - Add entry with: company, role, email, date, status "applied"
   - Increment `totalApplications`

7. **Commit:**
   ```bash
   git add applications.json && git commit -m "apply: Company — Role" && git push origin main
   ```

**Key Rule:** NO web scraping per job. Use batch data + standard hiring emails only.

**Credentials:** `process.env.GMAIL_API_TOKEN` (OAuth2 refresh token) + `oauth-credentials.json`

---

## 5. Sean's Profile (Quick Reference)

- **Name:** Sean M. Gonzalez
- **Email:** sean.moore.gonzalez@gmail.com
- **Location:** Reno, NV (Remote preferred)
- **Min salary:** $100k/year
- **Target roles:** Full-Stack Dev, Product Designer, TPM, UX/UI, Web3/DevRel, AI, Civic Tech
- **Avoid:** Roles requiring Greenhouse profile recreation (prefer Ashby, direct email, LinkedIn Easy Apply)
- **Resume files:** `/home/node/clawd/workspace/`

---

## 6. LinkedIn Connections Matching

**Tool:** `match-connections.js`
**Data:** `Connections.csv` (exported from LinkedIn, 1,267 companies, 1,490 connections)

**Strategy: Job-First, Connection-Second**

Do NOT reach out to connections "fishing" for opportunities. Only contact a connection if:
1. There is a specific job posting at their company
2. The role matches Sean's profile
3. The opportunity is real and ready to apply for

**Workflow:**
1. Find job → company hiring for role matching Sean's background
2. Check if Sean has a connection there: `node match-connections.js "Company Name"`
3. If match found → mention connection in cover letter
4. If no match → apply anyway if it's a good fit

**Usage in cover letters (if connection exists):**
Add a line like:
> "I see we have a mutual connection, [Name], who is [Position] at [Company]. I've been impressed by the work you're doing and would love to contribute."

**Never do this:**
- Cold outreach to connections asking "are you hiring?"
- Mention connection without a real job application context
- Use connections as a lead generation tool

---

## 8. Job Sourcing Strategy

**Goal:** Find opportunities aligned with Sean's background (Full-Stack Dev, Product Designer, UX/UI, Web3/DevRel, TPM, AI, Civic Tech).

**Data sources (in priority order):**
1. **Brave Search API** (using `web_search` tool with `BRAVE_API_KEY`)
2. **LinkedIn** (if API access available)
3. **Ashby.com** and **Greenhouse** (preferred ATS platforms based on past applications)
4. **Job boards:** AngelList, We Work Remotely, Remote.co, FlexJobs, Crypto jobs boards
5. **Direct company targeting:** Similar to companies in `applications.json` (Chainlink, Algorand, Goldsky, Nethermind, etc.)

**Search queries to run regularly:**
- `blockchain product manager jobs remote 2026`
- `full stack developer crypto protocol remote`
- `DevRel developer relations Web3 remote`
- `UX UI designer blockchain Web3 remote`
- `technical product manager AI remote`
- `civic tech product roles remote`
- `Solidity developer remote jobs`

**Filtering criteria (INCLUDE):**
- Remote or Reno-friendly
- $100k+/year salary or equivalent
- Ashby/direct email preferred (avoid mandatory Greenhouse profile recreation)
- Full-stack, product, design, DevRel, or TPM roles
- Web3, blockchain, protocol, AI, or civic tech focus

**Filtering criteria (EXCLUDE):**
- Roles requiring Greenhouse profile that you've already rejected
- Contract-only gigs (unless explicitly seeking)
- Below $100k
- Relocation required

**Job Priority System:**

When sourcing jobs, prioritize in this order:

1. **TIER 1: Connection + Match** (highest priority)
   - Job at a company where Sean has a direct connection
   - Role matches target profile
   - Application method is available (email, Ashby, Easy Apply)
   - **Action:** Apply immediately with connection mention in cover letter

2. **TIER 2: Strong Match, No Connection**
   - Role is perfect fit (Full-Stack Dev, PM, DevRel, etc.)
   - Salary ≥ $100k
   - Remote/flexible
   - Known company in Web3 ecosystem
   - **Action:** Apply with customized cover letter

3. **TIER 3: Partial Match**
   - Role adjacent to target (e.g., community manager, security engineer)
   - Company is Web3/crypto focused
   - Willing to stretch for right opportunity
   - **Action:** Apply, but may deprioritize vs Tier 1/2

**Before adding a job to applications.json:**
1. Determine tier (check `match-connections.js` first)
2. Confirm role matches Sean's interests
3. Check `applications.json` — skip if company + role already exists
4. Verify application method (email, Ashby, LinkedIn Easy Apply preferred)
5. If Tier 1 → apply immediately
6. If Tier 2/3 → get approval or batch with others
7. Add entry to `applications.json` with status `pending`, then apply

**After finding qualified jobs:**
- Report them as a clean table: Company | Role | URL | Method
- Get Sean's approval before applying (unless he says "auto-apply all")

---

## 9. Browser Automation & Job Scraping

**Config File:** `scraper-config.json`
**Current Status:** Batch automation configured for web3.career, cryptojobslist.com, remote3.co

**How to run scraper in next session:**
```bash
cd /home/node/clawd/workspace/JobHunter
node scraper.js  # Creates batch-NNN-pending-approval.json
```

**Scraper will:**
1. Hit job boards listed in `scraper-config.json`
2. Extract 30 jobs matching: remote, $80k+, your profile
3. Save to `batch-NNN-pending-approval.json`
4. Wait for your approval before applying

**Config parameters are tunable** in `scraper-config.json`:
- `salaryFloor` — minimum salary (default: $80k)
- `maxJobsPerBatch` — jobs per batch (default: 30)
- `searchEndpoints` — which job board pages to scrape
- `scrapingRules` — keyword filters, job types

---

## 10. Token / Rate Limit Discipline

**The hard limit:** 30k input tokens/minute on claude-sonnet. Violating this kills the session mid-task.

### Rules (non-negotiable)

- **NEVER use `web_fetch` or `web_search` tools directly in the main session for job research.**
  These dump raw HTML/JSON into shared context and blow the limit fast.

- **ALWAYS use `research-jobs.js` to investigate job URLs:**
  ```bash
  cd /home/node/clawd/workspace/JobHunter
  node research-jobs.js "https://jobs.ashbyhq.com/..." "https://..." 2>/dev/null
  ```
  Output is clean JSON. Report only: role, applyMethod, email. Nothing else.

- **For sourcing runs (searching multiple job boards):** spawn a subagent.
  The subagent has no conversation history — zero context overhead.
  It fetches, filters, returns a clean table. Main session only sees the result.

- **Start a fresh session** when the current one has been running for a long time
  or has processed many job pages. Context bloat is cumulative.

- Do not print raw MIME, encoded bodies, or large blobs to chat — ever.
- Batch git commits — don't commit after every tiny change.
- Read emails at most once per session unless explicitly asked again.
- Process data in scripts, report summaries in chat.

### Apply Method Decision Tree

| Detected method | Action |
|---|---|
| `email:X@Y.com` | Send via `gmail-client.js` directly |
| `ashby-form` | Give Sean the link + pre-written cover letter to paste |
| `greenhouse-form` | Give Sean the link + pre-written cover letter to paste |
| `lever-form` | Give Sean the link + pre-written cover letter to paste |
| `linkedin` | Give Sean the LinkedIn URL to Easy Apply |
| `form-unknown` | Try guessing `careers@domain.com` and email directly |
