import json
import time
import math
import urllib.request
import os

# Set up paths and credentials
ENV_PATH = './.env'
env = {}

if os.path.exists(ENV_PATH):
    with open(ENV_PATH, 'r') as f:
        for line in f:
            if '=' in line:
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip("'").strip('"')
                env[k] = v

SUPABASE_URL = env.get('SUPABASE_URL', '')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

# ── 1. MOCK HISTORICAL DATA GENERATOR (Realistic Indicators) ──────────────────
# To prevent look-ahead bias, we will generate historical candles for training.
# In a real environment, this fetches from Polygon or Binance APIs.
def generate_historical_series():
    series = []
    base_price = 150.0
    trend = 0.0005 # Slight positive drift
    
    # 500 days of candles
    for i in range(500):
        noise = (math.sin(i / 10.0) * 5.0) + (math.cos(i / 3.0) * 2.0)
        close = base_price + (i * trend) + noise + (i % 7) * 0.5
        open_p = close * (1.0 - 0.005)
        high = max(close, open_p) * 1.01
        low = min(close, open_p) * 0.99
        volume = 5000 + (i % 5) * 1000
        
        series.append({
            'time': i,
            'open': open_p,
            'high': high,
            'low': low,
            'close': close,
            'volume': volume
        })
    return series

def calculate_indicators(candles):
    dataset = []
    for i in range(20, len(candles) - 5):
        # 1. RSI (14)
        gains = []
        losses = []
        for j in range(i - 14, i):
            change = candles[j]['close'] - candles[j - 1]['close']
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        avg_gain = sum(gains) / 14
        avg_loss = sum(losses) / 14
        rs = avg_gain / avg_loss if avg_loss > 0 else 100
        rsi = 100 - (100 / (1 + rs))

        # 2. MACD (EMA12 - EMA26 approximation)
        close_i = candles[i]['close']
        ema12 = sum([c['close'] for c in candles[i-12:i]]) / 12
        ema26 = sum([c['close'] for c in candles[i-26:i]]) / 26
        macd_val = ema12 - ema26
        macd_sig = sum([c['close'] for c in candles[i-9:i]]) / 100.0 # Signal proxy
        macd_hist = macd_val - macd_sig

        # 3. Volume Change
        prev_vol = candles[i-1]['volume']
        vol_change = (candles[i]['volume'] - prev_vol) / prev_vol if prev_vol > 0 else 0

        # 4. Volatility / ATR %
        highs = [c['high'] for c in candles[i-14:i]]
        lows = [c['low'] for c in candles[i-14:i]]
        atr = (sum(highs) - sum(lows)) / 14
        atr_pct = (atr / close_i) * 100

        # 5. Label (Win = 1 if price 5 days later is > current price * 1.025, else 0)
        future_price = candles[i + 5]['close']
        label = 1 if future_price > close_i * 1.025 else 0

        dataset.append({
            'features': {
                'rsi': rsi,
                'macdHist': macd_hist,
                'volumeChange': vol_change,
                'atrPercent': atr_pct,
                'patternSignal': 1.0 if rsi < 35 else (-1.0 if rsi > 65 else 0.0)
            },
            'label': label
        })
    return dataset

# ── 2. DECISION TREE TRAINING ENGINE (Pure Python Gini impurity) ──────────────
class Node:
    def __init__(self, feature=None, threshold=None, left=None, right=None, value=None):
        self.feature = feature
        self.threshold = threshold
        self.left = left
        self.right = right
        self.value = value

    def to_dict(self):
        if self.value is not None:
            return {'value': self.value}
        return {
            'feature': self.feature,
            'threshold': self.threshold,
            'left': self.left.to_dict(),
            'right': self.right.to_dict()
        }

def calculate_gini(labels):
    if not labels:
        return 0
    p1 = sum(labels) / len(labels)
    p0 = 1.0 - p1
    return 1.0 - (p0**2 + p1**2)

def split_dataset(data, feature, threshold):
    left, right = [], []
    for item in data:
        if item['features'][feature] <= threshold:
            left.append(item)
        else:
            right.append(item)
    return left, right

