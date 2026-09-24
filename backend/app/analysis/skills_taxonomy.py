import re
from typing import List, Set, Dict, Tuple, Optional

# Canonical skill names
CANONICAL_SKILLS: List[str] = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Rust", "Ruby",
    "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Dart", "Shell", "Bash", "SQL",
    "HTML", "CSS", "Sass", "SCSS",
    # Frontend Frameworks & Libraries
    "React", "React Native", "Vue.js", "Angular", "Next.js", "Nuxt.js", "Svelte",
    "Redux", "Tailwind CSS", "Bootstrap", "jQuery", "Webpack", "Vite",
    # Backend Frameworks
    "FastAPI", "Django", "Flask", "Node.js", "Express.js", "Spring Boot", "ASP.NET",
    "Ruby on Rails", "NestJS", "Gin", "Echo", "Laravel",
    # Databases & Caching
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQLite", "DynamoDB",
    "Cassandra", "Oracle", "Microsoft SQL Server", "MariaDB", "Neo4j", "Firebase", "Supabase",
    # Cloud & DevOps
    "AWS", "AWS Lambda", "Google Cloud Platform", "Microsoft Azure", "Docker", "Kubernetes",
    "Terraform", "Ansible", "Jenkins", "GitHub Actions", "GitLab CI", "CI/CD", "Linux",
    "Nginx", "Apache", "Helm", "Prometheus", "Grafana", "CloudFormation",
    # AI / ML & Data Science
    "Machine Learning", "Deep Learning", "Natural Language Processing", "Computer Vision",
    "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "Keras", "Hugging Face",
    "LangChain", "OpenCV", "LLMs", "Generative AI", "Data Analysis", "Data Engineering",
    "Apache Spark", "Apache Kafka", "Hadoop", "Airflow", "Snowflake", "dbt", "BigQuery",
    # Architecture & Practices
    "REST API", "GraphQL", "gRPC", "Microservices", "System Design", "Distributed Systems",
    "Event-Driven Architecture", "OOP", "Object-Oriented Programming", "Design Patterns",
    "Agile", "Scrum", "Git", "GitHub", "GitLab", "Jira", "Unit Testing", "TDD", "Selenium",
    "Playwright", "Cypress", "PyTest", "Jest"
]

# Aliases mapping (lowercase alias -> canonical skill)
SKILL_ALIASES: Dict[str, str] = {
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "py": "Python",
    "python": "Python",
    "golang": "Go",
    "go": "Go",
    "c++": "C++",
    "cpp": "C++",
    "c#": "C#",
    "csharp": "C#",
    "c sharp": "C#",
    "c": "C",
    "java": "Java",
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "react native": "React Native",
    "react-native": "React Native",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "angularjs": "Angular",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "next js": "Next.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node": "Node.js",
    "express": "Express.js",
    "expressjs": "Express.js",
    "express.js": "Express.js",
    "spring": "Spring Boot",
    "springboot": "Spring Boot",
    "spring boot": "Spring Boot",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "mongo": "MongoDB",
    "redis": "Redis",
    "elasticsearch": "Elasticsearch",
    "elastic search": "Elasticsearch",
    "sqlite": "SQLite",
    "dynamodb": "DynamoDB",
    "aws": "AWS",
    "amazon web services": "AWS",
    "aws lambda": "AWS Lambda",
    "lambda": "AWS Lambda",
    "gcp": "Google Cloud Platform",
    "google cloud": "Google Cloud Platform",
    "google cloud platform": "Google Cloud Platform",
    "azure": "Microsoft Azure",
    "microsoft azure": "Microsoft Azure",
    "docker": "Docker",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "terraform": "Terraform",
    "ci/cd": "CI/CD",
    "cicd": "CI/CD",
    "ci / cd": "CI/CD",
    "github actions": "GitHub Actions",
    "gitlab ci": "GitLab CI",
    "jenkins": "Jenkins",
    "linux": "Linux",
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "dl": "Deep Learning",
    "deep learning": "Deep Learning",
    "nlp": "Natural Language Processing",
    "natural language processing": "Natural Language Processing",
    "cv": "Computer Vision",
    "computer vision": "Computer Vision",
    "tf": "TensorFlow",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "scikit-learn": "Scikit-learn",
    "scikit learn": "Scikit-learn",
    "sklearn": "Scikit-learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "keras": "Keras",
    "spark": "Apache Spark",
    "apache spark": "Apache Spark",
    "kafka": "Apache Kafka",
    "apache kafka": "Apache Kafka",
    "rest": "REST API",
    "rest api": "REST API",
    "restful": "REST API",
    "restful api": "REST API",
    "rest apis": "REST API",
    "restful apis": "REST API",
    "graphql": "GraphQL",
    "grpc": "gRPC",
    "microservices": "Microservices",
    "system design": "System Design",
    "distributed systems": "Distributed Systems",
    "git": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",
    "pytest": "PyTest",
    "unit testing": "Unit Testing",
    "tdd": "TDD",
    "html": "HTML",
    "css": "CSS",
    "tailwind": "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "redux": "Redux",
    "sql": "SQL",
    "nosql": "MongoDB",
    "llm": "LLMs",
    "llms": "LLMs",
    "generative ai": "Generative AI",
    "genai": "Generative AI",
    "gen ai": "Generative AI",
}

