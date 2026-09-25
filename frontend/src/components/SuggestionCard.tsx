import React from 'react';
import { AISuggestionItem } from '../types';
import { HelpCircle, MessageSquareQuote, Check, Edit2, MapPin, EyeOff } from 'lucide-react';

interface SuggestionCardProps {
  suggestion: AISuggestionItem;
  isSelected: boolean;
  onSelect: () => void;
  onApply: (suggestionId: string) => void;
  onIgnore: (suggestionId: string) => void;
  onEdit: (suggestion: AISuggestionItem) => void;
  onAskAgent?: (suggestion: AISuggestionItem) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  isSelected,
  onSelect,
  onApply,
  onIgnore,
  onEdit,
  onAskAgent,
}) => {
  const isApplied = suggestion.status === 'APPLIED' || suggestion.status === 'CUSTOM_APPLIED';
  const isIgnored = suggestion.status === 'IGNORED';

  // Determine exact location display label
  const locationLabel =
    suggestion.location_label ||
    suggestion.location?.location_label ||
    'Resume Section';

  return (
    <div
      className={`border bg-[#121416] p-4 relative group transition-all rounded-sm flex flex-col gap-3 ${
        isSelected
          ? 'border-[#ff5722] ring-1 ring-[#ff5722]/50 shadow-lg bg-[#16181a]'
          : 'border-[#2C3136] hover:border-[#ff5722]/60'
      }`}
      onClick={onSelect}
      style={{ opacity: isIgnored ? 0.45 : 1 }}
    >
      {/* 1. Location Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#2C3136]/70 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin size={13} className="text-[#ff5722] shrink-0" />
          <span className="font-label-caps text-xs text-white font-bold tracking-wide truncate">
            {locationLabel}
          </span>
        </div>
        {suggestion.confidence && suggestion.confidence >= 0.95 && (
          <span className="text-[9px] font-mono text-[#00C853] bg-[#00C853]/10 border border-[#00C853]/30 px-1.5 py-0.5 rounded-sm shrink-0">
            High ATS Impact
          </span>
        )}
      </div>

      {/* User prompt question banner if present */}
      {suggestion.user_prompt_question && (
        <div className="bg-[#ff5722]/10 border border-[#ff5722]/50 p-2.5 text-xs text-[#ffb5a0] flex items-start gap-2 rounded-sm font-body-md">
          <HelpCircle size={14} className="text-[#ff5722] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold font-label-caps text-[10px] block text-[#ff5722] mb-0.5">
              CLARIFICATION NEEDED:
            </span>
            {suggestion.user_prompt_question}
          </div>
        </div>
      )}

      {/* 2. Current Content */}
      <div className="flex flex-col gap-1">
        <span className="font-label-caps text-[10px] text-[#8e9196] font-bold tracking-wider uppercase">
          Current
        </span>
        <div className="bg-[#181a1c] border border-[#2C3136] p-2.5 rounded-sm">
          <p className="text-xs text-[#e4beb4] font-mono leading-relaxed line-through decoration-[#ff5252]/80 opacity-85">
            "{suggestion.original_text}"
          </p>
        </div>
      </div>

      {/* 3. Suggested Replacement */}
      {suggestion.suggested_text && suggestion.suggested_text !== suggestion.original_text && (
        <div className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] text-[#00C853] font-bold tracking-wider uppercase flex items-center gap-1">
            <span>Suggested Replacement</span>
          </span>
          <div className="bg-[#00C853]/5 border-l-2 border-l-[#00C853] border-y border-r border-[#2C3136] p-2.5 rounded-r-sm">
            <p className="text-xs text-[#00E676] font-mono leading-relaxed font-medium">
              "{suggestion.suggested_text}"
            </p>
          </div>
        </div>
      )}

      {/* 4. Reason / Why */}
      <div className="flex flex-col gap-1">
        <span className="font-label-caps text-[10px] text-[#ffb5a0] font-bold tracking-wider uppercase">
          Why
        </span>
        <p className="text-xs text-[#e2e2e5] font-body-md leading-relaxed bg-[#151719] p-2 rounded-sm border border-[#2C3136]/50">
          {suggestion.reasoning}
        </p>
      </div>

      {/* 5. Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#2C3136]/50 mt-1">
        {isApplied ? (
          <div className="flex items-center gap-1.5 text-[11px] font-label-caps text-[#00C853] font-bold bg-[#00C853]/10 px-2.5 py-1 rounded-sm border border-[#00C853]/30">
            <Check size={13} />
            <span>APPLIED TO RESUME</span>
          </div>
        ) : isIgnored ? (
          <div className="text-[10px] font-label-caps text-[#8e9196] italic">
            Ignored
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onIgnore(suggestion.suggestion_id);
              }}
              title="Ignore this suggestion"
              className="font-label-caps text-[10px] text-[#8e9196] hover:text-[#ff5252] px-2 py-1 rounded-sm transition-colors flex items-center gap-1 cursor-pointer"
            >
              <EyeOff size={11} />
              <span>IGNORE</span>
            </button>
          </div>
        )}

        {!isApplied && !isIgnored && (
          <div className="flex items-center gap-2">
            {/* Ask Agent Button */}
            {onAskAgent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAskAgent(suggestion);
                }}
                className="font-label-caps text-[10px] text-[#ff5722] hover:text-white px-2.5 py-1 border border-[#ff5722]/50 hover:bg-[#ff5722]/20 rounded-sm transition-colors flex items-center gap-1 cursor-pointer font-bold"
                title="Discuss this suggestion with AI Resume Assistant"
              >
                <MessageSquareQuote size={12} />
                <span>ASK AGENT</span>
              </button>
            )}

            {/* Edit Button */}
            {suggestion.suggested_text && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(suggestion);
                }}
                className="font-label-caps text-[10px] text-[#e4beb4] hover:text-white px-2.5 py-1 border border-[#2C3136] hover:border-[#ff5722] rounded-sm transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit2 size={11} />
                <span>EDIT</span>
              </button>
            )}

            {/* Apply Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApply(suggestion.suggestion_id);
              }}
              className="font-label-caps text-[10px] bg-[#ff5722] text-white px-3.5 py-1 hover:bg-[#ff7043] transition-all font-bold rounded-sm shadow-sm flex items-center gap-1 cursor-pointer glow-orange"
            >
              <Check size={12} />
              <span>APPLY</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
