/**
 * Full-Scale Probability Analysis Engine
 * Architecture: Data Layer → Analysis Engine → Visualization → UI
 * Designed for static GitHub Pages deployment
 * 
 * Modules:
 *  1. Markov Transition Matrix (37×37, entropy, hot pairs)
 *  2. Autocorrelation + Runs Test (lag 1-20, Wald-Wolfowitz)
 *  3. Frequency Domain Analysis (DFT for periodic patterns)
 *  4. Bayesian Changepoint Detection (pre/post distribution shift)
 *  5. Exhaustive Backtest Panel (all bets, all history)
 *  6. Statistical Arbitrage Detector (when p<0.05 edge exists)
 *  7. Theoretical Comparison (KS test, chi-squared, JS divergence)
 *  8. ML Prediction (logistic regression with recent-history features)
 */

const PROB_ENGINE = (() => {
  'use strict';
  
  // ============ CONSTANTS ============
  const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const BLACK_NUMS = new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]);
  const THEORETICAL_P = 1/37; // 2.7027%
  const HOUSE_EDGE = 0.027;
  
  function isRed(n) { return RED_NUMS.has(n); }
  function isBlack(n) { return BLACK_NUMS.has(n); }
  function color(n) { return n === 0 ? 'G' : (isRed(n) ? 'R' : 'B'); }
  
  // ============ DATA LAYER ============
  let spins = [];
  let N = 0;
  
  function load(data) {
    spins = [...data]; // immutable copy
    N = spins.length;
  }
  
  function getCounts() {
    const c = {};
    spins.forEach(n => { c[n] = (c[n]||0) + 1; });
    return c;
  }
  
  // ============ MODULE 1: MARKOV TRANSITION MATRIX ============
  function markovTransition() {
    if (N < 2) return null;
    // Initialize 37×37 matrix
    const T = Array.from({length:37}, () => new Array(37).fill(0));
    const totals = new Array(37).fill(0);
    
    for (let i = 0; i < N-1; i++) {
      const from = spins[i], to = spins[i+1];
      T[from][to]++;
      totals[from]++;
    }
    
    // Convert to probabilities: P(next|prev)
    const P = T.map((row, i) => 
      row.map(v => totals[i] > 0 ? v / totals[i] : 0)
    );
    
    // Find hot transitions (observed > expected)
    const expected = 1/37;
    const hotPairs = [];
    for (let from = 0; from < 37; from++) {
      if (totals[from] < 5) continue; // too few observations
      for (let to = 0; to < 37; to++) {
        const obs = P[from][to];
        if (obs > expected * 1.5) {
          hotPairs.push({ from, to, prob: obs, deviation: obs - expected });
        }
      }
    }
    hotPairs.sort((a,b) => b.deviation - a.deviation);
    
    // Transition entropy per starting number
    const entropy = totals.map((t, i) => {
      if (t < 5) return null;
      let h = 0;
      for (let j = 0; j < 37; j++) {
        if (P[i][j] > 0) h -= P[i][j] * Math.log2(P[i][j]);
      }
      return (h / Math.log2(37)).toFixed(2); // normalized to 0-1
    });
    
    // Overall transition entropy
    let totalTransitions = N - 1;
    let globalP = new Array(37).fill(0);
    for (let i = 0; i < N-1; i++) globalP[spins[i+1]]++;
    globalP = globalP.map(v => v / totalTransitions);
    let globalEntropy = 0;
    for (let j = 0; j < 37; j++) {
      if (globalP[j] > 0) globalEntropy -= globalP[j] * Math.log2(globalP[j]);
    }
    
    return {
      matrix: P,
      totals,
      hotPairs: hotPairs.slice(0, 10),
      entropy,
      globalEntropy: (globalEntropy / Math.log2(37)).toFixed(3),
      maxEntropy: Math.log2(37).toFixed(2)
    };
  }
  
  // ============ MODULE 2: AUTOCORRELATION + RUNS TEST ============
  function autocorrelation(maxLag = 20) {
    if (N < 20) return null;
    
    // Map to numeric for autocorrelation
    const values = spins.map(n => n);
    const mean = values.reduce((a,b) => a+b, 0) / N;
    
    // Variance
    const variance = values.reduce((s, v) => s + (v-mean)*(v-mean), 0) / N;
    if (variance === 0) return null;
    
    const acf = [];
    for (let lag = 1; lag <= maxLag; lag++) {
      let cov = 0;
      for (let i = 0; i < N - lag; i++) {
        cov += (values[i] - mean) * (values[i+lag] - mean);
      }
      cov /= (N - lag);
      acf.push(cov / variance);
    }
    
    // Significance bands (Bartlett's formula: ±1.96/√N)
    const band = 1.96 / Math.sqrt(N);
    
    // Find significant lags
    const significant = [];
    acf.forEach((v, i) => {
      if (Math.abs(v) > band) significant.push({ lag: i+1, value: v });
    });
    
    // Wald-Wolfowitz Runs Test
    const medianVal = [...values].sort((a,b)=>a-b)[Math.floor(N/2)];
    let runs = 1;
    let above = values[0] > medianVal;
    for (let i = 1; i < N; i++) {
      const currAbove = values[i] > medianVal;
      if (currAbove !== above) { runs++; above = currAbove; }
    }
    
    const n1 = values.filter(v => v > medianVal).length;
    const n2 = N - n1;
    const expectedRuns = 2*n1*n2/N + 1;
    const stdRuns = Math.sqrt(2*n1*n2*(2*n1*n2-N) / (N*N*(N-1)));
    const zRuns = (runs - expectedRuns) / stdRuns;
    
    return {
      acf,
      band,
      significant,
      runsTest: {
        runs, expectedRuns, stdRuns, zRuns,
        random: Math.abs(zRuns) < 1.96,
        pValue: (1 - Math.erf(Math.abs(zRuns)/Math.sqrt(2))).toFixed(4)
      }
    };
  }
  
  // ============ MODULE 3: FREQUENCY DOMAIN (DFT) ============
  function frequencyAnalysis() {
    if (N < 32) return null;
    
    // Use pure DFT (not FFT since we want all frequencies)
    const numFreqs = Math.min(N, 74);
    const powers = [];
    
    // For each possible period P
    for (let P = 2; P <= numFreqs; P++) {
      const freq = 1 / P;
      let real = 0, imag = 0;
      for (let t = 0; t < N; t++) {
        const angle = 2 * Math.PI * freq * t;
        real += spins[t] * Math.cos(angle);
        imag -= spins[t] * Math.sin(angle);
      }
      const power = (real*real + imag*imag) / N;
      powers.push({ period: P, power });
    }
    
    // Find top periods by power
    powers.sort((a,b) => b.power - a.power);
    
    // Normalize for display
    const maxPower = powers[0]?.power || 1;
    powers.forEach(p => p.normalized = p.power / maxPower);
    
    // Test significance: constant power baseline
    const meanPower = powers.reduce((s,p) => s + p.power, 0) / powers.length;
    const threshold = meanPower * 2; // 2x mean = significant
    
    const sigPeriods = powers.filter(p => p.power > threshold);
    
    return {
      powers: powers.slice(0, 20), // top 20
      meanPower,
      threshold,
      sigPeriods,
      note: sigPeriods.length === 0 ? 'No significant periodic patterns detected' : `${sigPeriods.length} significant periods found`
    };
  }
  
  // ============ MODULE 4: BAYESIAN CHANGEPOINT DETECTION ============
  function changepointDetection() {
    if (N < 40) return { error: 'Need at least 40 spins for changepoint detection' };
    
    // Scan all possible changepoints and compute log-likelihood
    const results = [];
    
    for (let cp = 20; cp < N - 20; cp++) {
      const pre = spins.slice(0, cp);
      const post = spins.slice(cp);
      const preCounts = {}; pre.forEach(n => { preCounts[n] = (preCounts[n]||0) + 1; });
      const postCounts = {}; post.forEach(n => { postCounts[n] = (postCounts[n]||0) + 1; });
      
      // Compute chi-squared between pre and post distributions
      let chi2 = 0;
      for (let n = 0; n <= 36; n++) {
        const preProp = (preCounts[n] || 0) / cp + 0.002; // smoothing
        const postProp = (postCounts[n] || 0) / post.length + 0.002;
        const diff = preProp - postProp;
        chi2 += diff * diff / preProp;
      }
      
      // Also track colour distribution changes
      const preRed = pre.filter(n => isRed(n)).length / cp;
      const postRed = post.filter(n => isRed(n)).length / post.length;
      const preGreen = pre.filter(n => n===0).length / cp;
      const postGreen = post.filter(n => n===0).length / post.length;
      const colourShift = Math.abs(preRed - postRed) + Math.abs(preGreen - postGreen);
      
      results.push({
        position: cp,
        chi2,
        colourShift,
        preRed: (preRed*100).toFixed(1),
        postRed: (postRed*100).toFixed(1),
        preGreen: (preGreen*100).toFixed(1),
        postGreen: (postGreen*100).toFixed(1),
        preSize: cp,
        postSize: N - cp
      });
    }
    
    results.sort((a,b) => b.colourShift - a.colourShift);
    const best = results[0];
    
    return {
      bestChangepoint: best,
      top3: results.slice(0, 3),
      significance: best.colourShift > 0.10 ? 'Significant colour distribution shift' : 'No clear changepoint detected'
    };
  }
  
  // ============ MODULE 5: EXHAUSTIVE BACKTEST ============
  function exhaustiveBacktest() {
    if (N < 20) return null;
    
    const results = [];
    
    // Test every single number
    for (let n = 0; n <= 36; n++) {
      const bt = simpleBacktest(spins, 'straight', n, 1);
      results.push({ ...bt, label: `#${n}` });
    }
    
    // Test colours
    results.push({ ...simpleBacktest(spins, 'red', null, 1), label: 'RED' });
    results.push({ ...simpleBacktest(spins, 'black', null, 1), label: 'BLACK' });
    results.push({ ...simpleBacktest(spins, 'low', null, 1), label: 'LOW (1-18)' });
    results.push({ ...simpleBacktest(spins, 'high', null, 1), label: 'HIGH (19-36)' });
    results.push({ ...simpleBacktest(spins, 'even', null, 1), label: 'EVEN' });
    results.push({ ...simpleBacktest(spins, 'odd', null, 1), label: 'ODD' });
    
    // Dozens
    for (let d = 1; d <= 3; d++) {
      results.push({ ...simpleBacktest(spins, 'dozen', d, 1), label: `Dozen ${d}` });
    }
    
    // Sort by ROI descending
    results.sort((a,b) => b.roi - a.roi);
    
    return {
      all: results,
      best: results[0],
      worst: results[results.length-1],
      summary: `${results.filter(r => r.roi > 0).length} of ${results.length} bets profitable`
    };
  }
  
  function simpleBacktest(seq, type, num, amount) {
    const payouts = { straight: 36, red: 2, black: 2, even: 2, odd: 2, low: 2, high: 2, dozen: 3 };
    const payout = payouts[type] || 2;
    
    let br = 0, wins = 0;
    let peak = 0, dd = 0;
    
    const winZones = getWinZones(type, num);
    
    for (const n of seq) {
      const won = winZones.includes(n);
      if (won) { br += amount * (payout - 1); wins++; }
      else { br -= amount; }
      peak = Math.max(peak, br);
      dd = Math.max(dd, peak - br);
    }
    
    const totalBets = seq.length;
    return {
      netResult: br,
      wins,
      winsPct: (wins/totalBets*100).toFixed(1),
      roi: (br / (amount * totalBets) * 100).toFixed(1),
      maxDrawdown: dd,
      totalBets
    };
  }
  
  // ============ MODULE 6: STATISTICAL ARBITRAGE DETECTOR ============
  function statArbDetector() {
    if (N < 20) return null;
    
    const signals = [];
    
    // Straight bets on each number
    for (let n = 0; n <= 36; n++) {
      const count = spins.filter(s => s === n).length;
      const observedP = count / N;
      const se = Math.sqrt(observedP * (1-observedP) / N);
      const z = (observedP - THEORETICAL_P) / (se || 1e-6);
      const pValue = 2 * (1 - normalCDF(Math.abs(z)));
      const edge = observedP * 35 - (1 - observedP); // net expected on €1
      
      let signal = 'NOISE';
      if (pValue < 0.05 && edge > 0) signal = 'SUGGESTIVE';
      if (pValue < 0.01 && edge > HOUSE_EDGE) signal = 'ACTIONABLE';
      
      if (pValue < 0.05) {
        signals.push({
          type: 'straight', number: n, count, observedP,
          z: z.toFixed(2), pValue: pValue.toFixed(4),
          edge: edge.toFixed(3), signal
        });
      }
    }
    
    // Colour bets
    const redCount = spins.filter(n => isRed(n)).length;
    const redP = redCount / N;
    const redZ = (redP - 18/37) / Math.sqrt(18/37 * 19/37 / N);
    if (Math.abs(redZ) > 1.96) {
      signals.push({
        type: 'colour', number: null, label: 'RED',
        count: redCount, observedP: redP,
        z: redZ.toFixed(2), pValue: (2*(1-normalCDF(Math.abs(redZ)))).toFixed(4),
        edge: ((redP * 2 - 1) * (N - spins.filter(n=>n===0).length)/N).toFixed(3),
        signal: Math.abs(redZ) > 2.58 ? 'ACTIONABLE' : 'SUGGESTIVE'
      });
    }
    
    signals.sort((a,b) => (b.pValue === '0.0000' ? 0 : parseFloat(b.pValue || 0)) - (a.pValue || 0));
    
    return {
      signals: signals.slice(0, 15),
      actionable: signals.filter(s => s.signal === 'ACTIONABLE').length,
      suggestive: signals.filter(s => s.signal === 'SUGGESTIVE').length,
      note: 'Benjamini-Hochberg correction recommended for multiple comparisons'
    };
  }
  
  function normalCDF(x) {
    const a = 0.2316419;
    const b1 = 0.31938153, b2 = -0.356563782, b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429;
    const t = 1 / (1 + a * Math.abs(x));
    const pdf = Math.exp(-x*x/2) / Math.sqrt(2*Math.PI);
    const cdf = 1 - pdf * (b1*t + b2*t*t + b3*t*t*t + b4*t*t*t*t + b5*t*t*t*t*t);
    return x >= 0 ? cdf : 1 - cdf;
  }
  
  // ============ MODULE 7: THEORETICAL COMPARISON ============
  function theoreticalComparison() {
    if (N < 30) return null;
    
    const counts = getCounts();
    const allCounts = [];
    
    for (let n = 0; n <= 36; n++) {
      const c = counts[n] || 0;
      const obs = c / N;
      const expected = THEORETICAL_P;
      allCounts.push({
        number: n, color: color(n),
        count: c, observed: obs, expected,
        deviation_pp: ((obs - expected) * 100).toFixed(2),
        deviation_pct: ((obs/expected - 1) * 100).toFixed(1)
      });
    }
    
    // Chi-squared goodness-of-fit
    let chi2 = 0;
    allCounts.forEach(d => {
      chi2 += (d.count - N/37) * (d.count - N/37) / (N/37);
    });
    const df = 36;
    const chiPValue = 1 - chi2CDF(chi2, df);
    
    // Jensen-Shannon Divergence
    const M = allCounts.map((d,i) => (d.observed + THEORETICAL_P) / 2);
    const kl_PM = allCounts.reduce((s,d,i) => s + (d.observed || 1e-6) * Math.log2((d.observed || 1e-6) / (M[i] || 1e-6)), 0);
    const kl_QM = THEORETICAL_P * 37 * Math.log2(THEORETICAL_P / M[0]); // all theoretical equal
    const jsDiv = 0.5 * kl_PM + (THEORETICAL_P * 37) * Math.log2(THEORETICAL_P / M[0]) / 2;
    
    return {
      numbers: allCounts.sort((a,b) => b.deviation_pct - a.deviation_pct),
      chi2: chi2.toFixed(2),
      df,
      chiPValue: chiPValue.toFixed(4),
      isFair: chiPValue > 0.05 ? 'Data consistent with fair wheel' : 'Significant deviation from theoretical (p<0.05)',
      jsDivergence: jsDiv.toFixed(6),
      topOver: allCounts.filter(d => parseFloat(d.deviation_pct) > 50).slice(0, 5),
      topUnder: allCounts.filter(d => parseFloat(d.deviation_pct) < -50).slice(-5)
    };
  }
  
  function chi2CDF(x, k) {
    // Approximation for chi-squared CDF
    if (k <= 0 || x <= 0) return 0;
    const v = k / 2;
    let sum = 0, term = 1;
    for (let i = 0; i < 100; i++) {
      term *= (x/2) / (v + i);
      sum += term;
      if (term < 1e-10) break;
    }
    return Math.exp(-x/2 + v * Math.log(x/2) - logGamma(v)) * (1 + sum);
  }
  
  function logGamma(z) {
    let x = 0;
    for (let i = 1; i < 100; i++) x += Math.log(i);
    // Approximation for large z
    return (z - 0.5) * Math.log(z) - z + Math.log(Math.sqrt(2*Math.PI)) + 1/(12*z);
  }
  
  // ============ MODULE 8: ML PREDICTION ============
  function mlPredict(features = 5) {
    if (N < features + 10) return { error: `Need at least ${features+10} spins for ML` };
    
    // Simple logistic: use last N spins as features to predict next spin colour
    const X = [], y = [];
    
    for (let i = features; i < N - 1; i++) {
      const window = spins.slice(i - features, i);
      const next = spins[i + 1];
      
      // Features: proportion of each colour in window
      const redFrac = window.filter(n => isRed(n)).length / features;
      const blackFrac = window.filter(n => isBlack(n)).length / features;
      const zeroFrac = window.filter(n => n === 0).length / features;
      // Feature: last number mod 6
      const lastSector = window[features-1] % 6 / 6;
      
      X.push([1, redFrac, blackFrac, lastSector]); // bias + features
      y.push(isRed(next) ? 1 : 0); // predict RED
    }
    
    // Simple gradient descent logistic regression
    const m = X.length;
    const dim = X[0].length;
    let w = new Array(dim).fill(0);
    const lr = 0.01;
    const iterations = 1000;
    
    for (let iter = 0; iter < iterations; iter++) {
      const grad = new Array(dim).fill(0);
      for (let i = 0; i < m; i++) {
        const pred = sigmoid(dot(w, X[i]));
        const err = pred - y[i];
        for (let j = 0; j < dim; j++) {
          grad[j] += err * X[i][j];
        }
      }
      for (let j = 0; j < dim; j++) w[j] -= lr * grad[j] / m;
    }
    
    // Calculate accuracy on training set
    let correct = 0;
    for (let i = 0; i < m; i++) {
      const pred = sigmoid(dot(w, X[i]));
      if ((pred > 0.5) === (y[i] === 1)) correct++;
    }
    const accuracy = (correct / m * 100).toFixed(1);
    
    // Baseline: always predict RED
    const redBaseline = (y.filter(v => v === 1).length / m * 100).toFixed(1);
    
    // Current prediction
    const window = spins.slice(N - features, N);
    const features_now = [
      1,
      window.filter(n => isRed(n)).length / features,
      window.filter(n => isBlack(n)).length / features,
      window[features-1] % 6 / 6
    ];
    const currentPred = sigmoid(dot(w, features_now));
    
    return {
      accuracy,
      baseline: redBaseline,
      improvement: (parseFloat(accuracy) - parseFloat(redBaseline)).toFixed(1),
      weights: w,
      currentPrediction: (currentPred * 100).toFixed(1) + '% chance of RED next',
      verdict: currentPred > 0.55 ? 'RED favored' : currentPred < 0.45 ? 'BLACK favored' : 'near 50/50 — no edge',
      note: `Trained on ${m} examples with ${features}-spin lookback`
    };
  }
  
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function dot(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
  
  // ============ PUBLIC API ============
  return {
    load,
    getSpins: () => spins,
    getN: () => N,
    getCounts,
    markovTransition,
    autocorrelation,
    frequencyAnalysis,
    changepointDetection,
    exhaustiveBacktest,
    statArbDetector,
    theoreticalComparison,
    mlPredict,
    constants: { THEORETICAL_P, HOUSE_EDGE, RED_NUMS, color }
  };
})();
