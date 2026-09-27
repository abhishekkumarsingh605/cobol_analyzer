import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode, 
  FileText, 
  Terminal, 
  Database, 
  File, 
  Copy, 
  Check, 
  X, 
  AlertOctagon, 
  GitFork, 
  Layers, 
  Code2, 
  Clock, 
  HardDrive,
  ExternalLink,
  ChevronRight,
  ListTree
} from 'lucide-react';
import { formatBytes } from '../parser/cobolParser';
import ProgramOutline from './ProgramOutline';

export default function IdeEditor({
  parsedFiles = [],
  missingComponents = [],
  activeFile = null,
  selectedLine = null,
  onSelectLine,
  openTabs = [],
  onSelectTab,
  onCloseTab,
  onOpenUpload
}) {
  const [copied, setCopied] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const codeContainerRef = useRef(null);

  const currentFile = parsedFiles.find(f => f.filename === activeFile) || parsedFiles[0];

  const handleOutlineSelectLine = (lineNum) => {
    if (onSelectLine) {
      onSelectLine(lineNum);
    }
    const lineElem = document.getElementById(`ide-code-line-${lineNum}`);
    if (lineElem) {
      lineElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      lineElem.classList.add('ide-line-highlight');
      setTimeout(() => {
        lineElem.classList.remove('ide-line-highlight');
      }, 3500);
    }
  };

  // Auto-scroll to selectedLine with subtle pulse animation
  useEffect(() => {
    if (selectedLine && codeContainerRef.current) {
      setTimeout(() => {
        const lineElem = document.getElementById(`ide-code-line-${selectedLine}`);
        if (lineElem) {
          lineElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lineElem.classList.add('ide-line-highlight');
          setTimeout(() => {
            lineElem.classList.remove('ide-line-highlight');
          }, 3500);
        }
      }, 120);
    }
  }, [selectedLine, activeFile]);

  const handleCopyCode = () => {
    if (!currentFile?.rawContent) return;
    navigator.clipboard.writeText(currentFile.rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build annotations for missing components, calls, and SQL ops on specific lines
  const lineAnnotations = useRef(new Map());
  lineAnnotations.current = new Map();

  if (currentFile) {
    if (currentFile.copybooks) {
      for (const cb of currentFile.copybooks) {
        const isMissing = missingComponents.some(m => m.name === cb.name && m.type?.toLowerCase().includes('copybook'));
        if (isMissing) {
          lineAnnotations.current.set(cb.lineNum, {
            type: 'MISSING_COPYBOOK',
            label: `Missing Copybook: ${cb.name}`,
            color: 'var(--accent-rose)'
          });
        }
      }
    }

    if (currentFile.calls) {
      for (const call of currentFile.calls) {
        const isMissing = missingComponents.some(m => m.name === call.target && m.type?.toLowerCase().includes('subprogram'));
        if (isMissing) {
          lineAnnotations.current.set(call.lineNum, {
            type: 'MISSING_CALL',
            label: `Missing Subprogram: ${call.target}`,
            color: 'var(--accent-rose)'
          });
        } else {
          lineAnnotations.current.set(call.lineNum, {
            type: 'CALL',
            label: `Call: ${call.target}`,
            color: 'var(--accent-blue)'
          });
        }
      }
    }

    if (currentFile.sqlOps) {
      for (const op of currentFile.sqlOps) {
        lineAnnotations.current.set(op.lineNum, {
          type: 'SQL',
          label: `SQL ${op.operation}: ${op.tables?.join(', ')}`,
          color: 'var(--accent-purple)'
        });
      }
    }
  }

  const getFileIcon = (file) => {
    const ext = file?.extension?.toLowerCase() || '';
    if (['.cbl', '.cob', '.cobol'].includes(ext)) return <FileCode size={14} color="var(--accent-blue)" />;
    if (['.cpy', '.copy'].includes(ext)) return <FileText size={14} color="var(--accent-emerald)" />;
    if (['.jcl', '.job'].includes(ext)) return <Terminal size={14} color="var(--accent-amber)" />;
    if (['.sql', '.ddl', '.dcl'].includes(ext)) return <Database size={14} color="var(--accent-purple)" />;
    return <File size={14} color="var(--text-muted)" />;
  };

  if (!currentFile) {
    return (
      <div className="ide-editor-empty">
        <Code2 size={48} style={{ opacity: 0.25, marginBottom: '16px' }} />
        <h3>No File Selected</h3>
        <p>Select a file from the File Explorer on the left navigation panel to view its source code.</p>
        <button onClick={() => onOpenUpload('upload-button')} className="btn-primary" style={{ marginTop: '16px' }}>
          Upload Codebase
        </button>
      </div>
    );
  }

  const smeMetrics = currentFile.smeDetails;

  return (
    <div className="ide-editor-container">
      {/* 1. IDE Editor Tabs Bar */}
      <div className="ide-editor-tabs-bar">
        <div className="ide-editor-tabs-scroll">
          {openTabs.map((filename) => {
            const fileObj = parsedFiles.find(f => f.filename === filename);
            const isActive = filename === currentFile.filename;
            return (
              <div
                key={filename}
                onClick={() => onSelectTab(filename)}
                className={`ide-editor-tab ${isActive ? 'active' : ''}`}
                title={fileObj?.path || filename}
              >
                {getFileIcon(fileObj)}
                <span className="ide-tab-name">{filename}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(filename);
                  }}
                  className="ide-tab-close"
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Copy button */}
        <div className="ide-editor-actions">
          <button
            onClick={handleCopyCode}
            className="btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px' }}
            title="Copy entire file contents to clipboard"
          >
            {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* 2. IDE Breadcrumb Bar */}
      <div className="ide-breadcrumb-bar">
        <div className="ide-breadcrumb-path">
          <span>{currentFile.category || 'Source'}</span>
          <ChevronRight size={13} style={{ opacity: 0.5 }} />
          <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{currentFile.filename}</span>
          {currentFile.programId && currentFile.programId !== currentFile.filename && (
            <>
              <ChevronRight size={13} style={{ opacity: 0.5 }} />
              <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                PROGRAM-ID: {currentFile.programId}
              </span>
            </>
          )}
        </div>

        {/* Quick SME tags & Program Outline Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="ide-breadcrumb-sme">
            {smeMetrics?.paragraphsCount !== undefined && smeMetrics.paragraphsCount > 0 && (
              <span className="ide-sme-tag">
                {smeMetrics.paragraphsCount} Paragraphs
              </span>
            )}
            {smeMetrics?.sectionsCount !== undefined && smeMetrics.sectionsCount > 0 && (
              <span className="ide-sme-tag">
                {smeMetrics.sectionsCount} Sections
              </span>
            )}
            <span className="ide-sme-tag">
              {formatBytes(currentFile.sizeBytes || 0)}
            </span>
          </div>

          <button
            id="btn-toggle-program-outline"
            onClick={() => setOutlineOpen(prev => !prev)}
            className={`ide-outline-header-btn ${outlineOpen ? 'active' : ''}`}
            title={outlineOpen ? "Hide Program Outline" : "Show Program Outline"}
          >
            <ListTree size={13} />
            <span>Program Outline</span>
          </button>
        </div>
      </div>

      {/* 3. Main Editor Area: Code Canvas (Left/Center) + Program Outline (Right) */}
      <div className="ide-editor-main-area">
        <div ref={codeContainerRef} className="ide-code-scroll-canvas">
          {currentFile.lines.map((line) => {
            const annotation = lineAnnotations.current.get(line.lineNum);
            const isComment = line.isComment;

            return (
              <div
                key={line.lineNum}
                id={`ide-code-line-${line.lineNum}`}
                className={`ide-code-line-row ${annotation ? 'has-annotation' : ''}`}
              >
                {/* Line Gutter Number */}
                <span className="ide-line-number">
                  {line.lineNum}
                </span>

                {/* Code Line Text */}
                <span className={`ide-line-text ${isComment ? 'comment' : ''}`}>
                  {line.raw}
                </span>

                {/* Inline Annotation Tag */}
                {annotation && (
                  <span
                    className="ide-inline-annotation"
                    style={{
                      color: annotation.color,
                      borderColor: annotation.color,
                      background: annotation.type.includes('MISSING') ? 'rgba(244, 63, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)'
                    }}
                  >
                    {annotation.type.includes('MISSING') ? (
                      <AlertOctagon size={11} />
                    ) : annotation.type === 'SQL' ? (
                      <Database size={11} />
                    ) : (
                      <GitFork size={11} />
                    )}
                    <span>{annotation.label}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Program Outline for Current Open Program */}
        <ProgramOutline
          currentFile={currentFile}
          selectedLine={selectedLine}
          onSelectLine={handleOutlineSelectLine}
          isOpen={outlineOpen}
          onToggleOpen={() => setOutlineOpen(prev => !prev)}
        />
      </div>

      {/* 4. IDE Bottom Status Bar */}
      <div className="ide-status-bar">
        <div className="ide-status-left">
          <span>Ln {selectedLine || 1}, Col 1</span>
          <span className="ide-status-divider">•</span>
          <span>{currentFile.totalLines} lines</span>
          <span className="ide-status-divider">•</span>
          <span>{currentFile.codeLines} code</span>
          <span className="ide-status-divider">•</span>
          <span>{currentFile.commentLines} comments</span>
        </div>

        <div className="ide-status-right">
          <span>UTF-8</span>
          <span className="ide-status-divider">•</span>
          <span>{currentFile.category === 'COBOL' ? 'COBOL Fixed (Col 8-72)' : currentFile.category}</span>
          <span className="ide-status-divider">•</span>
          <span style={{ color: 'var(--accent-emerald)' }}>Mainframe SME Verified</span>
        </div>
      </div>
    </div>
  );
}
