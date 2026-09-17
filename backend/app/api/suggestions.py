from fastapi import APIRouter, HTTPException
from app.schemas.suggestion import ApplySuggestionRequest, BatchSuggestionAction
from app.services.suggestion_service import SuggestionService

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])

@router.post("/{suggestion_id}/apply")
async def apply_suggestion(
    suggestion_id: str,
    req: ApplySuggestionRequest = None
):
    custom_text = req.custom_text if req else None
    success = SuggestionService.apply_suggestion(suggestion_id, custom_text)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to apply suggestion. Location or paragraph may have changed.")
    return {"status": "success", "message": "Suggestion applied successfully."}

@router.post("/{suggestion_id}/ignore")
async def ignore_suggestion(suggestion_id: str):
    success = SuggestionService.ignore_suggestion(suggestion_id)
    if not success:
        raise HTTPException(status_code=404, detail="Suggestion not found.")
    return {"status": "success", "message": "Suggestion ignored."}

@router.post("/batch")
async def batch_suggestions(batch: BatchSuggestionAction):
    applied_count = 0
    for sug_id in batch.suggestion_ids:
        if batch.action == "apply":
            if SuggestionService.apply_suggestion(sug_id):
                applied_count += 1
        elif batch.action == "ignore":
            if SuggestionService.ignore_suggestion(sug_id):
                applied_count += 1
    return {"status": "success", "processed": applied_count}
