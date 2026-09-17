import React, { useEffect, useRef, useState } from 'react';
import { NormalizedDocument, AISuggestionItem } from '../types';
import { WebDocumentViewer } from './WebDocumentViewer';

interface OnlyOfficeEditorProps {
  documentId?: string;
  document?: NormalizedDocument | null;
  suggestions: AISuggestionItem[];
  selectedSuggestionId?: string;
  onSelectSuggestion: (suggestionId: string) => void;
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (containerId: string, config: any) => any;
    };
  }
}

export const OnlyOfficeEditor: React.FC<OnlyOfficeEditorProps> = ({
  documentId,
  document,
  suggestions,
  selectedSuggestionId,
  onSelectSuggestion,
}) => {
  const [editorLoaded, setEditorLoaded] = useState<boolean>(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.DocsAPI && documentId) {
      try {
        const config = {
          documentType: 'word',
          document: {
            fileType: 'docx',
            key: `${documentId}_key`,
            title: document?.filename || 'Resume.docx',
            url: `/api/documents/${documentId}/download`,
          },
          editorConfig: {
            mode: 'edit',
            lang: 'en',
          },
        };
        new window.DocsAPI.DocEditor('onlyoffice-editor-frame', config);
        setEditorLoaded(true);
      } catch (err) {
        console.warn('ONLYOFFICE DocsAPI initialization fallback:', err);
        setEditorLoaded(false);
      }
    }
  }, [documentId, document]);

  if (editorLoaded) {
    return (
      <div className="editor-container">
        <div id="onlyoffice-editor-frame" ref={editorContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  // Seamless fallback to interactive WebDocumentViewer with yellow review markers
  if (!document) return null;

  return (
    <WebDocumentViewer
      document={document}
      suggestions={suggestions}
      selectedSuggestionId={selectedSuggestionId}
      onSelectSuggestion={onSelectSuggestion}
    />
  );
};
