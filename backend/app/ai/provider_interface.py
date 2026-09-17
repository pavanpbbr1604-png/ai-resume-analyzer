from abc import ABC, abstractmethod
from typing import List
from app.schemas.document import NormalizedDocument
from app.schemas.job_description import JobDescriptionRequest
from app.schemas.suggestion import AISuggestionItem

class AIProviderInterface(ABC):
    @abstractmethod
    def analyze_resume(
        self,
        doc: NormalizedDocument,
        jd: JobDescriptionRequest
    ) -> List[AISuggestionItem]:
        """Generate structured list of AISuggestionItem matching Pydantic contract."""
        pass
