# Architecture Audit & System Refinement Report — AI Resume Analyzer (Objective 1)

**Project:** AI Resume Analyzer — Objective 1: AI Resume Analysis + Intelligent Live Resume Editor  
**Audit Date:** August 2026  
**Auditor:** Antigravity AI Engineering Architect  

---

## 1. Original Implementation Plan Assessment & Deficiencies Identified

The initial implementation plan proposed creating a custom React-based document canvas (`WebDocumentViewer.tsx`) featuring custom paragraph rendering, custom bullet styling, and pixel-accurate offset calculations. 

### Critical Flaws in the Original Plan:
1. **Re-inventing Document Editing Infrastructure (Violation of Ready-Made Policy):** Attempting to build custom pagination, text selection, font rendering, cursor management, and layout reflow in React for complex `.docx` files is extremely fragile, high-maintenance, and reinventing existing enterprise document editors.
2. **Lack of Concurrency Protection:** The original plan did not enforce strict paragraph text hashing to detect user manual edits prior to applying AI suggestions, risking silent overwrites.
3. **Synchronous REST API Bottleneck:** Running AI analysis synchronously inside `POST /api/analyses` blocks client requests during multi-stage processing.
4. **Missing Native Editor Integration:** Failing to integrate an enterprise web document editor (such as ONLYOFFICE Docs) deprived users of true WYSIWYG document editing, native undo/redo, headers/footers, and complex table editing.
5. **Objective Boundary Risk:** Using terminology like "ATS Score 85/100" risked blurring lines into Objective 2 (ATS Scoring & Iterative Optimization). Objective 1 must strictly focus on AI Review, Document Structure Understanding, and Live Editing.

---

## 2. Revised Architecture & Technology Decisions

### Primary Document Editor Strategy: ONLYOFFICE Docs API
- **Selection:** ONLYOFFICE Docs Enterprise/Open-Source API (`DocsAPI.DocEditor`) paired with a custom `Asc.plugin` (`onlyoffice-plugin/`).
- **Editor Ownership:** ONLYOFFICE handles live document rendering, formatting, typography, cursor, text selection, tables, headers/footers, and native Undo/Redo.
- **Application Ownership:** FastAPI backend owns resume analysis, job description understanding, structured Pydantic AI suggestions, location mapping, version snapshots, database persistence, and security authentication.

### Document Processing Stack
- **DOCX Parsing & XML Modification:** `python-docx` for extracting paragraphs, runs, styles, tables, and hyperlinks.
- **PDF Extraction & Layout Analysis:** `PyMuPDF` (`fitz`) for text extraction, coordinate bounding boxes, and image rendering. `Docling` for complex structural understanding.
- **Formatting Inheritance Engine (`inheritance_engine.py`):** Acts as backend document-processing fallback and export utility. Ensures partial text replacement retains exact run-level font family, font size, bold, italic, underline, color, line spacing, and paragraph alignment.
- **3-Tier Analysis Pipeline:**
  1. **Level 1 (Deterministic):** Fast regex and rule checks (`deterministic_analyzer.py`) for trailing punctuation, capitalization, and weak verbs.
  2. **Level 2 (Semantic NLP):** `spaCy`, `sentence-transformers`, and `RapidFuzz` (`semantic_analyzer.py`) for skill gap detection and JD alignment.
  3. **Level 3 (LLM Structured Validation):** Pydantic v2 JSON contracts (`ai_service.py`, `provider_interface.py`, `MockAIProvider`).

---

## 3. Location Mapping & Concurrency Protection Design

### Suggestion Location Data Contract
```json
{
  "document_id": "doc_8f91a2b",
  "document_version": 1,
  "section_id": "sec_exp_01",
  "paragraph_id": "p_17",
  "run_ids": ["r_17_1", "r_17_2"],
  "start_offset": 0,
  "end_offset": 32,
  "original_text": "Worked on microservice architecture",
  "paragraph_hash": "a94f81c7e2b10",
  "context_before": "During my time at Acme, I ",
  "context_after": " using Python and Flask."
}
```

### Optimistic Concurrency Conflict Safeguard
Before applying any suggestion, the backend computes `hashlib.sha256(current_paragraph_text.strip().encode("utf-8")).hexdigest()[:16]`:
- If `current_hash == paragraph_hash`: Apply replacement smoothly using `FormattingInheritanceEngine`.
- If `current_hash != paragraph_hash`: Return `409 Conflict` status: `"This section has changed since this suggestion was generated."` Present user with `[Review]`, `[Apply Carefully]`, or `[Dismiss]`.

---

## 4. ONLYOFFICE Capabilities Audit & Plugin Integration Findings

| Capability | Supported by ONLYOFFICE | Technical Implementation |
| :--- | :---: | :--- |
| **DOCX WYSIWYG Editing** | **YES** | Native browser canvas rendering via `DocsAPI.DocEditor`. |
| **Native Undo/Redo** | **YES** | Handled internally by ONLYOFFICE document model. |
| **Plugin API Interaction** | **YES** | `Asc.plugin` registers handlers for `init`, `button`, and selection events. |
| **Search & Navigation** | **YES** | `Api.Search(text)` highlights and navigates cursor directly to targeted text. |
| **Text Replacement** | **YES** | `Api.ReplaceText(original, suggested)` preserves run formatting. |
| **Document Autosave Callback** | **YES** | Server posts callback status `2` (saved) to `/api/documents/{id}/callback`. |
| **JWT Authentication** | **YES** | Tokens sign document key, URL, and editor permissions. |

---

## 5. Objective Boundary Firewalls

- **Objective 1 (Current Scope):** AI Resume Analysis, Live Document Editing, Formatting Inheritance, 1-Click Apply/Ignore/Edit, Yellow Review Markers.
- **Objective 2 (Blocked):** ATS Score / Compatibility Percentage, Iterative ATS optimization loops, target score thresholds.
- **Objective 3 (Blocked):** Interview question generation, company interview experience scraping, YouTube search.
- **Objective 4 (Blocked):** LinkedIn/Unstop scraping, job discovery aggregation, application tracking.

---

## 6. Testing Strategy & Test Scenarios

1. **Test 1 (Punctuation Replacement):** Insert trailing period -> verify font family/size/bold preserved.
2. **Test 2 (Partial Word Replacement):** Replace "Worked on" with "Spearheaded" -> verify surrounding words untouched.
3. **Test 3 (No Fabrication Rule):** Missing AWS skill -> output recommendation question, do NOT inject fake experience.
4. **Test 4 (Missing Metric Safeguard):** "Improved API speed" -> trigger `USER_INPUT_REQUIRED` prompt question.
5. **Test 5 (Concurrency Conflict):** User edits paragraph -> AI suggestion returns conflict error.
6. **Test 6 (Multi-Run Span):** Text spanning 3 XML runs replaced safely without corrupting paragraph.
7. **Test 7 (PDF Graceful Handling):** PDF upload returns clear editing limitations message and DOCX recommendation.
