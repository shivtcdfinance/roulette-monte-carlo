"""
Dashboard Data Viewer — displays what's stored in the roulette database
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_setup import get_all_sessions, get_session_counts, get_session_stats

def show_all_data():
    sessions = get_all_sessions()
    if not sessions:
        print("No sessions in database yet.")
        return
    
    print(f"\n{'='*70}")
    print(f"  ROULETTE DATA DATABASE — {len(sessions)} session(s)")
    print(f"{'='*70}")
    
    for s in sessions:
        print(f"\n  📁 Session #{s['id']}: {s['name']}")
        print(f"     Wheel: {s['wheel_type']}  |  Spins: {s['total_spins']}")
        print(f"     Bet range: €{s['min_bet']} – €{s['max_bet']}")
        print(f"     Captured: {s['captured_at']}")
        
        if s['source_image']:
            print(f"     Source: {s['source_image']}")
        
        stats = get_session_stats(s['id'])
        if stats:
            print(f"     RED: {stats['red_count']} ({stats['red_pct']}%)  BLACK: {stats['black_count']} ({stats['black_pct']}%)  GREEN: {stats['green_count']} ({stats['green_pct']}%)")
            print(f"     EVEN: {stats['even_count']} ({stats['even_pct']}%)  ODD: {stats['odd_count']} ({stats['odd_pct']}%)")
            print(f"     LOW: {stats['low_count']} ({stats['low_pct']}%)  HIGH: {stats['high_count']} ({stats['high_pct']}%)")
        
        counts = get_session_counts(s['id'])
        if counts:
            sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:10]
            print(f"     Top numbers: {', '.join([f'#{n}: {c}' for n, c in sorted_counts])}")
        
        print(f"     {'─' * 50}")

if __name__ == "__main__":
    show_all_data()
