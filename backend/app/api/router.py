from fastapi import APIRouter
from app.api.resumes import router as resumes_router
from app.api.analyses import router as analyses_router
from app.api.suggestions import router as suggestions_router
from app.api.documents import router as documents_router

api_router = APIRouter()
api_router.include_router(resumes_router)
api_router.include_router(analyses_router)
api_router.include_router(suggestions_router)
api_router.include_router(documents_router)
