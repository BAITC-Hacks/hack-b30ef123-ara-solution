from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.models import CalculationRequest, CalculationResponse
from app.services.replenishment import calculate_replenishment


settings = get_settings()
app = FastAPI(title="HackAlem Replenishment API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_, exc: RequestValidationError) -> JSONResponse:
    first_error = exc.errors()[0]
    location = ".".join(str(part) for part in first_error["loc"] if part != "body")
    message = first_error["msg"] if not location else f"{location}: {first_error['msg']}"
    return JSONResponse(status_code=422, content={"code": "INVALID_REQUEST", "message": message})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/replenishment/calculate", response_model=CalculationResponse)
def calculate(request: CalculationRequest) -> CalculationResponse:
    return calculate_replenishment(request)
