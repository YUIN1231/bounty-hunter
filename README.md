# Bounty Hunter 🏹

AI-powered prize opportunity scanner. Automatically discovers hackathons, bug bounties, dev bounties, and ML competitions across 5 platforms — scored and ranked by Claude AI.

## Platforms Covered
- [Devpost](https://devpost.com) — Hackathons
- [HackerOne](https://hackerone.com) — Bug Bounties
- [Gitcoin](https://gitcoin.co) — Dev Bounties
- [Kaggle](https://kaggle.com) — ML Competitions
- [HeroX](https://herox.com) — Innovation Challenges

## Features
- One-click scan of all platforms simultaneously
- Claude AI scores each opportunity (0-100)
- Filter by category, minimum prize, deadline
- Daily auto-scan via `node scripts/auto-scan.mjs`
- GitLab CI/CD pipeline included

## Setup

```bash
npm install
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY
npm run dev
```

## Stack
Next.js 16 · TypeScript · Tailwind CSS v4 · Claude AI (Haiku)
