// Load the COMPLETE 103-spin sequence into the replica
// Order: FIFO - position 1 = oldest (20 @ 18:48), position 103 = newest (26 @ 20:30)
// Timestamps: ~1 min per spin, estimated

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
  22,30,26
];

const TIMESTAMPS = [
  "18:48","18:49","18:50","18:51","18:52","18:53","18:54","18:55","18:56","18:57",
  "18:58","18:59","19:00","19:01","19:02","19:03","19:04","19:05","19:06","19:07",
  "19:08","19:09","19:10","19:11","19:12","19:13","19:14","19:15","19:16","19:17",
  "19:18","19:19","19:20","19:21","19:22","19:23","19:24","19:25","19:26","19:27",
  "19:28","19:29","19:30","19:31","19:32","19:33","19:34","19:35","19:36","19:37",
  "19:38","19:39","19:40","19:41","19:42","19:43","19:44","19:45","19:46","19:47",
  "19:48","19:49","19:50","19:51","19:52","19:53","19:54","19:55","19:56","19:57",
  "19:58","19:59","20:00","20:01","20:02","20:03","20:04","20:05","20:06","20:07",
  "20:08","20:09","20:10","20:11","20:12","20:13","20:14","20:15","20:16","20:17",
  "20:18","20:19","20:20","20:21","20:22","20:23","20:24","20:25","20:26","20:27",
  "20:28","20:29","20:30"
];

const counts = {};
for (const num of CORRECT_SEQUENCE) counts[num] = (counts[num] || 0) + 1;
const total = CORRECT_SEQUENCE.length;

console.log('=== STATION 5 / GAME 980 — ' + total + ' spins (FIFO) ===');
console.log('Time range: ' + TIMESTAMPS[0] + ' → ' + TIMESTAMPS[total-1]);

// Top numbers
let table = 'Pos | # | Time\n';
for (let i = 0; i < total; i++) {
  table += (i+1) + ' | ' + CORRECT_SEQUENCE[i] + ' | ' + TIMESTAMPS[i] + '\n';
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
  console.log('✅ 103 spins loaded into replica (FIFO order)');
}