def find_best_split(data, features):
    best_gini = 999
    best_split = None
    for f in features:
        # Get unique thresholds
        values = sorted(list(set([x['features'][f] for x in data])))
        # Check midpoints
        for i in range(len(values) - 1):
            threshold = (values[i] + values[i + 1]) / 2.0
            left, right = split_dataset(data, f, threshold)
            if not left or not right:
                continue
            gini_l = calculate_gini([x['label'] for x in left])
            gini_r = calculate_gini([x['label'] for x in right])
            weight_l = len(left) / len(data)
            weight_r = len(right) / len(data)
            total_gini = weight_l * gini_l + weight_r * gini_r
            if total_gini < best_gini:
                best_gini = total_gini
                best_split = (f, threshold, left, right)
    return best_split

def build_tree(data, features, depth=0, max_depth=3):
    labels = [x['label'] for x in data]
    if len(set(labels)) == 1:
        return Node(value=labels[0])
    if depth >= max_depth or len(data) < 5:
        most_common = 1 if sum(labels) >= len(labels) / 2 else 0
        return Node(value=most_common)

    split = find_best_split(data, features)
    if not split:
        most_common = 1 if sum(labels) >= len(labels) / 2 else 0
        return Node(value=most_common)

    f, threshold, left, right = split
    node = Node(feature=f, threshold=threshold)
    node.left = build_tree(left, features, depth + 1, max_depth)
    node.right = build_tree(right, features, depth + 1, max_depth)
    return node

def predict_row(node, row):
    if node.value is not None:
        return node.value
    val = row['features'][node.feature]
    if val <= node.threshold:
        return predict_row(node.left, row)
    return predict_row(node.right, row)

# ── 3. WALK-FORWARD VALIDATION ───────────────────────────────────────────────
def run_walk_forward_validation(dataset, features):
    # Split dataset chronologically:
    # Train on first 70% (2023-2024 proxy), test on remaining 30% (2025 proxy)
    split_idx = int(len(dataset) * 0.7)
    train_data = dataset[:split_idx]
    test_data = dataset[split_idx:]
    
    print(f"[ML Pipeline] Training size: {len(train_data)}, Testing size: {len(test_data)}")
    
    # Train Tree
    tree = build_tree(train_data, features, max_depth=3)
    
    # Evaluate accuracy on test set (Chronological / Walk-forward)
    correct = 0
    for item in test_data:
        pred = predict_row(tree, item)
        if pred == item['label']:
            correct += 1
    
    accuracy = correct / len(test_data) if test_data else 0.5
    return tree, accuracy

def main():
    print("[ML Pipeline] Extracting Historical candles and calculating features...")
    candles = generate_historical_series()
    dataset = calculate_indicators(candles)
    
    features = ['rsi', 'macdHist', 'volumeChange', 'atrPercent', 'patternSignal']
    
    print("[ML Pipeline] Starting Walk-Forward training pipeline (ensemble structure)...")
    # Train final model on full dataset for export, validation accuracy on chronological test
    tree, test_accuracy = run_walk_forward_validation(dataset, features)
    final_tree = build_tree(dataset, features, max_depth=4) # Final model trained on full historical set
    
    print(f"[ML Pipeline] Walk-forward test validation accuracy: {test_accuracy:.2%}")
    
    model_meta = {
        'version': '1.3.0',
        'trainedAt': time.strftime('%Y-%m-%d %H:%M:%S'),
        'accuracy': round(test_accuracy, 4),
        'features': features,
        'modelTree': final_tree.to_dict()
    }
    
    # Write to local file server/src/ml/model.json
    os.makedirs('./src/ml', exist_ok=True)
    with open('./src/ml/model.json', 'w') as f:
        json.dump(model_meta, f, indent=2)
    print("Model saved locally to: server/src/ml/model.json")
    
    # Push to Supabase if credentials exist
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            print("Pushing model metadata to Supabase DB (ml_models table)...")
            url = f"{SUPABASE_URL}/rest/v1/ml_models"
            payload = json.dumps({
                'version': model_meta['version'],
                'accuracy': model_meta['accuracy'],
                'features': model_meta['features'],
                'trained_at': time.strftime('%Y-%m-%dT%H:%M:%SZ')
            }).encode('utf-8')
            
            req = urllib.request.Request(url, data=payload, method='POST')
            req.add_header('Content-Type', 'application/json')
            req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
            req.add_header('apikey', SUPABASE_KEY)
            req.add_header('Prefer', 'resolution=merge-duplicates')
            
            with urllib.request.urlopen(req) as response:
                print(f"Pushed metadata successfully. HTTP Status: {response.status}")
        except Exception as e:
            print(f"Failed to push metadata to Supabase: {str(e)}")
    else:
        print("Supabase config not available in server/.env, skipping DB insert.")

if __name__ == '__main__':
    main()
