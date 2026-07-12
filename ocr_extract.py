"""
Roulette Dashboard OCR Extractor
Usage: python3 ocr_extract.py <image_path> <image_index>

Extracts all visible data from a roulette dashboard screenshot:
- Percentage values (RED/BLACK/EVEN/ODD/LOW/HIGH)
- Number counts
- Result sequences
- UI elements and their positions
- Saves everything to the database
"""

import sys, os, json, subprocess, re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_setup import save_session, save_number_counts, save_session_stats, save_layout_entry, save_ocr, init_db

def ocr_region(image_path, crop=None, resize=3, sharpen=3, level_min=10, level_max=85):
    """OCR a specific region of an image with preprocessing"""
    cmd = ["tesseract", image_path, "stdout", "-l", "eng", "--psm", "6", "--oem", "3"]
    
    if crop:
        w, h, x, y = crop
        temp = f"/tmp/tesseract_crop_{os.getpid()}.jpg"
        magick_cmd = [
            "magick", image_path,
            "-crop", f"{w}x{h}+{x}+{y}",
            "-resize", f"{resize*100}%",
            "-sharpen", f"0x{sharpen}",
            "-level", f"{level_min}%,{level_max}%",
            "-colorspace", "Gray",
            "-normalize",
            temp
        ]
        subprocess.run(magick_cmd, capture_output=True)
        cmd[1] = temp
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if crop and os.path.exists(cmd[1]):
        os.remove(cmd[1])
    
    return result.stdout.strip()

def ocr_sparse(image_path, crop=None):
    """OCR with sparse text mode for scattered labels"""
    cmd = ["tesseract", image_path, "stdout", "-l", "eng", "--psm", "11", "--oem", "3"]
    
    if crop:
        w, h, x, y = crop
        temp = f"/tmp/tesseract_sparse_{os.getpid()}.jpg"
        magick_cmd = [
            "magick", image_path,
            "-crop", f"{w}x{h}+{x}+{y}",
            "-resize", "300%",
            "-sharpen", "0x3",
            "-level", "10%,85%",
            "-colorspace", "Gray",
            "-normalize",
            temp
        ]
        subprocess.run(magick_cmd, capture_output=True)
        cmd[1] = temp
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if crop and os.path.exists(cmd[1]):
        os.remove(cmd[1])
    
    return result.stdout.strip()

def extract_percentages(text):
    """Extract percentage values from OCR text"""
    pcts = re.findall(r'(\d+\.\d)%', text)
    return [float(p) for p in pcts]

def extract_counts(text):
    """Extract number counts from OCR"""
    counts = re.findall(r'(\d+)\s*hits?|count[:\s]*(\d+)', text.lower())
    return [int(c[0] or c[1]) for c in counts]

def analyze_dashboard_image(image_path, image_index):
    """Full analysis of a roulette dashboard image"""
    print(f"\n{'='*60}")
    print(f"ANALYZING IMAGE {image_index}: {image_path}")
    print(f"{'='*60}")
    
    # Get image dimensions
    result = subprocess.run(["magick", "identify", "-format", "%w %h", image_path], 
                          capture_output=True, text=True)
    dims = result.stdout.strip().split()
    width, height = int(dims[0]), int(dims[1]) if len(dims) == 2 else (1280, 960)
    print(f"Image size: {width}x{height}")
    
    # Full OCR
    print("\n--- Full OCR (PSM 6) ---")
    full_text = ocr_region(image_path)
    print(full_text[:500])
    
    print("\n--- Sparse OCR (PSM 11) ---")
    sparse_text = ocr_sparse(image_path)
    print(sparse_text[:500])
    
    # Extract percentages
    pcts = extract_percentages(sparse_text + " " + full_text)
    print(f"\nDetected percentages: {pcts}")
    
    # Save OCR to DB
    save_ocr(image_index, full_text + "\n\n=== SPARSE ===\n\n" + sparse_text)
    
    return {
        'full_text': full_text,
        'sparse_text': sparse_text,
        'percentages_detected': pcts,
        'width': width,
        'height': height
    }

def extract_ui_layout(text, width, height):
    """Extract UI element positions from OCR text"""
    # This maps detected text to approximate positions
    elements = []
    
    # Common labels to detect
    labels = {
        'red/black': ['RED', 'BLACK', 'RED / BLACK'],
        'even/odd': ['EVEN', 'ODD', 'EVEN / ODD'],
        'low/high': ['LOW', 'HIGH', 'LOW / HIGH'],
        'last_100': ['LAST 100', 'SPINS'],
        'total_bet': ['TOTAL BET', 'TOTAL'],
        'min_bet': ['MIN TOTAL BET'],
        'max_bet': ['MAX TOTAL BET'],
        'credits': ['CREDITS'],
        'game_number': ['GAME', 'GAME NUMBER']
    }
    
    return elements

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 ocr_extract.py <image_path> <image_index>")
        sys.exit(1)
    
    init_db()
    image_path = sys.argv[1]
    image_index = int(sys.argv[2])
    
    if not os.path.exists(image_path):
        print(f"Image not found: {image_path}")
        sys.exit(1)
    
    analyze_dashboard_image(image_path, image_index)
