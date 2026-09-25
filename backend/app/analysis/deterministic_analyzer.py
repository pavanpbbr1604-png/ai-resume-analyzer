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
    "made": "Developed",
    "served as": "Operated as",
    "familiar with": "Proficient in",
    "good knowledge of": "Proficient in",
    "good knowledge": "Proficient in",
    "using": "leveraging",
    "used": "implemented",
    "created": "developed",
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
    "reactjs": "React",
    "fastapi": "FastAPI",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "aws": "AWS",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    "graphql": "GraphQL",
    "redis": "Redis",
    "github": "GitHub",
    "gitlab": "GitLab",
    "git": "Git",
    "linux": "Linux",
    "node": "Node.js",
    "nodejs": "Node.js",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "yolov8": "YOLOv8",
    "yolo": "YOLOv8",
    "html": "HTML5",
    "css": "CSS3",
    "php": "PHP",
    "sql": "SQL",
}

SPECIFIC_PHRASE_UPGRADES = [
    (
        r"used yolov8 to detect people in crowded environments",
        "Implemented YOLOv8-based person detection for real-time crowd analysis.",
        "The revised version is more specific and uses stronger action-oriented wording."
    ),
    (
        r"made an e-?commerce website using php",
        "Developed a full-stack e-commerce platform using PHP and MySQL with an admin dashboard and payment integration.",
        "The original statement is too vague and does not communicate the scope of the project."
    ),
    (
        r"worked on a project for crowd detection",
        "Developed a crowd detection system using YOLOv8 and DeepSORT.",
        "Uses precise technical terminology and communicates direct engineering ownership."
    ),
    (
        r"worked on crowd detection using yolo",
        "Developed a YOLOv8-based crowd detection system for multi-perspective crowd analysis.",
        "Uses stronger action verbs and provides clearer technical context."
    )
]

