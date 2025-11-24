"""
Feature Extraction Script

Loads processed URLs and extracts features for all URLs in the dataset.
Saves features to CSV for model training.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import sys

# Add backend to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.services.feature_extraction import URLFeatureExtractor

# Define paths
PROJECT_ROOT = Path(__file__).parent.parent
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "urls" / "processed"
FEATURES_DATA_DIR = PROJECT_ROOT / "data" / "urls" / "features"

# Input and output files
INPUT_FILE = PROCESSED_DATA_DIR / "urls_processed.csv"
OUTPUT_FILE = FEATURES_DATA_DIR / "urls_features.csv"


def extract_features_from_urls():
    """
    Load processed URLs and extract features for all of them.
    
    Returns:
        DataFrame with URLs, labels, and extracted features
    """
    print(f"Loading processed URLs from {INPUT_FILE}...")
    
    # Load processed CSV
    df = pd.read_csv(INPUT_FILE)
    
    print(f"Loaded {len(df)} URLs")
    print(f"Columns: {df.columns.tolist()}")
    print(f"\nLabel distribution:")
    print(df['label'].value_counts())
    
    # Initialize feature extractor
    extractor = URLFeatureExtractor()
    feature_names = extractor.get_feature_names()
    
    print(f"\nExtracting {len(feature_names)} features from URLs...")
    print(f"Features: {', '.join(feature_names[:5])}... (+ {len(feature_names) - 5} more)")
    
    # Extract features for each URL
    features_list = []
    failed_count = 0
    
    for idx, row in df.iterrows():
        url = row['url']
        try:
            features = extractor.extract(url)
            features_list.append(features)
        except Exception as e:
            print(f"Error extracting features from URL {idx}: {e}")
            failed_count += 1
            # Use empty features as fallback
            features_list.append(extractor._empty_features())
        
        # Progress indicator
        if (idx + 1) % 10000 == 0:
            print(f"  Processed {idx + 1}/{len(df)} URLs...")
    
    if failed_count > 0:
        print(f"\nWarning: {failed_count} URLs failed feature extraction")
    
    # Convert to DataFrame
    features_df = pd.DataFrame(features_list)
    
    # Combine with original data (url, label, source)
    result_df = pd.concat([
        df[['url', 'label', 'source']].reset_index(drop=True),
        features_df.reset_index(drop=True)
    ], axis=1)
    
    # Print feature statistics
    print("\n" + "=" * 60)
    print("Feature Statistics")
    print("=" * 60)
    print(f"Total features: {len(feature_names)}")
    print(f"Total samples: {len(result_df)}")
    print(f"\nLabel distribution:")
    print(result_df['label'].value_counts())
    print(f"\nFeature summary:")
    print(features_df.describe())
    
    # Save features
    FEATURES_DATA_DIR.mkdir(parents=True, exist_ok=True)
    result_df.to_csv(OUTPUT_FILE, index=False)
    
    print(f"\n" + "=" * 60)
    print(f"Features saved to: {OUTPUT_FILE}")
    print(f"Shape: {result_df.shape}")
    print(f"Columns: {len(result_df.columns)}")
    print("=" * 60)
    
    return result_df


if __name__ == "__main__":
    try:
        df = extract_features_from_urls()
        print("\n✅ Feature extraction completed successfully!")
    except FileNotFoundError as e:
        print(f"❌ Error: file not found: {e}")
        print(f"   Make sure to run preprocess_urls.py first!")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error during feature extraction: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

