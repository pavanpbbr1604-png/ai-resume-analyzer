import re
from typing import List, Dict, Any
from app.schemas.job_description import JobDescriptionRequest

COMMON_TECH_STACK = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "FastAPI", "Django",
    "Flask", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
    "AWS", "GCP", "Azure", "CI/CD", "Git", "GitHub", "REST API", "GraphQL", "PyTorch",
    "TensorFlow", "Scikit-learn", "HTML", "CSS", "Tailwind", "Next.js", "Java", "C++", "C#", "Go",
    "Rust", "Linux", "Microservices", "Terraform", "Kafka", "Spark", "Pandas", "NumPy",
    "Agile", "Scrum", "Jira", "Selenium", "DevOps", "System Design", "Elasticsearch"
]

def parse_job_description(jd: JobDescriptionRequest) -> Dict[str, Any]:
    text = jd.text.lower()
    
    extracted_skills: List[str] = []
    for skill in COMMON_TECH_STACK:
        # Match word boundaries or exact phrase
        pattern = r'(?<!\w)' + re.escape(skill.lower()) + r'(?!\w)'
        if re.search(pattern, text):
            extracted_skills.append(skill)
            
    # Combine with explicitly provided skills
    all_skills = list(dict.fromkeys(extracted_skills + jd.required_skills + jd.preferred_skills))
    
    return {
        "title": jd.title or "Target Role",
        "company": jd.company or "Target Company",
        "skills": all_skills,
        "raw_text": jd.text,
    }
