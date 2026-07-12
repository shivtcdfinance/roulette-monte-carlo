// Load this script in the browser console to inject the correct result sequence
// or include it in index.html to auto-load

(function() {
  const CORRECT_SEQUENCE = [
    5, 14, 24, 31, 36,
    6, 14,
    33, 0, 11, 12, 19, 11, 30, 29, 2, 14, 24, 16, 28,
    10, 11, 30, 15, 11, 10, 22, 17,
    23, 15, 18, 16, 0, 27
  ];
  
  // Count occurrences
  const counts = {};
  for (const num of CORRECT_SEQUENCE) {
    counts[num] = (counts[num] || 0) + 1;
  }
  
  console.log('=== CORRECT RESULT SEQUENCE ===');
  console.log('Total:', CORRECT_SEQUENCE.length, 'spins');
  console.log('Counts:', JSON.stringify(counts));
  console.log('Sequence:', CORRECT_SEQUENCE.join(', '));
  
  // If the replica is loaded, inject these
  if (typeof repCounts !== 'undefined') {
    // Reset counts
    for (let n = 0; n <= 36; n++) repCounts[n] = 0;
    for (const num of CORRECT_SEQUENCE) repCounts[num] = (repCounts[num] || 0) + 1;
    
    repResults = [...CORRECT_SEQUENCE];
    
    // Update stats
    let red = 0, black = 0, green = 0;
    for (const [k, v] of Object.entries(repCounts)) {
      const n = parseInt(k);
      if (n === 0) green += v;
      else if (ROU.isRed(n)) red += v;
      else black += v;
    }
    const total = CORRECT_SEQUENCE.length;
    
    document.getElementById('repRed').textContent = Math.round(red/total*100) + '%';
    document.getElementById('repBlack').textContent = Math.round(black/total*100) + '%';
    document.getElementById('repGreen').textContent = Math.round(green/total*100) + '%';
    document.getElementById('repTotalLabel').textContent = total + ' spins';
    
    // Render
    repRenderBoard();
    repRenderResults();
    
    // Also update main grid
    const wheelType = document.getElementById('wheelType').value;
    const nums = getWheelNumbers(wheelType);
    const gridCounts = {};
    nums.forEach(num => { gridCounts[String(num)] = repCounts[num] || 0; });
    renderNumberGrid(gridCounts, wheelType);
    document.getElementById('sampleSize').value = total;
    
    console.log('✅ Correct sequence loaded into replica!');
  }
})();
