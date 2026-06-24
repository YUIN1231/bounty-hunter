# Global AI Hackathon Series with Qwen Cloud — Submission

## Project Name
Bounty Hunter — Multi-Agent Prize Discovery System

## Tagline
An AI agent that never sleeps, scanning the web for your next prize opportunity.

## What it does
Bounty Hunter is a multi-source AI agent system that:
- Dispatches parallel scraping agents to 5 platforms
- Feeds results to an LLM scoring agent (evaluates prize, deadline, eligibility)
- Aggregates, ranks, and presents actionable intelligence

## AI Agent Architecture
```
Orchestrator Agent
├── Scraper Agent: Devpost
├── Scraper Agent: HackerOne  
├── Scraper Agent: Gitcoin
├── Scraper Agent: Kaggle
└── Scraper Agent: HeroX
        ↓
Scorer Agent (Claude/Qwen)
        ↓
Dashboard
```

## Productivity impact
- Eliminates 30+ minutes/day of manual platform checking
- AI prioritization means developers focus only on highest-ROI opportunities
- One-click access to any opportunity

## Tech Stack
Next.js · TypeScript · LLM API (scorer) · Tailwind CSS · Node.js

## Team
Solo developer
