// Load corrected 125-spin FIFO sequence into replica
// FIFO: pos 1 = oldest (20), pos 125 = newest (26)
// NEW BATCH REVERSED WITHIN ITSELF

const CORRECT_SEQUENCE = [
  20,24,25,16,35,12,21,8,0,10,
  13,18,29,14,21,7,31,17,35,33,
  27,0,16,18,15,23,17,22,10,11,
  10,28,16,24,14,2,29,30,11,19,
  12,11,0,33,14,6,36,31,24,14,
  5,15,22,14,13,27,25,23,19,2,
  21,2,3,0,10,0,23,11,19,15,
  15,19,35,6,20,2,15,22,4,13,
  12,3,31,10,13,20,23,36,0,7,
  2,20,21,23,7,22,30,26,13,7,
  22,30,13,
  23,7,22,30,26,13,10,4,27,6,
  29,23,15,5,28,4,28,12,16,9,
  32,26
];

const counts = {};
for (const n of CORRECT_SEQUENCE) counts[n] = (counts[n] || 0) + 1;
const total = CORRECT_SEQUENCE.length;

console.log(`=== STATION 5 / GAME 980 — ${total} spins (FIFO, corrected) ===`);
console.log(`Pos 1 = #${CORRECT_SEQUENCE[0]} (oldest)`);
console.log(`Pos ${total} = #${CORRECT_SEQUENCE[total-1]} (newest)`);

// Show last 10
console.log('\nLast 10 spins (NEWEST):');
for (let i = total-10; i < total; i++) {
  console.log(`  Pos ${i+1}: #${CORRECT_SEQUENCE[i]}`);
}

// Inject into replica
if (typeof repCounts !== 'undefined') {
  for (let n = 0; n <= 36; n++) repCounts[n] = 0;
  for (const num of CORRECT_SEQUENCE) repCounts[num] = (repCounts[num] || 0) + 1;
  repResults = [...CORRECT_SEQUENCE];

  let red=0, black=0, green=0;
  for (const [k,v] of Object.entries(repCounts)) {
    const n=parseInt(k);
    if (n===0) green+=v;
    else if (ROU.isRed(n)) red+=v;
    else black+=v;
  }
  document.getElementById('repRed').textContent=Math.round(red/total*100)+'%';
  document.getElementById('repBlack').textContent=Math.round(black/total*100)+'%';
  document.getElementById('repGreen').textContent=Math.round(green/total*100)+'%';
  document.getElementById('repTotalLabel').textContent=total+' spins';
  repRenderBoard();repRenderResults();onGridChange();
  console.log(`✅ ${total} spins loaded`);
}
