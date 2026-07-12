/**
 * Multi-Bet Roulette Portfolio Engine
 * European 37-slot wheel (0-36)
 * GROSS payout convention: straight=36, split=18, street=12, corner=9, sixline=6, dozen=3, column=3, even-money=2
 * Net profit for outcome j: P_j = Σ amount_m * (grossPayout_m * I(j ∈ win_m) - 1)
 */

// ===================== NUMBER SETS =====================
const ROU = {
  REDS: new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]),
  BLACKS: new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]),
  
  COLUMNS: {
    1: [1,4,7,10,13,16,19,22,25,28,31,34],
    2: [2,5,8,11,14,17,20,23,26,29,32,35],
    3: [3,6,9,12,15,18,21,24,27,30,33,36]
  },
  
  DOZENS: {
    1: [1,2,3,4,5,6,7,8,9,10,11,12],
    2: [13,14,15,16,17,18,19,20,21,22,23,24],
    3: [25,26,27,28,29,30,31,32,33,34,35,36]
  },
  
  EVEN_MONEY: {
    red: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
    black: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35],
    even: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36],
    odd: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35],
    low: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
    high: [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]
  },
  
  ALL: Array.from({length: 37}, (_, i) => i),
  
  isRed(n) { return this.REDS.has(n); },
  isBlack(n) { return this.BLACKS.has(n); },
  getNumbers(betType, subType) {
    if (betType === 'straight') return [subType];
    if (betType === 'split') return subType; // array of 2 numbers
    if (betType === 'street') {
      const start = subType;
      const excluded = [0];
      const street = [];
      for (let i = start; i <= start + 2; i++) {
        if (i >= 1 && i <= 36 && !excluded.includes(i)) street.push(i);
      }
      return street.length === 3 ? street : [start, start+1, start+2].filter(n => n >= 1 && n <= 36);
    }
    if (betType === 'corner') {
      const n = subType;
      const row = Math.floor((n - 1) / 3);
      const col = (n - 1) % 3;
      return [
        row * 3 + 1 + col,
        row * 3 + 1 + col + 1,
        (row + 1) * 3 + 1 + col,
        (row + 1) * 3 + 1 + col + 1
      ].filter(x => x >= 1 && x <= 36);
    }
    if (betType === 'sixline') {
      const start = subType;
      const nums = [];
      for (let i = start; i <= start + 5; i++) {
        if (i >= 1 && i <= 36) nums.push(i);
      }
      return nums;
    }
    if (betType === 'dozen') return this.DOZENS[subType] || [];
    if (betType === 'column') return this.COLUMNS[subType] || [];
    if (['red','black','even','odd','low','high'].includes(betType)) return this.EVEN_MONEY[betType] || [];
    return [];
  },
  
  getPayout(betType) {
    const p = { straight: 36, split: 18, street: 12, corner: 9, sixline: 6, dozen: 3, column: 3 };
    return p[betType] || 2;
  },
  
  getLabel(betType, subType) {
    if (betType === 'straight') return `#${subType}`;
    if (betType === 'split') return `${subType[0]}-${subType[1]}`;
    if (betType === 'street') return `Str ${subType}-${subType+2}`;
    if (betType === 'corner') return `Cor ${subType}`;
    if (betType === 'sixline') return `6L ${subType}-${subType+5}`;
    if (betType === 'dozen') return `Dzn ${subType}`;
    if (betType === 'column') return `Col ${subType}`;
    return betType.charAt(0).toUpperCase() + betType.slice(1);
  }
};

// ===================== BET CLASS =====================
class Bet {
  constructor(type, numbers, amount, grossPayout) {
    this.type = type;
    this.numbers = numbers; // array of winning numbers
    this.amount = amount;
    this.grossPayout = grossPayout;
    this._set = new Set(numbers);
  }
  
  isWin(outcome) { return this._set.has(outcome); }
  
  netProfit(outcome) {
    return this.amount * (this.grossPayout * (this.isWin(outcome) ? 1 : 0) - 1);
  }
}

// ===================== PORTFOLIO CLASS =====================
class Portfolio {
  constructor(bets = []) { this.bets = bets; }
  
  addBet(bet) { this.bets.push(bet); }
  removeBet(i) { this.bets.splice(i, 1); }
  clear() { this.bets = []; }
  
