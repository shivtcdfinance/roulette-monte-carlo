/**
 * Roulette Dashboard Analyzer — Streaks, Sectors, Time Series, Backtester, Export
 * Integrates into the main index.html dashboard
 */
 
const ANALYZER = (() => {
  'use strict';
  
  // === WHEEL ORDER (European, clockwise from 0) ===
  const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  const SECTOR_OF = {};
  WHEEL_ORDER.forEach((n, i) => { SECTOR_OF[n] = Math.floor(i / (37/3)); });
  const SECTOR_NAMES = ['Sector 1 (0-12 wheel)', 'Sector 2 (13-25 wheel)', 'Sector 3 (26-36 wheel)'];
  
  // Neighbour map (5 each side + the number itself = 11)
  const NEIGHBOURS = {};
  WHEEL_ORDER.forEach((n, i) => {
    const idx = WHEEL_ORDER.indexOf(n);
    const nbs = [];
    for (let o = -5; o <= 5; o++) {
      nbs.push(WHEEL_ORDER[(idx + o + 37) % 37]);
    }
    NEIGHBOURS[n] = nbs;
  });
  
  // === STREAK ANALYSIS ===
  function analyzeStreaks(spins) {
    if (!spins || spins.length < 3) return null;
    const total = spins.length;
    const last20 = spins.slice(-20);
    const last50 = spins.slice(-50);
    
    // Count hits in windows
    const hits20 = {}; last20.forEach(n => { hits20[n] = (hits20[n]||0)+1; });
    const hits50 = {}; last50.forEach(n => { hits50[n] = (hits50[n]||0)+1; });
    const hitsAll = {}; spins.forEach(n => { hitsAll[n] = (hitsAll[n]||0)+1; });
    
    // Hot: hit 3+ times in last 20
    const hot = Object.entries(hits20).filter(([_,c]) => c >= 3).map(([n]) => parseInt(n)).sort();
    
    // Cold: no hit in last 50 but has hit overall
    const cold = Object.entries(hits50).filter(([_,c]) => c === 0).map(([n]) => parseInt(n));
    
    // Streaks: current run of same colour
    let colorRun = 1;
    const lastColor = getColor(spins[total-1]);
    for (let i = total-2; i >= 0; i--) {
      if (getColor(spins[i]) === lastColor) colorRun++;
      else break;
    }
    
    // Gap analysis: longest gap since each number last appeared
    const lastSeen = {};
    for (let i = 0; i < total; i++) { lastSeen[spins[i]] = i; }
    const gaps = Object.entries(lastSeen).map(([n, pos]) => ({ num: parseInt(n), gap: total - 1 - pos }));
    const longestGap = gaps.sort((a,b) => b.gap - a.gap)[0];
    
    // Repeat frequency: how often does a number repeat within 3 spins?
    let repeats = 0;
    for (let i = 0; i < total - 3; i++) {
      if (spins.slice(i+1, i+4).includes(spins[i])) repeats++;
    }
    
    return {
      hot, cold, colorRun, colorRunType: lastColor,
      longestGapNum: longestGap?.num, longestGapLen: longestGap?.gap,
      repeatFreq: (repeats / (total-3) * 100).toFixed(1),
      hits20, hitsAll
    };
  }
  
  function getColor(n) {
    if (n === 0) return 'G';
    const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    return reds.includes(n) ? 'R' : 'B';
  }
  
  // === SECTOR ANALYSIS ===
  function analyzeSectors(spins) {
    if (!spins || spins.length === 0) return null;
    const sectorHits = [0,0,0];
    const sectorCounts = [{}, {}, {}];
    
    spins.forEach(n => {
      const s = SECTOR_OF[n];
      sectorHits[s]++;
      sectorCounts[s][n] = (sectorCounts[s][n]||0) + 1;
    });
    
    const total = spins.length;
    const theoretical = [12/37, 12/37, 13/37]; // 12, 12, 13 numbers
    
    return {
      hits: sectorHits,
      pcts: sectorHits.map(h => (h/total*100).toFixed(1)),
      theoretical_pcts: theoretical.map(t => (t*100).toFixed(1)),
      deviation: sectorHits.map((h,i) => (h/total - theoretical[i]) * 100),
      names: SECTOR_NAMES,
      top_per_sector: sectorCounts.map(sc => 
        Object.entries(sc).sort((a,b) => b[1]-a[1]).slice(0,3))
    };
  }
  
  // === NEIGHBOUR ANALYSIS ===
  function analyzeNeighbours(spins, targetNum) {
    if (!spins || spins.length === 0) return null;
    const nbs = NEIGHBOURS[targetNum];
    if (!nbs) return null;
    
    const total = spins.length;
    const hits = {};
    nbs.forEach(n => { hits[n] = 0; });
    spins.forEach(n => { if (hits[n] !== undefined) hits[n]++; });
    
    const neighbourTotal = Object.values(hits).reduce((a,b) => a+b, 0);
    const neighbourPct = (neighbourTotal / total * 100).toFixed(1);
    const theoretical = (11 / 37 * 100).toFixed(1);
    
    return {
      targetNum,
      neighbours: nbs,
      hits,
      neighbourTotal,
      neighbourPct,
      theoretical,
      deviation: (neighbourPct - theoretical).toFixed(1),
      top: Object.entries(hits).sort((a,b) => b[1]-a[1]).slice(0,3)
    };
  }
  
  // === TIME SERIES (rolling window) ===
  function rollingStats(spins, windowSize) {
    const w = windowSize || 20;
    const data = [];
    for (let i = w; i <= spins.length; i++) {
      const slice = spins.slice(i-w, i);
      let r = 0, b = 0, g = 0;
      slice.forEach(n => {
        if (n === 0) g++;
        else if (getColor(n) === 'R') r++;
        else b++;
      });
      data.push({
        spin: i,
        red: (r/w*100).toFixed(1),
        black: (b/w*100).toFixed(1),
        green: (g/w*100).toFixed(1)
      });
    }
    return data;
  }
  
  // === WHAT-IF BACKTESTER ===
  function backtest(spins, betType, betNumber, betAmount) {
    if (!spins || spins.length === 0) return null;
    const amount = betAmount || 5;
    
    const payouts = {
      'straight': 36, 'split': 18, 'street': 12, 'corner': 9,
      'sixline': 6, 'dozen': 3, 'column': 3, 'red': 2, 'black': 2,
      'even': 2, 'odd': 2, 'low': 2, 'high': 2
    };
    const payout = payouts[betType] || 2;
    
    let bankroll = 0, wins = 0, losses = 0;
    let maxDrawdown = 0, peak = 0;
    const equity = [0];
    
    const winZones = getWinZones(betType, betNumber);
    
    spins.forEach(n => {
      const win = winZones.includes(n);
      if (win) {
        bankroll += amount * (payout - 1);
        wins++;
      } else {
        bankroll -= amount;
        losses++;
      }
      equity.push(bankroll);
      peak = Math.max(peak, bankroll);
      maxDrawdown = Math.max(maxDrawdown, peak - bankroll);
    });
    
    return {
      betType, betNumber, betAmount: amount,
      totalBets: spins.length,
      wins, losses,
      winRate: (wins/spins.length*100).toFixed(1),
      netResult: bankroll,
      maxDrawdown,
      roi: (bankroll / (amount * spins.length) * 100).toFixed(1),
      equity
    };
  }
  
  function getWinZones(type, num) {
    const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    switch(type) {
      case 'straight': return [num];
      case 'red': return reds;
      case 'black': return [...Array(37).keys()].filter(n => n !== 0 && !reds.includes(n));
      case 'even': return [...Array(37).keys()].filter(n => n !== 0 && n % 2 === 0);
      case 'odd': return [...Array(37).keys()].filter(n => n % 2 === 1);
      case 'low': return [...Array(19).keys()].filter(n => n !== 0);
      case 'high': return [...Array(19).keys()].map(n => n + 18).filter(n => n <= 36);
      case 'dozen': {
        const starts = {1:1, 2:13, 3:25};
        const s = num || 1;
        return [...Array(12).keys()].map(n => n + starts[s]);
      }
      case 'column': return [num, num+3, num+6, num+9, num+12, num+15, num+18, num+21, num+24, num+27, num+30, num+33].filter(n => n <= 36 && n !== 0);
      default: return [];
    }
  }
  
  // === EXPORT ===
  function exportCSV(spins, timestamps) {
    let csv = 'Spin,Number,Colour' + (timestamps ? ',Time' : '') + '\n';
    spins.forEach((n, i) => {
      const c = n === 0 ? 'G' : getColor(n) === 'R' ? '🔴' : '⚫';
      csv += `${i+1},${n},${c}` + (timestamps && timestamps[i] ? `,${timestamps[i]}` : '') + '\n';
    });
    return csv;
  }
  
  function exportStatsJson(spins) {
    const counts = {};
    spins.forEach(n => { counts[n] = (counts[n]||0) + 1; });
    const total = spins.length;
    
    return JSON.stringify({
      total_spins: total,
      counts,
      streaks: analyzeStreaks(spins),
      sectors: analyzeSectors(spins),
      timestamp: new Date().toISOString()
    }, null, 2);
  }
  
  // === SMART RECOMMENDATION ===
  function recommend(spins, bankroll, plannedSpins) {
    if (!spins || spins.length < 10) {
      return { error: 'Need at least 10 spins for a recommendation' };
    }
    
    const total = spins.length;
    const counts = {};
    spins.forEach(n => { counts[n] = (counts[n]||0) + 1; });
    
    // Find best straight bet
    let bestEV = -999, bestNum = -1;
    for (let n = 0; n <= 36; n++) {
      const c = counts[n] || 0;
      const bp = (1 + c) / (37 + total);
      const ev = bp * 36 - (1 - bp);
      if (ev > bestEV) { bestEV = ev; bestNum = n; }
    }
    
    // Find best colour bet
    const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    let r = 0, b = 0, g = 0;
    spins.forEach(n => {
      if (n === 0) g++;
      else if (reds.includes(n)) r++;
      else b++;
    });
    const rEV = (r/(r+b) * 2 - 1) * (1 - g/total);
    const bEV = (b/(r+b) * 2 - 1) * (1 - g/total);
    
    // Kelly sizing
    const kelly = (p, odds) => Math.max(0, (p * (odds+1) - 1) / odds * 0.25);
    
    const recommendations = [];
    
    if (bestEV > 0 && bestNum >= 0) {
      const p = (1 + (counts[bestNum]||0)) / (37 + total);
      const k = kelly(p, 35);
      recommendations.push({
        type: 'straight',
        number: bestNum,
        amount: Math.round(bankroll * k * 100) / 100,
        ev: bestEV,
        winPct: (p*100).toFixed(1),
        expectedPerSpin: (bankroll * k * bestEV).toFixed(2)
      });
    }
    
    // Colour bet
    ['Red','Black'].forEach((name, i) => {
      const ev = i === 0 ? rEV : bEV;
      if (ev > 0) {
        const p = i === 0 ? r/(r+b) : b/(r+b);
        const adjustedP = p * (1 - g/total);
        const k = kelly(adjustedP, 1);
        recommendations.push({
          type: name.toLowerCase(),
          number: null,
          amount: Math.round(bankroll * k * 100) / 100,
          ev: ev,
          winPct: (adjustedP*100).toFixed(1),
          expectedPerSpin: (bankroll * k * ev).toFixed(2)
        });
      }
    });
    
    recommendations.sort((a,b) => b.ev - a.ev);
    
    return {
      bestSingle: recommendations[0] || null,
      all: recommendations,
      streaks: analyzeStreaks(spins),
      note: recommendations.length === 0 ? 'No positive-EV bets found with current data' : null
    };
  }
  
  // === PUBLIC API ===
  return {
    analyzeStreaks,
    analyzeSectors,
    analyzeNeighbours,
    rollingStats,
    backtest,
    exportCSV,
    exportStatsJson,
    recommend,
    getColor,
    WHEEL_ORDER,
    SECTOR_OF,
    SECTOR_NAMES,
    NEIGHBOURS
  };
})();
