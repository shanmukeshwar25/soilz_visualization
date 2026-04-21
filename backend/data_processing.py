import pandas as pd
import numpy as np
import os
import io
import re

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'analysis_data_09-04-2026_2(in).csv')

# ── Category classification ───────────────────────────────────────────────────
# Soil-related categories (fertilization, minerals, nutrients)
SOIL_CATEGORIES = {
    'N-min 0-90 cm',
    'pH + O.S.',
    'Verticilium onderzoek in grond',
    'Beschikbare voorraad N + K',
    'Stengelaaltjes',
    'Longidorus en Xiphinema',
    'N-Mineraal Totaal',
    'Bemesting uitgebreid 0-90 cm',
    'pH',
    'Aaltjes + 28 dgn incubatie'
}

PLANT_CATEGORIES = {
    'Drogestof onderzoek plant',
    'Drogestof onderzoek plant compleet',
    'Vruchtanalyse Plus',
    'Brix-waarde bepaling'
}

MIXED_CATEGORIES = {
    'Bemesting Uitgebreid',
    'Aaltjes + 14 dgn Incubatie',
    'In de teelt bemesting - BASIS',
    'Aaltjes + 14 dgn incubatie + Cystenonderzoek',
    'In de teelt bemesting - UITGEBREID',
    'Bemesting Basis',
    'Tussentijdse rapportage Aaltjes',
    'Bemesting Uitgebreid + Fosfaatdifferentiatie',
    'Aaltjes - Zonder incubatie',
    'In de teelt bemesting - CHECKMONSTER',
    'N-mineraal',
    'Zware Metalen',
    'Wateronderzoek',
    'Plantsap monsters',
    'Fosfaatdifferentiatie',
    'Derogatie (veehouderij)',
    'Mestonderzoek (vast/vloeibaar)',
    'Scheurmonster grasland',
    'Bemesting uitgebreid + Klei/Zand/Silt verhouding',
    'Vrijwillig AM onderzoek',
    'Bietencysten onderzoek grond',
    'Bemesting basis + EC',
    'Fosfaatdifferentiatie + pH',
    'E-coli wateronderzoek',
    'Aaltjes zonder incubatie + Cysten'
}

# Mapping of measures to correct units when they are missing from the dataset
UNIT_MAPPING = {
    'Ph-KCL': 'pH',
    'pH H2o (water)': 'pH',
    'Fosfaat Pw': 'mg/l',
    'Fosfaat P-AL': 'mg/100g',
    'Fosfaat (P-CaCl2)': 'mg/kg',
    'K-HCL': 'mg/100g',
    'K-getal': 'index',
    'C/N-verhouding': 'ratio',
    'Klei-Humuscomplex, CEC': 'cmol+/kg',
    'Kalium (K-CaCl2)': 'mg/kg',
    'Magnesium (Mg-CaCL2)': 'mg/kg',
    'Natrium (Na-CL2)': 'mg/kg',
    'Calcium': 'mg/kg',
    'Geleidbaarheid EC': 'mS/cm',
    'Brix-waarde bepaling': '°Brix',
    'Drogestof onderzoek plant': '%',
    'Drogestof onderzoek plant compleet': '%',
    'Organische stof': '%',
    'Koolstof (C)': '%',
    'pH': 'pH',
    'Bicarbonaat': 'mmol/l',
    'E. Coli': 'kve/100ml',
}

def classify_category(cat: str) -> str:
    """Returns 'soil', 'plant', or 'mixed' for a category string."""
    if cat in SOIL_CATEGORIES:
        return 'soil'
    if cat in PLANT_CATEGORIES:
        return 'plant'
    if cat in MIXED_CATEGORIES:
        return 'mixed'
        
    # Keyword fallback
    c = str(cat).lower()
    if any(k in c for k in ['bodem', 'grond', 'bemesting', 'ph', 'fosfaat', 'zand', 'klei', 'mineraal', 'ec', 'os', 'o.s.']):
        return 'soil'
    if any(k in c for k in ['plant', 'vrucht', 'gewas', 'sap', 'blad', 'brix', 'drogestof']):
        return 'plant'
        
    return 'mixed'

