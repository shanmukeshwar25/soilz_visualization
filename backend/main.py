from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import data_processing

app = FastAPI(title="Soil Nutrient API")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Pre-load data into memory when API starts
    data_processing.get_data()


@app.get("/filters")
def get_filters():
    try:
        return data_processing.get_filters()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/companies")
def get_companies():
    try:
        return data_processing.get_companies()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/areas")
def get_areas(
    company: Optional[str] = Query(None, description="Company ID to scope areas"),
):
    try:
        return data_processing.get_areas(company)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/categories")
def get_categories(
    crop: str = Query(..., description="Crop Name"),
    soil: str = Query(..., description="Soil Type"),
    type: Optional[str] = Query(None, description="Category filter type (plant/soil)"),
):
    try:
        return data_processing.get_categories(crop, soil, type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/all-categories")
def get_all_categories():
    try:
        return data_processing.get_all_categories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/soil-trajectory")
def get_soil_trajectory(
    crop: str = Query(..., description="Crop Name"),
    soil: str = Query(..., description="Soil Type"),
):
    try:
        return data_processing.get_soil_trajectory(crop, soil)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/plant-trajectory")
def get_plant_trajectory(
    crop: str = Query(..., description="Crop Name"),
    soil: str = Query(..., description="Soil Type"),
):
    try:
        return data_processing.get_plant_trajectory(crop, soil)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/data")
def get_data(
    crop:       str           = Query(...,  description="Crop Name"),
    soil:       str           = Query(...,  description="Soil Type"),
    categories: Optional[str] = Query(None, description="Comma separated categories filter"),
    type:       Optional[str] = Query(None, description="Category type filter (plant/soil)"),
    company:    Optional[str] = Query(None, description="Company ID filter"),
    area:       Optional[str] = Query(None, description="Area ID filter"),
):
    try:
        data = data_processing.get_time_series_data(crop, soil, categories, type, company, area)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/summary")
def get_summary(
    crop:       str           = Query(...,  description="Crop Name"),
    soil:       str           = Query(...,  description="Soil Type"),
    categories: Optional[str] = Query(None, description="Comma separated categories filter"),
    type:       Optional[str] = Query(None, description="Category type filter (plant/soil)"),
    company:    Optional[str] = Query(None, description="Company ID filter"),
    area:       Optional[str] = Query(None, description="Area ID filter"),
):
    try:
        summary = data_processing.get_summary_stats(crop, soil, categories, type, company, area)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/date-range")
def get_date_range(
    crop:    str           = Query(...),
    soil:    str           = Query(...),
    company: Optional[str] = Query(None, description="Company ID filter"),
    area:    Optional[str] = Query(None, description="Area ID filter"),
):
    try:
        return data_processing.get_date_range(crop, soil, company, area)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/benchmarks")
def get_benchmarks(
    crop:       str           = Query(..., description="Crop Name"),
    soil:       str           = Query(..., description="Soil Type"),
    categories: Optional[str] = Query(None, description="Comma separated categories filter"),
    company:    Optional[str] = Query(None, description="Company ID filter"),
    area:       Optional[str] = Query(None, description="Area ID filter"),
):
    try:
        return data_processing.get_age_benchmarks(crop, soil, categories, company, area)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)