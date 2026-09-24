import re
from typing import List, Dict, Any, Optional
from app.schemas.job_description import JobDescriptionRequest
from app.analysis.skills_taxonomy import extract_canonical_skills

REQUIRED_HEADERS = [
    "required", "must have", "must-have", "mandatory", "qualifications",
    "minimum qualifications", "minimum requirements", "required skills",
    "what you'll need", "requirements", "essential", "basic qualifications"
]

PREFERRED_HEADERS = [
    "preferred", "nice to have", "nice-to-have", "bonus", "plus",
    "desirable", "preferred qualifications", "preferred skills",
    "good to have", "great to have", "what sets you apart", "additional qualifications"
]

RESPONSIBILITY_HEADERS = [
    "responsibilities", "what you'll do", "what you will do", "duties",
    "role overview", "day to day", "day-to-day", "the role", "job description"
]

def split_jd_sections(text: str) -> Dict[str, str]:
    """
    Deterministically segments JD text into sections based on common headings.
    Handles multi-line structures, inline heading prefixes, and bullet points.
    """
    normalized_text = text or ""
    all_headers = REQUIRED_HEADERS + PREFERRED_HEADERS + RESPONSIBILITY_HEADERS
    for h in all_headers:
        pattern = re.compile(rf'(?:^|[.;\n])\s*({re.escape(h)}\s*[:\-])', re.IGNORECASE)
        normalized_text = pattern.sub(r'\n\1', normalized_text)

    lines = normalized_text.split("\n")
    sections: Dict[str, List[str]] = {
        "required": [],
        "preferred": [],
        "responsibilities": [],
        "general": []
    }

    current_mode = "general"

    for line in lines:
        clean = line.strip().lower()
        if not clean:
            continue

        matched_mode = None
        for req_h in REQUIRED_HEADERS:
            if clean.startswith(req_h) or f"{req_h}:" in clean or (req_h in clean and (len(clean) < 45 or clean.endswith(":") or clean.startswith("#"))):
                matched_mode = "required"
                break

        if not matched_mode:
            for pref_h in PREFERRED_HEADERS:
                if clean.startswith(pref_h) or f"{pref_h}:" in clean or (pref_h in clean and (len(clean) < 45 or clean.endswith(":") or clean.startswith("#"))):
                    matched_mode = "preferred"
                    break

        if not matched_mode:
            for resp_h in RESPONSIBILITY_HEADERS:
                if clean.startswith(resp_h) or f"{resp_h}:" in clean or (resp_h in clean and (len(clean) < 45 or clean.endswith(":") or clean.startswith("#"))):
                    matched_mode = "responsibilities"
                    break

        if matched_mode:
            current_mode = matched_mode
            sections[current_mode].append(line)
        else:
            sections[current_mode].append(line)

    return {k: "\n".join(v) for k, v in sections.items()}

def extract_years_experience_jd(text: str) -> Optional[int]:
    """
    Deterministically extracts required years of experience from JD text.
    Examples: '3+ years', '5-7 years', 'minimum 2 years'.
    """
    patterns = [
        r'(\d+)\s*(?:\+|plus)?\s*(?:-\s*\d+)?\s*(?:years?|yrs?)\b(?:\s+of)?(?:\s+(?:relevant|professional|software|hands-on|industry))?\s+(?:experience|exp)',
        r'(?:minimum|at least|over)\s+(\d+)\s*(?:years?|yrs?)',
        r'(\d+)\s*(?:years?|yrs?)\s+experience',
    ]
    matches = []
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            try:
                val = int(m.group(1))
                if 1 <= val <= 25:
                    matches.append(val)
            except Exception:
                continue

    if matches:
        return min(matches)  # Use minimum stated experience threshold
    return None

def parse_job_description(jd: JobDescriptionRequest) -> Dict[str, Any]:
    """
    Parses and categorizes Job Description content deterministically.
    """
    text = jd.text or ""
    sections = split_jd_sections(text)

    # Extract skills
    req_skills_auto = extract_canonical_skills(sections["required"]) if sections["required"] else []
    pref_skills_auto = extract_canonical_skills(sections["preferred"]) if sections["preferred"] else []
    all_extracted_skills = extract_canonical_skills(text)

    # Handle explicit request overrides/additions
    explicit_req = [s for s in (jd.required_skills or []) if s]
    explicit_pref = [s for s in (jd.preferred_skills or []) if s]

    # Combine
    final_required = list(dict.fromkeys(req_skills_auto + explicit_req))
    final_preferred = list(dict.fromkeys(pref_skills_auto + explicit_pref))

    # If no explicit separation exists in JD text or request, use deterministic fallback
    if not final_required and not final_preferred and all_extracted_skills:
        # Fallback rule: top 70% skills as required, rest as preferred
        split_idx = max(1, int(len(all_extracted_skills) * 0.7))
        final_required = all_extracted_skills[:split_idx]
        final_preferred = all_extracted_skills[split_idx:]
    elif not final_required and all_extracted_skills:
        # If preferred was extracted but no required, general skills become required
        general_skills = [s for s in all_extracted_skills if s not in final_preferred]
        final_required = general_skills if general_skills else all_extracted_skills

    years_exp = extract_years_experience_jd(text)

    return {
        "title": jd.title or "Target Role",
        "company": jd.company or "Target Company",
        "required_skills": sorted(final_required),
        "preferred_skills": sorted([s for s in final_preferred if s not in final_required]),
        "all_skills": sorted(list(dict.fromkeys(final_required + final_preferred + all_extracted_skills))),
        "years_experience": years_exp,
        "sections": sections,
        "raw_text": text,
    }
