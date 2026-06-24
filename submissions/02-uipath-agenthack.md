# UiPath AgentHack — Submission

## Project Name
Bounty Hunter Agent — Autonomous Prize Opportunity Discovery

## Tagline
An AI agent that hunts prize money across the internet so you don't have to.

## What it does
Bounty Hunter is an autonomous agent that:
1. **Discovers** — scans Devpost, HackerOne, Gitcoin, Kaggle, HeroX daily
2. **Evaluates** — Claude AI scores each opportunity (prize size, deadline urgency, solo eligibility)
3. **Prioritizes** — surfaces top opportunities ranked by ROI
4. **Alerts** — notifies when high-value opportunities appear

## The Agentic Loop
```
[Trigger: schedule/manual]
    → Parallel scrape (5 platforms)
    → Claude AI evaluation
    → Score & rank
    → Store results
    → Surface to user
```

## Why this is agentic
- Operates without human intervention once deployed
- Makes autonomous decisions (what to surface, how to score)
- Handles failures gracefully (each scraper independent)
- Learns user preferences through score feedback (roadmap)

## Tech Stack
Next.js · TypeScript · Claude AI · 5 platform APIs · Node.js cron

## Team
Solo developer
