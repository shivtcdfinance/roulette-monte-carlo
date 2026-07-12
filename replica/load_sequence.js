// Load 125-spin sequence into replica
// FIFO: pos 1 = oldest (20 @ 18:48), pos 125 = newest (23 @ 20:52)

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
  26,32,9,16,12,28,4,28,5,15,
  23,29,6,27,4,10,13,26,30,22,
  7,23
];

const counts = {};
for (const n of CORRECT_SEQUENCE) counts[n] = (counts[n] || 0) + 1;
const total = CORRECT_SEQUENCE.length;

// Inject
if (typeof repCounts !== 'undefined') {
  for (let n = 0; n <= 36; n++) repCounts[n] = 0;
  for (const num of CORRECT_SEQUENCE) repCounts[num] = (repCounts[num] || 0) + 1;
  repResults = [...CORRECT_SEQUENCE];
  let red=0,black=0,green=0;
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
  console.log('Loaded '+total+' spins');
}
