import re
import urllib.parse
from typing import List, Dict, Any, Optional, Set
from pydantic import BaseModel

from app.schemas.document import NormalizedDocument
from app.schemas.job_description import JobDescriptionRequest
from app.analysis.skills_taxonomy import (
    extract_canonical_skills,
    CANONICAL_SKILLS,
    SKILL_ALIASES
)
from app.analysis.job_parser import parse_job_description

# ---------------------------------------------------------------------------
# Deterministic Skill Categorization Map
# ---------------------------------------------------------------------------

SKILL_CATEGORY_MAP: Dict[str, str] = {
    # Programming Languages
    "Python": "Programming Languages",
    "JavaScript": "Programming Languages",
    "TypeScript": "Programming Languages",
    "Java": "Programming Languages",
    "C++": "Programming Languages",
    "C#": "Programming Languages",
    "C": "Programming Languages",
    "Go": "Programming Languages",
    "Rust": "Programming Languages",
    "Ruby": "Programming Languages",
    "PHP": "Programming Languages",
    "Swift": "Programming Languages",
    "Kotlin": "Programming Languages",
    "Scala": "Programming Languages",
    "R": "Programming Languages",
    "MATLAB": "Programming Languages",
    "Dart": "Programming Languages",
    "Shell": "Programming Languages",
    "Bash": "Programming Languages",
    "SQL": "Databases & Query Languages",

    # Web Development
    "HTML": "Web Development",
    "CSS": "Web Development",
    "Sass": "Web Development",
    "SCSS": "Web Development",
    "React": "Web Development",
    "React Native": "Mobile Development",
    "Vue.js": "Web Development",
    "Angular": "Web Development",
    "Next.js": "Web Development",
    "Nuxt.js": "Web Development",
    "Svelte": "Web Development",
    "Redux": "Web Development",
    "Tailwind CSS": "Web Development",
    "Bootstrap": "Web Development",
    "jQuery": "Web Development",
    "Webpack": "Web Development",
    "Vite": "Web Development",

    # Backend & APIs
    "FastAPI": "Backend & APIs",
    "Django": "Backend & APIs",
    "Flask": "Backend & APIs",
    "Node.js": "Backend & APIs",
    "Express.js": "Backend & APIs",
    "Spring Boot": "Backend & APIs",
    "ASP.NET": "Backend & APIs",
    "Ruby on Rails": "Backend & APIs",
    "NestJS": "Backend & APIs",
    "Gin": "Backend & APIs",
    "Echo": "Backend & APIs",
    "Laravel": "Backend & APIs",
    "REST API": "Backend & APIs",
    "GraphQL": "Backend & APIs",
    "gRPC": "Backend & APIs",
    "Microservices": "Architecture & Practices",

    # Databases & Caching
    "PostgreSQL": "Databases & Caching",
    "MySQL": "Databases & Caching",
    "MongoDB": "Databases & Caching",
    "Redis": "Databases & Caching",
    "Elasticsearch": "Databases & Caching",
    "SQLite": "Databases & Caching",
    "DynamoDB": "Databases & Caching",
    "Cassandra": "Databases & Caching",
    "Oracle": "Databases & Caching",
    "Microsoft SQL Server": "Databases & Caching",
    "MariaDB": "Databases & Caching",
    "Neo4j": "Databases & Caching",
    "Firebase": "Databases & Caching",
    "Supabase": "Databases & Caching",

    # Cloud & DevOps
    "AWS": "Cloud & DevOps",
    "AWS Lambda": "Cloud & DevOps",
    "Google Cloud Platform": "Cloud & DevOps",
    "Microsoft Azure": "Cloud & DevOps",
    "Docker": "Cloud & DevOps",
    "Kubernetes": "Cloud & DevOps",
    "Terraform": "Cloud & DevOps",
    "Ansible": "Cloud & DevOps",
    "Jenkins": "Cloud & DevOps",
    "GitHub Actions": "Cloud & DevOps",
    "GitLab CI": "Cloud & DevOps",
    "CI/CD": "Cloud & DevOps",
    "Linux": "Operating Systems & Tools",
    "Nginx": "Cloud & DevOps",
    "Apache": "Cloud & DevOps",
    "Helm": "Cloud & DevOps",
    "Prometheus": "Cloud & DevOps",
    "Grafana": "Cloud & DevOps",
    "CloudFormation": "Cloud & DevOps",

    # AI / ML & Data Science
    "Machine Learning": "AI / ML & Data Science",
    "Deep Learning": "AI / ML & Data Science",
    "Natural Language Processing": "AI / ML & Data Science",
    "Computer Vision": "AI / ML & Data Science",
    "TensorFlow": "AI / ML & Data Science",
    "PyTorch": "AI / ML & Data Science",
    "Scikit-learn": "AI / ML & Data Science",
    "Pandas": "AI / ML & Data Science",
    "NumPy": "AI / ML & Data Science",
    "Keras": "AI / ML & Data Science",
    "Hugging Face": "AI / ML & Data Science",
    "LangChain": "AI / ML & Data Science",
    "OpenCV": "AI / ML & Data Science",
    "LLMs": "AI / ML & Data Science",
    "Generative AI": "AI / ML & Data Science",
    "Data Analysis": "AI / ML & Data Science",
    "Data Engineering": "AI / ML & Data Science",
    "Apache Spark": "AI / ML & Data Science",
    "Apache Kafka": "AI / ML & Data Science",
    "Hadoop": "AI / ML & Data Science",
    "Airflow": "AI / ML & Data Science",
    "Snowflake": "AI / ML & Data Science",
    "dbt": "AI / ML & Data Science",
    "BigQuery": "AI / ML & Data Science",

    # Architecture & Tools
    "System Design": "Architecture & Practices",
    "Distributed Systems": "Architecture & Practices",
    "Event-Driven Architecture": "Architecture & Practices",
    "OOP": "Architecture & Practices",
    "Object-Oriented Programming": "Architecture & Practices",
    "Design Patterns": "Architecture & Practices",
    "Agile": "Architecture & Practices",
    "Scrum": "Architecture & Practices",
    "Git": "Operating Systems & Tools",
    "GitHub": "Operating Systems & Tools",
    "GitLab": "Operating Systems & Tools",
    "Jira": "Operating Systems & Tools",
    "Unit Testing": "Testing & QA",
    "TDD": "Testing & QA",
    "Selenium": "Testing & QA",
    "Playwright": "Testing & QA",
    "Cypress": "Testing & QA",
    "PyTest": "Testing & QA",
    "Jest": "Testing & QA"
}

def categorize_skill(skill: str) -> str:
    return SKILL_CATEGORY_MAP.get(skill, "General Technical Skills")

def group_skills_by_category(skills: List[str]) -> Dict[str, List[str]]:
    categorized: Dict[str, List[str]] = {}
    for skill in skills:
        cat = categorize_skill(skill)
        if cat not in categorized:
            categorized[cat] = []
        categorized[cat].append(skill)
    return categorized

# ---------------------------------------------------------------------------
# Verified Resource Registry (Tier 1 Official Docs, Tier 2 GFG/MDN/W3S, Tier 3 Curated Video)
# ---------------------------------------------------------------------------

def make_youtube_search_url(query: str) -> str:
    return f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(query)}"

