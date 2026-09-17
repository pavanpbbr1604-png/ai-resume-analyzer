import re
from typing import List
from app.schemas.document import NormalizedDocument
from app.schemas.suggestion import (
    AISuggestionItem,
    SuggestionCategory,
    SuggestionType,
    SeverityLevel,
    SuggestionStatus,
)
from app.document.location_mapper import LocationMappingEngine

WEAK_VERBS_MAP = {
    "worked on": "Spearheaded development of",
    "responsible for": "Orchestrated and managed",
    "was responsible for": "Spearheaded and directed",
    "was tasked with": "Engineered",
    "duties included": "Delivered",
    "assisted with": "Collaborated on",
    "helped with": "Contributed to key milestones of",
    "participated in": "Partnered to implement",
    "handled": "Executed and optimized",
    "did": "Implemented",
    "made": "Engineered",
    "served as": "Operated as",
    "familiar with": "Proficient in",
}

PASSIVE_PHRASES_MAP = {
    "was responsible for": "Spearheaded",
    "was tasked with": "Engineered",
    "duties included": "Delivered",
    "assisted with": "Collaborated to deliver",
    "participated in": "Partnered to implement",
}

COMMON_RESUME_TYPOS = {
    "teh": "the",
    "experiance": "experience",
    "managment": "management",
    "developement": "development",
    "maintenence": "maintenance",
    "succesful": "successful",
    "seperate": "separate",
    "recieved": "received",
    "responsability": "responsibility",
    "responsabilities": "responsibilities",
    "acheived": "achieved",
    "collaberated": "collaborated",
    "implimented": "implemented",
    "occured": "occurred",
    "definately": "definitely",
    "untill": "until",
    "enviroment": "environment",
    "leadship": "leadership",
    "profesional": "professional",
    "commited": "committed",
    "refered": "referred",
    "neccessary": "necessary",
}

VAGUE_FILLER_RULES = [
    (r'\b(etc\.|etc)\b', "Specify actual tools, frameworks, or methodologies instead of the vague placeholder 'etc.'"),
    (r'\bvarious projects\b', "Name the specific projects, products, or systems rather than using 'various projects'."),
    (r'\bvarious tasks\b', "Specify the concrete engineering responsibilities delivered rather than 'various tasks'."),
    (r'\bmany users\b', "Quantify user scale (e.g. '10,000+ active users') rather than using 'many users'."),
    (r'\bseveral features\b', "Specify or quantify the key features shipped rather than 'several features'."),
]

TECH_KEYWORDS_CASE = {
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "react": "React",
    "fastapi": "FastAPI",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "aws": "AWS",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mongodb": "MongoDB",
    "graphql": "GraphQL",
    "redis": "Redis",
    "github": "GitHub",
    "gitlab": "GitLab",
    "linux": "Linux",
    "node": "Node.js",
    "nodejs": "Node.js",
}

