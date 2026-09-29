import React, { useState } from 'react';
import { X, MessageSquare, Star, Check, Send } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<'suggestion' | 'bug' | 'praise'>('suggestion');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setComment('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181a1d] border border-[#2C3136] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#2C3136] flex items-center justify-between bg-[#1f2226]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff5722]/15 border border-[#ff5722]/40 rounded-xl text-[#ff5722]">
              <MessageSquare size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share Your Feedback</h3>
              <p className="text-xs text-[#8e9196]">
                Help us improve your AI Resume Architect experience.
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

        {/* Form Body */}
        {submitted ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
              <Check size={24} />
            </div>
            <h4 className="text-base font-bold text-white">Thank You for Your Feedback!</h4>
            <p className="text-xs text-[#8e9196] max-w-xs">
              Your response has been recorded and will guide our next feature release.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#e4beb4] mb-2 text-center">
                How would you rate your experience?
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      size={24}
                      className={
                        star <= rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-[#383c42]'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#e4beb4] mb-1.5">
                Feedback Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'suggestion', label: 'Idea / Feature' },
                  { id: 'bug', label: 'Bug Report' },
                  { id: 'praise', label: 'Praise' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as any)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      category === cat.id
                        ? 'bg-[#ff5722] text-white border-[#ff5722]'
                        : 'bg-[#121416] text-[#8e9196] border-[#2C3136] hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#e4beb4] mb-1.5">
                Your Thoughts or Suggestions
              </label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you love? What could be even better?"
                className="w-full bg-[#121416] border border-[#2C3136] rounded-xl p-3 text-xs text-white focus:border-[#ff5722] outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#ff5722] hover:bg-[#ff7043] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send size={14} />
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