  payoffFor(outcome) {
    let total = 0;
    for (const bet of this.bets) total += bet.netProfit(outcome);
    return total;
  }
  
  payoffVector() {
    const v = new Float64Array(37);
    for (let j = 0; j < 37; j++) v[j] = this.payoffFor(j);
    return v;
  }
  
  /** Total cost per spin (sum of all bet amounts) */
  totalCost() {
    return this.bets.reduce((s, b) => s + b.amount, 0);
  }
  
  // ---- Distribution Metrics ----
  
  expectedValue(probs) {
    const pv = this.payoffVector();
    let ev = 0;
    for (let j = 0; j < 37; j++) ev += probs[j] * pv[j];
    return ev;
  }
  
  variance(probs) {
    const ev = this.expectedValue(probs);
    const pv = this.payoffVector();
    let v = 0;
    for (let j = 0; j < 37; j++) v += probs[j] * Math.pow(pv[j] - ev, 2);
    return v;
  }
  
  stdDev(probs) { return Math.sqrt(this.variance(probs)); }
  
  skewness(probs) {
    const ev = this.expectedValue(probs);
    const sd = this.stdDev(probs);
    if (sd === 0) return 0;
    const pv = this.payoffVector();
    let m3 = 0;
    for (let j = 0; j < 37; j++) m3 += probs[j] * Math.pow(pv[j] - ev, 3);
    return m3 / Math.pow(sd, 3);
  }
  
  kurtosis(probs) {
    const ev = this.expectedValue(probs);
    const sd = this.stdDev(probs);
    if (sd === 0) return 0;
    const pv = this.payoffVector();
    let m4 = 0;
    for (let j = 0; j < 37; j++) m4 += probs[j] * Math.pow(pv[j] - ev, 4);
    return m4 / Math.pow(sd, 4) - 3; // excess kurtosis
  }
  
  sharpe(probs) {
    const sd = this.stdDev(probs);
    return sd > 0 ? this.expectedValue(probs) / sd : 0;
  }
  
  sortino(probs) {
    const ev = this.expectedValue(probs);
    const pv = this.payoffVector();
    let downVar = 0;
    for (let j = 0; j < 37; j++) {
      const dev = pv[j] - ev;
      if (dev < 0) downVar += probs[j] * dev * dev;
    }
    const downStd = Math.sqrt(downVar);
    return downStd > 0 ? ev / downStd : ev > 0 ? Infinity : 0;
  }
  
  maxLoss() {
    const pv = this.payoffVector();
    let min = Infinity;
    for (let j = 0; j < 37; j++) if (pv[j] < min) min = pv[j];
    return min;
  }
  
  maxGain() {
    const pv = this.payoffVector();
    let max = -Infinity;
    for (let j = 0; j < 37; j++) if (pv[j] > max) max = pv[j];
    return max;
  }
  
  winProb(probs) {
    const pv = this.payoffVector();
    let wp = 0;
    for (let j = 0; j < 37; j++) if (pv[j] > 0) wp += probs[j];
    return wp;
  }
  
  breakEvenProb(probs) {
    const pv = this.payoffVector();
    let bp = 0;
    for (let j = 0; j < 37; j++) if (pv[j] >= 0) bp += probs[j];
    return bp;
  }
  
  cvaR(probs, conf = 0.95) {
    const pv = this.payoffVector();
    // Sort outcomes by payoff ascending
    const outcomes = Array.from({length: 37}, (_, j) => ({ payoff: pv[j], prob: probs[j] }));
    outcomes.sort((a, b) => a.payoff - b.payoff);
    
    let cumProb = 0;
    let tailSum = 0;
    const tailThreshold = 1 - conf;
    
    for (const o of outcomes) {
      const nextCum = cumProb + o.prob;
      if (nextCum <= tailThreshold) {
        tailSum += o.prob * o.payoff;
      } else {
        const partial = tailThreshold - cumProb;
        if (partial > 0) tailSum += partial * o.payoff;
        break;
      }
      cumProb = nextCum;
    }
    return tailSum / (1 - conf);
  }
  
