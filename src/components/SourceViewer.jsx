import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode, 
  FileText, 
  Search, 
  AlertOctagon, 
  Database, 
  GitFork, 
  Check, 
  Copy 
} from 'lucide-react';

export default function SourceViewer({ parsedFiles, missingComponents, selectedFile, selectedLine, onSelectFile }) {
  const [activeFilename, setActiveFilename] = useState(selectedFile || parsedFiles[0]?.filename || '');
  const [copied, setCopied] = useState(false);
  const codeContainerRef = useRef(null);

  useEffect(() => {
    if (selectedFile) {
      setActiveFilename(selectedFile);
    }
  }, [selectedFile]);

  // Scroll to selectedLine when provided
  useEffect(() => {
    if (selectedLine && codeContainerRef.current) {
      setTimeout(() => {
        const lineElem = document.getElementById(`code-line-${selectedLine}`);
        if (lineElem) {
          lineElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lineElem.style.background = 'rgba(56, 189, 248, 0.25)';
          setTimeout(() => {
            lineElem.style.background = '';
          }, 3000);
        }
      }, 100);
    }
  }, [selectedLine, activeFilename]);

  const currentFile = parsedFiles.find(f => f.filename === activeFilename) || parsedFiles[0];

  const handleCopyCode = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build line-level annotations:
  // Check which lines in currentFile have missing calls, copybooks, or SQL
  const lineAnnotations = new Map();
  if (currentFile) {
    // Missing copybooks
    for (const cb of currentFile.copybooks) {
      const isMissing = missingComponents.some(m => m.name === cb.name && m.type.toLowerCase().includes('copybook'));
      if (isMissing) {
        lineAnnotations.set(cb.lineNum, { type: 'MISSING_COPYBOOK', label: `Missing Copybook: ${cb.name}`, color: '#f43f5e' });
      }
    }

    // Missing calls
    for (const call of currentFile.calls) {
      const isMissing = missingComponents.some(m => m.name === call.target && m.type.toLowerCase().includes('subprogram'));
      if (isMissing) {
        lineAnnotations.set(call.lineNum, { type: 'MISSING_CALL', label: `Missing Target: ${call.target}`, color: '#f43f5e' });
      } else {
        lineAnnotations.set(call.lineNum, { type: 'CALL', label: `Call: ${call.target}`, color: '#38bdf8' });
      }
    }

    // SQL Ops
    for (const op of currentFile.sqlOps) {
      lineAnnotations.set(op.lineNum, { type: 'SQL', label: `SQL ${op.operation}: ${op.tables.join(', ')}`, color: '#a855f7' });
    }
  }

  const programs = parsedFiles.filter(f => !f.isCopybook);
  const copybooks = parsedFiles.filter(f => f.isCopybook);

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>COBOL Source Code Inspector</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Interactive viewer with in-line annotations for missing dependencies, program calls, and database operations.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
        {/* Left: File Tree / List */}
        <div className="glass-card" style={{ padding: '16px', height: '700px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '600' }}>
            Codebase Files ({parsedFiles.length})
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Programs Section */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                PROGRAMS ({programs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {programs.map(f => {
                  const isSelected = f.filename === currentFile?.filename;
                  return (
                    <button
                      key={f.filename}
                      onClick={() => {
                        setActiveFilename(f.filename);
                        if (onSelectFile) onSelectFile(f.filename);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        border: isSelected ? '1px solid var(--accent-blue)' : '1px solid transparent',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCode size={14} color={isSelected ? 'var(--accent-blue)' : 'var(--text-dim)'} />
                        <code>{f.filename}</code>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{f.codeLines}L</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Copybooks Section */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                COPYBOOKS ({copybooks.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {copybooks.map(f => {
                  const isSelected = f.filename === currentFile?.filename;
                  return (
                    <button
                      key={f.filename}
                      onClick={() => {
                        setActiveFilename(f.filename);
                        if (onSelectFile) onSelectFile(f.filename);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                        border: isSelected ? '1px solid var(--accent-purple)' : '1px solid transparent',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} color={isSelected ? 'var(--accent-purple)' : 'var(--text-dim)'} />
                        <code>{f.filename}</code>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{f.codeLines}L</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Code Viewer Container */}
        <div className="glass-card" style={{ height: '700px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header Bar */}
          <div style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <code style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>
                {currentFile?.filename}
              </code>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                {currentFile?.isCopybook ? 'Copybook' : `Program: ${currentFile?.programId}`}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {currentFile?.totalLines} lines ({currentFile?.codeLines} code, {currentFile?.commentLines} comments)
              </span>
            </div>

            <button onClick={handleCopyCode} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Line by Line Code Editor */}
          <div ref={codeContainerRef} style={{ flex: 1, overflowY: 'auto', background: '#070a10', padding: '12px 0', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            {currentFile?.lines.map(line => {
              const annotation = lineAnnotations.get(line.lineNum);
              const isComment = line.isComment;

              return (
                <div
                  key={line.lineNum}
                  id={`code-line-${line.lineNum}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px 14px',
                    transition: 'background 0.2s ease',
                    borderLeft: annotation ? `3px solid ${annotation.color}` : '3px solid transparent'
                  }}
                >
                  {/* Line Number */}
                  <span style={{
                    width: '45px',
                    color: 'var(--text-dim)',
                    userSelect: 'none',
                    textAlign: 'right',
                    marginRight: '16px',
                    fontSize: '0.75rem'
                  }}>
                    {line.lineNum}
                  </span>

                  {/* Code Line Content */}
                  <span style={{
                    flex: 1,
                    whiteSpace: 'pre',
                    color: isComment ? '#64748b' : '#e2e8f0',
                    fontStyle: isComment ? 'italic' : 'normal'
                  }}>
                    {line.raw}
                  </span>

                  {/* Inline Annotation Badge if present */}
                  {annotation && (
                    <span
                      style={{
                        marginLeft: '12px',
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: annotation.type.includes('MISSING') ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: annotation.color,
                        border: `1px solid ${annotation.color}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        userSelect: 'none'
                      }}
                    >
                      {annotation.type.includes('MISSING') ? <AlertOctagon size={12} /> : annotation.type === 'SQL' ? <Database size={12} /> : <GitFork size={12} />}
                      {annotation.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
