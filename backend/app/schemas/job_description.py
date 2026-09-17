from typing import List, Optional
from pydantic import BaseModel

class JobDescriptionRequest(BaseModel):
    title: Optional[str] = "Target Job Role"
    company: Optional[str] = "Target Company"
    text: Optional[str] = ""
    required_skills: List[str] = []
    preferred_skills: List[str] = []

    @property
    def has_content(self) -> bool:
        return bool(self.text and self.text.strip())
