# Dual-Mode Resume Analysis & Cover Letter Removal Plan

Implement a tailored two-mode analysis pipeline and UI flow based on whether the candidate uploads only their resume or both their resume and a target job description, while removing the cover letter feature for now.

## User Review Required

> [!IMPORTANT]
> **Summary of Key Changes**:
> 1. **Mode 1 (Resume Only)**:
>    - Generates standalone ATS Readiness Score (0-100) auditing formatting, bullet strength, and readability.
>    - Produces actionable run-level suggestions for **line improvements** (power verbs, quantified metrics) and **mistakes** (typos, spelling, capitalization, trailing punctuation, passive voice).
>    - Interview Prep is gated behind providing a Job Description (displays a "+ Add Job Description to Unlock Interview Prep" banner if accessed).
> 2. **Mode 2 (Resume + Job Description)**:
>    - Generates targeted ATS Role Match Score (0-100) comparing resume text against JD requirements.
>    - Produces role-targeted suggestions that align experience bullets and skills to the JD keywords.
>    - Generates full **Interview Preparation Plan** (topic modules, concepts to master, official documentation, practice tasks, schedule) based on both the resume and JD.
> 3. **Remove Cover Letter**:
>    - Completely removes the Cover Letter tab, state, copy button, and generator from the frontend workspace.
>    - Deprecates the `/cover-letter` backend endpoint.

---

## Proposed Changes

### Backend Engine & Schemas

#### [MODIFY] [deterministic_analyzer.py](file:///c:/d%20drive%20folder/content/ai-resume-analyzer/backend/app/analysis/deterministic_analyzer.py)
- Expand deterministic rule set to detect explicit **mistakes** in resume lines:
  - Common resume typos and misspellings (`teh` -> `the`, `experiance` -> `experience`, `managment` -> `management`, `developement` -> `development`, `maintenence` -> `maintenance`, `succesful` -> `successful`, `seperate` -> `separate`, `recieved` -> `received`, etc.).
  - Passive voice / weak phrases (`was responsible for`, `was tasked with`, `duties included`, `assisted with`, `participated in`).
  - Vague filler words (`etc.`, `various projects`, `many users`).
- Maintain line improvement suggestions for weak action verbs and missing metrics.

#### [MODIFY] [semantic_analyzer.py](file:///c:/d%20drive%20folder/content/ai-resume-analyzer/backend/app/analysis/semantic_analyzer.py)
- Enhance JD-matched suggestions to include:
  - Skill alignment: Incorporating missing required technologies into skills section.
  - Experience bullet tailoring: Recommending relevant JD keywords (e.g., Docker, AWS, CI/CD, microservices, REST APIs) into work experience bullets matching JD responsibilities.

#### [MODIFY] [prompts.py](file:///c:/d%20drive%20folder/content/ai-resume-analyzer/backend/app/ai/prompts.py)
- Update `STANDALONE_ATS_PROMPT` to explicitly instruct the model:
  - Focus on line-by-line improvements (upgrading weak phrasing with power verbs, identifying missing metrics).
  - Detect mistakes: grammatical errors, misspellings, casing inconsistencies, punctuation errors.
  - Do NOT invent fake missing skills since no JD is provided.
- Ensure `SYSTEM_PROMPT` and `INTERVIEW_PLAN_PROMPT` reinforce that interview prep is strictly customized to the target JD and candidate background.

#### [MODIFY] [llm_provider.py](file:///c:/d%20drive%20folder/content/ai-resume-analyzer/backend/app/ai/llm_provider.py) & [mock_provider.py](file:///c:/d%20drive%20folder/content/ai-resume-analyzer/backend/app/ai/mock_provider.py)
- Ensure clean labeling of suggestion categories (`WEAK_WORDING`, `PUNCTUATION`, `GRAMMAR`, `CONSISTENCY`, `MISSING_CONTEXT`, `SKILL_ALIGNMENT`).
- In `mock_provider.py`, make sure standalone suggestions clearly differentiate between line improvements and mistake corrections.

#### [MODIFY] [analyses.py](file:///c:/d%20drive%20folder/content/ai-resume-analyzer/backend/app/api/analyses.py)
- Deprecate/disable `@router.post("/cover-letter")` endpoint with informative notice so it's not active in API usage.

---

### Frontend Components & Workspace

#### [MODIFY] [ReviewPanel.tsx](file:///c:/d%20drive%20folder/content/ai-resume-analyzer/frontend/src/components/ReviewPanel.tsx)
- Remove `COVER LETTER` tab from sub-tab navigation bar (`activeTab` type updated to `'suggestions' | 'enhancer' | 'interview'`).
- Remove all cover letter state variables (`coverLetterText`, `isGeneratingCL`, `copiedCL`), handlers (`handleGenerateCoverLetter`, `handleCopyCoverLetter`), and the cover letter tab render block.
- Update Tab 1 title dynamically:
  - When `!hasJd`: **LINE SUGGESTIONS & MISTAKES ({suggestions.length})**
  - When `hasJd`: **JD MATCH SUGGESTIONS ({suggestions.length})**
- Update Interview Prep Tab:
  - When `hasJd`: Display full interview preparation plan.
  - When `!hasJd`: Display dedicated prompt card: *"Target Job Description Required — To generate a tailored interview preparation curriculum with role-specific topics, questions, and curated learning sources, please add a Job Description"* with a `+ ADD TARGET JD` button.

#### [MODIFY] [LeftUploadPanel.tsx](file:///c:/d%20drive%20folder/content/ai-resume-analyzer/frontend/src/components/LeftUploadPanel.tsx)
- Refine the upload view instructions:
  - **Upload Only Resume**: Instant Standalone ATS Score + Line Improvements & Mistake Corrections.
  - **Upload Resume + Job Description**: Role Match Score + JD Keyword Alignment + Tailored Interview Preparation Plan.

#### [MODIFY] [WorkspacePage.tsx](file:///c:/d%20drive%20folder/content/ai-resume-analyzer/frontend/src/pages/WorkspacePage.tsx)
- Ensure tab switching and sidebar clicks handle the JD requirement gracefully (if user clicks Interview Prep without a JD, automatically prompt them with the JD Drawer).

---

## Verification Plan

### Automated Tests
- Run backend test suite to verify all existing and new tests pass:
  ```powershell
  & "c:\d drive folder\content\ai-resume-analyzer\backend\venv\Scripts\python.exe" -m pytest
  ```
- Run frontend TypeScript check to guarantee zero compilation errors:
  ```powershell
  npm.cmd run build
  ```

### Manual Verification
1. **Test Standalone Mode (Resume Only)**:
   - Upload sample resume with no Job Description.
   - Verify ATS score gauge shows "GENERAL ATS SCORE (NO JD)" or "STANDALONE ATS AUDIT".
   - Verify suggestions display line-by-line improvements (power verbs, metrics) and mistakes (punctuation, capitalization, typos).
   - Verify Interview Prep tab shows the prompt requesting a JD to generate role-specific prep.
   - Verify NO cover letter option is visible anywhere in the UI.
2. **Test Targeted Mode (Resume + Job Description)**:
   - Add a Job Description.
   - Verify ATS score changes to "ATS ROLE MATCH".
   - Verify suggestions display JD-aligned keywords and experience tailoring.
   - Verify Interview Prep tab displays the complete, structured self-study curriculum.
