# 🎲 Roulette Monte Carlo Simulator

**Optimal betting decision engine** — runs millions of stochastic simulations to find the mathematically optimal bet given observed roulette data.

## How it works

1. **Input** your observed data from any roulette screen (counts per number, percentages, or paste a sequence)
2. **Configure** your bankroll, expected spins, bet strategy, and risk parameters
3. **Run** 10K–1M Monte Carlo trials simulating every possible outcome trajectory
4. **Get** the optimal bet: which bet type, win probability, expected value, outcome distribution, and bias analysis

## Features

| Feature | Description |
|---|---|
| Per-number frequency input | Grid of all 37/38 slots with observed hit counts |
| Aggregate input | Quick RED/BLACK/GREEN/EVEN/ODD/LOW/HIGH entry |
| Sequence parser | Paste raw results as numbers or colours |
| MC engine | 1,000–1,000,000 trials with Bayesian-smoothed probabilities |
| 5 betting strategies | Flat, Proportional, Kelly Criterion, Martingale, Fibonacci |
| 10+ bet types | Red, Black, Even, Odd, Low, High, Dozens, Straight, Columns |
| Full scan mode | Tests ALL bet types and finds the mathematically optimal one |
| Visual output | Distribution histogram, cumulative chart, percentile bars |
| Fairness analysis | Chi-squared test + per-number Z-scores |
| Session log | Every simulation recorded with timestamp and results |

## Usage

### From the dashboard
1. Open `index.html` in any browser (no server needed)
2. Use the number grid or presets to input observed data
3. Set your bankroll and expected iterations
4. Click **Run Monte Carlo Simulation**

### From chat (image analysis)
Take a photo of a roulette screen and send it to me. I'll:
- Extract all visible stats (counts, percentages, results sequence)
- Auto-populate the dashboard with the extracted data
- Run the analysis and give you the optimal bet

## Data Schemas

### Counting board layout (European single-zero)
```
Row 3:  3   6   9  12  15  18  21  24  27  30  33  36
Row 2:  2   5   8  11  14  17  20  23  26  29  32  35
Row 1:  1   4   7  10  13  16  19  22  25  28  31  34
Zero:   0
```

### Colour mapping
- **Red**: 1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
- **Black**: 2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35
- **Green**: 0 (European), 0 & 00 (American)

## Observed Data (from screenshots)

### Session 1 (First image)
| Outcome | Count (out of 100) | Percentage |
|---|---|---|
| **RED** | 51 | 51.0% |
| **BLACK** | 44 | 44.0% |
| **GREEN (Zero)** | 5 | 5.0% |

### Session 2 (Second image — latest)
| Outcome | Count (out of 100) | Percentage |
|---|---|---|
| **RED** | 39 | 39.0% |
| **BLACK** | 56 | 56.0% |
| **GREEN (Zero)** | 5 | 5.0% |

### Key observations
- Zero consistently hits at ~5.0% across both sessions (vs theoretical 2.70% — nearly double)
- Red/Black proportions completely flipped between sessions (51→39, 44→56)
- Bayesian analysis with Dirichlet prior smooths these observations against theoretical expectation
- 95% credible intervals from Beta posterior show the uncertainty in each number's true probability

## Deployment

This is a **pure static HTML/JS** application. No build tools, no server needed.

To deploy on GitHub Pages:
1. Push to a GitHub repo
2. Go to Settings → Pages → Source: Deploy from main branch, / (root)
3. Done — your dashboard is live

## License
MIT
