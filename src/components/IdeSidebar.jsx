import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  FileCode,
  FileText,
  Terminal,
  Database,
  Search,
  Upload,
  X,
  ChevronRight,
  ChevronDown,
  AlertOctagon,
  FileCheck,
  BarChart3,
  GitFork,
  Sparkles,
  Layers,
  Folder,
  FolderOpen,
  File,
  Code2,
  Calendar,
  HardDrive,
  ListTree,
  Filter
} from 'lucide-react';
import { formatBytes } from '../parser/cobolParser';

export default function IdeSidebar({
  parsedFiles = [],
  fileInventory = null,
  missingComponents = [],
  metrics = null,
  activeNav = 'inventory', // 'inventory' | 'missing' | 'reports'
  onNavChange,
  activeFile = null,
  onSelectFileAndLine,
  onOpenUpload,
  onOpenExport,
  searchQuery = '',
  onSearchQueryChange,
  reportsSubTab = 'audit',
  onReportsSubTabChange
}) {
  // Tree expansion state for directory paths
  const [expandedFolders, setExpandedFolders] = useState({
    'root': true,
    'cbl': true,
    'cpy': true,
    'jcl': true,
    'sql': true,
    'other': true
  });

  const [treeViewMode, setTreeViewMode] = useState('tree'); // 'tree' | 'category'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'COBOL' | 'COPYBOOK' | 'JCL' | 'SQL'
  const [missingFilter, setMissingFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'

  const categories = fileInventory?.categories || {
    cobol: { count: 0, paragraphsCount: 0, sectionsCount: 0, totalLines: 0 },
    copybook: { count: 0, totalLines: 0 },
    jcl: { count: 0, totalLines: 0 },
    other: { count: 0, totalLines: 0 }
  };

  // Helper to determine file icon based on extension and category
  const getFileIcon = (file) => {
    const ext = file.extension?.toLowerCase() || '';
    if (['.cbl', '.cob', '.cobol'].includes(ext) || (!file.isCopybook && file.category === 'COBOL')) {
      return <FileCode size={13} color="var(--accent-blue)" />;
    }
    if (['.cpy', '.copy'].includes(ext) || file.isCopybook || file.category === 'COPYBOOK') {
      return <FileText size={13} color="var(--accent-emerald)" />;
    }
    if (['.jcl', '.job'].includes(ext) || file.category === 'JCL') {
      return <Terminal size={13} color="var(--accent-amber)" />;
    }
    if (['.sql', '.ddl', '.dcl'].includes(ext) || file.category === 'SQL/DDL') {
      return <Database size={13} color="var(--accent-purple)" />;
    }
    return <File size={13} color="var(--text-muted)" />;
  };

  // Group files by category for category view mode
  const folderGroups = useMemo(() => {
    if (!parsedFiles || parsedFiles.length === 0) return {};

    const groups = {
      'cbl': { name: 'cbl (COBOL Programs)', icon: FileCode, color: 'var(--accent-blue)', files: [] },
      'cpy': { name: 'cpy (Copybook Layouts)', icon: FileText, color: 'var(--accent-emerald)', files: [] },
      'jcl': { name: 'jcl (Batch JCL Scripts)', icon: Terminal, color: 'var(--accent-amber)', files: [] },
      'sql': { name: 'sql (Schemas & DDL)', icon: Database, color: 'var(--accent-purple)', files: [] },
      'other': { name: 'other (Screens & Maps)', icon: File, color: 'var(--text-muted)', files: [] }
    };

    for (const f of parsedFiles) {
      const ext = f.extension?.toLowerCase() || '';
      const pathLower = (f.path || f.filename).toLowerCase();

      if (['.cbl', '.cob', '.cobol'].includes(ext) || pathLower.includes('/cbl/') || (!f.isCopybook && f.category === 'COBOL')) {
        groups['cbl'].files.push(f);
      } else if (['.cpy', '.copy'].includes(ext) || pathLower.includes('/cpy/') || f.isCopybook || f.category === 'COPYBOOK') {
        groups['cpy'].files.push(f);
      } else if (['.jcl', '.job'].includes(ext) || pathLower.includes('/jcl/') || f.category === 'JCL') {
        groups['jcl'].files.push(f);
      } else if (['.sql', '.ddl', '.dcl'].includes(ext) || pathLower.includes('/sql/') || f.category === 'SQL/DDL') {
        groups['sql'].files.push(f);
      } else {
        groups['other'].files.push(f);
      }
    }

    for (const k of Object.keys(groups)) {
      groups[k].files.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    return groups;
  }, [parsedFiles]);

  // Codebase Search Engine: Search across filenames AND lines of source code
  const searchResults = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return null;
    const query = searchQuery.trim().toLowerCase();
    const results = [];
    let totalLineMatches = 0;

    for (const f of parsedFiles) {
      const filenameMatch = f.filename.toLowerCase().includes(query) || (f.path && f.path.toLowerCase().includes(query));
      const matchingLines = [];
      const lines = f.rawContent ? f.rawContent.split(/\r?\n/) : [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(query)) {
          matchingLines.push({
            lineNum: i + 1,
            text: line.trim()
          });
          totalLineMatches++;
          if (matchingLines.length >= 30) break; // Keep UI snappy
        }
      }

      if (filenameMatch || matchingLines.length > 0) {
        results.push({
          file: f,
          filenameMatch,
          matchingLines,
          count: matchingLines.length + (filenameMatch ? 1 : 0)
        });
      }
    }

    return { results, totalLineMatches };
  }, [searchQuery, parsedFiles]);

  const toggleFolder = (key) => {
    setExpandedFolders(prev => {
      const current = prev[key] !== false;
      return {
        ...prev,
        [key]: !current
      };
    });
  };

  const expandAll = () => {
    const all = { 'root': true };
    const traverse = (node) => {
      if (node && node.isDirectory) {
        const key = node.path || node.name || 'root';
        all[key] = true;
        if (node.path) all[node.path] = true;
        if (node.name) all[node.name] = true;
        node.children?.forEach(traverse);
      }
    };
    if (fileInventory?.tree) traverse(fileInventory.tree);
    Object.keys(folderGroups).forEach(k => { all[k] = true; });
    all['cbl'] = true;
    all['cpy'] = true;
    all['jcl'] = true;
    all['sql'] = true;
    all['other'] = true;
    setExpandedFolders(all);
  };

  const collapseAll = () => {
    const collapsed = { 'root': true };
    const traverse = (node) => {
      if (node && node.isDirectory) {
        const key = node.path || node.name || 'root';
        collapsed[key] = false;
        if (node.path) collapsed[node.path] = false;
        if (node.name) collapsed[node.name] = false;
        node.children?.forEach(traverse);
      }
    };
    if (fileInventory?.tree) traverse(fileInventory.tree);
    Object.keys(folderGroups).forEach(k => { collapsed[k] = false; });
    collapsed['cbl'] = false;
    collapsed['cpy'] = false;
    collapsed['jcl'] = false;
    collapsed['sql'] = false;
    collapsed['other'] = false;
    collapsed['root'] = true;
    setExpandedFolders(collapsed);
  };

  const filteredMissing = useMemo(() => {
    if (missingFilter === 'ALL') return missingComponents;
    return missingComponents.filter(m => m.severity === missingFilter);
  }, [missingComponents, missingFilter]);

  // Category filter check for tree nodes
  const nodeMatchesCategory = (node) => {
    if (categoryFilter === 'ALL') return true;
    if (node.isDirectory) {
      return node.children?.some(c => nodeMatchesCategory(c));
    }
    const cat = node.category?.toUpperCase() || '';
    if (categoryFilter === 'COBOL') return cat === 'COBOL' && !node.isCopybook;
    if (categoryFilter === 'COPYBOOK') return cat === 'COPYBOOK' || node.isCopybook;
    if (categoryFilter === 'JCL') return cat === 'JCL';
    if (categoryFilter === 'SQL') return cat === 'SQL/DDL';
    return true;
  };

  // Render recursive directory tree node
  const renderTreeNode = (node, depth = 0) => {
    if (node.isDirectory) {
      const dirKey = node.path || node.name || 'root';
      const isExpanded = expandedFolders[dirKey] !== false; // default open
      const visibleChildren = node.children ? node.children.filter(nodeMatchesCategory) : [];

      if (categoryFilter !== 'ALL' && visibleChildren.length === 0) return null;

      return (
        <div key={dirKey} className="ide-tree-dir-group">
          {depth > 0 && (
            <button
              onClick={() => toggleFolder(dirKey)}
              className="ide-tree-dir-row"
              style={{ paddingLeft: `${8 + (depth - 1) * 14}px` }}
              title={`Directory: ${node.name} • ${node.totalFiles} files • ${node.totalSizeFormatted}`}
            >
              <span className="ide-folder-chevron">
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
              {isExpanded ? (
                <FolderOpen size={14} color="var(--accent-amber)" />
              ) : (
                <Folder size={14} color="var(--accent-amber)" />
              )}
              <span className="ide-tree-dir-name">{node.name}</span>
              <span className="ide-tree-dir-badge">
                {node.totalFiles} • {node.totalSizeFormatted}
              </span>
            </button>
          )}

          {(depth === 0 || isExpanded) && (
            <div className="ide-tree-dir-children">
              {visibleChildren.map(child => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File Node
    const isSelected = activeFile === node.filename;
    const sme = node.smeDetails;
    const lastModDate = node.lastModifiedFormatted || (node.lastModified ? new Date(node.lastModified).toLocaleDateString() : '');

    return (
      <button
        key={node.path || node.filename}
        onClick={() => onSelectFileAndLine(node.filename, 1)}
        className={`ide-tree-file-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${8 + (depth - 1) * 14}px` }}
        title={`${node.filename} • ${node.sizeFormatted} • Last Modified: ${lastModDate || 'N/A'} • ${node.totalLines} lines • ${sme?.paragraphsCount || 0} paragraphs • ${sme?.sectionsCount || 0} procedures`}
      >
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {getFileIcon(node)}
        </span>
        <span className="ide-tree-file-name">{node.name || node.filename}</span>

        {/* SME Badges & File Size */}
        <div className="ide-tree-file-badges">
          {sme?.paragraphsCount > 0 && (
            <span className="ide-sme-mini-badge" title={`${sme.paragraphsCount} COBOL Paragraphs`}>
              ¶{sme.paragraphsCount}
            </span>
          )}
          {sme?.sectionsCount > 0 && (
            <span className="ide-sme-mini-badge" title={`${sme.sectionsCount} Procedures / Sections`}>
              §{sme.sectionsCount}
            </span>
          )}
          {sme?.stepsCount > 0 && (
            <span className="ide-sme-mini-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }} title={`${sme.stepsCount} JCL EXEC Steps`}>
              {sme.stepsCount}st
            </span>
          )}
          <span className="ide-tree-file-size">
            {node.sizeFormatted}
          </span>
        </div>
      </button>
    );
  };

  return (
    <aside className="ide-sidebar">
      {/* 1. Sidebar Top Action: Upload Button */}
      {/* <div className="ide-sidebar-header">
        <button
          id="btn-sidebar-upload"
          onClick={() => onOpenUpload('upload-button')}
          className="ide-upload-btn"
          title="Upload COBOL files, folder, ZIP archive or Git repository"
        >
          <Upload size={15} />
          <span>Upload Codebase</span>
        </button>
      </div> */}

      {/* 2. Global Search Box */}
      <div className="ide-search-container">
        <div className="ide-search-box">
          <Search size={14} className="ide-search-icon" />
          <input
            id="input-ide-search"
            type="text"
            placeholder="Search file or code..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="ide-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchQueryChange('')}
              className="ide-search-clear"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Navigation View Options */}
      <div className="ide-nav-options">
        <button
          id="nav-opt-inventory"
          onClick={() => onNavChange('inventory')}
          className={`ide-nav-btn ${activeNav === 'inventory' && !searchQuery ? 'active' : ''}`}
        >
          <FolderTree size={16} />
          <span>File Inventory Tree</span>
          {parsedFiles.length > 0 && (
            <span className="ide-pill-count">{parsedFiles.length}</span>
          )}
        </button>

        <button
          id="nav-opt-missing"
          onClick={() => onNavChange('missing')}
          className={`ide-nav-btn ${activeNav === 'missing' && !searchQuery ? 'active' : ''}`}
        >
          <AlertOctagon size={16} color={missingComponents.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'} />
          <span>Missing Components</span>
          {missingComponents.length > 0 && (
            <span className="ide-pill-count pill-rose">{missingComponents.length}</span>
          )}
        </button>

        <button
          id="nav-opt-reports"
          onClick={() => onNavChange('reports')}
          className={`ide-nav-btn ${activeNav === 'reports' && !searchQuery ? 'active' : ''}`}
        >
          <FileCheck size={16} />
          <span>Reports</span>
          <span className="ide-pill-count pill-indigo">Hub</span>
        </button>
      </div>

      {/* 4. Sidebar Dynamic Body */}
      <div className="ide-sidebar-content">
        {/* A. If Search Query is active -> Render Search Results */}
        {searchQuery ? (
          <div className="ide-search-results-panel">
            <div className="ide-section-header">
              <span>SEARCH RESULTS</span>
              <span className="ide-results-count">
                {searchResults?.totalLineMatches || 0} hits in {searchResults?.results?.length || 0} files
              </span>
            </div>

            {searchResults && searchResults.results.length === 0 ? (
              <div className="ide-empty-search">
                <Search size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p>No files or code matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="ide-search-file-list">
                {searchResults?.results.map(({ file, filenameMatch, matchingLines }) => (
                  <div key={file.filename} className="ide-search-file-group">
                    <button
                      onClick={() => onSelectFileAndLine(file.filename, matchingLines[0]?.lineNum || 1)}
                      className="ide-search-file-header"
                    >
                      <FileCode size={13} color="var(--accent-blue)" />
                      <span className="ide-search-filename">{file.filename}</span>
                      <span className="ide-search-badge">{matchingLines.length}</span>
                    </button>

                    <div className="ide-search-lines">
                      {matchingLines.map((ml) => (
                        <button
                          key={`${file.filename}-${ml.lineNum}`}
                          onClick={() => onSelectFileAndLine(file.filename, ml.lineNum)}
                          className="ide-search-line-row"
                        >
                          <span className="ide-search-linenum">{ml.lineNum}:</span>
                          <span className="ide-search-linetext">{ml.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeNav === 'inventory' ? (
          /* B. Codebase File Inventory Tree Mode */
          <div className="ide-explorer-panel">
            <div className="ide-section-header">
              <span>FILE INVENTORY TREE</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                {fileInventory?.totalSizeFormatted || formatBytes(fileInventory?.totalSizeBytes || 0)}
              </span>
            </div>

            {parsedFiles.length === 0 ? (
              <div className="ide-empty-sidebar-notice">
                <p>No codebase loaded.</p>
                <button onClick={() => onOpenUpload('upload-button')} className="btn-secondary" style={{ marginTop: '8px', fontSize: '0.75rem', padding: '4px 10px' }}>
                  Upload Files
                </button>
              </div>
            ) : (
              <>
                {/* Tree Toolbar Controls */}
                <div className="ide-tree-toolbar">
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      id="btn-sidebar-expand-all"
                      onClick={expandAll}
                      className="ide-tree-tool-btn"
                      title="Expand all directories"
                    >
                      <ListTree size={12} />
                      <span>Expand All</span>
                    </button>
                    <button
                      id="btn-sidebar-collapse-all"
                      onClick={collapseAll}
                      className="ide-tree-tool-btn"
                      title="Collapse all directories"
                    >
                      <Folder size={12} />
                      <span>Collapse All</span>
                    </button>
                  </div>

                  {/* Tree vs Category View Switcher */}
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      onClick={() => setTreeViewMode('tree')}
                      className={`ide-tree-tool-btn ${treeViewMode === 'tree' ? 'active' : ''}`}
                      title="Hierarchical directory structure"
                    >
                      <span>Tree</span>
                    </button>
                    <button
                      onClick={() => setTreeViewMode('category')}
                      className={`ide-tree-tool-btn ${treeViewMode === 'category' ? 'active' : ''}`}
                      title="Group by file extension / category"
                    >
                      <span>Category</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills with Counts */}
                <div className="ide-filter-pills" style={{ marginBottom: '8px' }}>
                  {[
                    { id: 'ALL', label: `All (${parsedFiles.length})` },
                    { id: 'COBOL', label: `CBL (${categories.cobol.count})` },
                    { id: 'COPYBOOK', label: `CPY (${categories.copybook.count})` },
                    { id: 'JCL', label: `JCL (${categories.jcl.count})` },
                    { id: 'SQL', label: `SQL (${categories.other.count})` }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setCategoryFilter(p.id)}
                      className={`ide-filter-pill ${categoryFilter === p.id ? 'active' : ''}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Mainframe SME Quick Strip */}
                {categories.cobol.paragraphsCount > 0 && (
                  <div className="ide-sme-quick-strip" title="Mainframe SME summary metrics">
                    <span><strong>{categories.cobol.paragraphsCount}</strong> Paragraphs</span>
                    <span>•</span>
                    <span><strong>{categories.cobol.sectionsCount}</strong> Procedures</span>
                    <span>•</span>
                    <span><strong>{fileInventory?.totalCodeLines || 0}</strong> Code Lines</span>
                  </div>
                )}

                {/* Tree View Mode: Hierarchical Directory Tree */}
                {treeViewMode === 'tree' && fileInventory?.tree ? (
                  <div className="ide-folder-tree">
                    {renderTreeNode(fileInventory.tree, 0)}
                  </div>
                ) : (
                  /* Category Mode: Grouped by Extension / Purpose */
                  <div className="ide-folder-tree">
                    {Object.entries(folderGroups).map(([key, group]) => {
                      if (group.files.length === 0) return null;
                      const isExpanded = expandedFolders[key] !== false;
                      const GroupIcon = group.icon;

                      return (
                        <div key={key} className="ide-folder-block">
                          <button
                            onClick={() => toggleFolder(key)}
                            className="ide-folder-header"
                          >
                            <span className="ide-folder-chevron">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            {isExpanded ? (
                              <FolderOpen size={14} color={group.color} />
                            ) : (
                              <Folder size={14} color={group.color} />
                            )}
                            <span className="ide-folder-title">{group.name}</span>
                            <span className="ide-folder-count">{group.files.length}</span>
                          </button>

                          {isExpanded && (
                            <div className="ide-file-items">
                              {group.files.map((file) => {
                                const isSelected = activeFile === file.filename;
                                const sme = file.smeDetails;
                                const lastMod = file.lastModifiedFormatted || (file.lastModified ? new Date(file.lastModified).toLocaleDateString() : '');
                                return (
                                  <button
                                    key={file.filename}
                                    onClick={() => onSelectFileAndLine(file.filename, 1)}
                                    className={`ide-file-row ${isSelected ? 'selected' : ''}`}
                                    title={`${file.filename} • ${formatBytes(file.sizeBytes || 0)} • Last Modified: ${lastMod || 'N/A'} • ${file.totalLines}L (${file.codeLines} code)`}
                                  >
                                    <GroupIcon size={13} color={isSelected ? 'var(--accent-blue)' : group.color} style={{ flexShrink: 0 }} />
                                    <span className="ide-filename-text">{file.filename}</span>
                                    <div className="ide-tree-file-badges">
                                      {sme?.paragraphsCount > 0 && (
                                        <span className="ide-sme-mini-badge" title={`${sme.paragraphsCount} Paragraphs`}>
                                          ¶{sme.paragraphsCount}
                                        </span>
                                      )}
                                      <span className="ide-file-lines">{formatBytes(file.sizeBytes || 0)}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeNav === 'missing' ? (
          /* C. Missing Components Quick List */
          <div className="ide-missing-panel">
            <div className="ide-section-header">
              <span>UNRESOLVED DEPENDENCIES</span>
              <span className="ide-results-count">{missingComponents.length}</span>
            </div>

            {/* Severity Filter Pill Tabs */}
            <div className="ide-filter-pills">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setMissingFilter(sev)}
                  className={`ide-filter-pill ${missingFilter === sev ? 'active' : ''}`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {filteredMissing.length === 0 ? (
              <div className="ide-empty-sidebar-notice" style={{ color: 'var(--accent-emerald)' }}>
                ✓ No missing components found for this filter.
              </div>
            ) : (
              <div className="ide-missing-list">
                {filteredMissing.map((m) => {
                  const firstCaller = m.callers?.[0];
                  return (
                    <div key={m.id} className="ide-missing-card">
                      <div className="ide-missing-card-top">
                        <span className={`badge ${m.severity === 'CRITICAL' ? 'badge-critical' : m.severity === 'HIGH' ? 'badge-warning' : 'badge-info'
                          }`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                          {m.severity}
                        </span>
                        <span className="ide-missing-type">{m.type}</span>
                      </div>

                      <div className="ide-missing-name" title={m.name}>
                        {m.name}
                      </div>

                      {firstCaller && (
                        <button
                          onClick={() => onSelectFileAndLine(firstCaller.file || firstCaller.program, firstCaller.lineNum || 1)}
                          className="ide-missing-caller-link"
                          title="Click to jump directly to the source reference"
                        >
                          <span>Referenced in {firstCaller.file || firstCaller.program}:{firstCaller.lineNum || 1}</span>
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* D. Reports Hub Menu */
          <div className="ide-reports-panel">
            <div className="ide-section-header">
              <span>REPORT VIEWS</span>
            </div>

            <div className="ide-report-menu">
              <button
                onClick={() => onReportsSubTabChange('audit')}
                className={`ide-report-menu-item ${reportsSubTab === 'audit' ? 'active' : ''}`}
              >
                <BarChart3 size={15} color="var(--accent-blue)" />
                <div style={{ textAlign: 'left' }}>
                  <div className="ide-report-title">Architecture Assessment</div>
                  <div className="ide-report-sub">Risk score, metrics & breakdown</div>
                </div>
              </button>

              <button
                onClick={() => onReportsSubTabChange('schemas')}
                className={`ide-report-menu-item ${reportsSubTab === 'schemas' ? 'active' : ''}`}
              >
                <Database size={15} color="var(--accent-purple)" />
                <div style={{ textAlign: 'left' }}>
                  <div className="ide-report-title">Database Schemas & DDL</div>
                  <div className="ide-report-sub">{metrics?.totalDbTables || 0} tables, CRUD matrix</div>
                </div>
              </button>

              <button
                onClick={() => onReportsSubTabChange('flows')}
                className={`ide-report-menu-item ${reportsSubTab === 'flows' ? 'active' : ''}`}
              >
                <GitFork size={15} color="var(--accent-emerald)" />
                <div style={{ textAlign: 'left' }}>
                  <div className="ide-report-title">Application Flows & Calls</div>
                  <div className="ide-report-sub">Interactive graph & call trees</div>
                </div>
              </button>

              <button
                onClick={() => onReportsSubTabChange('inventory')}
                className={`ide-report-menu-item ${reportsSubTab === 'inventory' ? 'active' : ''}`}
              >
                <FolderTree size={15} color="var(--accent-amber)" />
                <div style={{ textAlign: 'left' }}>
                  <div className="ide-report-title">File Inventory & SME</div>
                  <div className="ide-report-sub">Paragraphs, procedures, sizes</div>
                </div>
              </button>
            </div>

            <div style={{ marginTop: '20px', padding: '0 8px' }}>
              <button
                onClick={onOpenExport}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
              >
                <FileCheck size={14} />
                <span>Export Executive Report</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Sidebar Bottom Quick Info */}
      {metrics && (
        <div className="ide-sidebar-footer">
          <div className="ide-footer-stat">
            <span className="ide-footer-label">Resolved</span>
            <span className="ide-footer-val" style={{ color: 'var(--accent-emerald)' }}>
              {metrics.resolvedRate}%
            </span>
          </div>
          <div className="ide-footer-stat">
            <span className="ide-footer-label">Missing</span>
            <span className="ide-footer-val" style={{ color: metrics.totalMissing > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
              {metrics.totalMissing}
            </span>
          </div>
          <div className="ide-footer-stat">
            <span className="ide-footer-label">Tables</span>
            <span className="ide-footer-val" style={{ color: 'var(--accent-purple)' }}>
              {metrics.totalDbTables}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
