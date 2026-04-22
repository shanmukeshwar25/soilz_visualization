import pandas as pd
import re
import io

def _read_custom_csv(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    if text.startswith('\ufeff'):
        text = text[1:]
    text = re.sub(r'(?m)^"|"$', '', text)
    text = text.replace('""', '"')
    return pd.read_csv(io.StringIO(text))

df = _read_custom_csv('analysis_data_09-04-2026_2(in).csv')
print("Unique MeasureCategory values:")
print(df['MeasureCategory'].unique())
print("\nUnique Category values:")
print(df['Category'].unique())
