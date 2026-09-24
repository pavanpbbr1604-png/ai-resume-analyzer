import re
import hashlib
from typing import Dict, Any, List, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np

from app.schemas.document import NormalizedDocument
from app.schemas.job_description import JobDescriptionRequest
from app.schemas.analysis import (
    AnalysisSummary,
    ATSBreakdown,
    JDMatchBreakdown,
    SectionScore,
)
from app.analysis.skills_taxonomy import (
    extract_canonical_skills,
    CANONICAL_SKILLS,
)
from app.analysis.job_parser import parse_job_description
from app.analysis.semantic_similarity import compute_semantic_similarity

ATS_ALGORITHM_VERSION = "2.0"
SEMANTIC_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Standard section keywords for detection
STANDARD_SECTIONS_PATTERNS = {
    "Summary / Profile": [r'\bsummary\b', r'\bprofessional summary\b', r'\bprofile\b', r'\bobjective\b', r'\babout me\b'],
    "Work Experience": [r'\bexperience\b', r'\bwork experience\b', r'\bemployment\b', r'\bprofessional experience\b', r'\bwork history\b'],
    "Technical Skills": [r'\bskills\b', r'\btechnical skills\b', r'\bcore competencies\b', r'\btech stack\b', r'\btechnologies\b'],
    "Education": [r'\beducation\b', r'\bacademic background\b', r'\bqualifications\b', r'\bdegrees?\b'],
    "Projects": [r'\bprojects\b', r'\bpersonal projects\b', r'\bkey projects\b', r'\btechnical projects\b'],
}

COMMON_TYPOS = [
    "teh", "experiance", "managment", "developement", "maintenence", "succesful",
    "seperate", "recieved", "responsability", "responsabilities", "acheived",
    "collaberated", "implimented", "occured", "definately", "untill", "enviroment",
    "leadship", "profesional", "commited", "refered", "neccessary"
]

VAGUE_FILLERS = [
    r'\b(etc\.|etc)\b',
    r'\bvarious projects\b',
    r'\bvarious tasks\b',
    r'\bmany users\b',
    r'\bseveral features\b'
]

WEAK_VERB_STARTERS = [
    "worked on", "responsible for", "was responsible for", "was tasked with",
    "duties included", "assisted with", "helped with", "participated in",
    "handled", "did", "made"
]

def compute_analysis_hash(resume_text: str, jd_text: Optional[str] = None) -> str:
    """
    Computes deterministic SHA-256 hash incorporating algorithm version,
    semantic model identifier, normalized resume text, and normalized JD text.
    """
    norm_resume = " ".join((resume_text or "").strip().split())
    norm_jd = " ".join((jd_text or "").strip().split()) if (jd_text and jd_text.strip()) else "NO_JD"
    analysis_input = f"{ATS_ALGORITHM_VERSION}|{SEMANTIC_MODEL}|{norm_resume}|{norm_jd}"
    return hashlib.sha256(analysis_input.encode("utf-8")).hexdigest()

def evaluate_parseability(doc: NormalizedDocument) -> float:
    """
    Measures resume parseability (0-100) based on raw text volume,
    character diversity, and absence of corrupted text.
    """
    text = doc.raw_text.strip()
    if not text:
        return 0.0

    length = len(text)
    if length < 150:
        return 25.0

    score = 70.0

    # Character readability (ratio of printable ASCII/common utf-8)
    printable_chars = sum(1 for c in text if 32 <= ord(c) <= 126 or ord(c) in (10, 13, 8220, 8221, 8216, 8217, 8226, 8211, 8212))
    ratio = printable_chars / max(1, length)
    if ratio > 0.95:
        score += 15.0
    elif ratio > 0.85:
        score += 5.0
    else:
        score -= 20.0

    # Text density per page check
    pages = max(1, doc.page_count)
    chars_per_page = length / pages
    if 600 <= chars_per_page <= 4000:
        score += 15.0
    elif 300 <= chars_per_page < 600 or 4000 < chars_per_page <= 6000:
        score += 8.0

    return max(0.0, min(100.0, score))