# Helper to read poorly quoted CSVs where the entire row is quoted
def _read_custom_csv(filepath: str) -> pd.DataFrame:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    if text.startswith('\ufeff'):
        text = text[1:]
    text = re.sub(r'(?m)^"|"$', '', text)
    text = text.replace('""', '"')
    return pd.read_csv(io.StringIO(text))

# Global variable to hold the cached dataset
_cleaned_data = None

def _apply_company_filter(df: pd.DataFrame, company: str) -> pd.DataFrame:
    """Filter dataframe by CompanyId string, if provided."""
    if not company or company == 'All Companies':
        return df
    try:
        cid = int(company)
        return df[df['CompanyId'] == cid]
    except (ValueError, TypeError):
        return df

def load_and_clean_data(csv_path: str) -> pd.DataFrame:
    """Loads and preprocesses the soil dataset."""
    df = _read_custom_csv(csv_path)

    # Drop rows where critical Date columns are missing
    df = df.dropna(subset=['CreatedDate', 'ValueS'])

    # Convert dates
    df['CreatedDate']   = pd.to_datetime(df['CreatedDate'],   dayfirst=True, errors='coerce')
    df['CropStartDate'] = pd.to_datetime(df['CropStartDate'], dayfirst=True, errors='coerce')
    df['CropEndDate']   = pd.to_datetime(df['CropEndDate'],   dayfirst=True, errors='coerce')

    # Remove unparseable CreatedDates
    df = df.dropna(subset=['CreatedDate'])

    # Clean up UnitS format
    df['UnitS'] = df['UnitS'].astype(str).str.strip()
    
    # Convert g/ha to kg/ha for standardization, leave other units alone (like %, index, mg/l)
    def standardize_val(row):
        try:
            val = float(row['ValueS'])
            u = str(row['UnitS']).lower()
            if u == 'g/ha':
                return val / 1000.0
            return val
        except:
            return 0.0

    df['ValueS'] = df.apply(standardize_val, axis=1)
    
    # Update unit labels for those converted
    df['UnitS'] = df['UnitS'].apply(lambda u: 'kg/ha' if str(u).lower() == 'g/ha' else str(u).lower())

    # Calculate days from start column (NaN if no crop cycle)
    df['days_from_start'] = (df['CreatedDate'] - df['CropStartDate']).dt.days

    # Rename for easier access
    df = df.rename(columns={'Plant/Crop': 'Crop'})

    # Keep BatchId to uniquely identify samples tested on the same date
    if 'BatchId' not in df.columns:
        df['BatchId'] = 'Unknown'

    # Preserve CompanyId for filtering
    if 'CompanyId' not in df.columns:
        df['CompanyId'] = pd.NA
    df['CompanyId'] = pd.to_numeric(df['CompanyId'], errors='coerce')
    df['BatchId'] = df['BatchId'].fillna('Unknown')

    # Ensure Category column exists
    if 'Category' not in df.columns:
        df['Category'] = 'Unknown'
    df['Category'] = df['Category'].fillna('Unknown')
    
    # Fill NAs to prevent groupby from dropping them
    df['Crop'] = df['Crop'].fillna('Unknown')
    df['SoilType'] = df['SoilType'].fillna('Unknown')
    df['CropStartDate'] = df['CropStartDate'].dt.strftime('%Y-%m-%d').fillna('Unknown')
    df['CropEndDate'] = df['CropEndDate'].dt.strftime('%Y-%m-%d').fillna('Unknown')
    df['days_from_start'] = df['days_from_start'].fillna(-999)

    # Standardize units and apply mapping for missing units
    def clean_unit(row):
        u = str(row['UnitS']).strip()
        if u.lower() in ['nan', '', 'unknown', 'none']:
            # Try to map based on measure
            m = row['Measure']
            return UNIT_MAPPING.get(m, 'Unknown')
        return u

    df['UnitS'] = df.apply(clean_unit, axis=1)

    # Compute HasPlantData / HasSoilData flags before aggregation
    df['HasPlantData'] = df['Crop'].notna().astype(int)
    df['HasSoilData']  = df['SoilType'].notna().astype(int)

    # Aggregate to handle exact measure duplicates within the SAME batch
    # Category, HasPlantData, HasSoilData are preserved; CompanyId kept via first()
    agg_df = df.groupby([
        'Crop', 'SoilType', 'CreatedDate', 'BatchId',
        'CropStartDate', 'CropEndDate', 'Category', 'Measure', 'days_from_start'
    ]).agg({
        'ValueS':       'mean',
        'HasPlantData': 'max',
        'HasSoilData':  'max',
        'UnitS':        'first',
        'CompanyId':    'first',
    }).reset_index()

    # Sort properly
    agg_df = agg_df.sort_values(by='CreatedDate')

    return agg_df


