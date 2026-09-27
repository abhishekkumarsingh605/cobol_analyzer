import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import IdeSidebar from './components/IdeSidebar';
import IdeEditor from './components/IdeEditor';
import FileInventoryView from './components/FileInventoryView';
import MissingComponentsView from './components/MissingComponentsView';
import ReportsHub from './components/ReportsHub';
import UploadModal from './components/UploadModal';
import ReportExportModal from './components/ReportExportModal';
import { analyzeCodebase } from './parser/cobolParser';
import { SAMPLE_ENTERPRISE_CODEBASE } from './samples/sampleCodebase';
import { Sparkles, Upload, FileCode, Search, FolderTree, Code2 } from 'lucide-react';

export default function App() {
  const [analysisData, setAnalysisData] = useState(null);
  
  // Left Navigation Panel Option: 'inventory' | 'missing' | 'reports'
  const [activeNav, setActiveNav] = useState('inventory');
  const [inventoryViewMode, setInventoryViewMode] = useState('editor'); // 'editor' | 'dashboard'
  const [reportsSubTab, setReportsSubTab] = useState('audit'); // 'audit' | 'schemas' | 'flows' | 'inventory'
  
  // Code & File Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // IDE Editor State
  const [activeFile, setActiveFile] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [openTabs, setOpenTabs] = useState([]);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState('upload-button');
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Dark / Light Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('cobol_analyzer_theme');
    return saved || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cobol_analyzer_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Load sample enterprise codebase on initial render
  useEffect(() => {
    handleLoadSample();
  }, []);

  const handleLoadSample = () => {
    const result = analyzeCodebase(SAMPLE_ENTERPRISE_CODEBASE);
    setAnalysisData(result);
    const initialFile = result.parsedFiles[0]?.filename || null;
    setActiveFile(initialFile);
    setSelectedLine(null);
    if (initialFile) {
      setOpenTabs([initialFile]);
    }
    setActiveNav('inventory');
  };

  const handleFilesLoaded = (files) => {
    const result = analyzeCodebase(files);
    setAnalysisData(result);
    const initialFile = result.parsedFiles[0]?.filename || null;
    setActiveFile(initialFile);
    setSelectedLine(null);
    if (initialFile) {
      setOpenTabs([initialFile]);
    }
    setActiveNav('inventory');
    setSearchQuery('');
  };

  const handleClear = () => {
    setAnalysisData(null);
    setActiveFile(null);
    setSelectedLine(null);
    setOpenTabs([]);
    setSearchQuery('');
  };

  const handleSelectFileAndLine = (file, lineNum = 1) => {
    if (file) {
      setActiveFile(file);
      setSelectedLine(lineNum);
      setOpenTabs(prev => prev.includes(file) ? prev : [...prev, file]);
      setActiveNav('inventory');
      setInventoryViewMode('editor');
    }
  };

  const handleSelectTab = (file) => {
    setActiveFile(file);
    setSelectedLine(null);
  };

  const handleCloseTab = (fileToClose) => {
    const newTabs = openTabs.filter(f => f !== fileToClose);
    setOpenTabs(newTabs);
    if (activeFile === fileToClose && newTabs.length > 0) {
      setActiveFile(newTabs[newTabs.length - 1]);
    }
  };

  return (
    <div style={{ height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Top IDE Header / Title Bar */}
      <Header
        metrics={analysisData?.metrics}
        onLoadSample={handleLoadSample}
        onOpenUpload={(tab = 'upload-button') => {
          setUploadInitialTab(tab);
          setIsUploadOpen(true);
        }}
        onOpenExport={() => setIsExportOpen(true)}
        onClear={handleClear}
        hasFiles={Boolean(analysisData)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main IDE Interface: Left Panel + Center Workspace */}
      <div className="ide-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left Navigation Panel (Locked) */}
        <IdeSidebar
          parsedFiles={analysisData?.parsedFiles || []}
          fileInventory={analysisData?.fileInventory || null}
          missingComponents={analysisData?.missingComponents || []}
          metrics={analysisData?.metrics || null}
          activeNav={activeNav}
          onNavChange={(nav) => {
            setActiveNav(nav);
            setSearchQuery('');
          }}
          activeFile={activeFile}
          onSelectFileAndLine={handleSelectFileAndLine}
          onOpenUpload={(tab = 'upload-button') => {
            setUploadInitialTab(tab);
            setIsUploadOpen(true);
          }}
          onOpenExport={() => setIsExportOpen(true)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          reportsSubTab={reportsSubTab}
          onReportsSubTabChange={setReportsSubTab}
        />

        {/* Center Workspace (Independently scrolling) */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, height: '100%' }}>
          {analysisData ? (
            <>
              {/* Option 1: Codebase File Inventory Tree & Code Editor View */}
              {activeNav === 'inventory' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  {/* Top View Mode Switcher between Code Editor and Full Inventory Dashboard */}
                  <div style={{
                    padding: '8px 16px',
                    background: 'var(--bg-panels)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                    zIndex: 4
                  }}>
                    <div className="ide-view-mode-toggle">
                      <button
                        id="btn-inventory-editor-mode"
                        onClick={() => setInventoryViewMode('editor')}
                        className={`ide-view-mode-btn ${inventoryViewMode === 'editor' ? 'active' : ''}`}
                      >
                        <Code2 size={13} />
                        <span>Code Editor</span>
                      </button>

                      <button
                        id="btn-inventory-dashboard-mode"
                        onClick={() => setInventoryViewMode('dashboard')}
                        className={`ide-view-mode-btn ${inventoryViewMode === 'dashboard' ? 'active' : ''}`}
                      >
                        <FolderTree size={13} />
                        <span>Codebase Inventory & SME Dashboard</span>
                      </button>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{analysisData.fileInventory?.totalFiles || 0} Files</span>
                      <span>•</span>
                      <span>{analysisData.fileInventory?.totalSizeFormatted || '0 B'}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--accent-emerald)' }}>Mainframe SME Verified</span>
                    </div>
                  </div>

                  {/* View Content */}
                  {inventoryViewMode === 'editor' ? (
                    <IdeEditor
                      parsedFiles={analysisData.parsedFiles}
                      missingComponents={analysisData.missingComponents}
                      activeFile={activeFile}
                      selectedLine={selectedLine}
                      onSelectLine={(lineNum) => setSelectedLine(lineNum)}
                      openTabs={openTabs}
                      onSelectTab={handleSelectTab}
                      onCloseTab={handleCloseTab}
                      onOpenUpload={(tab = 'upload-button') => {
                        setUploadInitialTab(tab);
                        setIsUploadOpen(true);
                      }}
                    />
                  ) : (
                    <div style={{ flex: 1, height: '100%', overflowY: 'auto' }}>
                      <FileInventoryView
                        fileInventory={analysisData.fileInventory}
                        parsedFiles={analysisData.parsedFiles}
                        onSelectFileAndLine={handleSelectFileAndLine}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Option 2: Missing Components View (Independent Scroll) */}
              {activeNav === 'missing' && (
                <div style={{ flex: 1, height: '100%', overflowY: 'auto' }}>
                  <MissingComponentsView
                    missingComponents={analysisData.missingComponents}
                    onSelectFileAndLine={handleSelectFileAndLine}
                  />
                </div>
              )}

              {/* Option 3: Reports Hub View (Independent Scroll) */}
              {activeNav === 'reports' && (
                <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <ReportsHub
                    data={analysisData}
                    subTab={reportsSubTab}
                    onSubTabChange={setReportsSubTab}
                    onSelectFileAndLine={handleSelectFileAndLine}
                    onOpenExport={() => setIsExportOpen(true)}
                  />
                </div>
              )}
            </>
          ) : (
            /* IDE Empty State Welcome Screen */
            <div style={{
              flex: 1,
              height: '100%',
              overflowY: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              background: 'var(--bg-primary)'
            }}>
              <div className="glass-card" style={{ maxWidth: '560px', width: '100%', padding: '40px', textAlign: 'center' }}>
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  border: '1px solid rgba(56, 189, 248, 0.25)'
                }}>
                  <FileCode size={34} color="var(--accent-blue)" />
                </div>

                <h2 style={{ fontSize: '1.45rem', fontWeight: '700', marginBottom: '10px' }}>
                  COBOL Analyzer Workspace Ready
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '26px', lineHeight: '1.6' }}>
                  Open or upload your enterprise mainframe codebase to inspect file trees, detect missing copybooks & subprograms, reverse-engineer database schemas, and trace application call chains.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button 
                    id="btn-empty-upload-files"
                    onClick={() => {
                      setUploadInitialTab('upload-button');
                      setIsUploadOpen(true);
                    }} 
                    className="btn-primary" 
                    style={{ justifyContent: 'center', padding: '12px', fontSize: '0.9rem' }}
                  >
                    <Upload size={18} />
                    <span>Upload Codebase (Files, Folder, ZIP)</span>
                  </button>

                  <button 
                    id="btn-empty-load-sample"
                    onClick={handleLoadSample} 
                    className="btn-accent" 
                    style={{ justifyContent: 'center', padding: '12px', fontSize: '0.9rem' }}
                  >
                    <Sparkles size={18} color="var(--accent-emerald)" />
                    <span>Load Core Banking Sample Codebase</span>
                  </button>

                  <button 
                    id="btn-empty-git-repo"
                    onClick={() => {
                      setUploadInitialTab('git-repo');
                      setIsUploadOpen(true);
                    }} 
                    className="btn-secondary" 
                    style={{ justifyContent: 'center', padding: '12px', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#c7d2fe' }}
                  >
                    <FileCode size={18} color="#818cf8" />
                    <span>Clone from Git Repository (Remote / Local)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Upload Modal (Triggered from Left Panel or Header) */}
      <UploadModal
        isOpen={isUploadOpen}
        initialTab={uploadInitialTab}
        onClose={() => setIsUploadOpen(false)}
        onFilesLoaded={handleFilesLoaded}
        onLoadSample={handleLoadSample}
      />

      {/* Export Report Modal */}
      <ReportExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        data={analysisData}
      />
    </div>
  );
}
