import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"

# Lightweight zero-dependency .env loader
env_file = BASE_DIR / ".env"
if env_file.exists():
    try:
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key and key not in os.environ:
                        os.environ[key] = val
    except Exception:
        pass

class Settings:
    PROJECT_NAME: str = "AI Resume Analyzer"
    API_V1_STR: str = "/api"
    
    # Storage settings
    STORAGE_PATH: Path = STORAGE_DIR
    ORIGINAL_DIR: Path = STORAGE_DIR / "original"
    WORKING_DIR: Path = STORAGE_DIR / "working"
    VERSIONS_DIR: Path = STORAGE_DIR / "versions"
    
    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{STORAGE_DIR}/app.db"
    
    # AI Provider Settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "auto")  # 'auto', 'gemini', 'openai', 'mock'
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

settings = Settings()

# Ensure storage directories exist
settings.STORAGE_PATH.mkdir(parents=True, exist_ok=True)
settings.ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
settings.WORKING_DIR.mkdir(parents=True, exist_ok=True)
settings.VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
