import pandas as pd
import io
import re
import os

# DATA_PATH = r'analysis_data_09-04-2026_2(in).csv'
DATA_PATH = os.getenv("DATA_PATH")
def _read_custom_csv(filepath):
    # Read a chunk instead of the whole file if it's too big, but let's try reading the first few rows
    with open(filepath, 'r', encoding='utf-8') as f:
        # Read enough for a good sample
        header = f.readline()
        lines = [f.readline() for _ in range(100000)]
    
    text = header + "".join(lines)
    if text.startswith('\ufeff'):
        text = text[1:]
    text = re.sub(r'(?m)^"|"$', '', text)
    text = text.replace('""', '"')
    return pd.read_csv(io.StringIO(text))

df = _read_custom_csv(DATA_PATH)
units = df[['Measure', 'UnitS']].drop_duplicates().sort_values('Measure')
print(units.to_string())

# Find where UnitS is null or 'Unknown' or empty
unknowns = df[df['UnitS'].isna() | (df['UnitS'] == '') | (df['UnitS'].astype(str).str.lower() == 'nan')]
if not unknowns.empty:
    print("\nMeasures with missing units:")
    print(unknowns[['Measure', 'UnitS']].drop_duplicates().to_string())
else:
    print("\nNo missing units found in the first 100k rows.")