# Strict boundary patterns for difficult/ambiguous tokens
# Ensures:
# - 'Java' does not match 'JavaScript'
# - 'C' does not match 'C++', 'C#', 'CSS', 'CI/CD', or single letters
# - 'C++' does not match 'C' or 'C#'
# - 'C#' does not match 'C' or 'C++'
# - 'React' alone does not match 'React Native'
# - 'Go' does not match 'Django', 'MongoDB', 'algorithm', 'good', etc.
# - 'AWS' does not match 'AWS Lambda'

SPECIAL_REGEX_PATTERNS: Dict[str, re.Pattern] = {
    "JavaScript": re.compile(r'(?i)(?:\bjavascript\b|\bjs\b)'),
    "Java": re.compile(r'(?<![A-Za-z0-9])Java(?![A-Za-z0-9]|Script)', re.IGNORECASE),
    "C++": re.compile(r'(?<![A-Za-z0-9])(?:C\+\+|cpp)\b', re.IGNORECASE),
    "C#": re.compile(r'(?<![A-Za-z0-9])(?:C\#|csharp|c\s+sharp)\b', re.IGNORECASE),
    "C": re.compile(r'(?<![A-Za-z0-9\+\#\-\/])C(?![A-Za-z0-9\+\#\-\/])'),
    "Go": re.compile(r'(?:\bgolang\b|\bGo\s+developer\b|\bGo\s+backend\b|\busing\s+Go\b|\bGo\s+language\b|\bGo,\b|\bGo\b(?=\s*(?:,|\/|and|programming|code)))'),
    "React Native": re.compile(r'(?i)\breact[\s\-_]native\b'),
    "React": re.compile(r'(?i)\breact(?:\.js|js)?\b(?!\s*native\b)'),
    "AWS Lambda": re.compile(r'(?i)(?:\baws\s+lambda\b|\blambda\s+functions?\b)'),
    "AWS": re.compile(r'(?i)(?:\baws\b|\bamazon\s+web\s+services\b)(?!\s*lambda\b)'),
    "REST API": re.compile(r'(?i)(?:\brestful\s+apis?\b|\brest\s+apis?\b|\brestful\b|\brest\b(?=\s*(?:api|services?|endpoints?|architecture)))'),
    "PostgreSQL": re.compile(r'(?i)(?:\bpostgres\b|\bpostgresql\b)'),
    "Kubernetes": re.compile(r'(?i)(?:\bk8s\b|\bkubernetes\b)'),
    "CI/CD": re.compile(r'(?i)(?:\bci\/cd\b|\bcicd\b|\bci\s*\/\s*cd\b)'),
    "Machine Learning": re.compile(r'(?i)(?:\bmachine\s+learning\b|\bml\b(?=\s*(?:model|pipeline|engineer|algorithms?|frameworks?)))'),
    "Natural Language Processing": re.compile(r'(?i)(?:\bnatural\s+language\s+processing\b|\bnlp\b)'),
    "Deep Learning": re.compile(r'(?i)(?:\bdeep\s+learning\b|\bdl\b(?=\s*(?:model|pipeline|neural)))'),
    "Computer Vision": re.compile(r'(?i)(?:\bcomputer\s+vision\b|\bcv\b(?=\s*(?:model|pipeline|image)))'),
}

def extract_canonical_skills(text: str) -> List[str]:
    """
    Deterministically extracts and normalizes canonical skills from arbitrary text.
    Uses strict regex boundary checks and alias resolution to prevent false positives.
    """
    if not text:
        return []

    found_skills: Set[str] = set()

    # 1. Run special patterns with boundary safeguards
    for skill_name, pattern in SPECIAL_REGEX_PATTERNS.items():
        if pattern.search(text):
            found_skills.add(skill_name)

    # 2. Match other canonical skills
    text_lower = text.lower()
    for skill in CANONICAL_SKILLS:
        if skill in SPECIAL_REGEX_PATTERNS:
            continue
        skill_lower = skill.lower()
        # Word boundary search
        pattern = r'(?<![A-Za-z0-9])' + re.escape(skill_lower) + r'(?![A-Za-z0-9])'
        if re.search(pattern, text_lower):
            found_skills.add(skill)

    # 3. Match aliases
    for alias, canonical in SKILL_ALIASES.items():
        if canonical in found_skills or alias in SPECIAL_REGEX_PATTERNS:
            continue
        # Only check if alias is distinct
        pattern = r'(?<![A-Za-z0-9])' + re.escape(alias) + r'(?![A-Za-z0-9])'
        if re.search(pattern, text_lower):
            found_skills.add(canonical)

    return sorted(list(found_skills))
