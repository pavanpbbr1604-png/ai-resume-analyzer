import React from 'react';
import { AISuggestionItem } from '../types';
import { HelpCircle } from 'lucide-react';

interface SuggestionCardProps {
  suggestion: AISuggestionItem;
  isSelected: boolean;
  onSelect: () => void;
  onApply: (suggestionId: string) => void;
  onIgnore: (suggestionId: string) => void;
  onEdit: (suggestion: AISuggestionItem) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  isSelected,
  onSelect,
  onApply,
  onIgnore,
  onEdit,
}) => {
  const getBadgeStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-[#ffb4ab] text-[#ffb4ab]';
      case 'HIGH':
        return 'border-[#ff5722] text-[#ff5722]';
      default:
        return 'border-[#e4beb4] text-[#e4beb4]';
    }
  };

  const isApplied = suggestion.status === 'APPLIED' || suggestion.status === 'CUSTOM_APPLIED';
  const isIgnored = suggestion.status === 'IGNORED';
  const applyButtonLabel = suggestion.category === 'SKILL_ALIGNMENT' ? 'ADD SKILLS' : 'APPLY';

  return (
    <div
      className={`border border-[#2C3136] bg-[#121416] p-4 relative group transition-colors rounded-sm cursor-pointer ${
        isSelected ? 'border-[#ff5722] shadow-md' : 'hover:border-[#ff5722]'
      }`}
      onClick={onSelect}
      style={{ opacity: isIgnored ? 0.4 : 1 }}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`px-2 py-0.5 border font-label-caps text-[9px] ${getBadgeStyle(suggestion.severity)}`}>
          {suggestion.severity}
        </span>
        <span className="font-label-caps text-[10px] text-[#e4beb4]">
          {suggestion.category.replace('_', ' ')}
        </span>
      </div>

      {suggestion.user_prompt_question && (
        <div className="bg-[#ff5722]/10 border border-[#ff5722] p-2 mb-3 text-xs text-[#ffb5a0] flex items-center gap-1.5 rounded-sm font-body-md">
          <HelpCircle size={14} className="text-[#ff5722]" />
          {suggestion.user_prompt_question}
        </div>
      )}

      <div className="mb-4">
        {suggestion.original_text && (
          <p className="text-xs text-[#e4beb4] line-through decoration-[#ffb4ab] mb-2 opacity-70 font-mono">
            {suggestion.original_text}
          </p>
        )}
        {suggestion.suggested_text ? (
          <p className="text-xs text-[#00C853] font-mono border-l-2 border-[#00C853] pl-2">
            {suggestion.suggested_text}
          </p>
        ) : (
          <p className="text-xs text-[#e2e2e5] font-body-md">
            {suggestion.reasoning}
          </p>
        )}
      </div>

      {isApplied ? (
        <div className="text-[10px] font-label-caps text-[#00C853] font-bold">
          ✓ APPLIED TO WORKING COPY
        </div>
      ) : isIgnored ? (
        <div className="text-[10px] font-label-caps text-[#e4beb4]">IGNORED</div>
      ) : (
        <div className="flex gap-2 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIgnore(suggestion.suggestion_id);
            }}
            className="font-label-caps text-[10px] text-[#e4beb4] hover:text-white px-3 py-1 transition-colors"
          >
            IGNORE
          </button>

          {suggestion.suggested_text && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(suggestion);
              }}
              className="font-label-caps text-[10px] text-[#e4beb4] hover:text-white px-3 py-1 border border-[#2C3136] hover:border-[#ff5722] transition-colors"
            >
              EDIT
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply(suggestion.suggestion_id);
            }}
            className="font-label-caps text-[10px] bg-[#ffb5a0] text-[#121416] px-4 py-1 hover:bg-[#ff5722] hover:text-white transition-colors font-bold rounded-sm"
          >
            {applyButtonLabel}
          </button>
        </div>
      )}
    </div>
  );
};