  omegaRatio(probs, threshold = 0) {
    const pv = this.payoffVector();
    let gainSum = 0, lossSum = 0;
    for (let j = 0; j < 37; j++) {
      const diff = pv[j] - threshold;
      if (diff > 0) gainSum += probs[j] * diff;
      else lossSum += probs[j] * (-diff);
    }
    return lossSum > 0 ? gainSum / lossSum : Infinity;
  }
  
  allMetrics(probs) {
    const ev = this.expectedValue(probs);
    const sd = this.stdDev(probs);
    return {
      ev,
      variance: this.variance(probs),
      stdDev: sd,
      skewness: this.skewness(probs),
      kurtosis: this.kurtosis(probs),
      sharpe: this.sharpe(probs),
      sortino: this.sortino(probs),
      totalCost: this.totalCost(),
      maxLoss: this.maxLoss(),
      maxGain: this.maxGain(),
      winProb: this.winProb(probs),
      breakEvenProb: this.breakEvenProb(probs),
      cvaR95: this.cvaR(probs, 0.95),
      omegaRatio: this.omegaRatio(probs, 0),
      // Payoff distribution for visualization
      payoffVector: this.payoffVector(),
    };
  }
}

// ===================== SIMULATOR =====================
class PortfolioSimulator {
  constructor() { this._seed = Date.now(); }
  
  _sample(probs) {
    let r = Math.random();
    for (let j = 0; j < 37; j++) {
      r -= probs[j];
      if (r <= 0) return j;
    }
    return 36;
  }
  
  /**
   * Run full Monte Carlo simulation for a portfolio over multiple spins
   * @param {Portfolio} portfolio - The bet portfolio
   * @param {number} bankroll - Starting bankroll
   * @param {number} spins - Number of spins to simulate (e.g., 50, 100)
   * @param {number} trials - Number of Monte Carlo trials (e.g., 10000)
   * @param {Float64Array|number[]} probs - 37-element probability array
   * @param {function} onProgress - Optional progress callback
   */
  simulate(portfolio, bankroll, spins, trials, probs, onProgress) {
    const results = [];
    const progressInterval = Math.max(1, Math.floor(trials / 20));
    
    for (let t = 0; t < trials; t++) {
      let br = bankroll;
      let peak = bankroll;
      let maxDD = 0;
      const path = [bankroll];
      
      for (let s = 0; s < spins; s++) {
        const outcome = this._sample(probs);
        const payoff = portfolio.payoffFor(outcome);
        br += payoff;
        if (br > peak) peak = br;
        const dd = peak - br;
        if (dd > maxDD) maxDD = dd;
        path.push(br);
      }
      
      results.push({ final: br, maxDrawdown: maxDD, path });
      
      if (onProgress && t % progressInterval === 0 && t > 0) {
        onProgress(t, trials);
      }
    }
    
    return this._analyze(results, bankroll, spins, trials);
  }
  
  _analyze(results, bankroll, spins, trials) {
    const finals = results.map(r => r.final);
    const drawdowns = results.map(r => r.maxDrawdown);
    const sorted = [...finals].sort((a, b) => a - b);
    
    const wins = finals.filter(f => f > bankroll).length;
    const avg = finals.reduce((a, b) => a + b, 0) / trials;
    const median = sorted[Math.floor(trials / 2)];
    const variance = finals.reduce((s, f) => s + Math.pow(f - avg, 2), 0) / trials;
    const stdDev = Math.sqrt(variance);
    const avgDD = drawdowns.reduce((a, b) => a + b, 0) / trials;
    const maxDD = Math.max(...drawdowns);
    
    // Percentiles
    const idx = (p) => sorted[Math.floor(trials * p / 100)];
    const p5 = idx(5), p10 = idx(10), p25 = idx(25);
    const p75 = idx(75), p90 = idx(90), p95 = idx(95);
    
    // Sharpe-like
    const sharpe = stdDev > 0 ? (avg - bankroll) / stdDev : 0;
    // Sortino-like
    let downVar = 0;
    for (const f of finals) {
      const dev = f - avg;
      if (dev < 0) downVar += dev * dev;
    }
    downVar /= trials;
    const sortino = downVar > 0 ? (avg - bankroll) / Math.sqrt(downVar) : 0;
    
    // CVaR
    let tailSum = 0, tailCount = 0;
    for (let i = 0; i < Math.floor(trials * 0.05); i++) {
      tailSum += sorted[i];
      tailCount++;
    }
    const cvaR = tailCount > 0 ? tailSum / tailCount : sorted[0];
    
    // Ruin probability (lose more than 90%)
    const ruin = finals.filter(f => f < bankroll * 0.1).length / trials;
    // Double-up probability
    const doubleUp = finals.filter(f => f >= bankroll * 2).length / trials;
    
    return {
      winProb: wins / trials,
      expectedReturn: avg,
      medianReturn: median,
      expectedProfit: avg - bankroll,
      stdDev,
      sharpe,
      sortino,
      p5, p10, p25, p75, p90, p95,
      avgDrawdown: avgDD,
      maxDrawdown: maxDD,
      cvaR95: cvaR,
      ruinProb: ruin,
      doubleUpProb: doubleUp,
      finals,
      sorted
    };
  }
}