def get_data() -> pd.DataFrame:
    global _cleaned_data
    if _cleaned_data is None:
        _cleaned_data = load_and_clean_data(DATA_PATH)
    return _cleaned_data


def get_filters():
    df = get_data()
    return {
        "crops": ["All Crops"] + sorted(df['Crop'].replace('Unknown', pd.NA).dropna().unique().tolist()),
        "soil_types": ["All Soils"] + sorted(df['SoilType'].replace('Unknown', pd.NA).dropna().unique().tolist()),
        "measures": sorted(df['Measure'].dropna().unique().tolist()),
    }


def get_companies():
    """Returns all distinct CompanyIds sorted numerically."""
    df = get_data()
    ids = sorted(df['CompanyId'].dropna().astype(int).unique().tolist())
    return {
        "companies": ["All Companies"] + [str(i) for i in ids]
    }


def get_all_categories():
    """Returns all distinct categories with their type (soil/plant/other)."""
    df = get_data()
    all_cats = sorted(df['Category'].dropna().unique().tolist())
    return {
        "categories": [
            {"name": c, "type": classify_category(c)}
            for c in all_cats
        ],
        "soil_categories": sorted(SOIL_CATEGORIES),
        "plant_categories": sorted(PLANT_CATEGORIES),
    }


def get_categories(crop: str, soil: str, cat_type: str = None):
    """Returns distinct Category values for a given crop+soil combination, with type metadata."""
    df = get_data()
    sub = df.copy()
    if crop and crop != 'All Crops':
        sub = sub[sub['Crop'] == crop]
    if soil and soil != 'All Soils':
        sub = sub[sub['SoilType'] == soil]
    all_cats = sorted(sub['Category'].dropna().unique().tolist())
    categories = [
        {"name": c, "type": classify_category(c)}
        for c in all_cats
    ]
    if cat_type:
        categories = [c for c in categories if c["type"] == cat_type]
    return {
        "categories": categories
    }


def get_time_series_data(crop: str, soil: str, categories: str = None, cat_type: str = None, company: str = None):
    df = get_data()
    sub_df = df.copy()
    if crop and crop != 'All Crops':
        sub_df = sub_df[sub_df['Crop'] == crop]
    if soil and soil != 'All Soils':
        sub_df = sub_df[sub_df['SoilType'] == soil]
    sub_df = _apply_company_filter(sub_df, company)

    if categories and categories != 'All':
        cats_list = [c.strip() for c in categories.split(',')]
        sub_df = sub_df[sub_df['Category'].isin(cats_list)]
    if cat_type:
        sub_df = sub_df[sub_df['Category'].apply(classify_category) == cat_type]

    if sub_df.empty:
        return []

    pivot_df = sub_df.pivot_table(
        index=['CreatedDate', 'BatchId', 'CropStartDate', 'CropEndDate', 'Crop', 'SoilType', 'days_from_start', 'Category'],
        columns='Measure',
        values='ValueS',
        aggfunc='first'
    ).reset_index()

    pivot_df = pivot_df.sort_values(['CreatedDate', 'BatchId'])

    pivot_df['date'] = pivot_df.apply(
        lambda row: f"{row['CreatedDate'].strftime('%Y-%m-%d %H:%M:%S')} (Batch {row['BatchId']})",
        axis=1
    )

    # CropStartDate and CropEndDate are already stringified in load_and_clean_data
    pivot_df = pivot_df.drop(columns=['CreatedDate', 'BatchId'])
    pivot_df = pivot_df.replace({np.nan: None, 'Unknown': None, -999.0: None, -999: None})

    return pivot_df.to_dict(orient='records')