def evaluate_standard_sections(doc: NormalizedDocument) -> Tuple[float, List[str]]:
    """
    Checks for the 5 standard resume sections (Summary, Experience, Skills, Education, Projects).
    """
    found_sections = set()
    all_headings = " ".join([sec.heading_text.lower() for sec in doc.sections])
    raw_lower = doc.raw_text.lower()

    for sec_name, patterns in STANDARD_SECTIONS_PATTERNS.items():
        # Check explicit section headings first
        if any(re.search(pat, all_headings) for pat in patterns):
            found_sections.add(sec_name)
        elif any(re.search(pat, raw_lower) for pat in patterns):
            found_sections.add(sec_name)

    count = len(found_sections)
    if count >= 5:
        score = 100.0
    elif count == 4:
        score = 85.0
    elif count == 3:
        score = 70.0
    elif count == 2:
        score = 50.0
    elif count == 1:
        score = 30.0
    else:
        score = 10.0

    return score, list(found_sections)

def evaluate_contact_info(doc: NormalizedDocument) -> float:
    """
    Evaluates presence of Email (+35), Phone (+25), LinkedIn/GitHub/Portfolio (+25), Location (+15).
    """
    text = doc.raw_text
    score = 0.0

    # Email
    if re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text):
        score += 35.0

    # Phone
    if re.search(r'(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', text) or re.search(r'\b\d{10}\b', text):
        score += 25.0

    # LinkedIn / GitHub / Portfolio
    if re.search(r'(?i)(?:linkedin\.com|github\.com|gitlab\.com|\bportfolio\b|\bhttps?://)', text):
        score += 25.0

    # Location (City, State, Country or Zip)
    if re.search(r'(?i)\b(?:[A-Z][a-zA-Z]+,\s*[A-Z]{2}\b|[A-Z][a-zA-Z]+,\s*[A-Z][a-zA-Z]+|\bUSA\b|\bIndia\b|\bCanada\b|\bUK\b|\bGermany\b|\bSan Francisco\b|\bNew York\b|\bAustin\b|\bSeattle\b|\bBengaluru\b|\bBangalore\b|\bHyderabad\b|\bLondon\b)', text):
        score += 15.0

    return max(0.0, min(100.0, score))

def evaluate_skills_inventory(doc: NormalizedDocument) -> Tuple[float, List[str]]:
    """
    Evaluates quantity, diversity, and canonical representation of technical skills.
    """
    extracted = extract_canonical_skills(doc.raw_text)
    count = len(extracted)

    if count >= 10:
        score = 100.0
    elif count >= 8:
        score = 90.0
    elif count >= 6:
        score = 80.0
    elif count >= 4:
        score = 70.0
    elif count >= 2:
        score = 55.0
    elif count == 1:
        score = 40.0
    else:
        score = 15.0

    # Bonus if there is an explicit Skills section
    has_skills_section = any("skill" in sec.heading_text.lower() or sec.section_type == "SKILLS" for sec in doc.sections)
    if not has_skills_section:
        score = max(0.0, score - 15.0)

    return score, extracted

def evaluate_experience_projects(doc: NormalizedDocument) -> float:
    """
    Evaluates action verbs, quantifiable metrics, and bullet structure.
    """
    bullets = []
    for sec in doc.sections:
        for p in sec.paragraphs:
            if p.is_bullet or p.full_text.strip().startswith(("•", "-", "*")):
                bullets.append(p.full_text.strip())

    if not bullets:
        # Check regular paragraphs
        all_paras = [p.full_text.strip() for sec in doc.sections for p in sec.paragraphs if len(p.full_text.strip()) > 20]
        if len(all_paras) < 3:
            return 30.0
        bullets = all_paras

    score = 60.0

    # Metric presence
    bullets_with_metrics = sum(1 for b in bullets if re.search(r'\d+%|\$\d+|\b\d+\b', b))
    metric_ratio = bullets_with_metrics / max(1, len(bullets))
    score += metric_ratio * 25.0

    # Action verb starters
    bullets_with_weak_verbs = sum(1 for b in bullets if any(b.lower().startswith(w) for w in WEAK_VERB_STARTERS))
    weak_ratio = bullets_with_weak_verbs / max(1, len(bullets))
    score -= weak_ratio * 20.0

    if len(bullets) >= 4:
        score += 15.0

    return max(0.0, min(100.0, score))

