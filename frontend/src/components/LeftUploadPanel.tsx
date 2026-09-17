import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { UploadCloud, Sparkles, FileText, ChevronDown, ChevronUp, Target, ShieldCheck } from 'lucide-react';

export interface LeftUploadPanelHandle {
  /** Focus the JD textarea so user can immediately type. */
  focusJdInput: () => void;
}

interface LeftUploadPanelProps {
  onAnalyze: (file: File, jdText: string) => void;
  onLoadSample: () => void;
  isLoading: boolean;
  hasDocument: boolean;
  currentFilename?: string;
  hasJd?: boolean;
}

export const LeftUploadPanel = forwardRef<LeftUploadPanelHandle, LeftUploadPanelProps>(function LeftUploadPanel({
  onAnalyze,
  onLoadSample,
  isLoading,
  hasDocument,
  currentFilename,
  hasJd = false,
}, ref) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showJdInput, setShowJdInput] = useState<boolean>(false);
  const jdTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose focusJdInput so parent can call it (e.g., from No-JD popup "Go Back").
  useImperativeHandle(ref, () => ({
    focusJdInput: () => {
      setShowJdInput(true);
      setTimeout(() => {
        if (jdTextareaRef.current) {
          jdTextareaRef.current.focus();
          jdTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
    },
  }));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.docx') || file.name.endsWith('.pdf')) {
        // Only store the file — user must click "Analyze Resume" to proceed.
        setSelectedFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Only store the file — user must click "Analyze Resume" to proceed.
      setSelectedFile(file);
      // Reset the input value so the same file can be re-selected if needed.
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onAnalyze(selectedFile, jdText);
    }
  };

  // Compact top bar when document is loaded
  if (hasDocument) {
    return (
      <div
        className={`left-upload-bar bg-[#0c0e10] border-b border-[#2C3136] p-3 transition-colors ${
          isDragOver ? 'bg-[#ff5722]/10 border-[#ff5722]' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#e4beb4] font-label-caps text-xs truncate">
            <FileText size={16} className="text-[#ff5722] shrink-0" />
            <span className="truncate font-bold text-white">{selectedFile ? selectedFile.name : (currentFilename || 'Resume Loaded')}</span>
            {hasJd ? (
              <span className="px-2 py-0.5 bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/40 text-[9px] font-bold rounded-sm flex items-center gap-1">
                <Target size={10} /> JD ACTIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-[#ff9100]/15 text-[#ffb74d] border border-[#ff9100]/40 text-[9px] font-bold rounded-sm flex items-center gap-1">
                <ShieldCheck size={10} /> STANDALONE ATS
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="bg-[#ff5722] text-white px-3 py-1.5 rounded-sm font-label-caps text-xs glow-orange hover:bg-opacity-90 transition-all flex items-center gap-1.5 cursor-pointer font-bold">
              <UploadCloud size={14} />
              <span>{isDragOver ? 'DROP RESUME' : 'CHANGE RESUME'}</span>
              <input
                type="file"
                accept=".docx,.pdf"
                onChange={handleFileChange}
                className="hidden"
                style={{ display: 'none' }}
              />
            </label>

            <button
              className={`border px-3 py-1.5 rounded-sm font-label-caps text-xs flex items-center gap-1.5 transition-colors font-bold ${
                showJdInput || hasJd
                  ? 'bg-[#25282c] text-[#ffb5a0] border-[#ff5722]'
                  : 'bg-[#1e2022] text-[#e4beb4] border-[#2C3136] hover:text-[#ff5722] hover:border-[#ff5722]'
              }`}
              onClick={() => setShowJdInput(!showJdInput)}
              title="Add or Edit Target Job Description"
            >
              <Target size={13} className={hasJd ? 'text-[#00C853]' : 'text-[#ff5722]'} />
              <span>{hasJd ? 'EDIT JD' : '+ ADD TARGET JD'}</span>
              {showJdInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              className="bg-[#1e2022] border border-[#2C3136] text-[#ffb5a0] px-3 py-1.5 rounded-sm font-label-caps text-xs flex items-center gap-1 hover:border-[#ff5722] transition-colors"
              onClick={onLoadSample}
              title="Load sample demo data"
            >
              <Sparkles size={14} className="text-[#ff5722]" />
              <span>DEMO</span>
            </button>
          </div>
        </div>

        {showJdInput && (
          <div className="mt-3 pt-3 border-t border-[#2C3136] flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="font-label-caps text-[10px] text-[#e4beb4] font-bold flex items-center gap-1.5">
                <Target size={12} className="text-[#ff5722]" />
                TARGET JOB DESCRIPTION:
              </label>
              {jdText && (
                <button
                  onClick={() => setJdText('')}
                  className="text-[10px] font-label-caps text-[#8e9196] hover:text-[#ff5252] transition-colors"
                >
                  CLEAR JD
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste target job description here..."
              className="w-full bg-[#121416] text-[#e2e2e5] border border-[#2C3136] p-2 text-xs font-mono rounded-sm focus:border-[#ff5722] outline-none"
            />
            <div className="flex gap-2 items-center">
              {selectedFile ? (
                <button
                  className="bg-[#ff5722] text-white px-4 py-1.5 rounded-sm font-label-caps text-xs glow-orange hover:bg-opacity-90 transition-all font-bold cursor-pointer"
                  onClick={() => onAnalyze(selectedFile, jdText)}
                  disabled={isLoading}
                >
                  {isLoading ? 'ANALYZING...' : jdText.trim() ? 'RUN ROLE MATCH →' : 'UPDATE REVIEW'}
                </button>
              ) : (
                <button
                  className="bg-[#ff5722] text-white px-4 py-1.5 rounded-sm font-label-caps text-xs glow-orange hover:bg-opacity-90 transition-all font-bold cursor-pointer"
                  onClick={onLoadSample}
                  disabled={isLoading}
                >
                  {isLoading ? 'ANALYZING...' : 'RE-RUN WITH NEW JD'}
                </button>
              )}
              <span className="text-[10px] text-[#8e9196] font-mono">
                {jdText.trim() ? '✓ Targeted role match' : 'ⓘ General review'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full clean dark drag & drop screen when no document loaded
  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-[#121416] h-full overflow-y-auto transition-colors ${
        isDragOver ? 'bg-[#ff5722]/10 border-2 border-dashed border-[#ff5722]' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="w-full max-w-2xl bg-[#1a1c1e] border border-[#2C3136] p-6 sm:p-10 rounded-sm shadow-2xl flex flex-col gap-6">
        <div className="text-center flex flex-col gap-2">
          <h2 className="font-headline-lg text-2xl sm:text-3xl text-white font-bold tracking-tight">
            AI Resume Analyzer & ATS Optimizer
          </h2>
          <p className="font-body-md text-xs sm:text-sm text-[#e4beb4] max-w-lg mx-auto leading-relaxed">
            Upload your resume for an instant ATS score, formatting analysis, and line suggestions. Optionally add a job description for role matching.
          </p>
        </div>

        {/* Dual Mode Indicator Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#121416] p-2 border border-[#2C3136] rounded-sm">
          <button
            type="button"
            onClick={() => setJdText('')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm border transition-all cursor-pointer text-left ${
              !jdText.trim()
                ? 'bg-[#181a1c] border-[#00C853]/60 shadow-[0_0_10px_rgba(0,200,83,0.15)]'
                : 'bg-[#181a1c]/60 border-[#2C3136] opacity-60 hover:opacity-100'
            }`}
          >
            <ShieldCheck size={16} className={!jdText.trim() ? 'text-[#00C853]' : 'text-[#8e9196]'} />
            <span className="font-label-caps text-[11px] text-white font-bold tracking-wide">
              RESUME ONLY (GENERAL ATS)
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('target-jd-input');
              if (el) el.focus();
            }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm border transition-all cursor-pointer text-left ${
              jdText.trim()
                ? 'bg-[#181a1c] border-[#ff5722]/60 shadow-[0_0_10px_rgba(255,87,34,0.15)]'
                : 'bg-[#181a1c]/60 border-[#2C3136] opacity-60 hover:opacity-100'
            }`}
          >
            <Target size={16} className={jdText.trim() ? 'text-[#ff5722]' : 'text-[#8e9196]'} />
            <span className="font-label-caps text-[11px] text-white font-bold tracking-wide">
              RESUME + JOB DESCRIPTION
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className={`border-2 border-dashed rounded-sm p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group ${
            isDragOver ? 'border-[#ff5722] bg-[#ff5722]/10' : 'border-[#ff5722]/60 bg-[#121416] hover:bg-[#1e2022] hover:border-[#ff5722]'
          }`}>
            <UploadCloud size={50} className="text-[#ff5722] group-hover:scale-110 transition-transform animate-pulse" />
            <div className="flex flex-col gap-1">
              <p className="font-headline-md text-base text-white font-bold">
                {selectedFile ? selectedFile.name : 'Upload Resume (.DOCX, .PDF)'}
              </p>
              <p className="font-label-caps text-xs text-[#e4beb4]">
                or <span className="text-[#ff5722] underline underline-offset-2 font-bold">click to browse files</span>
              </p>
            </div>
            <input
              type="file"
              accept=".docx,.pdf"
              onChange={handleFileChange}
              className="hidden"
              style={{ display: 'none' }}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="font-label-caps text-xs text-[#e4beb4] font-bold flex items-center gap-1.5">
                <Target size={13} className="text-[#ff5722]" />
                TARGET JOB DESCRIPTION (OPTIONAL):
              </label>
              <span className="text-[10px] font-mono text-[#8e9196]">
                {jdText.trim() ? 'Targeted Mode' : 'General ATS Mode'}
              </span>
            </div>
            <textarea
              id="target-jd-input"
              ref={jdTextareaRef}
              rows={3}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste target job description here (optional)..."
              className="w-full bg-[#121416] text-[#e2e2e5] border border-[#2C3136] p-3 text-xs font-mono leading-relaxed rounded-sm focus:border-[#ff5722] outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <button
              type="submit"
              className="w-full sm:flex-1 bg-[#ff5722] text-white py-3.5 px-6 rounded-sm font-label-caps text-xs font-bold glow-orange hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? (
                'ANALYZING RESUME...'
              ) : jdText.trim() ? (
                'ANALYZE WITH JD →'
              ) : (
                'ANALYZE RESUME →'
              )}
            </button>

            <button
              type="button"
              className="w-full sm:w-auto bg-[#1e2022] border border-[#2C3136] text-[#ffb5a0] py-3.5 px-6 rounded-sm font-label-caps text-xs font-bold hover:border-[#ff5722] transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              onClick={onLoadSample}
            >
              <Sparkles size={16} className="text-[#ff5722]" />
              <span>TRY DEMO RESUME</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