def get_summary_stats(crop: str, soil: str, categories: str = None, cat_type: str = None, company: str = None):
    df = get_data()
    sub_df = df.copy()
    if crop and crop != 'All Crops':
        sub_df = sub_df[sub_df['Crop'] == crop]
    if soil and soil != 'All Soils':
        sub_df = sub_df[sub_df['SoilType'] == soil]
    sub_df = _apply_company_filter(sub_df, company)

    if categories and categories != 'All':
        cats_list = [c.strip() for c in categories.split(',')]
        sub_df = sub_df[sub_df['Category'].isin(cats_list)]
    if cat_type:
        sub_df = sub_df[sub_df['Category'].apply(classify_category) == cat_type]

    if sub_df.empty:
        return []

    summary = []
    for (cat_name, measure), group in sub_df.groupby(['Category', 'Measure']):
        group_sorted = group.sort_values('CreatedDate')
        last_val = float(group_sorted.iloc[-1]['ValueS'])
        avg_val  = float(group['ValueS'].mean())
        median_val = float(group['ValueS'].median())
        min_val  = float(group['ValueS'].min())
        max_val  = float(group['ValueS'].max())
        
        # Determine actual unit, fall back to empty string if missing
        unit_val = ''
        if 'UnitS' in group.columns and not group['UnitS'].empty:
            unit_val = str(group['UnitS'].iloc[0]).strip()
            if unit_val.lower() in ['nan', 'unknown']:
                unit_val = ''

        summary.append({
            "category": cat_name,
            "measure": measure,
            "latest":  last_val,
            "average": avg_val,
            "median":  median_val,
            "min":     min_val,
            "max":     max_val,
            "unit":    unit_val,
        })

    return summary


def get_date_range(crop: str, soil: str, company: str = None):
    """
    Build Timeline Focus dropdown options grouped by calendar year of actual samples.
    """
    df_raw = _read_custom_csv(DATA_PATH)
    df_raw['CreatedDate']   = pd.to_datetime(df_raw['CreatedDate'],   dayfirst=True, errors='coerce')
    df_raw['CropStartDate'] = pd.to_datetime(df_raw['CropStartDate'], dayfirst=True, errors='coerce')
    df_raw['CropEndDate']   = pd.to_datetime(df_raw['CropEndDate'],   dayfirst=True, errors='coerce')
    df_raw = df_raw.rename(columns={'Plant/Crop': 'Crop'})
    df_raw['CompanyId'] = pd.to_numeric(df_raw.get('CompanyId', pd.NA), errors='coerce')

    sub = df_raw.copy()
    if crop and crop != 'All Crops':
        sub = sub[sub['Crop'] == crop]
    if soil and soil != 'All Soils':
        sub = sub[sub['SoilType'] == soil]
    sub = _apply_company_filter(sub, company)
        
    sub = sub.dropna(subset=['CreatedDate'])

    if sub.empty:
        return {"windows": []}

    sub = sub.copy()
    sub['sample_year'] = sub['CreatedDate'].dt.year

    yearly = (
        sub.groupby('sample_year')['CreatedDate']
        .agg(first_sample='min', last_sample='max')
        .reset_index()
        .sort_values('first_sample')
    )

    out = []
    for _, row in yearly.iterrows():
        fs = row['first_sample']
        ls = row['last_sample']
        label = f"{fs.strftime('%b %Y')} - {ls.strftime('%b %Y')}"
        out.append({
            "label":        label,
            "first_sample": fs.strftime('%Y-%m-%d %H:%M:%S'),
            "last_sample":  ls.strftime('%Y-%m-%d %H:%M:%S'),
            "year":         int(row['sample_year']),
        })

    return {"windows": out}