// ===================== OPTIMIZER =====================
class PortfolioOptimizer {
  /**
   * Search for optimal bet mix by trying common hedge patterns
   */
  static suggestOptimalMix(probs, bankroll, iterations) {
    const candidates = [];
    const baseBet = Math.min(5, bankroll * 0.05);
    
    // Common hedge patterns to test
    const patterns = [
      // Even-money single
      { bets: [{ type: 'red', amount: baseBet }], label: 'Red only' },
      { bets: [{ type: 'black', amount: baseBet }], label: 'Black only' },
      // Straight single
      { bets: [{ type: 'straight', num: 17, amount: baseBet }], label: '#17 only' },
      { bets: [{ type: 'straight', num: 0, amount: baseBet }], label: '0 only' },
      // Hedge: straight + opposite colour
      { bets: [
        { type: 'straight', num: 17, amount: baseBet },
        { type: 'black', amount: baseBet * 2 }
      ], label: '#17 + Black' },
      // Hedge: straight + same colour
      { bets: [
        { type: 'straight', num: 7, amount: baseBet },
        { type: 'red', amount: baseBet * 2 }
      ], label: '#7 + Red' },
      // Two straights
      { bets: [
        { type: 'straight', num: 0, amount: baseBet },
        { type: 'straight', num: 17, amount: baseBet }
      ], label: '0 + 17' },
      // Dozen + straight
      { bets: [
        { type: 'dozen', sub: 1, amount: baseBet },
        { type: 'straight', num: 0, amount: baseBet }
      ], label: 'Dzn1 + 0' },
      // Even + Odd (covers all non-zero)
      { bets: [
        { type: 'even', amount: baseBet },
        { type: 'odd', amount: baseBet }
      ], label: 'Even + Odd' },
      // Column + straight
      { bets: [
        { type: 'column', sub: 1, amount: baseBet },
        { type: 'straight', num: 0, amount: baseBet }
      ], label: 'Col1 + 0' },
      // Low + high (covers all non-zero)
      { bets: [
        { type: 'low', amount: baseBet },
        { type: 'high', amount: baseBet }
      ], label: 'Low + High' },
      // Asymmetric: 2 straights + colour hedge
      { bets: [
        { type: 'straight', num: 0, amount: baseBet },
        { type: 'straight', num: 17, amount: baseBet },
        { type: 'red', amount: baseBet * 3 }
      ], label: '0+17+Red' },
    ];
    
    for (const pattern of patterns) {
      const portfolio = new Portfolio();
      let cost = 0;
      
      for (const b of pattern.bets) {
        const nums = b.sub !== undefined 
          ? ROU.getNumbers(b.type, b.sub)
          : b.type === 'straight'
            ? [b.num]
            : ROU.getNumbers(b.type);
        const payout = ROU.getPayout(b.type);
        portfolio.addBet(new Bet(b.type, nums, b.amount, payout));
        cost += b.amount;
      }
      
      const metrics = portfolio.allMetrics(probs);
      
      // Finite horizon simulation
      const sim = new PortfolioSimulator();
      const simResults = sim.simulate(portfolio, bankroll, iterations, 10000, probs);
      
      candidates.push({
        label: pattern.label,
        portfolio,
        cost,
        metrics,
        simResults
      });
    }
    
    // Rank by win probability over the finite horizon
    candidates.sort((a, b) => b.simResults.winProb - a.simResults.winProb);
    
    return candidates;
  }
}
