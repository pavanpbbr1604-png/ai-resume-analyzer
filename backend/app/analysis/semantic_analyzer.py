from typing import List, Dict, Any
from app.schemas.document import NormalizedDocument
from app.schemas.suggestion import (
    AISuggestionItem,
    SuggestionCategory,
    SuggestionType,
    SeverityLevel,
    SuggestionStatus,
)
from app.document.location_mapper import LocationMappingEngine

def analyze_semantic(
    doc: NormalizedDocument,
    parsed_jd: Dict[str, Any]
) -> List[AISuggestionItem]:
    suggestions: List[AISuggestionItem] = []
    s_idx = 100

    jd_skills = parsed_jd.get("skills", [])
    raw_resume_text = doc.raw_text.lower()

    # Find skills section
    skills_sec = None
    for sec in doc.sections:
        if sec.section_type == "SKILLS" or "skill" in sec.heading_text.lower():
            skills_sec = sec
            break

    # 1. Missing Keyword / Skill Detection
    missing_skills = []
    for skill in jd_skills:
        if skill.lower() not in raw_resume_text:
            missing_skills.append(skill)

    if missing_skills and skills_sec and skills_sec.paragraphs:
        p_target = skills_sec.paragraphs[0]
        loc, conf = LocationMappingEngine.find_location(doc, p_target.full_text, skills_sec.heading_text)
        
        top_missing = missing_skills[:3]
        s_item = AISuggestionItem(
            suggestion_id=f"sug_sem_{s_idx}",
            category=SuggestionCategory.SKILL_ALIGNMENT,
            type=SuggestionType.MISSING_KEYWORD,
            severity=SeverityLevel.HIGH,
            confidence=0.89,
            requires_user_confirmation=True,
            location=loc,
            location_confidence=conf,
            location_label=loc.location_label,
            original_text=p_target.full_text,
            suggested_text=f"{p_target.full_text}, {', '.join(top_missing)}",
            reasoning=f"Job description strongly emphasizes key skills: {', '.join(top_missing)}.",
            why_it_matters="ATS search algorithms score resumes higher when target skill keywords match exact phrases in job postings.",
            user_prompt_question=f"Do you have hands-on experience with {', '.join(top_missing)}?",
            status=SuggestionStatus.PENDING,
        )
        suggestions.append(s_item)
        s_idx += 1

    # 2. Work Experience Alignment with JD Keywords
    if missing_skills:
        tailored_skills = set()
        for sec in doc.sections:
            if sec.section_type == "EXPERIENCE" or "experience" in sec.heading_text.lower():
                for p in sec.paragraphs:
                    p_text = p.full_text.strip()
                    p_lower = p_text.lower()
                    if p.is_bullet and any(w in p_lower for w in ["developed", "built", "designed", "architected", "deployed", "implemented", "engineered", "led", "managed"]):
                        for m_skill in missing_skills:
                            if m_skill not in tailored_skills and m_skill.lower() not in p_lower:
                                loc, conf = LocationMappingEngine.find_location(doc, p_text, sec.heading_text)
                                suggestions.append(AISuggestionItem(
                                    suggestion_id=f"sug_sem_{s_idx}",
                                    category=SuggestionCategory.EXPERIENCE_RELEVANCE,
                                    type=SuggestionType.EXPERIENCE_ALIGNMENT,
                                    severity=SeverityLevel.MEDIUM,
                                    confidence=0.88,
                                    requires_user_confirmation=True,
                                    location=loc,
                                    location_confidence=conf,
                                    location_label=loc.location_label,
                                    original_text=p_text,
                                    suggested_text=f"{p_text.rstrip('.')} utilizing {m_skill}.",
                                    reasoning=f"Incorporate target job requirement '{m_skill}' into experience accomplishments.",
                                    why_it_matters="Recruiters scan bullet points specifically for where and how required technologies were applied.",
                                    user_prompt_question=f"Did you utilize {m_skill} during this project or role?",
                                    status=SuggestionStatus.PENDING,
                                ))
                                s_idx += 1
                                tailored_skills.add(m_skill)
                                break
                        if len(tailored_skills) >= 2:
                            break

    return suggestions
