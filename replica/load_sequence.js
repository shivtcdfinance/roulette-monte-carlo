// Load the COMPLETE 103-spin sequence into the replica
// Order: LIFO - position 1 = newest (13), position 103 = oldest (20)

const CORRECT_SEQUENCE = [
  13,26,30,22,7,23,21,20,2,7,
  0,36,23,20,13,10,31,3,12,13,
  4,22,15,2,20,6,35,19,19,15,
  15,19,11,23,0,10,0,3,2,21,
  2,19,23,25,27,13,14,22,15,
  5,14,24,31,36,6,14,33,0,11,
  12,19,11,30,29,2,14,24,16,28,
  10,11,30,15,11,10,22,17,23,15,
  18,16,0,27,33,35,17,31,7,21,
  14,29,18,13,10,0,8,21,12,35,
  16,25,24,20
];

const counts = {};
for (const num of CORRECT_SEQUENCE) counts[num] = (counts[num] || 0) + 1;
const total = CORRECT_SEQUENCE.length;

console.log('=== STATION 5 / GAME 980 — ' + total + ' spins ===');

// Per-number table
let table = '# | Count | Bayesian P | EV(€1)\n';
for (let n = 0; n <= 36; n++) {
  const c = counts[n] || 0;
  const bp = ((1 + c) / (37 + total) * 100);
  const ev = bp/100 * 36 - (1 - bp/100);
  if (c > 0) table += n + ' | ' + c + ' | ' + bp.toFixed(2) + '% | €' + ev.toFixed(4) + '\n';
}
console.log(table);

// Inject into replica
if (typeof repCounts !== 'undefined') {
  for (let n = 0; n <= 36; n++) repCounts[n] = 0;
  for (const num of CORRECT_SEQUENCE) repCounts[num] = (repCounts[num] || 0) + 1;
  repResults = [...CORRECT_SEQUENCE];

  let red = 0, black = 0, green = 0;
  for (const [k, v] of Object.entries(repCounts)) {
    const n = parseInt(k);
    if (n === 0) green += v;
    else if (ROU.isRed(n)) red += v;
    else black += v;
  }

  document.getElementById('repRed').textContent = Math.round(red/total*100) + '%';
  document.getElementById('repBlack').textContent = Math.round(black/total*100) + '%';
  document.getElementById('repGreen').textContent = Math.round(green/total*100) + '%';
  document.getElementById('repTotalLabel').textContent = total + ' spins';
  repRenderBoard();
  repRenderResults();
  onGridChange();
  console.log('✅ 103 spins loaded into replica');
}
