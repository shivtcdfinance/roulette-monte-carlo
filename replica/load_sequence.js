// Load the CORRECT 54-number sequence into the replica
// Order: LIFO - position 1 = newest (5), position 54 = oldest (20)

const CORRECT_SEQUENCE = [
  5,14,24,31,36,6,14,33,0,11,
  12,19,11,30,29,2,14,24,16,28,
  10,11,30,15,11,10,22,17,23,15,
  18,16,0,27,33,35,17,31,7,21,
  14,29,18,13,10,0,8,21,12,35,
  16,25,24,20
];

// Count occurrences
const counts = {};
for (const num of CORRECT_SEQUENCE) counts[num] = (counts[num] || 0) + 1;
const total = CORRECT_SEQUENCE.length;

console.log('=== CORRECT SEQUENCE (' + total + ' spins) ===');
console.log('Order: LIFO (newest=pos1, oldest=pos' + total + ')');

// Per-number counts
let table = 'Number | Count | Bayesian P\n';
for (let n = 0; n <= 36; n++) {
  const c = counts[n] || 0;
  const bp = ((1 + c) / (37 + total) * 100).toFixed(2);
  if (c > 0) table += n + ' | ' + c + ' | ' + bp + '%\n';
}
console.log(table);

// If replica is loaded, inject
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
  console.log('✅ Sequence loaded into replica');
}
