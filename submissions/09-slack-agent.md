# Slack Agent Builder Challenge — Submission

## Project Name
Bounty Hunter Slack Bot — Prize Alerts in Your Team's Workspace

## Tagline
Get AI-ranked bounty opportunities delivered directly to your Slack channel, every morning.

## What it does
A Slack bot that runs Bounty Hunter scans on a schedule and posts the top opportunities to a channel.

**Daily digest format:**
```
🏆 Today's Top Bounties (Jun 24)
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Build with Gemini XPRIZE — $2,000,000 [score: 95]
   Deadline: Aug 17 · AI/Education
   → https://xprize.devpost.com

2. H0: Hack Zero Stack — $80,000 [score: 88]  
   Deadline: Jun 29 · Web/Databases
   → https://h01.devpost.com
```

**Slash commands:**
- `/bounty scan` — trigger immediate scan
- `/bounty top 5` — show top 5 opportunities
- `/bounty filter hackathon` — filter by category

## Slack integration
- Slack Bolt SDK for Node.js
- Scheduled via Slack Workflow Builder
- Posted to designated channel

## Tech Stack
Next.js · Slack Bolt · Claude AI · Tailwind (web dashboard companion)

## Team
Solo developer