def analyze_deterministic(doc: NormalizedDocument) -> List[AISuggestionItem]:
    suggestions: List[AISuggestionItem] = []
    s_idx = 1

    for sec in doc.sections:
        for p in sec.paragraphs:
            p_text = p.full_text.strip()
            if not p_text or len(p_text) < 10:
                continue

            # Check 1: Trailing punctuation on bullets
            if p.is_bullet and not p_text.endswith((".", ";", "!")):
                loc, conf = LocationMappingEngine.find_location(doc, p_text, sec.heading_text)
                s_item = AISuggestionItem(
                    suggestion_id=f"sug_det_{s_idx}",
                    category=SuggestionCategory.PUNCTUATION,
                    type=SuggestionType.PUNCTUATION_ERROR,
                    severity=SeverityLevel.LOW,
                    confidence=0.98,
                    requires_user_confirmation=True,
                    location=loc,
                    location_confidence=conf,
                    original_text=p_text,
                    suggested_text=f"{p_text}.",
                    reasoning="Bullet point should end with a period for consistent professional formatting.",
                    why_it_matters="Punctuation consistency improves ATS formatting scores and readability.",
                    status=SuggestionStatus.PENDING,
                )
                suggestions.append(s_item)
                s_idx += 1

            # Check 2: Weak action verbs & passive voice phrasing
            p_lower = p_text.lower()
            weak_matched = False
            for weak, strong in WEAK_VERBS_MAP.items():
                if p_lower.startswith(weak):
                    match_str = p_text[:len(weak)]
                    loc, conf = LocationMappingEngine.find_location(doc, match_str, sec.heading_text)
                    s_item = AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.WEAK_WORDING,
                        type=SuggestionType.WEAK_BULLET,
                        severity=SeverityLevel.MEDIUM,
                        confidence=0.92,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        original_text=match_str,
                        suggested_text=strong,
                        reasoning=f"Replace weak phrasing '{match_str}' with impactful action verb '{strong}'.",
                        why_it_matters="Active verbs demonstrate ownership and drive stronger recruiter engagement.",
                        status=SuggestionStatus.PENDING,
                    )
                    suggestions.append(s_item)
                    s_idx += 1
                    weak_matched = True
                    break

            # Passive voice check if not already matched at start
            if not weak_matched:
                for passive, active_replacement in PASSIVE_PHRASES_MAP.items():
                    idx = p_lower.find(passive)
                    if idx != -1:
                        match_str = p_text[idx:idx + len(passive)]
                        loc, conf = LocationMappingEngine.find_location(doc, match_str, sec.heading_text)
                        s_item = AISuggestionItem(
                            suggestion_id=f"sug_det_{s_idx}",
                            category=SuggestionCategory.WEAK_WORDING,
                            type=SuggestionType.WEAK_SENTENCE,
                            severity=SeverityLevel.MEDIUM,
                            confidence=0.90,
                            requires_user_confirmation=True,
                            location=loc,
                            location_confidence=conf,
                            original_text=match_str,
                            suggested_text=active_replacement,
                            reasoning=f"Replace passive voice '{match_str}' with active phrasing '{active_replacement}'.",
                            why_it_matters="Active voice conveys decisive ownership and scores higher on recruiter and ATS readability checks.",
                            status=SuggestionStatus.PENDING,
                        )
                        suggestions.append(s_item)
                        s_idx += 1
                        break

            # Check 3: Technical keyword capitalization
            words = re.findall(r'\b[A-Za-z0-9]+\b', p_text)
            for w in words:
                w_lower = w.lower()
                if w_lower in TECH_KEYWORDS_CASE and TECH_KEYWORDS_CASE[w_lower] != w:
                    correct_casing = TECH_KEYWORDS_CASE[w_lower]
                    loc, conf = LocationMappingEngine.find_location(doc, w, sec.heading_text)
                    s_item = AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.CONSISTENCY,
                        type=SuggestionType.FORMATTING_INCONSISTENCY,
                        severity=SeverityLevel.LOW,
                        confidence=0.95,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        original_text=w,
                        suggested_text=correct_casing,
                        reasoning=f"Standardize technology capitalization: '{w}' -> '{correct_casing}'.",
                        why_it_matters="Proper noun formatting shows attention to detail in technical roles.",
                        status=SuggestionStatus.PENDING,
                    )
                    suggestions.append(s_item)
                    s_idx += 1

            # Check 4: Missing metrics safeguard ("USER_INPUT_REQUIRED")
            if p.is_bullet and any(kw in p_lower for kw in ["improved", "increased", "reduced", "optimized", "developed"]):
                if not re.search(r'\d+%|\$\d+|\b\d+\b', p_text):
                    loc, conf = LocationMappingEngine.find_location(doc, p_text, sec.heading_text)
                    s_item = AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.MISSING_CONTEXT,
                        type=SuggestionType.USER_INPUT_REQUIRED,
                        severity=SeverityLevel.HIGH,
                        confidence=0.88,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        original_text=p_text,
                        suggested_text=p_text,  # Awaiting user input
                        reasoning="Impact bullet lacks quantifiable metric (e.g. %, $, or numbers).",
                        why_it_matters="Quantified achievements carry 40% higher weight with hiring managers.",
                        user_prompt_question="By what percentage or metric did you improve/reduce this outcome?",
                        status=SuggestionStatus.PENDING,
                    )
                    suggestions.append(s_item)
                    s_idx += 1

            # Check 5: Spelling typos and common mistake correction
            for token in words:
                token_lower = token.lower()
                if token_lower in COMMON_RESUME_TYPOS:
                    correct_word = COMMON_RESUME_TYPOS[token_lower]
                    if token.istitle():
                        correct_word = correct_word.capitalize()
                    loc, conf = LocationMappingEngine.find_location(doc, token, sec.heading_text)
                    s_item = AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.GRAMMAR,
                        type=SuggestionType.SPELLING_ERROR,
                        severity=SeverityLevel.HIGH,
                        confidence=0.99,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        original_text=token,
                        suggested_text=correct_word,
                        reasoning=f"Correct spelling mistake: '{token}' -> '{correct_word}'.",
                        why_it_matters="Spelling errors create negative recruiter impressions and fail ATS spell-checking passes.",
                        status=SuggestionStatus.PENDING,
                    )
                    suggestions.append(s_item)
                    s_idx += 1

            # Check 6: Vague filler words (e.g., 'etc.', 'various projects', 'many users')
            for pattern, guidance in VAGUE_FILLER_RULES:
                match = re.search(pattern, p_text, re.IGNORECASE)
                if match:
                    filler_str = match.group(0)
                    loc, conf = LocationMappingEngine.find_location(doc, filler_str, sec.heading_text)
                    s_item = AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.WEAK_WORDING,
                        type=SuggestionType.UNCLEAR_CONTENT,
                        severity=SeverityLevel.LOW,
                        confidence=0.94,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        original_text=filler_str,
                        suggested_text="",
                        reasoning=f"Remove vague filler '{filler_str}'. {guidance}",
                        why_it_matters="ATS keywords must be concrete nouns; recruiters discard vague placeholders.",
                        status=SuggestionStatus.PENDING,
                    )
                    suggestions.append(s_item)
                    s_idx += 1

    return suggestions
