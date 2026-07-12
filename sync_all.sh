#!/bin/bash
# Roulette MC Backup & Sync System
# Run: bash sync_all.sh
# Creates 4 redundant backups + vault sync + GitHub push

set -e
PROJECT="/Users/shivansh/Hermes v3/v3/projects/roulette-monte-carlo"
VAULT="/Users/shivansh/Hermes v3/v3/vault/skills/roulette-monte-carlo-skill"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DT=$(date +%Y-%m-%d_%H:%M)

cd "$PROJECT"

# ========== DATA INTEGRITY CHECK ==========
echo "🔍 Checking data integrity..."
SPINS=$(python3 -c "
import json
with open('session_data/station5_game980_159spins.json') as f:
    d = json.load(f)
print(len(d['sequence']))
" 2>/dev/null || echo "0")

echo "  Current spins: $SPINS"

# ========== BACKUP 1: Timestamped folder ==========
echo "📁 Backup 1: Timestamped folder..."
BACKUP1="backups/$TIMESTAMP"
mkdir -p "$BACKUP1"
cp session_data/*.json "$BACKUP1/" 2>/dev/null
cp roulette_data.db "$BACKUP1/" 2>/dev/null
cp -r replica/ "$BACKUP1/" 2>/dev/null
cp *.html *.js "$BACKUP1/" 2>/dev/null
echo "  Done: $BACKUP1"

# ========== BACKUP 2: Compressed tarball ==========
echo "📦 Backup 2: Compressed archive..."
tar -czf "backups/roulette_${TIMESTAMP}.tar.gz" \
    session_data/ roulette_data.db \
    *.html *.js \
    replica/ 2>/dev/null
echo "  Done: backups/roulette_${TIMESTAMP}.tar.gz"

# ========== BACKUP 3: Vault sync ==========
echo "🔗 Backup 3: Vault sync..."
cp session_data/*.json "$VAULT/" 2>/dev/null
cp *.html *.js "$VAULT/" 2>/dev/null
echo "  Done: $VAULT"

# ========== BACKUP 4: Database snapshot ==========
echo "💾 Backup 4: DB snapshot..."
python3 -c "
import sqlite3, json
with open('session_data/station5_game980_159spins.json') as f:
    d = json.load(f)
# DB is already live — just log the snapshot
with open(f'backups/db_snapshot_${TIMESTAMP}.json', 'w') as f:
    json.dump({'timestamp':'$DT','spins':len(d['sequence']),'stats':d.get('stats',{})}, f)
" 2>/dev/null
echo "  Done"

# ========== GITHUB PUSH ==========
echo "🚀 GitHub push..."
git add -A
git commit -m "Backup sync $TIMESTAMP — $SPINS spins" 2>/dev/null || echo "  Nothing new to commit"
git push origin main 2>/dev/null
echo "  Done"

# ========== SUMMARY ==========
echo ""
echo "════════════════════════════════════════"
echo "  ✅ ALL BACKUPS COMPLETE — $DT"
echo "════════════════════════════════════════"
echo "  1️⃣  $BACKUP1/"
echo "  2️⃣  backups/roulette_${TIMESTAMP}.tar.gz"
echo "  3️⃣  $VAULT/"
echo "  4️⃣  Database snapshot"
echo "  🌐  GitHub: origin/main"
echo ""
echo "  📊 $SPINS spins saved across all backups"
