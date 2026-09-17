import React, { useState } from 'react';
import { AISuggestionItem } from '../types';
import { Check, X } from 'lucide-react';

interface EditModalProps {
  suggestion: AISuggestionItem;
  onClose: () => void;
  onApplyCustom: (suggestionId: string, customText: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  suggestion,
  onClose,
  onApplyCustom,
}) => {
  const [customText, setCustomText] = useState(suggestion.suggested_text);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyCustom(suggestion.suggestion_id, customText);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Custom Suggestion Edit</h3>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Original text: <span style={{ color: '#fda4af' }}>{suggestion.original_text}</span>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Your Custom Replacement (Inherits Exact Font/Size/Style):
            </label>
            <textarea
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px',
                color: 'white',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Check size={14} /> Apply Custom Edit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