def evaluate_formatting_safety(doc: NormalizedDocument) -> float:
    """
    Measures page count efficiency, layout safety, and typography consistency.
    """
    score = 85.0

    # Page count
    pages = doc.page_count
    if pages == 1 or pages == 2:
        score += 15.0
    elif pages == 3:
        score += 5.0
    elif pages > 3:
        score -= 20.0

    # Bullet consistency
    bullets = [p for sec in doc.sections for p in sec.paragraphs if p.is_bullet]
    if bullets:
        has_period_count = sum(1 for b in bullets if b.full_text.strip().endswith((".", ";", "!")))
        period_ratio = has_period_count / len(bullets)
        if period_ratio >= 0.85 or period_ratio <= 0.15:
            score += 0.0  # Consistent
        else:
            score -= 10.0  # Inconsistent punctuation

    return max(0.0, min(100.0, score))

def evaluate_content_optimization(doc: NormalizedDocument) -> float:
    """
    Evaluates absence of typos, passive voice reduction, and filler words.
    """
    text_lower = doc.raw_text.lower()
    score = 100.0

    # Typos
    words = re.findall(r'\b[a-z]+\b', text_lower)
    typos_count = sum(1 for w in words if w in COMMON_TYPOS)
    score -= typos_count * 10.0

    # Vague fillers
    for pattern in VAGUE_FILLERS:
        matches = re.findall(pattern, text_lower)
        score -= len(matches) * 6.0

    # Passive phrases
    for weak in WEAK_VERB_STARTERS:
        matches = len(re.findall(r'\b' + re.escape(weak) + r'\b', text_lower))
        score -= matches * 3.0

    return max(0.0, min(100.0, score))

def calculate_ats_score(doc: NormalizedDocument) -> Tuple[int, ATSBreakdown, List[str], List[SectionScore]]:
    """
    Calculates deterministic ATS Compatibility Score (0-100) and full breakdown.
    Completely independent of the Job Description.
    """
    parseability = evaluate_parseability(doc)
    sections_score, found_sections = evaluate_standard_sections(doc)
    contact = evaluate_contact_info(doc)
    skills_score, extracted_skills = evaluate_skills_inventory(doc)
    exp_projects = evaluate_experience_projects(doc)
    formatting = evaluate_formatting_safety(doc)
    content = evaluate_content_optimization(doc)

    weighted_ats = (
        parseability * 0.20 +
        sections_score * 0.20 +
        contact * 0.10 +
        skills_score * 0.15 +
        exp_projects * 0.15 +
        formatting * 0.10 +
        content * 0.10
    )

    final_ats = max(0, min(100, round(weighted_ats)))

    breakdown = ATSBreakdown(
        parseability=round(parseability, 1),
        standard_sections=round(sections_score, 1),
        contact_info=round(contact, 1),
        skills_inventory=round(skills_score, 1),
        experience_projects=round(exp_projects, 1),
        formatting_safety=round(formatting, 1),
        content_optimization=round(content, 1),
    )

    section_scores = [
        SectionScore(
            section_name="Document Parseability & Machine Readability",
            score=round(parseability, 1),
            details=f"Evaluated raw text extraction density and character clarity."
        ),
        SectionScore(
            section_name="Standard Sections Completeness",
            score=round(sections_score, 1),
            details=f"Identified {len(found_sections)} standard sections: {', '.join(found_sections) if found_sections else 'None'}."
        ),
        SectionScore(
            section_name="Contact Information & Links",
            score=round(contact, 1),
            details="Validated email, phone number, location, and professional profiles."
        ),
        SectionScore(
            section_name="Technical Skills Inventory",
            score=round(skills_score, 1),
            details=f"Detected {len(extracted_skills)} standardized canonical skills in resume."
        ),
        SectionScore(
            section_name="Experience & Quantifiable Impact",
            score=round(exp_projects, 1),
            details="Evaluated bullet phrasing, strong action verbs, and numerical metrics."
        ),
        SectionScore(
            section_name="Formatting & ATS Safety",
            score=round(formatting, 1),
            details=f"Page count ({doc.page_count} pages) and layout structure safety."
        ),
        SectionScore(
            section_name="Content Optimization & Grammar",
            score=round(content, 1),
            details="Screened for spelling mistakes, passive phrases, and vague filler terms."
        ),
    ]

    return final_ats, breakdown, extracted_skills, section_scores

