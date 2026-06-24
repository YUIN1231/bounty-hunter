# GitLab Transcend Hackathon — Submission

## Project Name
Bounty Hunter — AI-Powered Opportunity Pipeline with GitLab CI/CD

## Tagline
Never miss a hackathon again. Automated daily scanning, AI scoring, and GitLab-powered deployment pipeline.

## What it does
Bounty Hunter is an automated system that continuously scans 5+ platforms (Devpost, HackerOne, Gitcoin, Kaggle, HeroX) for prize opportunities, scores them using Claude AI, and surfaces the highest-value ones in a clean dashboard.

The GitLab CI/CD pipeline powers:
- **Automated daily scans** via GitLab Schedules
- **Build validation** on every commit
- **One-command deployment** to any server

## The problem it solves
Prize money from hackathons and bounties is scattered across dozens of platforms. Developers miss opportunities simply because they don't have time to check every platform daily. Bounty Hunter automates this entirely.

## How I built it
- **Next.js 16** (App Router) — dashboard and API routes
- **Claude AI (Haiku)** — scores each opportunity 0-100 based on prize, deadline, solo eligibility
- **GitLab CI/CD** — daily automated scans via scheduled pipelines, build checks on PRs
- **5 scrapers** — Devpost API, HackerOne public API, Gitcoin API, Kaggle API, HeroX API

## GitLab Integration
- `.gitlab-ci.yml` with 3 stages: test → build → scan
- GitLab Schedules trigger `node scripts/auto-scan.mjs` daily
- Merge request pipelines validate builds before merge

## Demo
[localhost:3005] — scan runs live, returns ranked opportunities in <5 seconds

## Tech Stack
Next.js · TypeScript · Tailwind CSS · Claude API · GitLab CI/CD

## Team
Solo developer