def get_soil_trajectory(crop: str, soil: str):
    """
    Returns time-series data filtered to SOIL-RELATED categories only.
    Groups by (CreatedDate, BatchId, Category) and returns per-measure values
    so the frontend can draw a trajectory plot coloured by measure.
    """
    df = get_data()
    sub = df.copy()
    if crop and crop != 'All Crops':
        sub = sub[sub['Crop'] == crop]
    if soil and soil != 'All Soils':
        sub = sub[sub['SoilType'] == soil]
        
    sub = sub[sub['Category'].isin(SOIL_CATEGORIES)]

    if sub.empty:
        return {"data": [], "soil_categories_used": []}

    # Which soil categories are actually present in this subset
    cats_used = sorted(sub['Category'].dropna().unique().tolist())

    pivot = sub.pivot_table(
        index=['CreatedDate', 'BatchId', 'CropStartDate', 'CropEndDate', 'Category', 'days_from_start'],
        columns='Measure',
        values='ValueS',
        aggfunc='first'
    ).reset_index()

    pivot = pivot.sort_values(['CreatedDate', 'BatchId'])

    pivot['date'] = pivot.apply(
        lambda row: f"{row['CreatedDate'].strftime('%Y-%m-%d %H:%M:%S')} (Batch {row['BatchId']})",
        axis=1
    )
    
    pivot = pivot.drop(columns=['CreatedDate', 'BatchId'])
    pivot = pivot.replace({np.nan: None, 'Unknown': None, -999.0: None, -999: None})

    return {
        "data": pivot.to_dict(orient='records'),
        "soil_categories_used": cats_used,
    }


def get_plant_trajectory(crop: str, soil: str):
    """
    Returns time-series data filtered to PLANT-RELATED categories only.
    """
    df = get_data()
    sub = df.copy()
    if crop and crop != 'All Crops':
        sub = sub[sub['Crop'] == crop]
    if soil and soil != 'All Soils':
        sub = sub[sub['SoilType'] == soil]
        
    sub = sub[sub['Category'].isin(PLANT_CATEGORIES)]

    if sub.empty:
        return {"data": [], "plant_categories_used": []}

    cats_used = sorted(sub['Category'].dropna().unique().tolist())

    pivot = sub.pivot_table(
        index=['CreatedDate', 'BatchId', 'CropStartDate', 'CropEndDate', 'Category', 'days_from_start'],
        columns='Measure',
        values='ValueS',
        aggfunc='first'
    ).reset_index()

    pivot = pivot.sort_values(['CreatedDate', 'BatchId'])

    pivot['date'] = pivot.apply(
        lambda row: f"{row['CreatedDate'].strftime('%Y-%m-%d %H:%M:%S')} (Batch {row['BatchId']})",
        axis=1
    )
    
    pivot = pivot.drop(columns=['CreatedDate', 'BatchId'])
    pivot = pivot.replace({np.nan: None, 'Unknown': None, -999.0: None, -999: None})

    return {
        "data": pivot.to_dict(orient='records'),
        "plant_categories_used": cats_used,
    }

def get_age_benchmarks(crop: str, soil: str, categories: str = None, company: str = None):
    """
    Returns historical mean values for each measurement, grouped by (Category, days_from_start).
    This allows comparing a specific sample at Age X with the historical average at Age X.
    """
    df = get_data()
    sub_df = df.copy()
    
    # Filter out unknown ages
    sub_df = sub_df[sub_df['days_from_start'] != -999]
    
    if crop and crop != 'All Crops':
        sub_df = sub_df[sub_df['Crop'] == crop]
    if soil and soil != 'All Soils':
        sub_df = sub_df[sub_df['SoilType'] == soil]
    sub_df = _apply_company_filter(sub_df, company)

    if categories and categories != 'All':
        cats_list = [c.strip() for c in categories.split(',')]
        sub_df = sub_df[sub_df['Category'].isin(cats_list)]

    if sub_df.empty:
        return {}

    # Group by Category, Age, and Measure to get the mean
    benchmarks = sub_df.groupby(['Category', 'days_from_start', 'Measure'])['ValueS'].mean().reset_index()
    
    # Structure: { Category: { Day: { Measure: Value } } }
    res = {}
    for _, row in benchmarks.iterrows():
        cat = str(row['Category']).strip()
        day = int(row['days_from_start'])
        meas = row['Measure']
        val = float(row['ValueS'])
        
        if cat not in res: res[cat] = {}
        if day not in res[cat]: res[cat][day] = {}
        res[cat][day][meas] = val
        
    return res