import logging
import threading
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)

SEMANTIC_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_model_lock = threading.Lock()
_model_instance = None
_model_failed = False

def get_sentence_transformer_model():
    """
    Lazy-loads and caches the SentenceTransformer model singleton.
    Thread-safe and deterministic.
    """
    global _model_instance, _model_failed
    if _model_instance is not None:
        return _model_instance

    with _model_lock:
        if _model_instance is not None:
            return _model_instance
        if _model_failed:
            return None

        try:
            from sentence_transformers import SentenceTransformer
            # Load all-MiniLM-L6-v2
            _model_instance = SentenceTransformer(SEMANTIC_MODEL_NAME)
            logger.info(f"Loaded semantic model: {SEMANTIC_MODEL_NAME}")
            return _model_instance
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({SEMANTIC_MODEL_NAME}): {e}. Using deterministic fallback.")
            _model_failed = True
            return None

def compute_semantic_similarity(resume_text: str, jd_text: str) -> float:
    """
    Calculates semantic cosine similarity (0.0 to 100.0) between prepared resume
    and JD content using all-MiniLM-L6-v2.
    """
    if not resume_text or not jd_text:
        return 0.0

    model = get_sentence_transformer_model()
    if model is not None:
        try:
            embeddings = model.encode([resume_text, jd_text], convert_to_numpy=True, normalize_embeddings=True)
            # Cosine similarity for normalized vectors is just the dot product
            cos_sim = float(np.dot(embeddings[0], embeddings[1]))
            # Cosine similarity can range from -1 to 1; for natural language MiniLM it's typically 0.2 - 0.95
            # Scale gracefully to 0-100:
            score = max(0.0, min(100.0, cos_sim * 100.0))
            return score
        except Exception as ex:
            logger.warning(f"Semantic similarity calculation error with transformer: {ex}")

    # Deterministic fallback using TF-IDF sublinear cosine similarity
    from sklearn.feature_extraction.text import TfidfVectorizer
    try:
        vec = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
        tfidf_mat = vec.fit_transform([resume_text, jd_text])
        cos_sim = float((tfidf_mat[0] * tfidf_mat[1].T).toarray()[0][0])
        return max(0.0, min(100.0, cos_sim * 100.0))
    except Exception:
        return 50.0
