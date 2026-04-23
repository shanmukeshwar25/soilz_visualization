import pandas as pd
import io
import re
import sys

def _read_custom_csv(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    if text.startswith('\ufeff'):
        text = text[1:]
    text = re.sub(r'(?m)^\"|\"$', '', text)
    text = text.replace('\"\"', '\"')
    return pd.read_csv(io.StringIO(text))

df = _read_custom_csv('d:/Soil_vis/analysis_data_09-04-2026_2(in).csv')

print('Overall crops null count:')
print(df['Plant/Crop'].isna().sum())
print('Overall soil null count:')
print(df['SoilType'].isna().sum())

print('Unique values in crop:')
print(df['Plant/Crop'].unique()[:10])
print('Unique values in soil:')
print(df['SoilType'].unique()[:10])
