import React from 'react';
import {
  Layers,
  Upload,
  Download,
  Sparkles,
  RotateCcw,
  GitBranch,
  Sun,
  Moon
} from 'lucide-react';

export default function Header({
  metrics,
  onLoadSample,
  onOpenUpload,
  onOpenExport,
  onClear,
  hasFiles,
  theme = 'dark',
  onToggleTheme
}) {
  return (
    <header className="ide-top-header">
      {/* Brand / Title */}
      <div className="ide-header-brand">
        <div className="ide-header-logo">
          <Layers size={22} color="#ffffff" />
        </div>
        <div className="ide-header-titles">
          <div className="ide-header-title-row">
            <h1 className="ide-header-title">
              COBOL Analyzer
            </h1>
            <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
              COBOL & DB2
            </span>
          </div>
          <p className="ide-header-subtitle">
            Missing Component Discovery
          </p>
          <p className='ide-header-subtitle'>
            Database Schemas • Application Call Chain
          </p>
        </div>
      </div>

      {/* Quick KPI stats in header if loaded */}
      {hasFiles && metrics && (
        <div className="ide-header-kpi-bar">
          <div className="ide-header-kpi-item">
            <span className="ide-header-kpi-label">Programs</span>
            <strong className="ide-header-kpi-val" style={{ color: 'var(--text-main)' }}>
              {metrics.totalPrograms}
            </strong>
          </div>
          <div className="ide-header-kpi-sep" />
          <div className="ide-header-kpi-item">
            <span className="ide-header-kpi-label">DB Tables</span>
            <strong className="ide-header-kpi-val" style={{ color: 'var(--accent-purple)' }}>
              {metrics.totalDbTables}
            </strong>
          </div>
          <div className="ide-header-kpi-sep" />
          <div className="ide-header-kpi-item">
            <span className="ide-header-kpi-label">Missing</span>
            <strong
              className="ide-header-kpi-val"
              style={{ color: metrics.totalMissing > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}
            >
              {metrics.totalMissing}
            </strong>
          </div>
          <div className="ide-header-kpi-sep" />
          <div className="ide-header-kpi-item">
            <span className="ide-header-kpi-label">Readiness</span>
            <strong className="ide-header-kpi-val" style={{ color: 'var(--accent-emerald)' }}>
              {metrics.resolvedRate}%
            </strong>
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="ide-header-actions">
        <button
          id="btn-load-sample"
          onClick={onLoadSample}
          className="btn-accent"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
            fontSize: '0.78rem',
            padding: '6px 12px',
            gap: '6px'
          }}
          title="Load sample core banking codebase"
        >
          <Sparkles size={15} />
          <span>Load Sample</span>
        </button>

        <button
          id="btn-upload"
          onClick={() => onOpenUpload('upload-button')}
          className="btn-primary"
          style={{ fontSize: '0.78rem', padding: '6px 12px', gap: '6px' }}
          title="Upload COBOL files (.cbl, .cpy), folder, or ZIP archive"
        >
          <Upload size={15} />
          <span>Upload Codebase</span>
        </button>

        {hasFiles && (
          <>
            <button
              id="btn-export"
              onClick={onOpenExport}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '6px 12px', gap: '6px' }}
              title="View and download comprehensive modernization report"
            >
              <Download size={15} />
              <span>Export Report</span>
            </button>

            <button
              id="btn-clear"
              onClick={onClear}
              className="btn-secondary"
              style={{ padding: '6px 8px' }}
              title="Clear current workspace"
            >
              <RotateCcw size={15} />
            </button>
          </>
        )}

        {/* Dark / Light Theme Toggle Button */}
        <button
          id="btn-theme-toggle"
          onClick={onToggleTheme}
          className="btn-secondary"
          style={{
            padding: '6px 10px',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
        >
          {theme === 'dark' ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#6366f1" />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </header>
  );
}
