import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AISuggestionItem,
  ResumeChatMessage,
  NormalizedDocument,
} from '../types';
import { api } from '../services/api';
import {
  Send,
  Sparkles,
  Bot,
  User,
  X,
  Target,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';

interface ResumeChatProps {
  documentId?: string;
  document?: NormalizedDocument | null;
  analysisId?: string;
  currentJdText?: string;
  activeSuggestion?: AISuggestionItem | null;
  onClearActiveSuggestion?: () => void;
  onApplySuggestion?: (suggestionId: string) => void;
}

function generateInitialGreeting(doc?: NormalizedDocument | null): string {
  if (!doc) {
    return "Hello! I'm your **Resume AI Coach** (conversational agent modeled after ChatGPT). Once your resume is loaded, I'll read every section, evaluate your project bullets, and help you craft high-impact achievements.";
  }

  const filename = doc.filename || 'your uploaded resume';
  const sectionNames = (doc.sections || [])
    .map((s) => s.heading_text || s.section_type)
    .filter((n) => n && n.trim().length > 0);

  const sectionsSummary =
    sectionNames.length > 0
      ? sectionNames.slice(0, 5).join(', ')
      : 'Summary, Experience, Projects, Skills, Education';

  return `👋 Hi! I've reviewed your resume **${filename}** across detected sections: *${sectionsSummary}*.

I'm here as your dedicated **ChatGPT-style Career & Resume Coach**:
• **Full Resume Critique**: Comprehensive review of bullet strength, metrics, and ATS compatibility.
• **Google X-Y-Z Bullet Rewrites**: Transform passive task descriptions into quantifiable impact (*"Accomplished [X] measured by [Y], by doing [Z]"*).
• **Strengths & Gaps**: An honest assessment of your technical depth and market positioning.
• **Job Description Alignment**: Check keyword coverage and match requirements.

How can I help elevate your resume today?`;
}

// Lightweight, safe markdown formatter for ChatGPT-like rich responses
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const renderedContent = useMemo(() => {
    const lines = content.split('\n');
    return lines.map((line, lineIdx) => {
      // Header 3 or 2
      if (line.startsWith('### ') || line.startsWith('## ')) {
        const headerText = line.replace(/^#{2,3}\s+/, '');
        return (
          <h4
            key={lineIdx}
            className="text-white font-bold text-xs mt-2.5 mb-1 text-[#ffb5a0] tracking-wide"
          >
            {renderInline(headerText)}
          </h4>
        );
      }

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().replace(/^[-•*]\s+/, '');
        return (
          <div key={lineIdx} className="flex items-start gap-2 my-0.5 ml-1">
            <span className="text-[#ff5722] text-xs leading-5 shrink-0">•</span>
            <div className="flex-1 text-[#e2e2e5] text-xs leading-relaxed">
              {renderInline(bulletText)}
            </div>
          </div>
        );
      }

      // Numbered list: 1. 2. etc
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={lineIdx} className="flex items-start gap-1.5 my-0.5 ml-1">
            <span className="text-[#ff5722] font-mono text-[11px] shrink-0 font-bold">
              {numMatch[1]}.
            </span>
            <div className="flex-1 text-[#e2e2e5] text-xs leading-relaxed">
              {renderInline(numMatch[2])}
            </div>
          </div>
        );
      }

      // Empty line / paragraph break
      if (!line.trim()) {
        return <div key={lineIdx} className="h-1.5" />;
      }

      // Normal paragraph
      return (
        <p key={lineIdx} className="text-xs leading-relaxed text-[#e2e2e5] my-0.5">
          {renderInline(line)}
        </p>
      );
    });
  }, [content]);

  return <div className="space-y-0.5">{renderedContent}</div>;
};

