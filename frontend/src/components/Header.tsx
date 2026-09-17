import React from 'react';
import { FileText, Undo2, Download, Upload, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  filename: string;
  documentId?: string;
  onUndo: () => void;
  onUploadClick: () => void;
  version: number;
}

export const Header: React.FC<HeaderProps> = ({
  filename,
  documentId,
  onUndo,
  onUploadClick,
  version,
}) => {
  const handleDownload = () => {
    if (documentId) {
      window.location.href = api.getDownloadUrl(documentId);
    }
  };

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-icon">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="brand-title">AI Resume Analyzer</h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Objective 1 — Intelligent Live Document Editor
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={16} color="var(--primary)" />
        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{filename || 'John_Doe_Resume.docx'}</span>
        {version > 0 && (
          <span className="badge badge-medium" style={{ fontSize: '0.7rem' }}>
            v{version}
          </span>
        )}
      </div>

      <div className="header-actions">
        <button className="btn-secondary" onClick={onUndo} title="Undo last change">
          <Undo2 size={16} /> Undo
        </button>

        <button className="btn-secondary" onClick={onUploadClick}>
          <Upload size={16} /> New Resume
        </button>

        <button className="btn-primary" onClick={handleDownload} disabled={!documentId}>
          <Download size={16} /> Download DOCX
        </button>
      </div>
    </header>
  );
};
