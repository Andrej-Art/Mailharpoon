"""
Preprocessing-Script for urls from Kaggle

I use this data from kaggle: https://www.kaggle.com/datasets/suryaprabha19/phishing-url?resource=download

Load url data, clean it and save it in a standardized format for feature engineering.


"""

import pandas as pd
from pathlib import Path
import sys

# Define paths
PROJECT_ROOT = Path(__file__).parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "data" / "urls" / "raw" / "kaggle_phishing_url"
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "urls" / "processed"

# Input file
INPUT_FILE = RAW_DATA_DIR / "phishing_url_kaggle.csv"
OUTPUT_FILE = PROCESSED_DATA_DIR / "urls_processed.csv"


def preprocess_urls():
    """Load, clean and store URL data"""
    
    print(f"Loading data from {INPUT_FILE}...")
    
    # Load CSV
    df = pd.read_csv(INPUT_FILE)
    
    print(f"Original number of rows: {len(df)}")
    
    # 1. Remove duplicates (based on URL)
    df = df.drop_duplicates(subset=['url'], keep='first')
    print(f"After removing duplicates: {len(df)}")
    
    # 2. Drop empty/invalid URLs
    df = df[df['url'].notna()]
    df = df[df['url'].str.strip() != '']
    print(f"After removing empty rows: {len(df)}")
    
    # 3. Standardize labels: 1 -> "phish", 0 -> "legit"
    df['label'] = df['label'].map({1: 'phish', 0: 'legit'})
    
    # 4. Ensure columns are consistent and add source
    df = df.rename(columns={'url': 'url', 'label': 'label'})
    df['source'] = 'kaggle_phishing_url'
    
    # 5. Reorder columns
    df = df[['url', 'label', 'source']]
    
    # 6. Print stats
    print("\n=== Stats ===")
    print(f"Total: {len(df)} URLs")
    print(f"Phishing: {len(df[df['label'] == 'phish'])}")
    print(f"Legitimate: {len(df[df['label'] == 'legit'])}")
    
    # 7. Save processed file
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)
    
    print(f"\n Processed data saved to: {OUTPUT_FILE}")
    return df


if __name__ == "__main__":
    try:
        df = preprocess_urls()
    except FileNotFoundError as e:
        print(f"Error: file not found: {e}")
        sys.exit(1)
    except Exception as e:
        print(f" Error during preprocessing: {e}")
        sys.exit(1)

