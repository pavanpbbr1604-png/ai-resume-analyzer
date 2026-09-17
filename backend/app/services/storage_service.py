import shutil
from pathlib import Path
from typing import Optional, List, Tuple
from app.core.config import settings

class StorageService:
    @staticmethod
    def get_original_path(doc_id: str, extension: str = ".docx") -> Path:
        return settings.ORIGINAL_DIR / f"{doc_id}_original{extension}"

    @staticmethod
    def get_working_path(doc_id: str, extension: str = ".docx") -> Path:
        return settings.WORKING_DIR / f"{doc_id}_working{extension}"

    @staticmethod
    def get_version_dir(doc_id: str) -> Path:
        version_dir = settings.VERSIONS_DIR / doc_id
        version_dir.mkdir(parents=True, exist_ok=True)
        return version_dir

    @classmethod
    def save_uploaded_file(cls, doc_id: str, content: bytes, filename: str) -> Tuple[Path, Path]:
        ext = Path(filename).suffix.lower() or ".docx"
        orig_path = cls.get_original_path(doc_id, ext)
        work_path = cls.get_working_path(doc_id, ext)

        with open(orig_path, "wb") as f:
            f.write(content)

        shutil.copy2(orig_path, work_path)

        # Initialize version 0
        cls.create_version_snapshot(doc_id, 0, ext)

        return orig_path, work_path

    @classmethod
    def create_version_snapshot(cls, doc_id: str, version_num: int, extension: str = ".docx") -> Path:
        v_dir = cls.get_version_dir(doc_id)
        v_path = v_dir / f"v_{version_num:03d}{extension}"
        work_path = cls.get_working_path(doc_id, extension)
        if work_path.exists():
            shutil.copy2(work_path, v_path)
        return v_path

    @classmethod
    def restore_version(cls, doc_id: str, version_num: int, extension: str = ".docx") -> bool:
        v_dir = cls.get_version_dir(doc_id)
        v_path = v_dir / f"v_{version_num:03d}{extension}"
        work_path = cls.get_working_path(doc_id, extension)
        if v_path.exists():
            shutil.copy2(v_path, work_path)
            return True
        return False
