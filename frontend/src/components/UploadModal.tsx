import React, { useState } from 'react';
import { UploadCloud, Sparkles } from 'lucide-react';

interface UploadModalProps {
  onAnalyze: (file: File, jdText: string) => void;
  onLoadSample: () => void;
  isLoading: boolean;
}

const DEFAULT_SAMPLE_JD = `Target Role: Senior Software Engineer
Company: TechCorp Innovations

Key Requirements & Responsibilities:
• 4+ years of experience building high-throughput REST APIs and microservices using Python, FastAPI, and Flask.
• Experience with containerization technologies like Docker, Kubernetes, and cloud infrastructure (AWS/GCP).
• Strong skills in SQL database design (PostgreSQL/MySQL) and caching with Redis.
• Demonstrated track record of optimizing backend API latency and quantifying technical metrics.`;

export const UploadModal: React.FC<UploadModalProps> = ({
  onAnalyze,
  onLoadSample,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState<string>(DEFAULT_SAMPLE_JD);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    onAnalyze(selectedFile, jdText);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Upload Resume & Target JD</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Select a DOCX or PDF resume and paste the job description.
            </p>
          </div>
          <button className="btn-secondary" onClick={onLoadSample} style={{ background: 'rgba(37,99,235,0.2)', border: '1px solid var(--primary)' }}>
            <Sparkles size={14} color="var(--primary)" /> Try Sample Demo
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <UploadCloud size={36} color="var(--primary)" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>
              {selectedFile ? selectedFile.name : 'Click to select or drag resume file'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supports .docx and .pdf files</p>
            <input
              type="file"
              accept=".docx,.pdf"
              onChange={handleFileChange}
              style={{ marginTop: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Target Job Description
            </label>
            <textarea
              rows={6}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job description..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                color: 'white',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!selectedFile || isLoading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {isLoading ? 'Analyzing Document & JD...' : 'Analyze Resume'}
          </button>
        </form>
      </div>
    </div>
  );
};
