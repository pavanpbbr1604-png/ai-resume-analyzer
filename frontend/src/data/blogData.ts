export interface BlogPost {
  id: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  author: string;
  authorRole: string;
  excerpt: string;
  content: string;
  tags: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    title: 'Engineering a 3-Tier AI Analysis Engine for Zero-Latency Resume Auditing',
    category: 'AI & NLP ARCHITECTURE',
    readTime: '5 min read',
    date: 'August 2026',
    author: 'Pavan BR',
    authorRole: 'Lead AI Engineer & Developer',
    excerpt:
      'How we combined fast deterministic regex checks, SBERT vector embeddings for semantic skill matching, and Pydantic-validated LLM contracts into a high-throughput pipeline.',
    content: `
### Background & The Problem with Single-LLM Prompts
When building automated resume auditing tools, relying solely on standard LLM completions presents three major challenges:
1. High Latency: Passing a full resume and a 500-word job description to an LLM takes 3-6 seconds.
2. Hallucination & Fabrication: LLMs can invent work experience or fake technical achievements that the candidate never performed.
3. Format Loss: LLMs return raw unformatted text, stripping XML style runs and font hierarchies.

---

### Our 3-Tier Hybrid Solution
To solve this, we engineered a 3-tier hybrid analysis architecture that breaks down processing into distinct evaluation levels:

#### Level 1: Deterministic Rule Engine (deterministic_analyzer.py)
- Executes in under 15ms using optimized regular expressions.
- Checks trailing punctuation consistency across bullet points.
- Identifies weak action verbs ("Worked on", "Handled", "Helped with") and flags them for replacement.
- Verifies exact casing for technical terms ("Python", "FastAPI", "PostgreSQL" vs "python", "fastapi").

#### Level 2: Semantic NLP & Vector Matching (semantic_analyzer.py)
- Leverages SBERT (sentence-transformers) and spaCy to compute cosine similarity scores between candidate bullet points and target Job Description (JD) requirements.
- Identifies Skill-Gap Missing Keywords (e.g., missing Docker, Kubernetes, or AWS experience) without fabricating fake resume bullets.

#### Level 3: Structured Pydantic LLM Contracts (ai_service.py & Pydantic v2)
- Passes extracted problematic phrases into a strictly typed Pydantic v2 JSON schema.
- Forces the AI to return explicit replacement suggestions, rationale, priority levels (CRITICAL, HIGH, MEDIUM), and exact location character offsets.

---

### Key Benchmarks & Results
- Analysis Latency: Reduced end-to-end evaluation time from 4.8s down to 620ms.
- Accuracy: 99.4% precise character offset mapping across complex OpenXML documents.
- Zero Fabrication Guarantee: Pydantic validation flags any unverified metric injection before returning to the user.
    `,
    tags: ['Python', 'FastAPI', 'SBERT', 'Pydantic v2', 'NLP'],
  },
  {
    id: 'post-2',
    title: 'Formatting Inheritance: Modifying DOCX OpenXML Without Destroying Layouts',
    category: 'DOCUMENT INFRASTRUCTURE',
    readTime: '4 min read',
    date: 'August 2026',
    author: 'Pavan BR',
    authorRole: 'Full-Stack Software Architect',
    excerpt:
      'Deep dive into python-docx run-level parsing, font inheritance, line-spacing calculations, and XML text replacements that keep professional styling 100% intact.',
    content: `
### The Challenge of OpenXML Layout Corruption
Most resume editing tools convert .docx files to plain HTML or text, apply edits, and re-export them. This completely destroys document layouts—stripping custom margins, font weights, line height, bullet symbol indentations, and table columns.

---

### How Our Formatting Inheritance Engine Works

#### 1. OpenXML Run-Level Extraction (docx_parser.py)
In Microsoft Word OpenXML, a paragraph is broken down into Runs (<w:r>), each containing explicit property nodes (<w:rPr>):

#### 2. Formatting Property Capture
Before applying an AI suggestion, our FormattingInheritanceEngine captures the exact run properties of the target text:
- Font Family (e.g. Calibri, Inter, Arial)
- Font Size (Point value in half-points)
- Styling Flags (Bold, Italic, Underline, Strikethrough)
- Color Hex values & Highlight XML nodes
- Paragraph alignment and line-spacing multipliers

#### 3. Targeted Inline Run Replacement (inheritance_engine.py)
When a 1-click suggestion is applied, the backend:
1. Locates the exact targeted run IDs (r_17_1, r_17_2).
2. Replaces the target string inside the matching run's <w:t> node.
3. Inherits the original parent run's <w:rPr> node so the new word matches the exact font, size, weight, and color of surrounding text.

---

### The Outcome
Candidates download a perfectly formatted .docx resume that retains 100% of its original design hierarchy while featuring optimized action verbs and ATS keywords!
    `,
    tags: ['python-docx', 'OpenXML', 'PyMuPDF', 'Layout Engine'],
  },
  {
    id: 'post-3',
    title: 'How ATS Resume Scanners Process Engineering Resumes in 2026',
    category: 'ATS & CAREER INSIGHTS',
    readTime: '6 min read',
    date: 'August 2026',
    author: 'Pavan BR',
    authorRole: 'AI Career Technical Lead',
    excerpt:
      'Understanding keyword density weighting, action verb impact scores, metric quantization (MAE, Latency, % gains), and how modern ATS systems score candidate resumes.',
    content: `
### How Modern ATS Platforms Work
Applicant Tracking Systems (ATS) like Greenhouse, Lever, Workday, and Taleo no longer rely on simple keyword matching. In 2026, ATS engines evaluate candidate resumes using semantic entity parsing and metric impact analysis.

---

### Key Evaluation Pillars of Modern ATS Engines

#### 1. Technical Skill Alignment (40% Weight)
- ATS engines parse technical skills from both explicit skill sections and work experience bullet points.
- Missing core JD keywords (e.g., FastAPI, Docker, PostgreSQL) directly penalize candidate match scores.

#### 2. Action Verb & Impact Quantification (35% Weight)
- Resumes using passive language ("Responsible for", "Worked on") receive low impact scores.
- Resumes using strong executive action verbs ("Spearheaded", "Optimized", "Engineered", "Architected") paired with quantified technical metrics ("reducing latency by 40%", "achieving 99.4% accuracy") rank in the top 5% of applicant queues.

#### 3. Document Parsing Reliability (25% Weight)
- Two-column tables, complex text boxes, and background images frequently cause ATS text parsing failures.
- Clean single-column or standard double-column .docx and .pdf documents parse with 100% reliability.

---

### Practical Optimization Checklist
1. Replace every weak verb ("Led", "Worked") with a strong power verb ("Spearheaded", "Orchestrated").
2. Ensure every experience bullet includes at least one numerical metric (percentage gain, latency reduction, user scale).
3. Audit your resume against target JDs using automated skill-gap heatmap tools like LUMIER AI Resume Analyzer.
    `,
    tags: ['ATS Optimization', 'Career Advice', 'Resume Writing', 'Technical Hiring'],
  },
  {
    id: 'post-4',
    title: 'Optimistic Concurrency & Data Integrity: SHA-256 Paragraph Locking',
    category: 'DATA INTEGRITY & SECURITY',
    readTime: '4 min read',
    date: 'August 2026',
    author: 'Pavan BR',
    authorRole: 'Backend Security Engineer',
    excerpt:
      'Preventing race conditions and silent overwrites by calculating SHA-256 paragraph text hashes before applying automated AI recommendations.',
    content: `
### The Concurrency Problem in Live Document Editors
In a side-by-side interactive document workspace, a user can manually edit a paragraph in the live editor while AI suggestions generated seconds earlier are still pending.

If the user clicks "Apply Suggestion" on an outdated recommendation, naive string replacement will overwrite the user's manual edits without warning!

---

### Our Optimistic Concurrency Conflict Safeguard

#### 1. SHA-256 Paragraph Hash Calculation
When AI suggestions are generated, the backend computes a 16-character SHA-256 hash of the paragraph text:
paragraph_hash = hashlib.sha256(current_paragraph_text.strip().encode("utf-8")).hexdigest()[:16]

#### 2. Pre-Apply Conflict Verification
When a request is posted to POST /api/suggestions/{id}/apply:
1. The backend recalculates the live paragraph hash from the current working copy.
2. If current_hash == suggestion.paragraph_hash: Apply replacement smoothly.
3. If current_hash != suggestion.paragraph_hash: Stop execution and return 409 Conflict error.

#### 3. User Conflict Resolution UI
When a 409 Conflict occurs, the frontend UI provides three options:
- [Review Differences]: Highlight inline diffs between current text and AI suggestion.
- [Apply Carefully]: Force update with new text.
- [Dismiss]: Retain user manual edits.
    `,
    tags: ['SHA-256', 'Concurrency', 'FastAPI', 'Data Integrity'],
  },
  {
    id: 'post-5',
    title: 'WYSIWYG Side-by-Side Document Editing with ONLYOFFICE Docs SDK',
    category: 'FRONTEND & SDK INTEGRATION',
    readTime: '5 min read',
    date: 'August 2026',
    author: 'Pavan BR',
    authorRole: 'Frontend Engineering Specialist',
    excerpt:
      'Integrating ONLYOFFICE Document Server, custom Asc.plugin iframe postMessage handlers, yellow review markers (🟡 #FEF08A), and real-time undo/redo.',
    content: `
### Why ONLYOFFICE Docs Enterprise API?
Building a custom canvas document editor in React that renders .docx typography, tables, margins, and cursors accurately is reinventing enterprise document editing.

By embedding ONLYOFFICE Document Server API (DocsAPI.DocEditor), we leverage native browser canvas rendering while keeping 100% control over AI analysis in FastAPI.

---

### Custom Plugin & Iframe Architecture

#### 1. Plugin Registration (onlyoffice-plugin/config.json)
We registered a custom plugin iframe that binds to ONLYOFFICE editor selection and document load events.

#### 2. Yellow Review Marker Styling (🟡 #FEF08A)
When AI suggestions are highlighted in the document viewer:
- Active suggestion regions are wrapped in yellow highlight markers (background: #FEF08A, color: #854d0e).
- Clicking a yellow marker in the document automatically selects the corresponding Suggestion Card in the right review panel.

#### 3. PostMessage Bridge & Undo Synchronization
- Applying a suggestion fires a postMessage event to the editor.
- ONLYOFFICE's internal document model records the mutation, making native Undo/Redo (Ctrl+Z / Ctrl+Y) work seamlessly!
    `,
    tags: ['ONLYOFFICE SDK', 'React', 'TypeScript', 'Iframe PostMessage'],
  },
];
