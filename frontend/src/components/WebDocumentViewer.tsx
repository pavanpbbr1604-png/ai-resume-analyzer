import React, { useState, useEffect } from 'react';
import { NormalizedDocument, AISuggestionItem, NormalizedParagraph } from '../types';
import { api } from '../services/api';
import { FileText, ZoomIn, ZoomOut } from 'lucide-react';

interface WebDocumentViewerProps {
  document: NormalizedDocument;
  suggestions: AISuggestionItem[];
  selectedSuggestionId?: string;
  onSelectSuggestion: (suggestionId: string) => void;
  uploadedFileUrl?: string | null;
}

export const WebDocumentViewer: React.FC<WebDocumentViewerProps> = ({
  document: doc,
  suggestions,
  selectedSuggestionId,
  onSelectSuggestion,
  uploadedFileUrl,
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'original' | 'wysiwyg' | 'interactive'>('interactive');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const activeSuggestions = suggestions.filter((s) => s.status === 'PENDING');
  const isPdf = doc?.filename?.toLowerCase().endsWith('.pdf') || doc?.mime_type === 'application/pdf';
  const isSampleDoc = doc?.document_id?.startsWith('doc_sample');
  const fileDownloadUrl = doc?.document_id && !isSampleDoc ? api.getDownloadUrl(doc.document_id) : null;
  const activeFileUrl = uploadedFileUrl || fileDownloadUrl;

  useEffect(() => {
    if (doc?.document_id && !doc.document_id.startsWith('doc_sample')) {
      api.getHtmlPreview(doc.document_id)
        .then((html) => {
          if (html && html.trim().length > 0) {
            setHtmlContent(html);
            if (isPdf && activeFileUrl) {
              setViewMode('original');
            } else {
              setViewMode('wysiwyg');
            }
          } else if (activeFileUrl) {
            setViewMode('original');
          } else {
            setHtmlContent('');
            setViewMode('interactive');
          }
        })
        .catch(() => {
          if (activeFileUrl) {
            setViewMode('original');
          } else {
            setHtmlContent('');
            setViewMode('interactive');
          }
        });
    } else {
      setHtmlContent('');
      setViewMode('interactive');
    }
  }, [doc?.document_id, isPdf, activeFileUrl]);

  const getProcessedHtml = () => {
    if (!htmlContent) return '';
    let processed = htmlContent;

    activeSuggestions.forEach((sug) => {
      if (!sug.original_text || sug.original_text.length < 3) return;
      const target = sug.original_text;
      const isSelected = selectedSuggestionId === sug.suggestion_id;
      const markerHtml = `<mark class="yellow-review-marker ${isSelected ? 'selected' : ''}" data-sug-id="${sug.suggestion_id}" title="${sug.reasoning.replace(/"/g, '&quot;')}">${target}</mark>`;
      
      const regex = new RegExp(`(?<!<[^>]*)(${target.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})(?![^<]*>)`, 'g');
      processed = processed.replace(regex, markerHtml);
    });

    return processed;
  };

  const renderParagraphRuns = (p: NormalizedParagraph) => {
    const matchingSugs = activeSuggestions.filter(
      (s) =>
        (s.location && s.location.paragraph_id === p.paragraph_id) ||
        p.full_text.includes(s.original_text)
    );

    const alignmentStyle: React.CSSProperties['textAlign'] =
      p.alignment?.toLowerCase() === 'center'
        ? 'center'
        : p.alignment?.toLowerCase() === 'right'
        ? 'right'
        : p.alignment?.toLowerCase() === 'justify'
        ? 'justify'
        : 'left';

    const pStyle: React.CSSProperties = {
      textAlign: alignmentStyle,
      lineHeight: p.line_spacing || 1.4,
      marginBottom: `${p.space_after || 6}px`,
      marginTop: `${p.space_before || 0}px`,
    };

    if (matchingSugs.length === 0) {
      if (p.runs && p.runs.length > 0) {
        return (
          <div className={`doc-paragraph ${p.is_bullet ? 'doc-bullet' : ''}`} style={pStyle}>
            {p.runs.map((r) => {
              const runStyle: React.CSSProperties = {
                fontFamily: r.formatting.font_family || 'inherit',
                fontSize: r.formatting.font_size ? `${r.formatting.font_size}pt` : 'inherit',
                fontWeight: r.formatting.bold ? 700 : 400,
                fontStyle: r.formatting.italic ? 'italic' : 'normal',
                textDecoration: r.formatting.underline ? 'underline' : 'none',
                color: r.formatting.color || 'inherit',
              };
              return (
                <span key={r.run_id} style={runStyle}>
                  {r.text}
                </span>
              );
            })}
          </div>
        );
      }

      return (
        <div className={`doc-paragraph ${p.is_bullet ? 'doc-bullet' : ''}`} style={pStyle}>
          {p.full_text}
        </div>
      );
    }

    const sug = matchingSugs[0];
    const targetText = sug.original_text;
    const fullText = p.full_text;
    const matchPos = fullText.indexOf(targetText);

    if (matchPos !== -1) {
      const before = fullText.substring(0, matchPos);
      const matched = fullText.substring(matchPos, matchPos + targetText.length);
      const after = fullText.substring(matchPos + targetText.length);
      const isSelected = selectedSuggestionId === sug.suggestion_id;

      return (
        <div className={`doc-paragraph ${p.is_bullet ? 'doc-bullet' : ''}`} style={pStyle}>
          <span>{before}</span>
          <mark
            className={`yellow-review-marker ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectSuggestion(sug.suggestion_id)}
            title={sug.reasoning}
          >
            {matched}
          </mark>
          <span>{after}</span>
        </div>
      );
    }

    return (
      <div className={`doc-paragraph ${p.is_bullet ? 'doc-bullet' : ''}`} style={pStyle}>
        {p.full_text}
      </div>
    );
  };

  const handleHtmlClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const markEl = target.closest('.yellow-review-marker') as HTMLElement;
    if (markEl) {
      const sugId = markEl.getAttribute('data-sug-id');
      if (sugId) {
        onSelectSuggestion(sugId);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col border border-[#2C3136] bg-[#121416] relative h-full rounded-sm overflow-hidden">
      {/* Top Toolbar matching LUMIER Stitch layout */}
      <div className="h-12 border-b border-[#2C3136] flex items-center justify-between px-4 bg-[#0c0e10] shrink-0">
        <div className="flex items-center gap-2 text-[#e4beb4]">
          <FileText size={16} className="text-[#ff5722]" />
          <span className="font-label-caps text-xs">{doc?.filename || '1CR23CS127_PAVANBR_RESUME.pdf'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
            className="text-[#e4beb4] hover:text-[#ff5722] transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <span className="font-label-caps text-xs text-[#e4beb4]">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
            className="text-[#e4beb4] hover:text-[#ff5722] transition-colors"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-[#2C3136] bg-[#121416] shrink-0">
        {activeFileUrl && (
          <button
            onClick={() => setViewMode('original')}
            className={`flex-1 py-2 font-label-caps text-[11px] border-r border-[#2C3136] transition-colors ${
              viewMode === 'original' ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold' : 'text-[#e4beb4] hover:text-[#ff5722]'
            }`}
          >
            EXACT ORIGINAL
          </button>
        )}
        {htmlContent && (
          <button
            onClick={() => setViewMode('wysiwyg')}
            className={`flex-1 py-2 font-label-caps text-[11px] border-r border-[#2C3136] transition-colors ${
              viewMode === 'wysiwyg' ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold' : 'text-[#e4beb4] hover:text-[#ff5722]'
            }`}
          >
            WYSIWYG
          </button>
        )}
        <button
          onClick={() => setViewMode('interactive')}
          className={`flex-1 py-2 font-label-caps text-[11px] transition-colors ${
            viewMode === 'interactive' ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold' : 'text-[#e4beb4] hover:text-[#ff5722]'
          }`}
        >
          AI CANVAS
        </button>
      </div>

      {/* Document Canvas Container */}
      <div className="flex-1 overflow-y-auto p-8 relative flex justify-center bg-[#0F1113]">
        <div
          className="w-full max-w-2xl bg-white text-black p-8 shadow-2xl relative"
          style={{ minHeight: '800px', transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          {viewMode === 'original' && activeFileUrl ? (
            <iframe
              src={`${activeFileUrl}#toolbar=0`}
              style={{ width: '100%', height: '800px', border: 'none' }}
              title="Exact Document Viewer"
            />
          ) : viewMode === 'wysiwyg' && htmlContent ? (
            <div
              className="wysiwyg-docx-render"
              dangerouslySetInnerHTML={{ __html: getProcessedHtml() }}
              onClick={handleHtmlClick}
            />
          ) : (
            doc?.sections?.map((sec) => (
              <div key={sec.section_id} style={{ marginBottom: '24px' }}>
                {sec.heading_text && (
                  <h2 className="font-bold text-lg border-b border-gray-300 mb-2 mt-4 uppercase">
                    {sec.heading_text}
                  </h2>
                )}
                {sec.paragraphs.map((p) => (
                  <React.Fragment key={p.paragraph_id}>
                    {renderParagraphRuns(p)}
                  </React.Fragment>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
