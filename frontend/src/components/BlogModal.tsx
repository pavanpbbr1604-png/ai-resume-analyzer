import React, { useState } from 'react';
import { X, Newspaper, ArrowRight, Clock } from 'lucide-react';

interface BlogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Article {
  id: string;
  title: string;
  readTime: string;
  tag: string;
  snippet: string;
  content: string;
}

const ARTICLES: Article[] = [
  {
    id: 'ats-algorithms-2026',
    title: 'How 2026 ATS Algorithms Screen Your Resume (And How to Beat Them)',
    readTime: '4 min read',
    tag: 'ATS Deep Dive',
    snippet: 'Modern ATS engines no longer just match keywords—they analyze semantic proximity and role context. Learn how to rank in the top 5%.',
    content: `### Understanding Next-Gen ATS (Workday, Greenhouse & Lever)

Modern Application Tracking Systems (ATS) in 2026 use advanced NLP pipelines:
1. **Semantic Embeddings**: Instead of dumb string matching, ATS tools convert your resume sections into dense semantic vectors. If a job asks for "Distributed Systems", having "Built Kafka pipelines and microservices" matches strongly even without the exact words.
2. **Contextual Keyword Density**: Stuffing 50 keywords at the bottom of a resume triggers rejection penalties. Keywords must be embedded organically inside active accomplishment bullets.
3. **Format Parsing Traps**: Avoid two-column layouts, tables, headers/footers, and complex graphics. Standard single-column Markdown, DOCX, or pure text PDFs parse with 100% fidelity.

**Key Rule**: Quantify every bullet using the Google X-Y-Z formula. Recruiters spend an average of 6.2 seconds on an initial scan!`,
  },
  {
    id: 'google-xyz-formula',
    title: 'The Google X-Y-Z Formula: Transform Weak Bullets into Executive Impact',
    readTime: '3 min read',
    tag: 'Resume Writing',
    snippet: '"Accomplished [X] as measured by [Y], by doing [Z]". See before-and-after examples engineered for top-tier tech roles.',
    content: `### Formula Blueprint: Accomplished [X] as measured by [Y], by doing [Z]

Laszlo Bock, former SVP of People Operations at Google, revealed this formula as the gold standard for high-converting resume bullets.

#### Before vs After Examples:

- **Weak**: "Worked on improving database queries."
- **Strong (X-Y-Z)**: "Decreased database query latency by 42% (Y) by implementing Redis caching and indexing slow SQL joins (Z), improving response times for 250k daily active users (X)."

- **Weak**: "Helped onboard new junior engineers."
- **Strong (X-Y-Z)**: "Accelerated developer time-to-first-commit by 3 weeks (Y) across a 12-person team (X) by architecting an automated Dockerized dev environment and interactive documentation (Z)."

**Pro-tip**: Whenever you write a bullet, ask yourself: *"Compared to what? And what was the business outcome?"*`,
  },
  {
    id: 'tech-interview-prep',
    title: 'Cracking the Modern Technical Interview: From System Design to STAR',
    readTime: '5 min read',
    tag: 'Interview Prep',
    snippet: 'A strategic blueprint for answering behavioral questions with the STAR method and tackling architectural trade-offs.',
    content: `### Mastering the Behavioral & Technical Round

Hiring managers evaluate three core pillars:
1. **Technical Depth & Trade-offs**: Can you justify *why* you picked PostgreSQL over MongoDB? Every architecture decision has a trade-off.
2. **The STAR Framework for Behavioral Rounds**:
   - **Situation**: Context in 1-2 concise sentences.
   - **Task**: The specific challenge or bottleneck you were accountable for.
   - **Action**: The technical or leadership steps **YOU** took (avoid generic "we").
   - **Result**: Quantifiable outcomes (e.g. "shipped 2 weeks ahead of deadline", "reduced cloud spend by $18,000/month").
3. **Curiosity & Signal**: Ask questions that prove you think about product reliability and business impact, not just writing code.`,
  },
];

export const BlogModal: React.FC<BlogModalProps> = ({ isOpen, onClose }) => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181a1d] border border-[#2C3136] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#2C3136] flex items-center justify-between bg-[#1f2226]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff5722]/15 border border-[#ff5722]/40 rounded-xl text-[#ff5722]">
              <Newspaper size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Career & Resume Playbooks
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#ff5722]/20 text-[#ff5722] border border-[#ff5722]/40">
                  Curated Guides
                </span>
              </h3>
              <p className="text-xs text-[#8e9196]">
                Tactical, battle-tested strategies to maximize interviews and ATS ranking.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8e9196] hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {selectedArticle ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-xs text-[#ff5722] hover:underline flex items-center gap-1 font-bold"
              >
                ← Back to all articles
              </button>
              <div className="border-b border-[#282a2e] pb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ff5722]/20 text-[#ff5722]">
                  {selectedArticle.tag}
                </span>
                <h2 className="text-xl font-bold text-white mt-2 mb-1">{selectedArticle.title}</h2>
                <span className="text-xs text-[#8e9196]">{selectedArticle.readTime}</span>
              </div>
              <div className="text-sm text-[#d1d5db] whitespace-pre-wrap leading-relaxed space-y-3 font-sans">
                {selectedArticle.content}
              </div>
            </div>
          ) : (
            ARTICLES.map((art) => (
              <div
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                className="bg-[#131517] border border-[#282a2e] hover:border-[#ff5722]/60 p-5 rounded-xl cursor-pointer transition-all hover:bg-[#1b1e22] group shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-[#8e9196] mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#25282c] text-[#ffb5a0] border border-[#ff5722]/30">
                    {art.tag}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {art.readTime}
                  </span>
                </div>
                <h4 className="font-bold text-white text-base group-hover:text-[#ff5722] transition-colors mb-1.5">
                  {art.title}
                </h4>
                <p className="text-xs text-[#9ca3af] leading-relaxed mb-3">{art.snippet}</p>
                <div className="flex items-center gap-1 text-xs font-bold text-[#ff5722] group-hover:translate-x-1 transition-transform">
                  Read Guide <ArrowRight size={13} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