VERIFIED_SKILL_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "Python": {
        "prerequisites": "Basic computer literacy and logic",
        "fundamentals": ["Variables and Data Types", "Control Flow (if/else, loops)", "Functions & Scopes", "Built-in Data Structures (List, Tuple, Set, Dict)"],
        "core_concepts": ["Object-Oriented Programming (OOP)", "Exception Handling", "Iterators & Generators", "Decorators & Closures", "File I/O and Context Managers"],
        "interview_topics": ["Mutable vs Immutable types", "List vs Tuple performance", "is vs == operator semantics", "Shallow vs Deep Copy", "*args and **kwargs", "Global Interpreter Lock (GIL) & Memory Management"],
        "practice_tasks": [
            "Implement a custom LRU cache using Python dictionaries and doubly linked lists.",
            "Write a generator function that streams and parses large log files line by line.",
            "Build a retry decorator with exponential backoff for network functions.",
            "Implement a thread-safe singleton pattern using Python dunder methods."
        ],
        "estimated_hours": "3-4 Hours",
        "resources": [
            {"title": "Python Official Tutorial & Data Structures", "url": "https://docs.python.org/3/tutorial/datastructures.html", "source": "Official Python Docs", "source_type": "OFFICIAL_DOCS", "description": "Canonical guide to Python syntax, functions, and standard libraries."},
            {"title": "GeeksforGeeks Python Programming", "url": "https://www.geeksforgeeks.org/python-programming-language/", "source": "GeeksforGeeks", "source_type": "ARTICLE", "description": "Structured tutorials covering Python syntax, OOP, and interview question sets."},
            {"title": "freeCodeCamp Python Full Course", "url": "https://www.youtube.com/watch?v=rfscVS0vtbw", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Comprehensive video course covering Python fundamentals to advanced OOP concepts."}
        ],
        "questions": {
            "basic": [
                "What is the difference between a list and a tuple in Python?",
                "How do Python dictionaries handle key lookups and hash collisions?",
                "What is the difference between `is` and `==` in Python?"
            ],
            "intermediate": [
                "Explain how Python decorators work and write a basic timer decorator.",
                "What is a generator function and how does the `yield` keyword differ from `return`?",
                "Explain the difference between shallow copy and deep copy using the `copy` module."
            ],
            "advanced": [
                "Explain Python memory management, reference counting, and cyclic garbage collection.",
                "What is the Python Global Interpreter Lock (GIL) and how does it impact multi-threaded CPU-bound programs?",
                "How do `*args` and `**kwargs` unpack arguments and how does Python resolve method resolution order (MRO) with C3 Linearization?"
            ]
        }
    },
    "SQL": {
        "prerequisites": "Relational data modeling basics",
        "fundamentals": ["SELECT, WHERE, ORDER BY, LIMIT", "Aggregate Functions (COUNT, SUM, AVG, MIN, MAX)", "GROUP BY and HAVING clauses", "Basic Data Definition (CREATE, ALTER, DROP)"],
        "core_concepts": ["INNER, LEFT, RIGHT, and FULL OUTER JOINS", "Subqueries and Correlated Subqueries", "Common Table Expressions (CTEs)", "Transactions and ACID Properties"],
        "interview_topics": ["WHERE vs HAVING execution lifecycle", "Primary Key vs Unique Key", "Window Functions (ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG)", "Indexes (B-Tree vs Hash) and Query Execution Plans (EXPLAIN)"],
        "practice_tasks": [
            "Write a query using window functions to find the top 3 highest-earning employees in each department.",
            "Write a query with a CTE and self-join to detect duplicate records.",
            "Optimize a slow JOIN query using appropriate indexing and EXPLAIN ANALYZE.",
            "Formulate transaction queries demonstrating READ COMMITTED vs REPEATABLE READ isolation."
        ],
        "estimated_hours": "3-4 Hours",
        "resources": [
            {"title": "PostgreSQL Official SQL Tutorial", "url": "https://www.postgresql.org/docs/current/tutorial-sql.html", "source": "PostgreSQL Docs", "source_type": "OFFICIAL_DOCS", "description": "In-depth guide to relational queries, joins, aggregates, and transactions."},
            {"title": "W3Schools SQL Tutorial & Practice", "url": "https://www.w3schools.com/sql/", "source": "W3Schools", "source_type": "ARTICLE", "description": "Interactive SQL tutorials with live query editors and syntax examples."},
            {"title": "freeCodeCamp SQL Database Course", "url": "https://www.youtube.com/watch?v=HXV3zeQKqGY", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Comprehensive video course covering SQL design, queries, and optimization."}
        ],
        "questions": {
            "basic": [
                "What is the difference between `WHERE` and `HAVING` in SQL?",
                "Explain the difference between `PRIMARY KEY` and `UNIQUE KEY` constraints.",
                "What are the differences between `INNER JOIN` and `LEFT JOIN`?"
            ],
            "intermediate": [
                "How do Common Table Expressions (CTEs) differ from subqueries and temporary tables?",
                "Explain the differences between `RANK()`, `DENSE_RANK()`, and `ROW_NUMBER()`.",
                "What are ACID properties in relational database management systems?"
            ],
            "advanced": [
                "How do B-Tree indexes accelerate SELECT queries, and what is the trade-off during INSERT/UPDATE operations?",
                "How do you use `EXPLAIN ANALYZE` to troubleshoot sequential scans and optimize query plans?",
                "What are the different transaction isolation levels and what concurrency phenomena (dirty reads, non-repeatable reads, phantom reads) do they prevent?"
            ]
        }
    },
    "JavaScript": {
        "prerequisites": "Basic programming syntax",
        "fundamentals": ["Data types, `let`/`const`/`var`, Operators", "Functions, Arrow Functions, Scope", "Array methods (`map`, `filter`, `reduce`, `find`)", "Objects and Destructuring"],
        "core_concepts": ["Closures and Lexical Scoping", "Prototypes and Prototypal Inheritance", "Asynchronous JavaScript (Callbacks, Promises, `async`/`await`)", "Event Loop, Call Stack, Microtasks vs Macrotasks"],
        "interview_topics": ["`==` vs `===` coercion rules", "Hoisting behavior of functions and variables", "`this` binding rules (`call`, `apply`, `bind`)", "Event Bubbling, Capturing, and Delegation"],
        "practice_tasks": [
            "Implement a polyfill for `Array.prototype.reduce` and `Promise.all`.",
            "Write a debounce and throttle utility function from scratch.",
            "Build a custom EventEmitter class with `on`, `off`, `emit`, and `once` methods.",
            "Implement deep cloning with handling for nested objects and circular references."
        ],
        "estimated_hours": "3-4 Hours",
        "resources": [
            {"title": "MDN Web Docs: JavaScript Guide", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", "source": "MDN Web Docs", "source_type": "OFFICIAL_DOCS", "description": "Standard documentation for JavaScript syntax, event loop, prototypes, and async patterns."},
            {"title": "JavaScript.info: The Modern JavaScript Tutorial", "url": "https://javascript.info/", "source": "JavaScript.info", "source_type": "ARTICLE", "description": "Deep-dive tutorials from basic variables to advanced closures, microtasks, and generators."},
            {"title": "freeCodeCamp JavaScript Algorithms and Data Structures", "url": "https://www.youtube.com/watch?v=PkZNo7MFNFg", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Comprehensive JavaScript fundamentals and problem-solving video course."}
        ],
        "questions": {
            "basic": [
                "What is the difference between `var`, `let`, and `const`?",
                "Explain the difference between `==` and `===` with type coercion examples.",
                "How does the `map()` array method differ from `forEach()`?"
            ],
            "intermediate": [
                "Explain JavaScript closures and provide a real-world use case.",
                "How does the JavaScript Event Loop handle microtasks (Promises) vs macrotasks (`setTimeout`)?",
                "Explain how `this` is determined in regular functions vs arrow functions."
            ],
            "advanced": [
                "How does Prototypal Inheritance work in JavaScript under the hood?",
                "Implement a robust `debounce` function and explain how it differs from `throttle`.",
                "How does `Promise.allSettled` differ from `Promise.all`, and how do unhandled rejections propagate?"
            ]
        }
    },
    "React": {
        "prerequisites": "JavaScript ES6+, DOM basics",
        "fundamentals": ["JSX Syntax & Rules", "Functional Components & Props", "Component State with `useState`", "Conditional Rendering & Lists with Keys"],
        "core_concepts": ["Component Lifecycle & `useEffect` hook", "Handling Forms and Controlled vs Uncontrolled Components", "Context API for State Sharing", "Custom Hooks Creation"],
        "interview_topics": ["Virtual DOM and Reconciliation (Fiber architecture)", "Rules of Hooks & Dependency Array pitfalls", "React Performance Optimization (`useMemo`, `useCallback`, `React.memo`)", "State Management architecture (Context vs Redux/Zustand)"],
        "practice_tasks": [
            "Build a custom `useFetch` hook with caching, loading state, and abort controller support.",
            "Create an optimized infinite scroll component using `IntersectionObserver`.",
            "Implement a modal dialog system using React Portals and Context API.",
            "Refactor a re-rendering heavy component tree using `useCallback` and `React.memo`."
        ],
        "estimated_hours": "3-5 Hours",
        "resources": [
            {"title": "React Official Documentation", "url": "https://react.dev/learn", "source": "React.dev", "source_type": "OFFICIAL_DOCS", "description": "Official documentation covering hooks, component state, effects, and modern React patterns."},
            {"title": "GeeksforGeeks ReactJS Guide", "url": "https://www.geeksforgeeks.org/reactjs-tutorials/", "source": "GeeksforGeeks", "source_type": "ARTICLE", "description": "Tutorials covering component architecture, hooks lifecycle, and React interview questions."},
            {"title": "freeCodeCamp Full React Course", "url": "https://www.youtube.com/watch?v=bMknfKXIFA8", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Complete beginner to advanced React tutorial covering state, hooks, and app development."}
        ],
        "questions": {
            "basic": [
                "What is JSX and why is it used in React?",
                "What is the difference between props and state?",
                "Why are `key` props important when rendering lists in React?"
            ],
            "intermediate": [
                "Explain the `useEffect` hook and how cleanup functions work.",
                "What is the difference between `useMemo` and `useCallback`?",
                "Explain controlled vs uncontrolled input components in React."
            ],
            "advanced": [
                "How does React's Virtual DOM and Reconciliation algorithm (React Fiber) work?",
                "What causes stale closures in React hooks and how do you resolve them?",
                "How do you profile and eliminate unnecessary re-renders in a complex React application?"
            ]
        }
    },
    "Git": {
        "prerequisites": "Terminal / Command Line basics",
        "fundamentals": ["git init, git clone, git status", "Staging and Committing (git add, git commit)", "Branching and Switching (git branch, git switch/checkout)", "Remote operations (git push, git pull, git fetch)"],
        "core_concepts": ["Merging vs Rebasing strategies", "Resolving Merge Conflicts cleanly", "Stashing changes (git stash, git stash pop)", "Git Commit History and Log formatting (git log, git reflog)"],
        "interview_topics": ["Git commit tree structure (Blobs, Trees, Commits)", "Interactive Rebasing (`git rebase -i`)", "Undoing mistakes (git revert vs git reset --soft/--hard)", "Feature Branch Workflow & Pull Request best practices"],
        "practice_tasks": [
            "Simulate and resolve a complex three-way merge conflict on a test repository.",
            "Use interactive rebase (`git rebase -i`) to squash the last 4 commits and edit commit messages.",
            "Recover a deleted branch using `git reflog`.",
            "Create a clean release tag and configure automated git pre-commit hooks."
        ],
        "estimated_hours": "2 Hours",
        "resources": [
            {"title": "Official Pro Git Book", "url": "https://git-scm.com/book/en/v2", "source": "Git-SCM", "source_type": "OFFICIAL_DOCS", "description": "The definitive, free official manual on Git internal architecture, branching, and workflows."},
            {"title": "Atlassian Git Tutorials & Workflows", "url": "https://www.atlassian.com/git/tutorials", "source": "Atlassian", "source_type": "GUIDE", "description": "Comprehensive guides on git reset, rebase, cherry-pick, and team branching models."},
            {"title": "freeCodeCamp Git & GitHub Crash Course", "url": "https://www.youtube.com/watch?v=RGOj5yH7evk", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Practical video guide covering version control commands, conflict resolution, and branching."}
        ],
        "questions": {
            "basic": [
                "What is the difference between `git pull` and `git fetch`?",
                "What does `git status` tell you about your working directory and staging area?",
                "How do you create and switch to a new branch in Git?"
            ],
            "intermediate": [
                "What is the difference between `git merge` and `git rebase`?",
                "Explain the difference between `git reset --soft`, `--mixed`, and `--hard`.",
                "What is `git stash` and when would you use it?"
            ],
            "advanced": [
                "How does `git reflog` work and how can it be used to recover lost commits or deleted branches?",
                "How does Git store objects internally (blobs, trees, commits, and annotated tags)?",
                "How do you resolve a cherry-pick conflict without corrupting the target branch history?"
            ]
        }
    },
    "Linux": {
        "prerequisites": "Operating system fundamentals",
        "fundamentals": ["File system hierarchy (/etc, /var, /usr, /home)", "Navigation and File manipulation (cd, ls, cp, mv, rm, mkdir)", "File permissions and ownership (chmod, chown, umask)", "Standard I/O redirection and Pipes (>, >>, <, |)"],
        "core_concepts": ["Process management (ps, top, htop, kill, pkill, bg, fg)", "Package managers (apt, yum, dnf, pacman)", "Text processing utilities (grep, sed, awk, cut, sort, uniq)", "SSH and Secure File Transfer (ssh, scp, rsync)"],
        "interview_topics": ["Systemd and Service management (systemctl, journalctl)", "Networking diagnostics (netstat, ss, curl, ping, traceroute, lsof)", "Disk and Memory monitoring (df, du, free, vmstat)", "Shell scripting automation with Bash"],
        "practice_tasks": [
            "Write a bash script to monitor disk usage and send an alert if a partition exceeds 85%.",
            "Use `awk` and `grep` to parse an Nginx access log and extract the top 10 requesting IP addresses.",
            "Create and enable a custom systemd service unit that restarts automatically on failure.",
            "Find and safely terminate processes consuming excessive memory using `lsof` and `pkill`."
        ],
        "estimated_hours": "2-3 Hours",
        "resources": [
            {"title": "Linux Journey: Free Linux Fundamentals", "url": "https://linuxjourney.com/", "source": "Linux Journey", "source_type": "GUIDE", "description": "Structured learning modules from command line basics to kernel, processes, and routing."},
            {"title": "GeeksforGeeks Linux Command Line Tutorial", "url": "https://www.geeksforgeeks.org/linux-commands/", "source": "GeeksforGeeks", "source_type": "ARTICLE", "description": "Reference catalog of essential Linux commands, pipes, filters, and admin tools."},
            {"title": "freeCodeCamp Linux for Beginners Course", "url": "https://www.youtube.com/watch?v=sWbGOq-74lY", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Full operating system overview covering shell scripting, permissions, and administration."}
        ],
        "questions": {
            "basic": [
                "Explain Linux file permissions (rwx) and how `chmod 755` modifies access.",
                "How do you check current running processes and memory utilization in Linux?",
                "What is the difference between `>` and `>>` in shell redirection?"
            ],
            "intermediate": [
                "How do you use `grep`, `awk`, or `sed` to find specific patterns in log files?",
                "What is the difference between a soft link (symbolic link) and a hard link in Linux?",
                "How do you check which process is listening on a specific network port (e.g. port 8080)?"
            ],
            "advanced": [
                "Explain the Linux boot process from BIOS/UEFI to systemd target initialization.",
                "How do Linux file descriptors, pipes, and standard streams (stdin, stdout, stderr) operate at the kernel level?",
                "How do you troubleshoot a server experiencing high CPU load average but low CPU percentage utilization?"
            ]
        }
    },
    "REST API": {
        "prerequisites": "HTTP protocol basics",
        "fundamentals": ["Client-Server Architecture", "HTTP Methods (GET, POST, PUT, PATCH, DELETE)", "HTTP Status Codes (2xx, 3xx, 4xx, 5xx)", "Request/Response headers and JSON payloads"],
        "core_concepts": ["RESTful Constraints and Resource-Oriented URL Design", "Idempotency and Safety of HTTP methods", "Authentication & Authorization (JWT, OAuth2, API Keys)", "Pagination, Filtering, and Sorting mechanisms"],
        "interview_topics": ["PUT vs PATCH semantics", "Error handling and standardized error response formats", "Rate Limiting and Throttling strategies", "API Versioning (URI vs Header vs Query parameter)"],
        "practice_tasks": [
            "Design and implement a complete RESTful CRUD API with input validation and pagination.",
            "Implement a JWT authentication and refresh token rotation middleware.",
            "Configure a sliding-window rate limiter using Redis.",
            "Write comprehensive contract tests validating HTTP status codes and payload schemas."
        ],
        "estimated_hours": "2-3 Hours",
        "resources": [
            {"title": "RESTful API Architectural Guidelines & Design", "url": "https://restfulapi.net/", "source": "RESTful API Net", "source_type": "GUIDE", "description": "Comprehensive guide on REST architectural constraints, resource naming, and HTTP status codes."},
            {"title": "MDN HTTP Overview and Methods", "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview", "source": "MDN Web Docs", "source_type": "OFFICIAL_DOCS", "description": "Complete HTTP reference including headers, caching, CORS, and status codes."},
            {"title": "freeCodeCamp REST API Design Best Practices", "url": "https://www.youtube.com/watch?v=-MTSQjw5DrM", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Practical guide to designing clean, scalable, and secure RESTful Web APIs."}
        ],
        "questions": {
            "basic": [
                "What does REST stand for and what are its core architectural constraints?",
                "What is the difference between `GET` and `POST` HTTP methods?",
                "Explain the meaning of common HTTP status codes: 200, 201, 400, 401, 403, 404, 500."
            ],
            "intermediate": [
                "What is the difference between `PUT` and `PATCH` requests?",
                "What does it mean for an HTTP method to be idempotent?",
                "How do you implement secure stateless authentication using JWT tokens?"
            ],
            "advanced": [
                "How do you design an API rate limiter to protect microservices against burst traffic?",
                "What are the pros and cons of different API versioning strategies (URI path vs custom headers)?",
                "How do you ensure data consistency across multiple REST API microservice calls without 2-phase commit?"
            ]
        }
    },
    "AWS": {
        "prerequisites": "Networking and Linux server basics",
        "fundamentals": ["Cloud Computing Models (IaaS, PaaS, SaaS)", "AWS IAM (Users, Groups, Roles, Policies)", "EC2 Compute Instances & Security Groups", "S3 Object Storage, Buckets, and Access Control"],
        "core_concepts": ["VPC Networking (Subnets, Route Tables, Internet Gateways, NAT Gateways)", "Serverless with AWS Lambda & API Gateway", "Relational & NoSQL Databases (RDS, DynamoDB)", "Load Balancing (ALB) and Auto Scaling Groups (ASG)"],
        "interview_topics": ["IAM Role AssumeRole and Least Privilege principles", "High Availability and Multi-AZ vs Multi-Region architecture", "CloudWatch Monitoring, Alarms, and CloudTrail auditing", "Cost optimization and Storage classes (S3 Standard vs Glacier)"],
        "practice_tasks": [
            "Design a multi-tier VPC with public and private subnets, NAT gateway, and security groups.",
            "Deploy a serverless REST API using AWS Lambda, API Gateway, and DynamoDB.",
            "Set up an Application Load Balancer with health checks routed to an Auto Scaling Group.",
            "Configure IAM role policies granting least privilege access to S3 buckets."
        ],
        "estimated_hours": "4-6 Hours",
        "resources": [
            {"title": "AWS Official Getting Started Documentation", "url": "https://aws.amazon.com/getting-started/", "source": "AWS Official Docs", "source_type": "OFFICIAL_DOCS", "description": "Hands-on tutorials for core AWS services: IAM, EC2, S3, RDS, Lambda, and VPC."},
            {"title": "AWS Well-Architected Framework", "url": "https://aws.amazon.com/architecture/well-architected/", "source": "AWS Architecture", "source_type": "GUIDE", "description": "Cloud design best practices for security, reliability, performance, and cost optimization."},
            {"title": "freeCodeCamp AWS Certified Cloud Practitioner / Solutions Architect Course", "url": "https://www.youtube.com/watch?v=SOTamWNgDKc", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Complete video course covering AWS architecture, compute, networking, and storage."}
        ],
        "questions": {
            "basic": [
                "What is the difference between AWS IAM Users, Groups, and IAM Roles?",
                "What is Amazon S3 and how does object storage differ from block storage (EBS)?",
                "What is an AWS Security Group and how does it differ from a Network ACL?"
            ],
            "intermediate": [
                "Explain how a VPC with public and private subnets, Internet Gateway, and NAT Gateway functions.",
                "What is AWS Lambda and what are cold starts and concurrency limits?",
                "How does Amazon RDS handle automated backups, multi-AZ failover, and read replicas?"
            ],
            "advanced": [
                "How do you architect a highly available, fault-tolerant web application across multiple AWS Availability Zones?",
                "How does IAM role assumption (`sts:AssumeRole`) work across different AWS accounts?",
                "How do you design a zero-downtime deployment strategy on AWS using ECS, ALB, and blue/green deployments?"
            ]
        }
    },
    "Docker": {
        "prerequisites": "Linux CLI and application runtime basics",
        "fundamentals": ["Containers vs Virtual Machines", "Dockerfile syntax (FROM, RUN, COPY, CMD, ENTRYPOINT)", "Building images (`docker build`) and Running containers (`docker run`)", "Container inspection and logs (`docker ps`, `docker logs`, `docker exec`)"],
        "core_concepts": ["Docker Volumes and Persistent Data Management", "Docker Networking (Bridge, Host, Overlay)", "Multi-stage Docker Builds for image optimization", "Docker Compose for multi-container local environments"],
        "interview_topics": ["Layer caching and Docker image minimization techniques", "`CMD` vs `ENTRYPOINT` differences", "Container Security (non-root users, vulnerability scanning)", "Handling SIGTERM and graceful container shutdowns"],
        "practice_tasks": [
            "Write an optimized multi-stage Dockerfile for a production web application under 50MB.",
            "Create a `docker-compose.yml` file running a web service, Redis cache, and PostgreSQL database with health checks.",
            "Mount persistent volumes and configure custom bridge network isolation between containers.",
            "Scan a container image for security vulnerabilities and configure non-root user execution."
        ],
        "estimated_hours": "3 Hours",
        "resources": [
            {"title": "Docker Official Documentation", "url": "https://docs.docker.com/get-started/", "source": "Docker Docs", "source_type": "OFFICIAL_DOCS", "description": "Official guide to Dockerfiles, images, containers, networks, and compose orchestration."},
            {"title": "GeeksforGeeks Docker Tutorial", "url": "https://www.geeksforgeeks.org/docker-tutorial/", "source": "GeeksforGeeks", "source_type": "ARTICLE", "description": "Step-by-step guide to containerization, commands, volumes, and microservices setup."},
            {"title": "freeCodeCamp Docker Full Course", "url": "https://www.youtube.com/watch?v=fqMOX6JJhGo", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Complete beginner to advanced containerization guide with hands-on projects."}
        ],
        "questions": {
            "basic": [
                "What is the difference between a Docker image and a Docker container?",
                "Explain the difference between `CMD` and `ENTRYPOINT` in a Dockerfile.",
                "How do you view container logs and attach an interactive shell to a running container?"
            ],
            "intermediate": [
                "What is a multi-stage Docker build and why is it essential for production images?",
                "How do Docker Volumes differ from Bind Mounts?",
                "How does Docker networking work in default bridge mode?"
            ],
            "advanced": [
                "How do Docker image layers and union file systems (overlay2) handle caching during builds?",
                "How do you ensure a container application handles PID 1 signal forwarding and graceful SIGTERM shutdown?",
                "What security practices should be implemented to prevent container breakouts and privilege escalation?"
            ]
        }
    },
    "Kubernetes": {
        "prerequisites": "Docker and containerization mastery",
        "fundamentals": ["Kubernetes Architecture (Control Plane vs Worker Nodes)", "Pods, Deployments, and ReplicaSets", "Services (ClusterIP, NodePort, LoadBalancer)", "ConfigMaps and Secrets"],
        "core_concepts": ["Ingress Controllers and Routing Rules", "Persistent Volumes (PV) and Persistent Volume Claims (PVC)", "Readiness, Liveness, and Startup Probes", "Horizontal Pod Autoscaling (HPA) and Resource Limits (CPU/Memory)"],
        "interview_topics": ["StatefulSets vs Deployments", "Rolling Updates and Rollbacks strategy", "Kube-proxy and CNI networking internals", "Helm package management and GitOps principles"],
        "practice_tasks": [
            "Write a Kubernetes Deployment manifest with readiness and liveness probes and resource requests/limits.",
            "Create a Service and Ingress definition routing traffic to two microservices.",
            "Deploy a StatefulSet backed by Persistent Volume Claims for a database cluster.",
            "Configure a HorizontalPodAutoscaler scaling pods based on CPU utilization metrics."
        ],
        "estimated_hours": "4-6 Hours",
        "resources": [
            {"title": "Kubernetes Official Documentation", "url": "https://kubernetes.io/docs/home/", "source": "Kubernetes.io", "source_type": "OFFICIAL_DOCS", "description": "Official tutorials and concepts for Pods, Services, Deployments, and Cluster Management."},
            {"title": "Kubernetes Basics Interactive Tutorials", "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/", "source": "Kubernetes Tutorials", "source_type": "GUIDE", "description": "Interactive browser modules deploying and scaling containerized applications."},
            {"title": "freeCodeCamp Kubernetes Course for Beginners", "url": "https://www.youtube.com/watch?v=X48VuDVv0do", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Comprehensive video course covering cluster architecture, pods, deployments, and Helm."}
        ],
        "questions": {
            "basic": [
                "What is a Pod in Kubernetes and why doesn't Kubernetes run containers directly?",
                "What is the difference between a Deployment and a ReplicaSet?",
                "What is the purpose of a Kubernetes ClusterIP Service vs NodePort Service?"
            ],
            "intermediate": [
                "Explain the difference between Liveness, Readiness, and Startup probes.",
                "How do ConfigMaps and Secrets inject configuration into container workloads?",
                "What is the difference between Deployments and StatefulSets?"
            ],
            "advanced": [
                "How does the Kubernetes Control Plane (kube-apiserver, etcd, kube-scheduler, controller-manager) reconcile desired vs actual state?",
                "How does Kubernetes CNI and kube-proxy implement pod-to-pod networking across worker nodes?",
                "How do you configure zero-downtime rolling updates with pod disruption budgets (PDB) and graceful termination periods?"
            ]
        }
    },
    "Java": {
        "prerequisites": "Basic programming fundamentals",
        "fundamentals": ["JVM, JRE, JDK architecture", "Data Types, Operators, Control Structures", "Classes, Objects, Methods, Constructors", "Packages and Access Modifiers"],
        "core_concepts": ["OOP Principles (Inheritance, Polymorphism, Encapsulation, Abstraction)", "Exception Handling (Checked vs Unchecked)", "Java Collections Framework (List, Set, Map, Queue)", "Generics and Streams API (Java 8+)"],
        "interview_topics": ["String Immutability and String Pool", "equals() and hashCode() contract", "JVM Garbage Collection and Memory Areas (Heap, Stack, Metaspace)", "Multithreading and Concurrency (synchronized, volatile, ExecutorService)"],
        "practice_tasks": [
            "Implement a custom generic HashMap with collision handling.",
            "Process and aggregate complex data sets using the Java 8 Streams API and Collectors.",
            "Build a thread-safe producer-consumer queue using `BlockingQueue` and `ExecutorService`.",
            "Benchmark and optimize a memory-heavy routine using Java Flight Recorder / VisualVM."
        ],
        "estimated_hours": "3-5 Hours",
        "resources": [
            {"title": "Oracle Java Official Documentation & Tutorials", "url": "https://docs.oracle.com/javase/tutorial/", "source": "Oracle Docs", "source_type": "OFFICIAL_DOCS", "description": "Canonical Java tutorials covering OOP, Collections, Generics, and Concurrency."},
            {"title": "GeeksforGeeks Java Programming", "url": "https://www.geeksforgeeks.org/java/", "source": "GeeksforGeeks", "source_type": "ARTICLE", "description": "Comprehensive guides to Java syntax, collections, multithreading, and interview questions."},
            {"title": "freeCodeCamp Java Programming Full Course", "url": "https://www.youtube.com/watch?v=A74TOX803D0", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Detailed video course covering core Java, OOP, and data structures."}
        ],
        "questions": {
            "basic": [
                "What is the difference between JDK, JRE, and JVM?",
                "Why is the `String` class immutable in Java?",
                "What is the difference between `ArrayList` and `LinkedList` in the Collections framework?"
            ],
            "intermediate": [
                "Explain the contract between `equals()` and `hashCode()` methods.",
                "What is the difference between Checked and Unchecked Exceptions in Java?",
                "How does the Java 8 Streams API work and what are intermediate vs terminal operations?"
            ],
            "advanced": [
                "How does the JVM Garbage Collector (G1 / ZGC) manage memory across young and old generations?",
                "Explain the Java Memory Model, the `volatile` keyword, and happens-before relationships in multithreading.",
                "How do ConcurrentHashMap and CopyOnWriteArrayList achieve thread safety without synchronizing entire collections?"
            ]
        }
    },
    "Spring Boot": {
        "prerequisites": "Core Java & OOP mastery",
        "fundamentals": ["Spring Boot Starters & Auto-configuration", "Inversion of Control (IoC) and Dependency Injection (DI)", "Spring Beans & Component Scanning (@Component, @Service, @Repository)", "REST Controllers (@RestController, @RequestMapping)"],
        "core_concepts": ["Spring Data JPA and Hibernate ORM integration", "Bean Scopes (Singleton, Prototype, Request, Session)", "Spring Security & JWT integration", "Application Properties & Profile management (@Profile, @Value)"],
        "interview_topics": ["Spring Boot Auto-configuration under the hood (@EnableAutoConfiguration)", "Transaction management (@Transactional isolation & propagation)", "Spring AOP (Aspect-Oriented Programming)", "Actuator endpoints and Microservices observability"],
        "practice_tasks": [
            "Build a full CRUD RESTful API using Spring Boot, Spring Data JPA, and PostgreSQL.",
            "Secure API endpoints with Spring Security and JWT authentication filters.",
            "Implement custom aspect logging using Spring AOP for all service methods.",
            "Configure database migrations with Flyway or Liquibase in a Spring Boot app."
        ],
        "estimated_hours": "3-5 Hours",
        "resources": [
            {"title": "Spring Boot Official Guides and Reference", "url": "https://spring.io/guides", "source": "Spring.io", "source_type": "OFFICIAL_DOCS", "description": "Official getting started guides for building REST services, data access, and security."},
            {"title": "Baeldung Spring Boot Tutorials", "url": "https://www.baeldung.com/spring-boot", "source": "Baeldung", "source_type": "ARTICLE", "description": "Industry-standard in-depth tutorials on Spring Boot, Data JPA, Security, and Cloud."},
            {"title": "freeCodeCamp Spring Boot Full Course", "url": "https://www.youtube.com/watch?v=9SGDpanrc8U", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Comprehensive video course building enterprise Java applications with Spring Boot."}
        ],
        "questions": {
            "basic": [
                "What is Spring Boot and how does it differ from the traditional Spring Framework?",
                "What is Dependency Injection and how does the Spring IoC container manage beans?",
                "Explain the role of `@RestController` and `@Autowired` annotations."
            ],
            "intermediate": [
                "How does Spring Data JPA simplify database operations and repository interfaces?",
                "What is the difference between `@Component`, `@Service`, and `@Repository` annotations?",
                "Explain how `@Transactional` works and what happens during an unchecked exception rollback."
            ],
            "advanced": [
                "How does Spring Boot's `@EnableAutoConfiguration` and `spring.factories` work under the hood?",
                "Explain Spring AOP, join points, pointcuts, and proxy mechanism (JDK Dynamic vs CGLIB).",
                "How do you handle distributed transactions across Spring Boot microservices (Saga pattern)?"
            ]
        }
    },
    "FastAPI": {
        "prerequisites": "Python 3.8+ and async/await fundamentals",
        "fundamentals": ["Path Parameters, Query Parameters, and Request Bodies", "Pydantic Models for Request/Response validation", "HTTP status codes and OpenAPI/Swagger automatic documentation", "Dependency Injection system (`Depends`)"],
        "core_concepts": ["Asynchronous endpoint handlers (`async def` vs `def`)", "Middleware and CORS configuration", "SQLAlchemy / SQLModel database integration with Async Sessions", "Authentication with OAuth2 and JWT bearer tokens"],
        "interview_topics": ["Starlette and Pydantic foundation architecture", "Background Tasks and event handlers (startup/shutdown lifespan)", "Error handling with custom `HTTPException` handlers", "Uvicorn/Gunicorn worker process management"],
        "practice_tasks": [
            "Build an asynchronous REST API with FastAPI, SQLAlchemy 2.0 async, and Alembic migrations.",
            "Create reusable dependency injection functions for user authentication and rate limiting.",
            "Implement a WebSocket connection endpoint for real-time notifications.",
            "Write end-to-end integration tests using `httpx.AsyncClient` and pytest."
        ],
        "estimated_hours": "3 Hours",
        "resources": [
            {"title": "FastAPI Official Documentation & Tutorial", "url": "https://fastapi.tiangolo.com/tutorial/", "source": "FastAPI Docs", "source_type": "OFFICIAL_DOCS", "description": "Interactive official guide to building high-performance Python APIs with Pydantic and OpenAPI."},
            {"title": "TestDriven.io FastAPI Guides", "url": "https://testdriven.io/blog/fastapi-crud/", "source": "TestDriven.io", "source_type": "ARTICLE", "description": "Production patterns for FastAPI, Docker, asynchronous databases, and automated testing."},
            {"title": "freeCodeCamp FastAPI Full Course", "url": "https://www.youtube.com/watch?v=0sOvCWFmrtA", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Comprehensive video course covering FastAPI, PostgreSQL, JWT security, and deployment."}
        ],
        "questions": {
            "basic": [
                "What is FastAPI and why is it faster than Flask and Django for API development?",
                "How does Pydantic integrate with FastAPI for data validation and serialization?",
                "How do you define path parameters and query parameters in a FastAPI route?"
            ],
            "intermediate": [
                "When should you use `async def` vs standard `def` in FastAPI endpoint definitions?",
                "How does FastAPI's Dependency Injection system (`Depends`) work?",
                "How do you implement JWT authentication in FastAPI using `OAuth2PasswordBearer`?"
            ],
            "advanced": [
                "How do Starlette ASGI event loops and threadpool workers handle CPU-bound vs IO-bound tasks in FastAPI?",
                "How do you manage asynchronous database sessions across concurrent requests to avoid connection pool exhaustion?",
                "How do you implement custom ASGI middleware for logging and request tracing in FastAPI?"
            ]
        }
    },
    "Node.js": {
        "prerequisites": "JavaScript ES6+ and Asynchronous programming",
        "fundamentals": ["Node.js Architecture & V8 Engine", "Global Objects, Modules (`CommonJS` vs `ES Modules`)", "File System (`fs`) and Path operations", "Node Package Manager (`npm` / `yarn`)"],
        "core_concepts": ["Event-Driven Architecture & `EventEmitter`", "Streams (`Readable`, `Writable`, `Transform`) and Buffers", "Asynchronous execution: Callbacks, Promises, and `async`/`await`", "Building HTTP servers with Express.js / Fastify"],
        "interview_topics": ["Node.js Event Loop phases (Timers, I/O Polling, Check/setImmediate, Close)", "Worker Threads vs Cluster module for CPU-bound scaling", "Memory leaks diagnostics and Garbage Collection tuning", "Process management (`process.on('uncaughtException')`, PM2)"],
        "practice_tasks": [
            "Build a streaming file processing server handling multi-gigabyte uploads with minimal memory.",
            "Implement a cluster-based Express server distributing traffic across multiple CPU cores.",
            "Create a custom transform stream that compresses and encrypts log data in real time.",
            "Profile and fix an event listener memory leak using Chrome DevTools memory heap snapshots."
        ],
        "estimated_hours": "3-4 Hours",
        "resources": [
            {"title": "Node.js Official Documentation & Guides", "url": "https://nodejs.org/en/docs/guides/", "source": "Nodejs.org", "source_type": "OFFICIAL_DOCS", "description": "Official guides to the Node.js event loop, streams, buffers, and security best practices."},
            {"title": "GeeksforGeeks Node.js Guide", "url": "https://www.geeksforgeeks.org/nodejs/", "source": "GeeksforGeeks", "source_type": "ARTICLE", "description": "Tutorials covering asynchronous JavaScript on the server, Express.js, and API development."},
            {"title": "freeCodeCamp Node.js and Express.js Course", "url": "https://www.youtube.com/watch?v=Oe421EPjeBE", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Comprehensive video course building backend microservices with Node and Express."}
        ],
        "questions": {
            "basic": [
                "What is Node.js and how does it execute JavaScript outside the browser?",
                "What is the difference between `require` (CommonJS) and `import` (ES Modules)?",
                "What are Node.js Buffers and why are they needed?"
            ],
            "intermediate": [
                "Explain the phases of the Node.js Event Loop (Timers, Poll, Check).",
                "What is the difference between `process.nextTick()` and `setImmediate()`?",
                "How do Node.js Streams prevent high memory consumption during large file transfers?"
            ],
            "advanced": [
                "How does Node.js handle CPU-heavy operations without blocking the single event loop thread (Worker Threads vs Cluster module)?",
                "How do you troubleshoot and resolve memory leaks caused by uncleaned closures or EventEmitter listeners in production?",
                "How does the V8 garbage collector manage the new space (scavenge) and old space (mark-sweep-compact) in Node.js?"
            ]
        }
    },
    "PostgreSQL": {
        "prerequisites": "Relational database and SQL foundations",
        "fundamentals": ["Data types (JSONB, Arrays, UUID, Timestamps)", "Constraints (Foreign Keys, Check, Unique)", "Indexes (B-Tree, GIN, GiST, Hash, BRIN)", "Views and Materialized Views"],
        "core_concepts": ["Transactions, MVCC (Multi-Version Concurrency Control)", "Write-Ahead Logging (WAL) and Vacuuming (`VACUUM FULL`, `ANALYZE`)", "Window Functions and Advanced Analytical Queries", "Stored Procedures and PL/pgSQL functions"],
        "interview_topics": ["MVCC internals and Dead Tuples generation", "Query Optimization with `EXPLAIN (ANALYZE, BUFFERS)`", "Connection pooling (PgBouncer) and Replication (Streaming Replication)", "Partitioning strategies (Range, List, Hash)"],
        "practice_tasks": [
            "Query and index complex nested JSON documents using PostgreSQL JSONB and GIN indexes.",
            "Design table range partitioning for high-volume time-series telemetry data.",
            "Troubleshoot a slow sequential scan query using `EXPLAIN (ANALYZE, BUFFERS)` and add partial/composite indexes.",
            "Configure a materialized view with automated concurrent refresh on a scheduled trigger."
        ],
        "estimated_hours": "3-4 Hours",
        "resources": [
            {"title": "PostgreSQL Official Documentation", "url": "https://www.postgresql.org/docs/current/index.html", "source": "PostgreSQL.org", "source_type": "OFFICIAL_DOCS", "description": "Comprehensive reference for PostgreSQL SQL syntax, indexes, MVCC, and server administration."},
            {"title": "PostgreSQL Tutorial by PostgresTutorial.com", "url": "https://www.postgresqltutorial.com/", "source": "PostgresTutorial", "source_type": "ARTICLE", "description": "Practical guides to PostgreSQL administration, JSONB querying, window functions, and indexing."},
            {"title": "freeCodeCamp Relational Database / PostgreSQL Course", "url": "https://www.youtube.com/watch?v=qw--VYLpxG4", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Complete tutorial on database schema design, queries, and administration with Postgres."}
        ],
        "questions": {
            "basic": [
                "What makes PostgreSQL distinct from MySQL and other relational database engines?",
                "What is the difference between `JSON` and `JSONB` data types in PostgreSQL?",
                "What is a Materialized View and how does it differ from a standard View?"
            ],
            "intermediate": [
                "Explain Multi-Version Concurrency Control (MVCC) in PostgreSQL.",
                "Why does PostgreSQL require `VACUUM` and what are dead tuples?",
                "When should you use a GIN index instead of a standard B-Tree index?"
            ],
            "advanced": [
                "How do you analyze an `EXPLAIN (ANALYZE, BUFFERS)` query plan to locate disk spills, hash joins, and sequential scans?",
                "How does PostgreSQL Write-Ahead Logging (WAL) ensure durability and enable Streaming Replication?",
                "What are table partitioning strategies in PostgreSQL and how does partition pruning improve query execution times?"
            ]
        }
    },
    "MongoDB": {
        "prerequisites": "NoSQL database concepts and JSON data structures",
        "fundamentals": ["Documents, Collections, and BSON format", "CRUD Operations (`insertOne`, `find`, `updateOne`, `deleteOne`)", "Query Operators ($gt, $in, $and, $or, $regex)", "Data Modeling: Embedding vs Referencing"],
        "core_concepts": ["Aggregation Framework ($match, $group, $project, $lookup, $unwind)", "Indexing (Single Field, Compound, Multikey, Text, TTL)", "Replica Sets and High Availability (Primary, Secondary, Arbiter)", "Sharding and Horizontal Partitioning (Shard Key selection)"],
        "interview_topics": ["ACID Transactions in MongoDB (Replica Set multi-document transactions)", "Write Concerns (w: 1, w: majority, j: true) and Read Preferences", "Aggregation Pipeline Optimization", "Capped Collections and Change Streams"],
        "practice_tasks": [
            "Construct a multi-stage aggregation pipeline calculating monthly revenue by customer tier.",
            "Design an e-commerce document schema comparing embedded subdocuments vs referenced collections.",
            "Create a compound index and verify index utilization using `.explain('executionStats')`.",
            "Implement a real-time notification listener using MongoDB Change Streams."
        ],
        "estimated_hours": "3 Hours",
        "resources": [
            {"title": "MongoDB Official Documentation", "url": "https://www.mongodb.com/docs/", "source": "MongoDB Docs", "source_type": "OFFICIAL_DOCS", "description": "Official guides to BSON data modeling, aggregation pipelines, replica sets, and sharding."},
            {"title": "MongoDB University Free Courses", "url": "https://learn.mongodb.com/", "source": "MongoDB University", "source_type": "GUIDE", "description": "Hands-on labs and certifications covering NoSQL schema design and query optimization."},
            {"title": "freeCodeCamp MongoDB Full Course", "url": "https://www.youtube.com/watch?v=ofme2o29ngU", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Complete beginner to advanced MongoDB tutorial with aggregation framework examples."}
        ],
        "questions": {
            "basic": [
                "What is MongoDB and how does a document database differ from a relational database?",
                "When should you embed documents vs reference them by ObjectId?",
                "What is BSON and how does it extend JSON?"
            ],
            "intermediate": [
                "Explain the MongoDB Aggregation Pipeline and how `$group` and `$lookup` work.",
                "What is a Compound Index and why does index field order matter (ESR rule)?",
                "Explain Write Concern (`w: majority`) and Read Concern in MongoDB replica sets."
            ],
            "advanced": [
                "How does MongoDB Sharding distribute data across shards and what are the pitfalls of choosing a low-cardinality Shard Key?",
                "How do multi-document ACID transactions work in MongoDB replica sets and what is the performance impact?",
                "How do you diagnose and resolve WiredTiger storage engine cache pressure and ticket bottlenecks?"
            ]
        }
    },
    "C++": {
        "prerequisites": "C syntax or general programming background",
        "fundamentals": ["Pointers, References, Memory Addresses", "Classes, Constructors, Destructors, Access Modifiers", "Standard Template Library (STL): vector, map, set, queue", "Operator Overloading and Namespaces"],
        "core_concepts": ["Dynamic Memory Management (`new`/`delete`, RAII idiom)", "Pointers: Raw Pointers vs Smart Pointers (`std::unique_ptr`, `std::shared_ptr`, `std::weak_ptr`)", "Templates and Generic Programming", "Move Semantics and Rvalue References (C++11+)"],
        "interview_topics": ["Virtual Functions and VTABLE / VPTR dispatch", "Rule of 3 / Rule of 5 / Rule of 0", "Memory alignment, padding, and Cache locality", "Undefined Behavior and Memory safety pitfalls (Dangling pointers, double free)"],
        "practice_tasks": [
            "Implement a custom `Vector` class with dynamic resizing and move semantics.",
            "Write a thread-safe memory pool allocator using RAII.",
            "Implement a custom smart pointer class imitating `std::shared_ptr` with reference counting.",
            "Solve standard competitive programming/algorithmic problems using STL containers and iterators."
        ],
        "estimated_hours": "3-5 Hours",
        "resources": [
            {"title": "cppreference.com - Complete C++ Standard Reference", "url": "https://en.cppreference.com/w/", "source": "cppreference", "source_type": "OFFICIAL_DOCS", "description": "Standard authoritative reference for modern C++ (C++11/14/17/20), STL containers, and algorithms."},
            {"title": "GeeksforGeeks C++ Programming Language", "url": "https://www.geeksforgeeks.org/c-plus-plus/", "source": "GeeksforGeeks", "source_type": "ARTICLE", "description": "Comprehensive tutorials from basic syntax to smart pointers, STL, and C++ interview questions."},
            {"title": "freeCodeCamp C++ Programming Course", "url": "https://www.youtube.com/watch?v=vLnPwxZdW4Y", "source": "freeCodeCamp", "source_type": "VIDEO", "description": "Full course covering pointers, memory management, OOP, and data structures in C++."}
        ],
        "questions": {
            "basic": [
                "What is the difference between a pointer and a reference in C++?",
                "What is RAII (Resource Acquisition Is Initialization) in C++?",
                "What is the difference between `std::vector` and a raw static array?"
            ],
            "intermediate": [
                "Explain the differences between `std::unique_ptr`, `std::shared_ptr`, and `std::weak_ptr`.",
                "How do Virtual Functions and the VTABLE / VPTR mechanism achieve runtime polymorphism?",
                "What is the Rule of Five in modern C++?"
            ],
            "advanced": [
                "Explain Move Semantics, Rvalue references (`&&`), and `std::move` vs `std::forward`.",
                "How does template instantiation work at compile time and what is SFINAE (Substitution Failure Is Not An Error)?",
                "How do struct padding and memory alignment affect CPU cache line utilization and performance?"
            ]
        }
    }
}

def get_skill_knowledge(skill: str) -> Dict[str, Any]:
    """Retrieves verified knowledge base for a skill or builds a structured fallback."""
    if skill in VERIFIED_SKILL_KNOWLEDGE_BASE:
        return VERIFIED_SKILL_KNOWLEDGE_BASE[skill]

    # Deterministic fallback knowledge for skills not explicitly detailed in the top dictionary
    cat = categorize_skill(skill)
    yt_url = make_youtube_search_url(f"{skill} tutorial crash course")
    gfg_query = f"https://www.google.com/search?q={urllib.parse.quote_plus(skill + ' documentation tutorial geeksforgeeks')}"

    return {
        "prerequisites": f"Foundational {cat} concepts",
        "fundamentals": [f"{skill} Architecture & Setup", f"{skill} Core Syntax & Operations", f"{skill} Standard Library & Tools"],
        "core_concepts": [f"{skill} Best Practices", f"{skill} Integration & Configuration", f"{skill} Error Handling & Debugging"],
        "interview_topics": [f"{skill} Performance Optimization", f"{skill} Architecture Trade-offs", f"{skill} Production Troubleshooting"],
        "practice_tasks": [
            f"Build a production-ready application module leveraging {skill}.",
            f"Implement automated unit tests validating {skill} logic and edge cases.",
            f"Optimize configuration and resource utilization for {skill}."
        ],
        "estimated_hours": "2-3 Hours",
        "resources": [
            {"title": f"{skill} Documentation & Reference", "url": gfg_query, "source": "Official / Educational Source", "source_type": "OFFICIAL_DOCS", "description": f"Authoritative documentation and tutorials for {skill}."},
            {"title": f"{skill} Video Course & Guide", "url": yt_url, "source": "YouTube", "source_type": "VIDEO", "description": f"Curated video tutorials covering {skill} architecture and practical usage."}
        ],
        "questions": {
            "basic": [
                f"What are the primary use cases and benefits of using {skill}?",
                f"How do you initialize and configure a project with {skill}?",
                f"What are the core components or concepts in {skill}?"
            ],
            "intermediate": [
                f"How do you handle error states and exceptions in {skill}?",
                f"What are common design patterns or architectures when working with {skill}?",
                f"How does {skill} integrate with surrounding backend/frontend systems?"
            ],
            "advanced": [
                f"What are the common performance bottlenecks in {skill} and how do you optimize them?",
                f"How do you ensure security, concurrency, and reliability when running {skill} in production?",
                f"What architectural trade-offs would lead you to choose {skill} over competing technologies?"
            ]
        }
    }

# ---------------------------------------------------------------------------
# Project Extractor & Question Generator
# ---------------------------------------------------------------------------

class ProjectData(BaseModel):
    name: str
    description: str
    technologies: List[str]
    bullet_points: List[str]

def extract_projects_from_resume(doc: NormalizedDocument) -> List[ProjectData]:
    """
    Extracts actual projects mentioned in the resume and detects the technologies used.
    Prevents hallucinating technologies not mentioned in the project context.
    """
    projects: List[ProjectData] = []
    
    # 1. Look for sections categorized as projects or experience
    for section in doc.sections:
        h_lower = section.heading_text.lower()
        is_project_section = any(k in h_lower for k in ["project", "portfolio", "academic work", "key work", "experience"])
        
        if not is_project_section:
            continue
            
        current_proj_name = ""
        current_bullets: List[str] = []
        current_text_block: List[str] = []
        
        for p in section.paragraphs:
            text = p.full_text.strip()
            if not text:
                continue
                
            # Check if this paragraph looks like a project title (short, contains dates or tech keywords)
            if len(text) < 80 and not text.startswith("•") and not text.startswith("-") and not text.startswith("*"):
                if current_proj_name and current_bullets:
                    proj_text = " ".join(current_text_block)
                    proj_skills = extract_canonical_skills(proj_text)
                    projects.append(ProjectData(
                        name=current_proj_name,
                        description=proj_text[:200] + "..." if len(proj_text) > 200 else proj_text,
                        technologies=proj_skills,
                        bullet_points=current_bullets[:4]
                    ))
                current_proj_name = text
                current_bullets = []
                current_text_block = [text]
            else:
                clean_bullet = text.lstrip("•-* ").strip()
                current_bullets.append(clean_bullet)
                current_text_block.append(clean_bullet)
                
        # Append last project if any
        if current_proj_name and current_bullets:
            proj_text = " ".join(current_text_block)
            proj_skills = extract_canonical_skills(proj_text)
            projects.append(ProjectData(
                name=current_proj_name,
                description=proj_text[:200] + "..." if len(proj_text) > 200 else proj_text,
                technologies=proj_skills,
                bullet_points=current_bullets[:4]
            ))
            
    # Fallback if no specific project headers were matched
    if not projects:
        # Extract from experience or all sections
        for sec in doc.sections:
            for p in sec.paragraphs:
                p_text = p.full_text.strip()
                skills = extract_canonical_skills(p_text)
                if len(skills) >= 2 and len(p_text) > 40:
                    projects.append(ProjectData(
                        name=f"Key Initiative: {skills[0]} & {skills[1]} Integration",
                        description=p_text[:200],
                        technologies=skills,
                        bullet_points=[p_text]
                    ))
                    if len(projects) >= 3:
                        break
            if len(projects) >= 3:
                break
                
    return projects[:3]  # Keep top 3 projects to avoid overwhelming

def generate_project_interview_prep(project: ProjectData) -> Dict[str, Any]:
    """
    Generates targeted technical and architecture questions based strictly on the project stack.
    """
    tech_str = ", ".join(project.technologies) if project.technologies else "core technologies"
    
    primary_tech = project.technologies[0] if project.technologies else "software"
    secondary_tech = project.technologies[1] if len(project.technologies) > 1 else None

    architecture_questions = [
        f"Walk me through the high-level architecture of '{project.name}'. How do the components communicate?",
        f"Why did you choose {tech_str} for this project over alternative tech stacks?",
        f"How did you design the data flow and handle data persistence/storage in '{project.name}'?"
    ]
    
    technical_questions = [
        f"How did you implement the core business logic using {primary_tech} in '{project.name}'?",
        f"How did you handle error boundaries, logging, and exception handling across '{project.name}'?"
    ]
    if secondary_tech:
        technical_questions.append(
            f"How does {primary_tech} interface with {secondary_tech} in your implementation?"
        )
        
    challenge_questions = [
        f"What was the single most difficult technical hurdle or bug you encountered while building '{project.name}', and how did you diagnose and resolve it?",
        f"If you had to refactor or scale '{project.name}' to handle 100x user volume, what bottlenecks would you address first?"
    ]
    
    resume_verification_questions = [
        f"Can you explain the specific part of '{project.name}' that you wrote personally?",
        f"What trade-offs did you make during the development of '{project.name}' to deliver on time?"
    ]
    
    return {
        "project_name": project.name,
        "tech_stack": project.technologies,
        "description": project.description,
        "architecture_questions": architecture_questions,
        "technical_questions": technical_questions,
        "challenge_questions": challenge_questions,
        "resume_verification_questions": resume_verification_questions
    }

# ---------------------------------------------------------------------------
# Deterministic Skill Gap & Priority Engine
# ---------------------------------------------------------------------------

class SkillGapItem(BaseModel):
    skill: str
    category: str
    status: str      # MATCHED, REVISION_NEEDED, REQUIRED_MISSING, PREFERRED_MISSING, OPTIONAL
    status_label: str # "MATCHED — REVISION NEEDED", "REQUIRED — NOT DETECTED", etc.
    priority: str    # CRITICAL, IMPORTANT, SUPPORTING, OPTIONAL
    priority_order: int
    reason: str

def analyze_skill_gaps(
    resume_skills: List[str],
    has_jd: bool,
    jd_required_skills: List[str],
    jd_preferred_skills: List[str]
) -> List[SkillGapItem]:
    """
    Deterministically computes skill gaps and priority ranks based on Resume and JD.
    """
    gaps: List[SkillGapItem] = []
    resume_set = set(resume_skills)
    req_set = set(jd_required_skills)
    pref_set = set(jd_preferred_skills)

    if not has_jd:
        # Resume-Only Mode: All detected skills need interview revision
        for skill in sorted(resume_skills):
            gaps.append(SkillGapItem(
                skill=skill,
                category=categorize_skill(skill),
                status="MATCHED",
                status_label="DETECTED IN RESUME",
                priority="IMPORTANT",
                priority_order=2,
                reason="Detected in your uploaded resume. Focus on fundamental principles, edge cases, and interview-level questions."
            ))
        return gaps

    # Resume + JD Mode:
    # 1. Missing Required Skills (CRITICAL - Priority 1)
    missing_required = sorted(list(req_set - resume_set))
    for skill in missing_required:
        gaps.append(SkillGapItem(
            skill=skill,
            category=categorize_skill(skill),
            status="REQUIRED_MISSING",
            status_label="REQUIRED — NOT DETECTED",
            priority="CRITICAL",
            priority_order=1,
            reason=f"{skill} is explicitly required in the target Job Description but was not detected in your resume. High probability of interview evaluation."
        ))

    # 2. Matched Required Skills (IMPORTANT - Priority 2)
    matched_required = sorted(list(req_set & resume_set))
    for skill in matched_required:
        gaps.append(SkillGapItem(
            skill=skill,
            category=categorize_skill(skill),
            status="REVISION_NEEDED",
            status_label="MATCHED — REVISION NEEDED",
            priority="IMPORTANT",
            priority_order=2,
            reason=f"{skill} is required by the role and detected in your resume. Revise deep architectural concepts, internals, and performance optimization."
        ))

    # 3. Missing Preferred Skills (SUPPORTING - Priority 3)
    missing_preferred = sorted(list((pref_set - req_set) - resume_set))
    for skill in missing_preferred:
        gaps.append(SkillGapItem(
            skill=skill,
            category=categorize_skill(skill),
            status="PREFERRED_MISSING",
            status_label="PREFERRED — NOT DETECTED",
            priority="SUPPORTING",
            priority_order=3,
            reason=f"{skill} is listed as a preferred or nice-to-have skill in the JD. Studying key basics will set you apart from other candidates."
        ))

    # 4. Matched Preferred Skills (SUPPORTING - Priority 3)
    matched_preferred = sorted(list((pref_set - req_set) & resume_set))
    for skill in matched_preferred:
        gaps.append(SkillGapItem(
            skill=skill,
            category=categorize_skill(skill),
            status="MATCHED",
            status_label="MATCHED — PREFERRED SKILL",
            priority="SUPPORTING",
            priority_order=3,
            reason=f"{skill} is a preferred JD skill present on your resume. Be ready to discuss how you've used it in past projects."
        ))

    # 5. Other Resume Skills (OPTIONAL - Priority 4)
    other_resume = sorted(list(resume_set - req_set - pref_set))
    for skill in other_resume:
        gaps.append(SkillGapItem(
            skill=skill,
            category=categorize_skill(skill),
            status="OPTIONAL",
            status_label="ADDITIONAL RESUME SKILL",
            priority="OPTIONAL",
            priority_order=4,
            reason=f"{skill} is on your resume but not explicitly mentioned in the JD. Revise briefly as supporting background."
        ))

    # Sort deterministically by priority order, then alphabetically
    gaps.sort(key=lambda g: (g.priority_order, g.skill))
    return gaps

# ---------------------------------------------------------------------------
# Roadmap Phase & Module Builder
# ---------------------------------------------------------------------------

def build_interview_prep_modules(
    skill_gaps: List[SkillGapItem]
) -> List[Dict[str, Any]]:
    """
    Constructs comprehensive study modules for each prioritized skill.
    """
    modules: List[Dict[str, Any]] = []
    
    for item in skill_gaps:
        kb = get_skill_knowledge(item.skill)
        
        # Format learning sources
        learning_sources = []
        for r in kb.get("resources", []):
            learning_sources.append({
                "title": r["title"],
                "url": r["url"],
                "source_type": r.get("source_type", "OFFICIAL_DOCS"),
                "description": r["description"],
                "recommended_reading": f"Focus on {item.skill} concepts, code examples, and practice questions."
            })
            
        concepts = kb.get("fundamentals", [])[:2] + kb.get("core_concepts", [])[:2] + kb.get("interview_topics", [])[:2]
        
        modules.append({
            "topic_id": f"mod_{item.skill.lower().replace(' ', '_').replace('.', '_').replace('#', 'sharp').replace('+', 'plus')}",
            "title": f"{item.skill} — Mastery Track",
            "skill": item.skill,
            "category": item.category,
            "priority": item.priority,
            "status": item.status,
            "status_label": item.status_label,
            "estimated_hours": kb.get("estimated_hours", "2-3 Hours"),
            "prerequisites": kb.get("prerequisites", "Foundational programming basics"),
            "concepts_to_master": concepts,
            "why_it_matters_for_role": item.reason,
            "learning_sources": learning_sources,
            "independent_practice_tasks": kb.get("practice_tasks", []),
            "interview_questions": kb.get("questions", {})
        })
        
    return modules

def build_schedule_phases(
    has_jd: bool,
    skill_gaps: List[SkillGapItem]
) -> List[Dict[str, Any]]:
    """
    Builds the multi-phase study schedule based on deterministic priorities.
    """
    phases: List[Dict[str, Any]] = []
    
    if not has_jd:
        # Resume Mode Phases
        # Phase 1: Core Languages & Foundations
        lang_skills = [g.skill for g in skill_gaps if g.category in ["Programming Languages", "Web Development"]]
        if lang_skills:
            phases.append({
                "phase_title": "Phase 1: Core Technical Foundations",
                "focus_summary": f"Deep revision of syntax, data structures, and core principles in {', '.join(lang_skills[:4])}.",
                "deliverables": [f"Complete fundamentals review for {s}" for s in lang_skills[:3]] + ["Execute baseline coding practice"]
            })
            
        # Phase 2: Backend, Databases & Systems
        backend_skills = [g.skill for g in skill_gaps if g.category in ["Backend & APIs", "Databases & Caching", "Databases & Query Languages", "Operating Systems & Tools"]]
        if backend_skills:
            phases.append({
                "phase_title": "Phase 2: Data Persistence & Architecture",
                "focus_summary": f"Review query optimization, API contracts, and command-line tooling for {', '.join(backend_skills[:4])}.",
                "deliverables": [f"Practice complex queries and commands in {s}" for s in backend_skills[:3]]
            })
            
        # Phase 3: Project Preparation & Technical Deep-Dive
        phases.append({
            "phase_title": "Phase 3: Project Defense & Advanced Interview Topics",
            "focus_summary": "Prepare architecture walkthroughs, debugging retrospectives, and trade-off justifications for your resume projects.",
            "deliverables": [
                "Draft clear 2-minute elevator pitch for each resume project",
                "Prepare STAR-method responses for biggest technical hurdles",
                "Practice intermediate and advanced technical questions"
            ]
        })
        
        # Phase 4: Final Interview Readiness
        phases.append({
            "phase_title": "Phase 4: Mock Simulation & Final Polish",
            "focus_summary": "Simulate end-to-end technical screenings, timed problem-solving, and behavioral alignment.",
            "deliverables": [
                "Complete the interactive Readiness Checklist",
                "Conduct a 30-minute self-mock interview covering core skills",
                "Review resume verification questions"
            ]
        })
        
    else:
        # Resume + JD Mode Phases
        # Phase 1: Missing Required JD Skills (Critical)
        critical_skills = [g.skill for g in skill_gaps if g.priority == "CRITICAL"]
        if critical_skills:
            phases.append({
                "phase_title": "Phase 1: Critical JD Skill Gaps",
                "focus_summary": f"Urgent ramp-up on mandatory JD skills not detected on your resume: {', '.join(critical_skills)}.",
                "deliverables": [f"Study core documentation and fundamentals for {s}" for s in critical_skills] + ["Build a proof-of-concept project demonstrating integration"]
            })
            
        # Phase 2: Matched Required Skills Revision (Important)
        important_skills = [g.skill for g in skill_gaps if g.priority == "IMPORTANT"]
        if important_skills:
            phases.append({
                "phase_title": "Phase 2: Deep Revision of Core Role Requirements",
                "focus_summary": f"Deepen interview-level mastery on required technologies you already know: {', '.join(important_skills)}.",
                "deliverables": [f"Review advanced concepts & pitfalls in {s}" for s in important_skills] + ["Solve intermediate problem sets"]
            })
            
        # Phase 3: Supporting / Preferred Skills & Practical Application
        supporting_skills = [g.skill for g in skill_gaps if g.priority == "SUPPORTING"]
        if supporting_skills:
            phases.append({
                "phase_title": "Phase 3: Preferred Skills & System Integration",
                "focus_summary": f"Study preferred JD technologies: {', '.join(supporting_skills[:4])}.",
                "deliverables": [f"Familiarize with standard use cases for {s}" for s in supporting_skills[:3]]
            })
            
        # Phase 4: JD-Specific Scenarios & Project Defense
        phases.append({
            "phase_title": "Phase 4: Role-Specific Scenarios & Project Defense",
            "focus_summary": "Align your actual project achievements with the target employer's core responsibilities and technical architecture.",
            "deliverables": [
                "Map your resume projects to the specific responsibilities listed in the JD",
                "Prepare answers for JD-specific architecture and domain scenarios",
                "Complete the interactive Interview Readiness Checklist"
            ]
        })
        
    return phases

def build_categorized_interview_questions(
    skill_gaps: List[SkillGapItem],
    projects: List[ProjectData],
    has_jd: bool,
    jd_req: JobDescriptionRequest
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Aggregates interview questions organized strictly into categories:
    Fundamentals, Intermediate, Advanced, Project, JD-Specific, Behavioral.
    """
    categorized: Dict[str, List[Dict[str, Any]]] = {
        "Fundamentals": [],
        "Intermediate": [],
        "Advanced": [],
        "Project": [],
        "JD-Specific": [],
        "Behavioral": []
    }
    
    q_counter = 1
    
    # 1. Technical Questions by Level from Detected Skills
    for item in skill_gaps[:6]:  # Focus on top 6 prioritized skills
        kb = get_skill_knowledge(item.skill)
        questions_dict = kb.get("questions", {})
        
        for q_text in questions_dict.get("basic", []):
            categorized["Fundamentals"].append({
                "question_id": f"q_{q_counter}",
                "question": q_text,
                "context": f"Tests core understanding of {item.skill} syntax and fundamentals.",
                "category": f"{item.skill} · Fundamentals",
                "skill": item.skill
            })
            q_counter += 1
            
        for q_text in questions_dict.get("intermediate", []):
            categorized["Intermediate"].append({
                "question_id": f"q_{q_counter}",
                "question": q_text,
                "context": f"Tests practical application and standard patterns in {item.skill}.",
                "category": f"{item.skill} · Intermediate",
                "skill": item.skill
            })
            q_counter += 1
            
        for q_text in questions_dict.get("advanced", []):
            categorized["Advanced"].append({
                "question_id": f"q_{q_counter}",
                "question": q_text,
                "context": f"Tests deep architectural trade-offs, internals, and performance in {item.skill}.",
                "category": f"{item.skill} · Advanced",
                "skill": item.skill
            })
            q_counter += 1

    # 2. Project Questions from actual resume projects
    for proj in projects:
        prep = generate_project_interview_prep(proj)
        for q_text in prep["architecture_questions"][:2]:
            categorized["Project"].append({
                "question_id": f"q_{q_counter}",
                "question": q_text,
                "context": f"Project: {proj.name} ({', '.join(proj.technologies)})",
                "category": "Project Architecture",
                "skill": proj.technologies[0] if proj.technologies else "General"
            })
            q_counter += 1
        for q_text in prep["challenge_questions"][:1]:
            categorized["Project"].append({
                "question_id": f"q_{q_counter}",
                "question": q_text,
                "context": f"Project: {proj.name} — Problem Solving & Troubleshooting",
                "category": "Project Challenges",
                "skill": proj.technologies[0] if proj.technologies else "General"
            })
            q_counter += 1

    # 3. JD-Specific Questions (if JD exists)
    if has_jd and jd_req.text:
        jd_skills = [g.skill for g in skill_gaps if g.priority in ["CRITICAL", "IMPORTANT"]]
        role = jd_req.title or "this engineering role"
        
        categorized["JD-Specific"].append({
            "question_id": f"q_{q_counter}",
            "question": f"How does your past experience prepare you to meet the core responsibilities of {role}?",
            "context": "Evaluates role alignment with the target Job Description.",
            "category": "Role Alignment",
            "skill": "JD"
        })
        q_counter += 1
        
        if jd_skills:
            categorized["JD-Specific"].append({
                "question_id": f"q_{q_counter}",
                "question": f"How would you architect a production feature integrating {', '.join(jd_skills[:3])} according to the job requirements?",
                "context": "Evaluates hands-on system integration required by the employer.",
                "category": "Technical Architecture",
                "skill": jd_skills[0]
            })
            q_counter += 1

    # 4. Behavioral Questions
    behavioral_bank = [
        ("Describe a time when you had to debug a critical production bug under time pressure. What was your process?", "Tests composure, diagnostic strategy, and incident resolution."),
        ("How do you handle technical disagreements with teammates during code reviews or architecture discussions?", "Tests collaboration, communication, and pragmatic consensus building."),
        ("Tell me about a time you had to learn an unfamiliar technology or framework rapidly to deliver a feature.", "Tests learning agility and adaptability."),
        ("Describe a project where requirements changed midway through development. How did you adjust your plan?", "Tests flexibility and agile delivery.")
    ]
    for b_q, b_ctx in behavioral_bank:
        categorized["Behavioral"].append({
            "question_id": f"q_{q_counter}",
            "question": b_q,
            "context": b_ctx,
            "category": "STAR Method Behavioral",
            "skill": "Soft Skills"
        })
        q_counter += 1

    return categorized

def build_readiness_checklist(
    has_jd: bool,
    skill_gaps: List[SkillGapItem],
    projects: List[ProjectData]
) -> List[Dict[str, Any]]:
    """
    Generates an interactive checklist of actionable preparation milestones.
    """
    checklist: List[Dict[str, Any]] = []
    
    # 1. Resume Skills Check
    for item in skill_gaps[:5]:
        checklist.append({
            "item_id": f"chk_{item.skill.lower().replace(' ', '_')}",
            "category": "Resume Skills Revision" if not has_jd or item.priority == "IMPORTANT" else "Target JD Skills",
            "label": f"Master {item.skill} core concepts, pitfalls, and interview questions",
            "priority": item.priority,
            "completed": False
        })
        
    # 2. Projects Check
    for proj in projects:
        checklist.append({
            "item_id": f"chk_proj_{proj.name[:15].lower().replace(' ', '_')}",
            "category": "Project Defense",
            "label": f"Prepare 2-minute architectural walkthrough and challenges for '{proj.name}'",
            "priority": "IMPORTANT",
            "completed": False
        })
        
    # 3. Practice & Behavioral Check
    checklist.append({
        "item_id": "chk_coding_practice",
        "category": "Coding & Problem Solving",
        "label": "Solve 5-10 hands-on practice problems in your primary programming language",
        "priority": "IMPORTANT",
        "completed": False
    })
    
    checklist.append({
        "item_id": "chk_behavioral",
        "category": "Behavioral Alignment",
        "label": "Prepare STAR-method stories for leadership, conflict resolution, and production troubleshooting",
        "priority": "IMPORTANT",
        "completed": False
    })
    
    return checklist

# ---------------------------------------------------------------------------
# Main Engine Entrypoint
# ---------------------------------------------------------------------------

def generate_personalized_interview_plan(
    doc: NormalizedDocument,
    jd: JobDescriptionRequest
) -> Dict[str, Any]:
    """
    The deterministic master engine for generating personalized interview preparation plans.
    Authoritative source of truth for:
    - Detected resume skills
    - Categorization
    - JD requirements
    - Skill status & priority
    - Multi-phase roadmap
    - Verified resource links
    - Project deep-dive questions
    - Interactive checklist
    """
    has_jd = bool(jd.text and jd.text.strip())
    
    # 1. Deterministic Resume Skill Extraction
    resume_text = doc.raw_text or " ".join(p.full_text for s in doc.sections for p in s.paragraphs)
    resume_skills = extract_canonical_skills(resume_text)
    categorized_resume_skills = group_skills_by_category(resume_skills)
    
    # 2. Deterministic JD Parsing (if present)
    jd_required_skills: List[str] = []
    jd_preferred_skills: List[str] = []
    role_title = "Software Engineer"
    company = "Target Company"
    
    if has_jd:
        parsed_jd = parse_job_description(jd)
        jd_required_skills = parsed_jd.get("required_skills", [])
        jd_preferred_skills = parsed_jd.get("preferred_skills", [])
        role_title = jd.title if jd.title and jd.title.strip() else "Target Technical Role"
        company = jd.company if jd.company and jd.company.strip() else "Hiring Organization"
    else:
        # Detect role title from resume or default
        if "Python" in resume_skills and ("FastAPI" in resume_skills or "Django" in resume_skills):
            role_title = "Python / Backend Engineer"
        elif "React" in resume_skills or "JavaScript" in resume_skills or "TypeScript" in resume_skills:
            role_title = "Frontend / Full Stack Engineer"
        elif "Machine Learning" in resume_skills or "Deep Learning" in resume_skills:
            role_title = "AI / ML Engineer"
        else:
            role_title = "Software Engineer"
        company = "Your Target Technical Interviews"

    # 3. Deterministic Skill Gap Analysis
    skill_gaps = analyze_skill_gaps(
        resume_skills=resume_skills,
        has_jd=has_jd,
        jd_required_skills=jd_required_skills,
        jd_preferred_skills=jd_preferred_skills
    )
    
    # 4. Resume Projects Extraction
    projects_data = extract_projects_from_resume(doc)
    project_prep = [generate_project_interview_prep(p) for p in projects_data]
    
    # 5. Build Study Modules with Verified Resources
    modules = build_interview_prep_modules(skill_gaps)
    
    # 6. Build Schedule Phases
    schedule_phases = build_schedule_phases(has_jd, skill_gaps)
    
    # 7. Build Categorized Questions
    categorized_questions = build_categorized_interview_questions(skill_gaps, projects_data, has_jd, jd)
    
    # Flat list for backwards compatibility
    flat_questions = []
    for cat_name, q_list in categorized_questions.items():
        for q in q_list:
            flat_questions.append({
                "question_id": q["question_id"],
                "question": q["question"],
                "context": q["context"],
                "category": q["category"]
            })
            
    # 8. Build Interactive Readiness Checklist
    readiness_checklist = build_readiness_checklist(has_jd, skill_gaps, projects_data)
    
    # 9. Top-Level Summary
    mode_str = "resume_jd" if has_jd else "resume_only"
    timeline = "14-Day Targeted Mastery Plan" if has_jd else "Self-Paced Skills Revision Plan"
    
    if has_jd:
        target_summary = (
            f"Job-Specific Interview Preparation Roadmap customized for {role_title} at {company}. "
            f"Prioritizes mandatory JD requirements missing from your resume, followed by deep revision of matched skills, "
            f"project defense, and role-specific technical questions."
        )
    else:
        target_summary = (
            f"Resume-Based Interview Preparation Roadmap built strictly from the {len(resume_skills)} technical skills "
            f"and projects detected on your uploaded resume. Focuses on foundational principles, practical implementations, and interview readiness."
        )

    # Flatten Curated Free Resources
    curated_free = []
    for mod in modules[:3]:
        for src in mod.get("learning_sources", [])[:1]:
            curated_free.append({
                "title": src["title"],
                "url": src["url"],
                "source_type": src["source_type"],
                "description": src["description"],
                "recommended_reading": src.get("recommended_reading")
            })

    return {
        "plan_id": f"plan_{'jd' if has_jd else 'res'}_{len(resume_skills)}",
        "mode": mode_str,
        "role_title": role_title,
        "company": company,
        "has_target_jd": has_jd,
        "timeline_overview": timeline,
        "target_summary": target_summary,
        "detected_resume_skills": resume_skills,
        "detected_resume_skills_categorized": categorized_resume_skills,
        "jd_required_skills": jd_required_skills,
        "jd_preferred_skills": jd_preferred_skills,
        "skill_gaps": [g.model_dump() for g in skill_gaps],
        "modules": modules,
        "recommended_schedule": schedule_phases,
        "project_preparation": project_prep,
        "interview_questions_by_category": categorized_questions,
        "likely_interview_questions": flat_questions,
        "readiness_checklist": readiness_checklist,
        "curated_free_resources": curated_free
    }
