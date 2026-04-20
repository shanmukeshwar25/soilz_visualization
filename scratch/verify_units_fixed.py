import sys
import os
import pandas as pd

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from data_processing import get_data

df = get_data()
units = df[['Measure', 'UnitS']].drop_duplicates().sort_values('Measure')
print(units.to_string())

# Find where UnitS is 'Unknown' or empty
unknowns = df[df['UnitS'].astype(str).str.lower().isin(['unknown', '', 'nan'])]
if not unknowns.empty:
    print("\nMeasures that still have 'Unknown' or empty units:")
    print(unknowns[['Measure', 'UnitS']].drop_duplicates().to_string())
else:
    print("\nAll target measures have corrected units!")
