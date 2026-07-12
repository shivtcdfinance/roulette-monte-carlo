import sqlite3, json, os

DB_PATH = os.path.expanduser("~/Hermes v3/v3/projects/roulette-monte-carlo/roulette_data.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()
    
    c.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            source_image TEXT,
            captured_at TEXT DEFAULT (datetime('now')),
            wheel_type TEXT DEFAULT 'european',
            total_spins INTEGER DEFAULT 100,
            min_bet REAL DEFAULT 0.10,
            max_bet REAL DEFAULT 400,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS number_counts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            number INTEGER NOT NULL,
            count INTEGER DEFAULT 0,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            UNIQUE(session_id, number)
        );

        CREATE TABLE IF NOT EXISTS session_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL UNIQUE,
            red_count INTEGER DEFAULT 0,
            black_count INTEGER DEFAULT 0,
            green_count INTEGER DEFAULT 0,
            even_count INTEGER DEFAULT 0,
            odd_count INTEGER DEFAULT 0,
            low_count INTEGER DEFAULT 0,
            high_count INTEGER DEFAULT 0,
            red_pct REAL DEFAULT 0,
            black_pct REAL DEFAULT 0,
            green_pct REAL DEFAULT 0,
            even_pct REAL DEFAULT 0,
            odd_pct REAL DEFAULT 0,
            low_pct REAL DEFAULT 0,
            high_pct REAL DEFAULT 0,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS layout_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_index INTEGER NOT NULL,
            label TEXT NOT NULL,
            element_type TEXT,
            bounding_box TEXT,
            detected_value TEXT,
            confidence REAL,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS ocr_captures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_index INTEGER NOT NULL,
            raw_text TEXT,
            processed_at TEXT DEFAULT (datetime('now'))
        );
    """)
    
    conn.commit()
    conn.close()
    print("Database initialized at:", DB_PATH)

def save_session(name, wheel_type, total_spins, min_bet, max_bet, source_image=None, notes=None):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        INSERT INTO sessions (name, wheel_type, total_spins, min_bet, max_bet, source_image, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (name, wheel_type, total_spins, min_bet, max_bet, source_image, notes))
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    return session_id

def save_number_counts(session_id, counts_dict):
    conn = get_conn()
    c = conn.cursor()
    for number, count in counts_dict.items():
        c.execute("""
            INSERT OR REPLACE INTO number_counts (session_id, number, count)
            VALUES (?, ?, ?)
        """, (session_id, int(number), int(count)))
    conn.commit()
    conn.close()

def save_session_stats(session_id, stats):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        INSERT OR REPLACE INTO session_stats 
        (session_id, red_count, black_count, green_count, even_count, odd_count, low_count, high_count,
         red_pct, black_pct, green_pct, even_pct, odd_pct, low_pct, high_pct)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (session_id, stats.get('red',0), stats.get('black',0), stats.get('green',0),
          stats.get('even',0), stats.get('odd',0), stats.get('low',0), stats.get('high',0),
          stats.get('red_pct',0.0), stats.get('black_pct',0.0), stats.get('green_pct',0.0),
          stats.get('even_pct',0.0), stats.get('odd_pct',0.0), stats.get('low_pct',0.0), stats.get('high_pct',0.0)))
    conn.commit()
    conn.close()

def save_layout_entry(image_index, label, element_type, bbox, detected_value, confidence):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        INSERT INTO layout_registry (image_index, label, element_type, bounding_box, detected_value, confidence)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (image_index, label, element_type, json.dumps(bbox), str(detected_value), confidence))
    conn.commit()
    conn.close()

def save_ocr(image_index, raw_text):
    conn = get_conn()
    c = conn.cursor()
    c.execute("INSERT INTO ocr_captures (image_index, raw_text) VALUES (?, ?)", (image_index, raw_text))
    conn.commit()
    conn.close()

def get_all_sessions():
    conn = get_conn()
    c = conn.cursor()
    rows = c.execute("SELECT * FROM sessions ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_session_counts(session_id):
    conn = get_conn()
    c = conn.cursor()
    rows = c.execute("SELECT number, count FROM number_counts WHERE session_id=? ORDER BY number", (session_id,)).fetchall()
    conn.close()
    return {r['number']: r['count'] for r in rows}

def get_session_stats(session_id):
    conn = get_conn()
    c = conn.cursor()
    r = c.execute("SELECT * FROM session_stats WHERE session_id=?", (session_id,)).fetchone()
    conn.close()
    return dict(r) if r else None

if __name__ == "__main__":
    init_db()
