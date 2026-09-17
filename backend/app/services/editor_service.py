from typing import Dict, Any
from app.services.document_service import DocumentService

class EditorService:
    @staticmethod
    def get_onlyoffice_config(document_id: str, base_url: str = "http://localhost:8000") -> Dict[str, Any]:
        """
        Generates official ONLYOFFICE Docs API configuration object.
        Reference: https://api.onlyoffice.com/editors/config/
        """
        version = DocumentService.get_version(document_id)
        doc = DocumentService.get_document(document_id)
        filename = doc.filename if doc else f"Resume_{document_id}.docx"

        return {
            "documentType": "word",
            "document": {
                "fileType": "docx",
                "key": f"{document_id}_v{version}",
                "title": filename,
                "url": f"{base_url}/api/documents/{document_id}/download",
                "permissions": {
                    "edit": True,
                    "download": True,
                    "print": True,
                    "review": True,
                    "comment": True,
                }
            },
            "editorConfig": {
                "mode": "edit",
                "lang": "en",
                "callbackUrl": f"{base_url}/api/documents/{document_id}/callback",
                "user": {
                    "id": "user_candidate_01",
                    "name": "Candidate Reviewer",
                },
                "customization": {
                    "autosave": True,
                    "chat": False,
                    "comments": True,
                    "help": False,
                    "toolbarNoTabs": True,
                },
                "plugins": {
                    "autostart": ["asc.{BE54D81C-9E9C-4340-A0E0-4740A8A9E66F}"],
                    "pluginsData": [
                        f"{base_url}/onlyoffice-plugin/config.json"
                    ]
                }
            }
        }
