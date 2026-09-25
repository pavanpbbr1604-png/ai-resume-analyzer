import React, { useState, useEffect, useRef } from 'react';
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

export const ResumeChat: React.FC<ResumeChatProps> = ({
  documentId,
  document,
  analysisId,
  currentJdText = '',
  activeSuggestion,
  onClearActiveSuggestion,
  onApplySuggestion,
}) => {
  const [messages, setMessages] = useState<ResumeChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your dedicated **Resume Improvement Assistant**. Ask me anything about your resume, job description alignment, bullet rewrites, or specific suggestions.",
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
          const reply = getLocalChatReply(message, activeSuggestion, currentJdText);
          setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
          setIsLoading(false);
        }, 600);
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
        content:
          "Chat reset. How can I assist you with your resume or target Job Description today?",
      },
    ]);
  };

  // Quick Prompt Suggestions
  const quickPrompts = activeSuggestion
    ? [
        `Why should I change this ${activeSuggestion.location_label || 'section'}?`,
        `Give me a shorter version for this.`,
        `Make this more ATS-friendly.`,
        `Provide 2 alternative rewrites.`,
      ]
    : [
        `How can I make my project bullets more impactful?`,
        `What skills from the JD are missing in my resume?`,
        `Give me an executive summary formula.`,
        `How do I quantify my experience?`,
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
              <div className="whitespace-pre-wrap">{msg.content}</div>

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
              <span className="text-[10px] font-label-caps text-[#ffb5a0]">ANALYZING...</span>
            </div>
            <div className="bg-[#181a1c] border border-[#2C3136] p-3 rounded-sm text-xs text-[#8e9196] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-ping" />
              <span className="font-mono text-[11px]">Formulating targeted resume feedback...</span>
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

// Local simulation helper for demo mode
function getLocalChatReply(
  message: string,
  targetSuggestion?: AISuggestionItem | null,
  jdText?: string
): string {
  const msgLower = message.toLowerCase();

  // Out of scope check
  if (
    msgLower.includes('joke') ||
    msgLower.includes('weather') ||
    msgLower.includes('eat') ||
    msgLower.includes('homework') ||
    msgLower.includes('recipe')
  ) {
    return 'I can help only with your resume and job-description analysis. Ask me something about your resume or the JD.';
  }

  if (targetSuggestion) {
    const loc = targetSuggestion.location_label || 'this section';
    if (msgLower.includes('why') || msgLower.includes('reason')) {
      return `**Why this change was recommended for ${loc}:**\n\n- **Current:** *"${targetSuggestion.original_text}"*\n- **Suggested:** **"${targetSuggestion.suggested_text}"**\n\n**Reason:** ${targetSuggestion.reasoning}\n\nUsing active power verbs and quantifying measurable outcomes increases recruiter callback rates.`;
    }
    if (msgLower.includes('short') || msgLower.includes('brief')) {
      return `Here is a concise version for **${loc}**:\n\n**"${targetSuggestion.suggested_text.split(',')[0]}."**\n\nClick **[Apply]** or **[Edit]** to insert it into your resume.`;
    }
    return `Regarding **${loc}** (*"${targetSuggestion.original_text}"*):\n\nI recommend upgrading to: **"${targetSuggestion.suggested_text}"**.\n\n${targetSuggestion.reasoning}`;
  }

  if (msgLower.includes('skill') || msgLower.includes('keyword')) {
    if (jdText) {
      return `**Target Job Description Skills Alignment:**\n\nEnsure high-priority technologies from the JD are explicitly listed under your **Technical Skills** section and substantiated in your project bullets with quantified accomplishments.`;
    }
    return `**Skills Section Best Practice:**\nGroup technical skills into clear categories (*Languages, Frameworks, Databases, Tools*). Use standard casing (e.g. \`Python\`, \`FastAPI\`, \`React\`) for maximum ATS parseability.`;
  }

  return `I'm your **Resume Improvement Assistant**. I can help you rewrite bullets using the Google X-Y-Z formula ("Accomplished [X] as measured by [Y], by doing [Z]"), explain ATS recommendations, or align your experience to a target JD.`;
}
