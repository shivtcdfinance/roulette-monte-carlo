---
name: roulette-monte-carlo-skill
description: Monte Carlo roulette simulator with Bayesian analysis, multi-bet portfolio engine, and dashboard replica. Handles data ingestion, per-number Bayesian probability, confidence intervals, and optimal bet recommendation.
version: 1.0
created: 2026-07-12
project_path: ~/Hermes v3/v3/projects/roulette-monte-carlo/
vault_path: ~/Hermes v3/v3/vault/skills/roulette-monte-carlo-skill/
hermes_skill_path: ~/.hermes/skills/roulette-monte-carlo-skill/
reference:
  project_skill_ref: skill-reference/SKILL_REFERENCE.md
  vault_skill_ref: SKILL_REFERENCE.md
---

# Roulette Monte Carlo Simulator Skill

## Data Flow
1. User reads result strip **left→right (latest→oldest)** on casino screen
2. User types numbers raw, hitting enter between each
3. **I store in FIFO order**: pos 1 = oldest, highest pos = newest
4. New numbers **append to the END** of the sequence
5. Timestamp estimation: ~1 min per spin starting from reference time

## Critical Rules
- **NEVER guess from OCR** — glossy screens cause 14↔19 confusion and digit merging
- Always confirm with user in 5-10 number batches
- User provides raw data; I only store and analyse

## Dataset: Station 5 / Game 980
- 125 spins (FIFO, 18:48 → 20:52)
- RED 41.6%, BLACK 53.6%, ZERO 4.8%
- Top numbers: #13 (7), #23 (7), #0 (6), #10 (6), #15 (6), #22 (6)
- Best EV: #0 (€+0.85), #15 (€+0.85), #13 (€+0.59)

## Dashboard
- URL: `https://shivtcdfinance.github.io/roulette-monte-carlo/`
- Replica at top of page with safe-click ball menu (confirmation before delete)
- Bayesian per-number analysis with 95% credible intervals
- Multi-bet portfolio builder with payoff profile
- Snapshot/backup system (localStorage)
- Auto-save every 30s, refresh protection

## 3-Way Skill Storage
Every skill must be saved in 3 locations:
1. **Hermes skill system** (this one) — `skill_view(name='roulette-monte-carlo-skill')`
2. **Project folder** — `~/Hermes v3/v3/projects/roulette-monte-carlo/skill-reference/`
3. **Vault folder** — `~/Hermes v3/v3/vault/skills/roulette-monte-carlo-skill/`

Each location has a `SKILL_REFERENCE.md` listing all 3 paths and cross-references.

## Appending New Data
```python
# Python helper to update sequence
def append_spins(fifo_list, new_numbers):
    fifo_list.extend(new_numbers)
    # Recalculate counts, stats, Bayesian probabilities
    # Save to JSON, DB, and load_sequence.js
    # Update timestamps at ~1 min per spin
    return fifo_list
```