def extract_years_experience_resume(text: str) -> float:
    """
    Deterministically computes total candidate years of experience from resume text.
    Looks for date ranges like '2021 - 2024' or stated years like '4 years experience'.
    """
    total_years = 0.0
    # Match 4-digit year ranges like 2019-2023 or 2020 - Present
    ranges = re.findall(r'\b(19\d{2}|20\d{2})\s*[-–—to]+\s*(19\d{2}|20\d{2}|[Pp]resent|[Cc]urrent)\b', text)
    for start, end in ranges:
        try:
            start_yr = int(start)
            end_yr = 2026 if end.lower() in ("present", "current") else int(end)
            diff = max(0, end_yr - start_yr)
            total_years += diff
        except Exception:
            continue

    if total_years > 0:
        return min(30.0, total_years)

    # Stated years
    stated = re.findall(r'(\d+)\s*(?:\+|plus)?\s*(?:years?|yrs?)\b(?:\s+of)?\s+(?:experience|exp)', text, re.IGNORECASE)
    if stated:
        try:
            return float(max(int(s) for s in stated))
        except Exception:
            pass

    return 2.0  # baseline estimate if unstated

def evaluate_education_match(resume_text: str, jd_text: str) -> float:
    """
    Evaluates degrees (B.E., B.Tech, B.S., M.S., Ph.D.) and fields (CS, IT, etc.)
    with equivalence normalization.
    """
    res_lower = resume_text.lower()
    jd_lower = jd_text.lower()

    # Degree patterns
    bachelor_pats = [r'\bb\.?e\.?\b', r'\bb\.?tech\b', r'\bb\.?s\.?\b', r'\bbachelor', r'\bundergraduate\b']
    master_pats = [r'\bm\.?e\.?\b', r'\bm\.?tech\b', r'\bm\.?s\.?\b', r'\bmaster', r'\bpostgraduate\b']
    phd_pats = [r'\bph\.?d\b', r'\bdoctorate\b']

    # Major patterns
    cs_majors = [r'\bcomputer\s+science\b', r'\bcse\b', r'\binformation\s+technology\b', r'\bsoftware\s+engineering\b', r'\bdata\s+science\b']

    res_has_bach = any(re.search(p, res_lower) for p in bachelor_pats)
    res_has_mast = any(re.search(p, res_lower) for p in master_pats)
    res_has_phd = any(re.search(p, res_lower) for p in phd_pats)
    res_has_cs = any(re.search(p, res_lower) for p in cs_majors)

    jd_has_bach = any(re.search(p, jd_lower) for p in bachelor_pats)
    jd_has_mast = any(re.search(p, jd_lower) for p in master_pats)
    jd_has_phd = any(re.search(p, jd_lower) for p in phd_pats)
    jd_has_cs = any(re.search(p, jd_lower) for p in cs_majors)

    # If JD specifies nothing about education, give high baseline
    if not (jd_has_bach or jd_has_mast or jd_has_phd or jd_has_cs):
        return 100.0 if (res_has_bach or res_has_mast or res_has_cs) else 80.0

    score = 70.0
    if jd_has_phd and res_has_phd:
        score = 100.0
    elif jd_has_mast and (res_has_mast or res_has_phd):
        score = 100.0
    elif jd_has_bach and (res_has_bach or res_has_mast or res_has_phd):
        score = 100.0
    elif res_has_bach or res_has_mast:
        score = 85.0  # Close degree or equivalent

    if jd_has_cs and res_has_cs:
        score = min(100.0, score + 10.0)

    return score