// Inline helper for bold, code, and emphasis
function renderInline(text: string): React.ReactNode {
  // Regex to match **bold**, `code`, *italic*
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="bg-[#24272b] text-[#ffb5a0] px-1 py-0.2 rounded font-mono text-[11px] border border-[#3c4148]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="text-[#e4beb4] italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

export const ResumeChat: React.FC<ResumeChatProps> = ({
  documentId,
  document,
  analysisId,
  currentJdText = '',
  activeSuggestion,
  onClearActiveSuggestion,
  onApplySuggestion,
}) => {
  const [messages, setMessages] = useState<ResumeChatMessage[]>(() => [
    {
      role: 'assistant',
      content: generateInitialGreeting(document),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update initial greeting when document loads if chat hasn't started
  useEffect(() => {
    if (document) {
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].role === 'assistant') {
          return [
            {
              role: 'assistant',
              content: generateInitialGreeting(document),
            },
          ];
        }
        return prev;
      });
    }
  }, [document]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // When active suggestion changes, automatically focus input
  useEffect(() => {
    if (activeSuggestion) {
      inputRef.current?.focus();
    }
  }, [activeSuggestion]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || isLoading) return;

    const userMsg: ResumeChatMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const docId = documentId || document?.document_id || 'doc_sample_001';

    try {
      if (docId.startsWith('doc_sample') || !documentId) {
        // Local preview simulation
        setTimeout(() => {
          const reply = getLocalChatReply(message, document, activeSuggestion, currentJdText);
          setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
          setIsLoading(false);
        }, 500);
      } else {
        const response = await api.chatResume(docId, message, {
          analysisId,
          suggestionId: activeSuggestion?.suggestion_id,
          history: messages,
          jdText: currentJdText,
        });

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.reply },
        ]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Sorry, I encountered an error communicating with the resume assistant. Please try again.",
        },
      ]);
    } finally {
      if (!docId.startsWith('doc_sample')) {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: generateInitialGreeting(document),
      },
    ]);
  };

  // Dynamic Prompt Chips - ChatGPT style
  const quickPrompts = activeSuggestion
    ? [
        `Why should I change this ${activeSuggestion.location_label || 'section'}?`,
        `Rewrite using Google X-Y-Z formula`,
        `Give me a shorter, high-impact version`,
        `Make this more ATS keyword-rich`,
      ]
    : [
        `Critique my full resume`,
        `What are my top strengths & weaknesses?`,
        `Rewrite my project bullets using Google X-Y-Z`,
        `What skills should I highlight or improve?`,
        `Draft an executive summary for this resume`,
      ];

  const hasJd = Boolean(currentJdText && currentJdText.trim());

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121416] overflow-hidden rounded-sm">
      {/* Top Chat Header */}
      <div className="px-4 py-2.5 border-b border-[#2C3136] bg-[#16181a] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#ff5722]/20 border border-[#ff5722]/50 flex items-center justify-center">
            <Sparkles size={13} className="text-[#ff5722]" />
          </div>
          <div>
            <h3 className="font-label-caps text-xs text-white font-bold tracking-wider leading-none">
              RESUME ASSISTANT
            </h3>
            <span className="text-[10px] text-[#8e9196] font-mono">
              Strictly focused on your resume & JD
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[9px] font-label-caps px-2 py-0.5 rounded-sm border ${
              hasJd
                ? 'border-[#00C853]/40 text-[#00C853] bg-[#00C853]/10'
                : 'border-[#2C3136] text-[#8e9196] bg-[#1e2022]'
            }`}
          >
            {hasJd ? '✓ JD Connected' : 'Standalone Mode'}
          </span>
          <button
            onClick={handleResetChat}
            title="Reset conversation"
            className="text-[#8e9196] hover:text-white p-1 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Active Suggestion Focus Pill Banner */}
      {activeSuggestion && (
        <div className="p-2.5 bg-[#ff5722]/10 border-b border-[#ff5722]/40 flex items-start justify-between gap-2 shrink-0 animate-fade-in">
          <div className="flex items-start gap-2 min-w-0">
            <Target size={14} className="text-[#ff5722] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-label-caps text-[10px] text-[#ffb5a0] font-bold">
                  FOCUSING ON:
                </span>
                <span className="font-mono text-[10px] text-white font-bold bg-[#ff5722]/20 px-1.5 py-0.2 rounded-sm truncate">
                  {activeSuggestion.location_label || 'Resume Location'}
                </span>
              </div>
              <p className="text-[11px] text-[#e4beb4] font-mono truncate mt-0.5 opacity-90">
                "{activeSuggestion.original_text}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onApplySuggestion && activeSuggestion.status !== 'APPLIED' && (
              <button
                onClick={() => onApplySuggestion(activeSuggestion.suggestion_id)}
                className="bg-[#00C853] hover:bg-[#00E676] text-black font-label-caps text-[9px] px-2 py-0.5 rounded-sm font-bold transition-colors cursor-pointer"
              >
                APPLY
              </button>
            )}
            {onClearActiveSuggestion && (
              <button
                onClick={onClearActiveSuggestion}
                className="text-[#8e9196] hover:text-white p-0.5 transition-colors cursor-pointer"
                title="Clear active suggestion focus"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col gap-1 ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 px-1">
              {msg.role === 'assistant' ? (
                <>
                  <Bot size={12} className="text-[#ff5722]" />
                  <span className="text-[10px] font-label-caps text-[#ffb5a0] font-bold">
                    RESUME AGENT
                  </span>
                </>
              ) : (
                <>
                  <User size={12} className="text-[#8e9196]" />
                  <span className="text-[10px] font-label-caps text-[#8e9196]">YOU</span>
                </>
              )}
            </div>

            <div
              className={`max-w-[88%] p-3 rounded-sm text-xs leading-relaxed relative group ${
                msg.role === 'user'
                  ? 'bg-[#ff5722]/15 border border-[#ff5722]/50 text-white font-mono'
                  : 'bg-[#181a1c] border border-[#2C3136] text-[#e2e2e5] font-body-md'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <FormattedMessage content={msg.content} />
              )}

              {msg.role === 'assistant' && (
                <button
                  onClick={() => handleCopyMessage(msg.content, idx)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[#8e9196] hover:text-white transition-opacity p-1 bg-[#121416]/80 rounded"
                  title="Copy message"
                >
                  {copiedIndex === idx ? (
                    <Check size={12} className="text-[#00C853]" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5 px-1">
              <Bot size={12} className="text-[#ff5722]" />
              <span className="text-[10px] font-label-caps text-[#ffb5a0]">ANALYZING RESUME...</span>
            </div>
            <div className="bg-[#181a1c] border border-[#2C3136] p-3 rounded-sm text-xs text-[#8e9196] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-ping" />
              <span className="font-mono text-[11px]">Thinking through resume structure & crafting feedback...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips */}
      <div className="p-2 border-t border-[#2C3136]/60 bg-[#16181a] flex gap-1.5 overflow-x-auto shrink-0 scrollbar-thin">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="text-[10px] whitespace-nowrap bg-[#1e2022] hover:bg-[#ff5722]/20 text-[#e4beb4] hover:text-white border border-[#2C3136] hover:border-[#ff5722]/60 px-2.5 py-1 rounded-sm transition-colors cursor-pointer shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-[#2C3136] bg-[#141618] shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeSuggestion
                ? `Ask about this suggestion or request an alternative...`
                : `Ask about your resume, specific sections, bullet rewrites, or JD alignment...`
            }
            className="flex-1 bg-[#121416] text-[#e2e2e5] border border-[#2C3136] focus:border-[#ff5722] rounded-sm p-2 text-xs font-mono outline-none resize-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="bg-[#ff5722] hover:bg-[#ff7043] disabled:opacity-40 text-white p-2.5 rounded-sm transition-all glow-orange font-bold cursor-pointer shrink-0"
            title="Send message (Enter)"
          >
            <Send size={15} />
          </button>
        </div>
        <div className="flex justify-between items-center mt-1.5 px-1">
          <span className="text-[9px] text-[#8e9196] font-mono">
            Press <kbd className="px-1 py-0.2 bg-[#2C3136] rounded text-[8px]">Enter</kbd> to send, <kbd className="px-1 py-0.2 bg-[#2C3136] rounded text-[8px]">Shift+Enter</kbd> for newline
          </span>
          <span className="text-[9px] text-[#8e9196] font-mono">
            Strict domain scope enabled
          </span>
        </div>
      </div>
    </div>
  );
};

// Local simulation helper for demo / preview mode
function getLocalChatReply(
  message: string,
  doc?: NormalizedDocument | null,
  targetSuggestion?: AISuggestionItem | null,
  jdText?: string
): string {
  const msgLower = message.toLowerCase();

  // Strict domain guardrails
  const outOfScopeKeywords = [
    'joke', 'weather', 'recipe', 'movie', 'song', 'sports', 'football',
    'cricket', 'politics', 'election', 'food', 'restaurant', 'stock price',
    'crypto', 'bitcoin', 'homework', 'math'
  ];
  if (outOfScopeKeywords.some((kw) => msgLower.includes(kw))) {
    return 'I can help only with your resume and job-description analysis. Ask me something about your resume or the JD.';
  }

  // Active suggestion specific questions
  if (targetSuggestion) {
    const loc = targetSuggestion.location_label || 'this section';
    if (msgLower.includes('why') || msgLower.includes('reason')) {
      return `### Why this change was recommended for ${loc}

- **Current Text:** *"${targetSuggestion.original_text}"*
- **Recommended Upgrade:** **"${targetSuggestion.suggested_text}"**

### Key Advantages:
1. **Action-Oriented Verbs:** Replaces passive language with active, decisive power verbs.
2. **Quantified Impact:** Recruiters and hiring managers look for clear business or engineering metrics (e.g. latency reduction, throughput, user growth).
3. **ATS Readability:** Embeds core skills and clean phrasing so automated screening systems parse it with high confidence.`;
    }

    if (msgLower.includes('short') || msgLower.includes('brief') || msgLower.includes('concise')) {
      const firstClause = targetSuggestion.suggested_text.split(',')[0];
      return `### Concise Rewrite for ${loc}:

**"${firstClause}."**

*Tip: This tightens the wording while preserving the core technical accomplishment. You can apply it directly to your resume.*`;
    }

    if (msgLower.includes('xyz') || msgLower.includes('google')) {
      return `### Google X-Y-Z Breakdown for ${loc}:

• **[X] Accomplished:** ${targetSuggestion.suggested_text.split('by')[0] || 'Enhanced system performance'}
• **[Y] Measured by:** 25-40% measurable speedup and error rate reduction
• **[Z] Doing what:** Architecting modular pipelines with automated validation

**Drop-in Replacement:**
**"${targetSuggestion.suggested_text}"**`;
    }

    return `### Targeted Advice for ${loc}

- **Original:** *"${targetSuggestion.original_text}"*
- **Recommendation:** **"${targetSuggestion.suggested_text}"**

${targetSuggestion.reasoning}`;
  }

  // Full resume critique
  if (msgLower.includes('critique') || msgLower.includes('review') || msgLower.includes('evaluate')) {
    const filename = doc?.filename || 'your resume';
    return `### Comprehensive Resume Critique for ${filename}

After analyzing your resume structure, content, and formatting, here is my detailed evaluation:

1. **Executive Impact & Action Verbs**:
   - Several bullet points start with passive duties (e.g., *"Responsible for"*, *"Worked on"*). Converting these to decisive action verbs (*"Spearheaded"*, *"Architected"*, *"Optimized"*) immediately elevates seniority.
2. **Quantification & Metrics (The 40% Rule)**:
   - Strong resumes quantify at least 40% of their bullet points. Ensure every major project includes metrics: percentage improvements, volume of requests handled, or team scale.
3. **ATS Friendliness & Structure**:
   - Your section headers are clearly mapped. Keep standard headings (*"Work Experience"*, *"Technical Skills"*, *"Projects"*) without complex table graphics to maintain 100% parseability.
4. **Keyword Relevance**:
   ${jdText ? '- When compared against your target JD, ensure exact keyword matches appear in both your Skills section and within relevant project bullets.' : '- Ensure your core tech stack matches the modern standards of the roles you are targeting.'}

Would you like me to rewrite a specific project bullet using the Google X-Y-Z formula?`;
  }

  // Strengths and weaknesses
  if (msgLower.includes('strength') || msgLower.includes('weakness')) {
    return `### Strengths & Growth Areas

### 🌟 Top Strengths:
1. **Clear Technical Trajectory**: Your resume shows direct hands-on project experience with modern technologies and realistic implementation scopes.
2. **Logical Organization**: Information flow follows standard recruiting practices, making it easy for recruiters to scan in 6 seconds.

### ⚠️ Key Improvement Opportunities:
1. **Unquantified Results**: Several achievements describe *what* you built, but not the *business or technical impact* it created.
2. **Missing Specificity**: Replace generic phrases like *"various features"* with the exact modules and architectures you implemented.
3. **Executive Summary Tightness**: If present, summarize your years of experience, core tech stack, and proudest engineering win in 3 focused lines.`;
  }

  // Google X-Y-Z formula rewrite
  if (msgLower.includes('xyz') || msgLower.includes('google') || msgLower.includes('bullet') || msgLower.includes('rewrite')) {
    return `### Google X-Y-Z Achievement Formula

Google recruiters recommend structuring every bullet as:
> **"Accomplished [X], as measured by [Y], by doing [Z]"**

### Example Transformation:
- ❌ **Passive (Before):** *"Worked on backend APIs for the e-commerce checkout page."*
- ✅ **Google X-Y-Z (After):** **"Redesigned RESTful checkout APIs, reducing p99 response times by 38% and supporting 15,000+ daily concurrent users by implementing Redis caching and asynchronous workers."**

Share any bullet point from your resume, and I'll transform it for you into this high-impact format!`;
  }

  // Executive summary
  if (msgLower.includes('summary') || msgLower.includes('profile')) {
    return `### Recommended Executive Summary Template

Here is a 3-sentence high-impact formula tailored for tech resumes:

> **"[Target Role / Title]** with expertise in **[Top 3 Technologies]**, proven in designing and deploying scalable, high-availability software systems. Experienced in end-to-end development, API optimization, and cross-functional delivery with a track record of driving **[Key Metric, e.g. 30%+ performance gains]**. Passionate about building robust architectures and delivering clean, maintainable code."

*Tip: Customize the technologies in brackets with the specific stack listed on your resume.*`;
  }

  // Skills & Keywords
  if (msgLower.includes('skill') || msgLower.includes('keyword')) {
    if (jdText) {
      return `### JD Keyword Alignment

To maximize your ATS match score against this job description:
1. **Direct Match**: Cross-reference the required skills in the JD and ensure they appear verbatim in your **Technical Skills** section.
2. **In-Context Demonstration**: Don't just list skills in a vacuum—mention them in at least one bullet point under your experience or projects.
3. **Categorization**: Group your skills into clean buckets (*Languages*, *Frameworks*, *Databases & Cloud*, *Developer Tools*).`;
    }
    return `### Technical Skills Optimization

- **Categorize Clearly**: Group your skills logically (e.g. *Languages: Python, TypeScript | Frameworks: FastAPI, React | Cloud & DevOps: Docker, AWS, Git*).
- **Remove Obsolete Tools**: Avoid listing basic utilities like MS Office or generic terms like "Problem Solving" in technical skills—demonstrate them through your project results instead.`;
  }

  return `I am your **ChatGPT-style Resume AI Coach**. 

I can help you:
- **Critique your entire resume** and identify weak wording
- **Rewrite bullets** using Google's X-Y-Z formula (*Accomplished [X], measured by [Y], by doing [Z]*)
- **Highlight strengths & weaknesses**
- **Align qualifications** with a target job description

What section would you like to dive into?`;
}
