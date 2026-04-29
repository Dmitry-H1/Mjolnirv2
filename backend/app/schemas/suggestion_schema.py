from pydantic import BaseModel
 
class SuggestionResponse(BaseModel):
    log_id: str
    suggestion: str
    priority: str
 