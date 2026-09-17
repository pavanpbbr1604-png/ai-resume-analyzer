# Dependency Documentation & License Register

This document records all major dependencies utilized in **AI Resume Analyzer — Objective 1**, including license compliance, maintenance status, Python/Node compatibility, and technical justifications.

---

## 1. Document Processing Dependencies

### `python-docx`
- **Version:** `1.1.2+`
- **License:** MIT License
- **Official Documentation:** https://python-docx.readthedocs.io/
- **Repository:** https://github.com/python-openxml/python-docx
- **Maintenance Status:** Actively Maintained
- **Python Compatibility:** Python 3.8 - 3.14
- **Purpose:** Primary DOCX manipulation library. Reads paragraphs, runs, tables, headings, font styles (family, size, bold, italic, underline, color), alignment, line spacing, and indentation. Used by `FormattingInheritanceEngine` to safely replace text while retaining exact run-level formatting.
- **Limitations:** DOCX files represent reflowable text without fixed pixel pagination. Visual layout coordinates cannot be computed solely from DOCX XML.
- **Alternatives Considered:** `docxtpl` (template-only), raw `lxml` (too error-prone for full formatting preservation).

### `PyMuPDF` (`fitz`)
- **Version:** `1.24.0+`
- **License:** AGPL-3.0 / Commercial License
- **Official Documentation:** https://pymupdf.readthedocs.io/
- **Repository:** https://github.com/pymupdf/PyMuPDF
- **Maintenance Status:** Actively Maintained
- **Python Compatibility:** Python 3.8 - 3.14
- **Purpose:** PDF text extraction, coordinate bounding box (`rect`) detection, page rendering (PNG pixmaps), text search, and highlight annotation creation.
- **Limitations:** PDF text is stored as positioned character glyphs, not semantic runs or paragraphs. Editing PDF text reflow dynamically is unsafe.
- **Alternatives Considered:** `pdfplumber` (slower rendering), `pypdf` (lacks precise layout extraction and rendering).

### `Docling`
- **Version:** `2.0.0+`
- **License:** MIT License
- **Official Documentation:** https://ds4sd.github.io/docling/
- **Repository:** https://github.com/DS4SD/docling
- **Maintenance Status:** Actively Maintained
- **Python Compatibility:** Python 3.9 - 3.14
- **Purpose:** Layout-aware document understanding, reading order recovery, table structure parsing, and multi-format normalization.
- **Limitations:** Higher CPU memory footprint. Used for structural normalization alongside python-docx and PyMuPDF.
- **Alternatives Considered:** `unstructured` (heavier dependencies), `tesseract` (OCR only).

### `Mammoth`
- **Version:** `1.8.0+`
- **License:** BSD-2-Clause
- **Official Documentation:** https://github.com/mwilliamson/python-mammoth
- **Repository:** https://github.com/mwilliamson/python-mammoth
- **Maintenance Status:** Maintained
- **Python Compatibility:** Python 3.8 - 3.14
- **Purpose:** Converting DOCX files directly to clean semantic HTML for lightweight browser preview fallbacks.
- **Limitations:** Does not preserve custom pixel margins or exact page pagination.

---

## 2. Editor & Interface Integration

### `ONLYOFFICE Docs API` & Plugin API
- **Official Documentation:** https://api.onlyoffice.com/
- **Repository:** https://github.com/ONLYOFFICE
- **License:** AGPL-3.0 / Enterprise Commercial
- **Purpose:** Enterprise web-based DOCX editor. Provides WYSIWYG editing, document configuration, JWT authentication, callback hooks for autosave, and `Asc.plugin` Office API for navigating to character offsets, selecting text, and modifying formatting.
- **Integration Plan:** Embedded via iframe with standard Docs API configuration (`DocsAPI.DocEditor`). Custom plugin communicates via postMessage / REST API with FastAPI backend to highlight flagged issues and execute single-click replacements.

---

## 3. Intelligence & NLP Dependencies

### `RapidFuzz`
- **Version:** `3.9.0+`
- **License:** MIT License
- **Official Documentation:** https://rapidfuzz.github.io/RapidFuzz/
- **Repository:** https://github.com/rapidfuzz/RapidFuzz
- **Purpose:** High-performance Levenshtein / Jaro-Winkler string comparison for keyword normalization, section heading detection, and typo verification.

### `sentence-transformers`
- **Version:** `3.0.0+`
- **License:** Apache-2.0
- **Official Documentation:** https://www.sbert.net/
- **Repository:** https://github.com/UKPLab/sentence-transformers
- **Purpose:** Dense vector embeddings (`all-MiniLM-L6-v2`) for computing cosine similarity between resume bullets and job description responsibilities.

### `spaCy`
- **Version:** `3.7.0+`
- **License:** MIT License
- **Official Documentation:** https://spacy.io/
- **Repository:** https://github.com/explosion/spaCy
- **Purpose:** Linguistic parsing, sentence segmentation, POS tagging, and rule-based entity recognition.

---

## 4. Backend Framework & Data Contracts

### `FastAPI`
- **Version:** `0.111.0+`
- **License:** MIT License
- **Official Documentation:** https://fastapi.tiangolo.com/
- **Repository:** https://github.com/fastapi/fastapi
- **Purpose:** Modern, fast (high-performance) web framework for building APIs with Python based on standard Python type hints.

### `Pydantic v2`
- **Version:** `2.8.0+`
- **License:** MIT License
- **Official Documentation:** https://docs.pydantic.dev/
- **Repository:** https://github.com/pydantic/pydantic
- **Purpose:** Strict schema definition, request/response serialization, and validation of LLM structured JSON responses.

### `SQLAlchemy 2.0`
- **Version:** `2.0.30+`
- **License:** MIT License
- **Official Documentation:** https://www.sqlalchemy.org/
- **Repository:** https://github.com/sqlalchemy/sqlalchemy
- **Purpose:** Asynchronous ORM for managing Postgres / SQLite databases, document metadata, version histories, and suggestion states.