def compute_technical_keyword_score(resume_text: str, jd_text: str, resume_skills: List[str], jd_skills: List[str]) -> float:
    """
    Technical Keywords (15%): TF-IDF + normalized technical keyword overlap.
    Excludes generic stopwords.
    """
    if not jd_skills:
        return 80.0

    # 1. Canonical overlap
    res_skill_set = set(resume_skills)
    jd_skill_set = set(jd_skills)
    matched_skills = res_skill_set.intersection(jd_skill_set)
    overlap_ratio = len(matched_skills) / max(1, len(jd_skill_set))
    overlap_score = overlap_ratio * 100.0

    # 2. TF-IDF technical vocabulary cosine similarity
    tfidf_score = 50.0
    try:
        vec = TfidfVectorizer(
            stop_words='english',
            token_pattern=r'(?u)\b[A-Za-z0-9+#.-]{2,}\b',
            max_features=200
        )
        tfidf_mat = vec.fit_transform([resume_text, jd_text])
        sim = float((tfidf_mat[0] * tfidf_mat[1].T).toarray()[0][0])
        tfidf_score = max(0.0, min(100.0, sim * 100.0))
    except Exception:
        tfidf_score = overlap_score

    # Blended score: 60% overlap + 40% TF-IDF
    blended = overlap_score * 0.60 + tfidf_score * 0.40
    return max(0.0, min(100.0, blended))

def calculate_jd_match_score(
    doc: NormalizedDocument,
    jd: JobDescriptionRequest
) -> Tuple[Optional[int], Optional[JDMatchBreakdown], List[str], List[str], List[str]]:
    """
    Calculates deterministic Resume-Job Description Match Score (0-100%).
    Returns (None, None, matched, [], []) if JD is empty (No-JD mode).
    """
    if not jd.text or not jd.text.strip():
        # Standalone No-JD Mode
        resume_skills = extract_canonical_skills(doc.raw_text)
        return None, None, resume_skills, [], []

    parsed_jd = parse_job_description(jd)
    resume_skills = extract_canonical_skills(doc.raw_text)
    resume_skills_set = set(resume_skills)

    req_skills = parsed_jd["required_skills"]
    pref_skills = parsed_jd["preferred_skills"]
    all_jd_skills = parsed_jd["all_skills"]

    # 1. Required Skills Score (30%)
    matched_required = [s for s in req_skills if s in resume_skills_set]
    missing_required = [s for s in req_skills if s not in resume_skills_set]
    if req_skills:
        req_score = (len(matched_required) / len(req_skills)) * 100.0
    else:
        req_score = 80.0

    # 2. Preferred Skills Score (10%)
    matched_preferred = [s for s in pref_skills if s in resume_skills_set]
    missing_preferred = [s for s in pref_skills if s not in resume_skills_set]
    if pref_skills:
        pref_score = (len(matched_preferred) / len(pref_skills)) * 100.0
    else:
        pref_score = 75.0  # Neutral fallback when no preferred skills specified

    # Overall matched skills across all JD skills
    all_matched = sorted(list(set(matched_required + matched_preferred + [s for s in all_jd_skills if s in resume_skills_set])))

    # 3. Technical Keywords (15%)
    tech_score = compute_technical_keyword_score(doc.raw_text, jd.text, resume_skills, all_jd_skills)

    # 4. Semantic Similarity (20%) using all-MiniLM-L6-v2
    # Prepare structured sections for semantic comparison
    resume_sections_text = []
    for sec in doc.sections:
        if sec.section_type in ("SUMMARY", "EXPERIENCE", "PROJECTS", "SKILLS") or any(k in sec.heading_text.lower() for k in ["summary", "experience", "project", "skill", "work"]):
            sec_body = " ".join(p.full_text for p in sec.paragraphs)
            resume_sections_text.append(f"{sec.heading_text}: {sec_body}")

    prepared_resume = "\n".join(resume_sections_text) if resume_sections_text else doc.raw_text[:2000]
    prepared_jd = f"{jd.title or ''}\n{jd.text[:2000]}"

    semantic_score = compute_semantic_similarity(prepared_resume, prepared_jd)

    # 5. Experience Match (10%)
    resume_years = extract_years_experience_resume(doc.raw_text)
    jd_years = parsed_jd.get("years_experience")
    if jd_years and jd_years > 0:
        if resume_years >= jd_years:
            exp_score = 100.0
        else:
            exp_score = (resume_years / jd_years) * 100.0
    else:
        exp_score = 85.0  # Neutral fallback

    # 6. Education Match (5%)
    edu_score = evaluate_education_match(doc.raw_text, jd.text)

    # 7. Relevant Projects / Experience (10%)
    # Evaluates project / experience content against JD keywords
    project_paras = [p.full_text for sec in doc.sections if any(k in sec.heading_text.lower() for k in ["project", "experience", "work"]) for p in sec.paragraphs]
    proj_text = " ".join(project_paras) if project_paras else doc.raw_text
    proj_skills = extract_canonical_skills(proj_text)
    proj_matched = [s for s in all_jd_skills if s in proj_skills]
    if all_jd_skills:
        proj_score = min(100.0, (len(proj_matched) / max(1, len(all_jd_skills))) * 120.0)
    else:
        proj_score = 75.0

    # Fixed JD Match Score Formula:
    # jd_match_score = round(
    #     required_skills * 0.30 +
    #     preferred_skills * 0.10 +
    #     technical_keywords * 0.15 +
    #     semantic_similarity * 0.20 +
    #     experience * 0.10 +
    #     education * 0.05 +
    #     projects_experience * 0.10
    # )
    weighted_jd = (
        req_score * 0.30 +
        pref_score * 0.10 +
        tech_score * 0.15 +
        semantic_score * 0.20 +
        exp_score * 0.10 +
        edu_score * 0.05 +
        proj_score * 0.10
    )

    final_jd_score = max(0, min(100, round(weighted_jd)))

    breakdown = JDMatchBreakdown(
        required_skills=round(req_score, 1),
        preferred_skills=round(pref_score, 1),
        technical_keywords=round(tech_score, 1),
        semantic_similarity=round(semantic_score, 1),
        experience_match=round(exp_score, 1),
        education_match=round(edu_score, 1),
        projects_experience=round(proj_score, 1),
    )

    return final_jd_score, breakdown, all_matched, missing_required, missing_preferred

