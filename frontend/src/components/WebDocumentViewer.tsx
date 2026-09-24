import React, { useState } from 'react';
import { NormalizedDocument, AISuggestionItem } from '../types';
import { api } from '../services/api';
import { FileText, ZoomIn, ZoomOut } from 'lucide-react';

interface WebDocumentViewerProps {
  document: NormalizedDocument;
  suggestions?: AISuggestionItem[];
  selectedSuggestionId?: string;
  onSelectSuggestion?: (suggestionId: string) => void;
  uploadedFileUrl?: string | null;
}

export const WebDocumentViewer: React.FC<WebDocumentViewerProps> = ({
  document: doc,
  uploadedFileUrl,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const isSampleDoc = doc?.document_id?.startsWith('doc_sample');
  const fileDownloadUrl = doc?.document_id && !isSampleDoc ? api.getDownloadUrl(doc.document_id) : null;
  const activeFileUrl = uploadedFileUrl || fileDownloadUrl;

  return (
    <div className="flex-1 flex flex-col border border-[#2C3136] bg-[#121416] relative h-full rounded-sm overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-12 border-b border-[#2C3136] flex items-center justify-between px-4 bg-[#0c0e10] shrink-0">
        <div className="flex items-center gap-2 text-[#e4beb4]">
          <FileText size={16} className="text-[#ff5722]" />
          <span className="font-label-caps text-xs">{doc?.filename || 'Resume Document'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
            className="text-[#e4beb4] hover:text-[#ff5722] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="font-label-caps text-xs text-[#e4beb4] select-none">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
            className="text-[#e4beb4] hover:text-[#ff5722] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Exact Document Viewer Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative flex justify-center bg-[#0F1113]">
        <div
          className="w-full max-w-3xl bg-white text-black shadow-2xl relative overflow-hidden rounded-sm"
          style={{ minHeight: '850px', transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          {activeFileUrl ? (
            <iframe
              src={`${activeFileUrl}#toolbar=0`}
              className="w-full h-full min-h-[850px] border-none"
              title="Exact Resume Document"
            />
          ) : (
            <div className="p-8 text-black font-sans leading-relaxed">
              {doc?.sections?.map((sec) => (
                <div key={sec.section_id} className="mb-6">
                  {sec.heading_text && (
                    <h2 className="font-bold text-base border-b border-gray-300 pb-1 mb-2 mt-4 uppercase text-gray-800">
                      {sec.heading_text}
                    </h2>
                  )}
                  {sec.paragraphs.map((p) => (
                    <p
                      key={p.paragraph_id}
                      className={`text-xs mb-1.5 text-gray-900 ${p.is_bullet ? 'pl-4 relative before:content-["•"] before:absolute before:left-0' : ''}`}
                    >
                      {p.full_text}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