def analyze_deterministic(doc: NormalizedDocument) -> List[AISuggestionItem]:
    suggestions: List[AISuggestionItem] = []
    s_idx = 1

    for sec in doc.sections:
        for p in sec.paragraphs:
            p_text = p.full_text.strip()
            if not p_text or len(p_text) < 4:
                continue

            p_lower = p_text.lower()

            # Check 0: Specific Project Phrase Upgrades (High-value contextual replacements)
            matched_phrase_upgrade = False
            for pattern, upgrade_replacement, why_reason in SPECIFIC_PHRASE_UPGRADES:
                match = re.search(pattern, p_lower)
                if match:
                    matched_str = p_text[match.start():match.end()]
                    loc, conf = LocationMappingEngine.find_location(doc, matched_str, sec.heading_text)
                    suggestions.append(AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.CONTENT_RELEVANCE,
                        type=SuggestionType.PROJECT_DESCRIPTION,
                        severity=SeverityLevel.HIGH,
                        confidence=0.98,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        location_label=loc.location_label,
                        original_text=matched_str,
                        suggested_text=upgrade_replacement,
                        reasoning=why_reason,
                        why_it_matters="Technical depth and action verbs significantly boost ATS screening and hiring manager interest.",
                        status=SuggestionStatus.PENDING,
                    ))
                    s_idx += 1
                    matched_phrase_upgrade = True
                    break

            if matched_phrase_upgrade:
                continue

            # Check 1: Trailing punctuation on bullets
            if p.is_bullet and len(p_text) > 15 and not p_text.endswith((".", ";", "!")):
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
                    location_label=loc.location_label,
                    original_text=p_text,
                    suggested_text=f"{p_text}.",
                    reasoning="Bullet point should end with a period for consistent professional formatting.",
                    why_it_matters="Punctuation consistency improves ATS formatting scores and readability.",
                    status=SuggestionStatus.PENDING,
                )
                suggestions.append(s_item)
                s_idx += 1

            # Check 2: Weak action verbs & passive voice phrasing (Micro and Phrase Level)
            weak_matched = False
            # Check prefix match first
            for weak, strong in WEAK_VERBS_MAP.items():
                if p_lower.startswith(weak) and (len(p_lower) == len(weak) or not p_lower[len(weak)].isalnum()):
                    match_str = p_text[:len(weak)]
                    loc, conf = LocationMappingEngine.find_location(doc, match_str, sec.heading_text)
                    capitalized_strong = strong.capitalize() if match_str[0].isupper() else strong
                    suggestions.append(AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.WEAK_WORDING,
                        type=SuggestionType.WEAK_BULLET,
                        severity=SeverityLevel.MEDIUM,
                        confidence=0.94,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        location_label=loc.location_label,
                        original_text=match_str,
                        suggested_text=capitalized_strong,
                        reasoning=f"Replace weak phrasing '{match_str}' with impactful action verb '{capitalized_strong}'.",
                        why_it_matters="Active verbs demonstrate ownership and drive stronger recruiter engagement.",
                        status=SuggestionStatus.PENDING,
                    ))
                    s_idx += 1
                    weak_matched = True
                    break

            # Mid-sentence weak words and passive voice check
            if not weak_matched:
                for weak, strong in WEAK_VERBS_MAP.items():
                    pattern = r'\b' + re.escape(weak) + r'\b'
                    match = re.search(pattern, p_text, re.IGNORECASE)
                    if match:
                        match_str = p_text[match.start():match.end()]
                        loc, conf = LocationMappingEngine.find_location(doc, match_str, sec.heading_text)
                        rep_text = strong.capitalize() if match_str[0].isupper() else strong.lower()
                        suggestions.append(AISuggestionItem(
                            suggestion_id=f"sug_det_{s_idx}",
                            category=SuggestionCategory.WEAK_WORDING,
                            type=SuggestionType.WEAK_SENTENCE,
                            severity=SeverityLevel.MEDIUM,
                            confidence=0.91,
                            requires_user_confirmation=True,
                            location=loc,
                            location_confidence=conf,
                            location_label=loc.location_label,
                            original_text=match_str,
                            suggested_text=rep_text,
                            reasoning=f"Upgrade '{match_str}' to '{rep_text}' for stronger technical clarity.",
                            why_it_matters="Active, precise wording highlights candidate execution capability.",
                            status=SuggestionStatus.PENDING,
                        ))
                        s_idx += 1
                        break

            # Check 3: Technical keyword capitalization & standardization
            words = re.findall(r'\b[A-Za-z0-9+#.]+\b', p_text)
            for w in words:
                w_lower = w.lower()
                if w_lower in TECH_KEYWORDS_CASE and TECH_KEYWORDS_CASE[w_lower] != w:
                    correct_casing = TECH_KEYWORDS_CASE[w_lower]
                    loc, conf = LocationMappingEngine.find_location(doc, w, sec.heading_text)
                    suggestions.append(AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.CONSISTENCY,
                        type=SuggestionType.FORMATTING_INCONSISTENCY,
                        severity=SeverityLevel.LOW,
                        confidence=0.96,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        location_label=loc.location_label,
                        original_text=w,
                        suggested_text=correct_casing,
                        reasoning=f"Use standard technical naming: '{w}' -> '{correct_casing}'.",
                        why_it_matters="Standardized technical nomenclature passes ATS exact-string tokenizers and looks professional.",
                        status=SuggestionStatus.PENDING,
                    ))
                    s_idx += 1

            # Check 4: Missing metrics safeguard ("USER_INPUT_REQUIRED")
            if p.is_bullet and any(kw in p_lower for kw in ["improved", "increased", "reduced", "optimized", "enhanced", "boosted"]):
                if not re.search(r'\d+%|\$\d+|\b\d+\b', p_text):
                    loc, conf = LocationMappingEngine.find_location(doc, p_text, sec.heading_text)
                    suggestions.append(AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.MISSING_CONTEXT,
                        type=SuggestionType.USER_INPUT_REQUIRED,
                        severity=SeverityLevel.HIGH,
                        confidence=0.88,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        location_label=loc.location_label,
                        original_text=p_text,
                        suggested_text=p_text,  # Awaiting user input
                        reasoning="Impact bullet lacks quantifiable metric (e.g. %, latency reduction, or user scale).",
                        why_it_matters="Quantified achievements carry 40% higher weight with hiring managers.",
                        user_prompt_question="By what percentage, latency reduction, or scale did you improve this outcome?",
                        status=SuggestionStatus.PENDING,
                    ))
                    s_idx += 1

            # Check 5: Spelling typos and common mistake correction
            for token in words:
                token_lower = token.lower()
                if token_lower in COMMON_RESUME_TYPOS:
                    correct_word = COMMON_RESUME_TYPOS[token_lower]
                    if token.istitle():
                        correct_word = correct_word.capitalize()
                    loc, conf = LocationMappingEngine.find_location(doc, token, sec.heading_text)
                    suggestions.append(AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.GRAMMAR,
                        type=SuggestionType.SPELLING_ERROR,
                        severity=SeverityLevel.HIGH,
                        confidence=0.99,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        location_label=loc.location_label,
                        original_text=token,
                        suggested_text=correct_word,
                        reasoning=f"Correct spelling mistake: '{token}' -> '{correct_word}'.",
                        why_it_matters="Spelling errors create negative recruiter impressions and fail ATS spell-checking passes.",
                        status=SuggestionStatus.PENDING,
                    ))
                    s_idx += 1

            # Check 6: Vague filler words (e.g., 'etc.', 'various projects', 'many users')
            for pattern, guidance in VAGUE_FILLER_RULES:
                match = re.search(pattern, p_text, re.IGNORECASE)
                if match:
                    filler_str = match.group(0)
                    loc, conf = LocationMappingEngine.find_location(doc, filler_str, sec.heading_text)
                    suggestions.append(AISuggestionItem(
                        suggestion_id=f"sug_det_{s_idx}",
                        category=SuggestionCategory.WEAK_WORDING,
                        type=SuggestionType.UNCLEAR_CONTENT,
                        severity=SeverityLevel.LOW,
                        confidence=0.94,
                        requires_user_confirmation=True,
                        location=loc,
                        location_confidence=conf,
                        location_label=loc.location_label,
                        original_text=filler_str,
                        suggested_text="",
                        reasoning=f"Remove vague filler '{filler_str}'. {guidance}",
                        why_it_matters="ATS keywords must be concrete nouns; recruiters discard vague placeholders.",
                        status=SuggestionStatus.PENDING,
                    ))
                    s_idx += 1

    return suggestions