def run_deterministic_analysis(
    doc: NormalizedDocument,
    jd: JobDescriptionRequest,
    total_suggestions: int = 0,
    crit_count: int = 0,
    high_count: int = 0,
    med_count: int = 0,
    low_count: int = 0
) -> AnalysisSummary:
    """
    Executes complete deterministic V2 scoring for both ATS Score and JD Match.
    """
    has_jd = bool(jd.text and jd.text.strip())

    # 1. Deterministic ATS Score (independent of JD)
    ats_score, ats_breakdown, res_skills, section_scores = calculate_ats_score(doc)

    # 2. Deterministic JD Match Score (or None if no JD)
    jd_score, jd_breakdown, matched_skills, missing_req, missing_pref = calculate_jd_match_score(doc, jd)

    # 3. Deterministic SHA-256 analysis hash
    analysis_hash = compute_analysis_hash(doc.raw_text, jd.text if has_jd else None)

    # If standalone mode, matched_skills is resume skills
    if not has_jd:
        matched_skills = res_skills
        missing_req = []
        missing_pref = []
        missing_all = []
    else:
        missing_all = sorted(list(set(missing_req + missing_pref)))

    overall_score = jd_score if has_jd else ats_score

    return AnalysisSummary(
        overall_match_score=float(overall_score),
        ats_score=ats_score,
        ats_breakdown=ats_breakdown,
        jd_match_score=jd_score,
        jd_match_breakdown=jd_breakdown,
        skills_match_score=jd_breakdown.required_skills if jd_breakdown else ats_breakdown.skills_inventory,
        experience_match_score=jd_breakdown.experience_match if jd_breakdown else ats_breakdown.experience_projects,
        formatting_score=ats_breakdown.formatting_safety,
        clarity_score=ats_breakdown.content_optimization,
        total_suggestions=total_suggestions,
        critical_issues=crit_count,
        high_priority_issues=high_count,
        medium_priority_issues=med_count,
        low_priority_issues=low_count,
        matched_skills=matched_skills,
        missing_required_skills=missing_req,
        missing_preferred_skills=missing_pref,
        missing_keywords=missing_all,
        section_scores=section_scores,
        has_jd=has_jd,
        analysis_mode="targeted" if has_jd else "standalone",
        algorithm_version=ATS_ALGORITHM_VERSION,
        semantic_model=SEMANTIC_MODEL,
        analysis_hash=analysis_hash,
    )
