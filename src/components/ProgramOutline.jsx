import React, { useState, useMemo } from 'react';
import { 
  ListTree, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  X, 
  FileCode, 
  Terminal, 
  Database, 
  FileText, 
  GitFork, 
  Layers, 
  Hash, 
  Bookmark, 
  PanelRightClose,
  PanelRightOpen,
  Code2
} from 'lucide-react';

export default function ProgramOutline({
  currentFile,
  selectedLine = null,
  onSelectLine,
  isOpen = true,
  onToggleOpen
}) {
  const [filterText, setFilterText] = useState('');
  const [groupOpen, setGroupOpen] = useState({
    divisions: true,
    sections: true,
    paragraphs: true,
    calls: true,
    copybooks: true,
    sql: true,
    jclSteps: true,
    jclDd: false
  });

  const toggleGroup = (key) => {
    setGroupOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Build hierarchical symbol outline for currentFile
  const outline = useMemo(() => {
    if (!currentFile) return null;

    const divisions = [];
    const sections = [];
    const paragraphs = [];
    const calls = [];
    const copybooks = [];
    const sqlOps = [];
    const jclSteps = [];
    const jclDd = [];

    const lines = currentFile.lines || [];

    // 1. Scan lines for standard Division & Major Section headers
    for (const l of lines) {
      const upper = l.code ? l.code.toUpperCase() : (l.raw ? l.raw.toUpperCase() : '');
      if (l.isComment) continue;

      if (upper.includes('IDENTIFICATION DIVISION')) {
        divisions.push({ id: 'div-id', name: 'IDENTIFICATION DIVISION', lineNum: l.lineNum, icon: 'division' });
      } else if (upper.includes('ENVIRONMENT DIVISION')) {
        divisions.push({ id: 'div-env', name: 'ENVIRONMENT DIVISION', lineNum: l.lineNum, icon: 'division' });
      } else if (upper.includes('DATA DIVISION')) {
        divisions.push({ id: 'div-data', name: 'DATA DIVISION', lineNum: l.lineNum, icon: 'division' });
      } else if (upper.includes('WORKING-STORAGE SECTION')) {
        divisions.push({ id: 'sec-ws', name: 'WORKING-STORAGE SECTION', lineNum: l.lineNum, icon: 'subdivision' });
      } else if (upper.includes('LINKAGE SECTION')) {
        divisions.push({ id: 'sec-link', name: 'LINKAGE SECTION', lineNum: l.lineNum, icon: 'subdivision' });
      } else if (upper.includes('PROCEDURE DIVISION')) {
        divisions.push({ id: 'div-proc', name: 'PROCEDURE DIVISION', lineNum: l.lineNum, icon: 'division' });
      }
    }

    // 2. Sections from smeDetails
    if (currentFile.smeDetails?.sectionsList) {
      for (const s of currentFile.smeDetails.sectionsList) {
        sections.push({
          id: `sec-${s.name}-${s.lineNum}`,
          name: s.name,
          lineNum: s.lineNum
        });
      }
    }

    // 3. Paragraphs from smeDetails
    if (currentFile.smeDetails?.paragraphsList) {
      for (const p of currentFile.smeDetails.paragraphsList) {
        paragraphs.push({
          id: `para-${p.name}-${p.lineNum}`,
          name: p.name,
          lineNum: p.lineNum
        });
      }
    }

    // 4. External Calls
    if (currentFile.calls) {
      for (const c of currentFile.calls) {
        calls.push({
          id: `call-${c.target}-${c.lineNum}`,
          name: `${c.type?.startsWith('CICS') ? 'CICS LINK' : 'CALL'} '${c.target}'`,
          target: c.target,
          lineNum: c.lineNum,
          dynamic: c.dynamic
        });
      }
    }

    // 5. Copybooks
    if (currentFile.copybooks) {
      for (const cb of currentFile.copybooks) {
        copybooks.push({
          id: `cb-${cb.name}-${cb.lineNum}`,
          name: `COPY ${cb.name}`,
          target: cb.name,
          lineNum: cb.lineNum
        });
      }
    }

    // 6. SQL Operations
    if (currentFile.sqlOps) {
      for (const op of currentFile.sqlOps) {
        sqlOps.push({
          id: `sql-${op.operation}-${op.lineNum}`,
          name: `EXEC SQL ${op.operation} (${op.tables?.join(', ') || 'TABLE'})`,
          lineNum: op.lineNum
        });
      }
    }

    // 7. JCL Specific Symbols
    if (currentFile.smeDetails?.stepsList) {
      for (const st of currentFile.smeDetails.stepsList) {
        jclSteps.push({
          id: `step-${st.stepName}-${st.lineNum}`,
          name: `${st.stepName} (PGM=${st.pgmName})`,
          lineNum: st.lineNum
        });
      }
    }

    if (currentFile.smeDetails?.ddList) {
      for (const d of currentFile.smeDetails.ddList) {
        jclDd.push({
          id: `dd-${d.ddName}-${d.lineNum}`,
          name: `${d.ddName} -> ${d.dsn}`,
          lineNum: d.lineNum
        });
      }
    }

    const totalSymbols = divisions.length + sections.length + paragraphs.length + calls.length + copybooks.length + sqlOps.length + jclSteps.length + jclDd.length;

    return {
      divisions,
      sections,
      paragraphs,
      calls,
      copybooks,
      sqlOps,
      jclSteps,
      jclDd,
      totalSymbols
    };
  }, [currentFile]);

  // Filter symbols based on search term
  const filterList = (items) => {
    if (!filterText || !filterText.trim()) return items;
    const q = filterText.trim().toLowerCase();
    return items.filter(it => it.name.toLowerCase().includes(q));
  };

  if (!isOpen) {
    return (
      <aside className="ide-outline-collapsed">
        <button
          onClick={onToggleOpen}
          className="ide-outline-collapsed-btn"
          title="Open Program Outline"
        >
          <PanelRightOpen size={16} />
          <span className="ide-outline-vertical-text">Outline</span>
        </button>
      </aside>
    );
  }

  const isCurrentSymbolActive = (lineNum) => {
    return selectedLine === lineNum;
  };

  return (
    <aside className="ide-outline-panel">
      {/* 1. Outline Header */}
      <div className="ide-outline-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListTree size={14} color="var(--accent-blue)" />
          <span className="ide-outline-title">PROGRAM OUTLINE</span>
          {outline?.totalSymbols > 0 && (
            <span className="ide-outline-badge">{outline.totalSymbols}</span>
          )}
        </div>

        <button
          onClick={onToggleOpen}
          className="ide-outline-action-btn"
          title="Collapse Outline Panel"
        >
          <PanelRightClose size={14} />
        </button>
      </div>

      {/* 2. Symbol Filter Search Input */}
      <div className="ide-outline-search-wrap">
        <div className="ide-outline-search-box">
          <Search size={12} className="ide-outline-search-icon" />
          <input
            type="text"
            placeholder="Filter symbols..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="ide-outline-search-input"
          />
          {filterText && (
            <button onClick={() => setFilterText('')} className="ide-outline-search-clear">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Symbol Hierarchy Tree */}
      <div className="ide-outline-scroll">
        {!outline || outline.totalSymbols === 0 ? (
          <div className="ide-outline-empty">
            <Code2 size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p>No symbols parsed for this file.</p>
          </div>
        ) : (
          <div className="ide-outline-tree">
            {/* A. Divisions */}
            {outline.divisions.length > 0 && filterList(outline.divisions).length > 0 && (
              <div className="ide-outline-group">
                <button onClick={() => toggleGroup('divisions')} className="ide-outline-group-hdr">
                  <span className="ide-outline-chevron">
                    {groupOpen.divisions ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <Bookmark size={13} color="var(--accent-indigo)" />
                  <span className="ide-outline-group-title">DIVISIONS</span>
                  <span className="ide-outline-group-count">{filterList(outline.divisions).length}</span>
                </button>

                {groupOpen.divisions && (
                  <div className="ide-outline-group-items">
                    {filterList(outline.divisions).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectLine(item.lineNum)}
                        className={`ide-outline-item ${isCurrentSymbolActive(item.lineNum) ? 'active' : ''}`}
                        title={`${item.name} at line ${item.lineNum}`}
                      >
                        <span className="ide-outline-item-name">{item.name}</span>
                        <span className="ide-outline-item-line">L{item.lineNum}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* B. Sections / Procedures */}
            {outline.sections.length > 0 && filterList(outline.sections).length > 0 && (
              <div className="ide-outline-group">
                <button onClick={() => toggleGroup('sections')} className="ide-outline-group-hdr">
                  <span className="ide-outline-chevron">
                    {groupOpen.sections ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <Layers size={13} color="var(--accent-blue)" />
                  <span className="ide-outline-group-title">SECTIONS</span>
                  <span className="ide-outline-group-count">{filterList(outline.sections).length}</span>
                </button>

                {groupOpen.sections && (
                  <div className="ide-outline-group-items">
                    {filterList(outline.sections).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectLine(item.lineNum)}
                        className={`ide-outline-item ${isCurrentSymbolActive(item.lineNum) ? 'active' : ''}`}
                        title={`${item.name} SECTION at line ${item.lineNum}`}
                      >
                        <span className="ide-outline-item-name">{item.name}</span>
                        <span className="ide-outline-item-line">L{item.lineNum}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* C. Paragraphs */}
            {outline.paragraphs.length > 0 && filterList(outline.paragraphs).length > 0 && (
              <div className="ide-outline-group">
                <button onClick={() => toggleGroup('paragraphs')} className="ide-outline-group-hdr">
                  <span className="ide-outline-chevron">
                    {groupOpen.paragraphs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <Hash size={13} color="var(--accent-emerald)" />
                  <span className="ide-outline-group-title">PARAGRAPHS</span>
                  <span className="ide-outline-group-count">{filterList(outline.paragraphs).length}</span>
                </button>

                {groupOpen.paragraphs && (
                  <div className="ide-outline-group-items">
                    {filterList(outline.paragraphs).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectLine(item.lineNum)}
                        className={`ide-outline-item ${isCurrentSymbolActive(item.lineNum) ? 'active' : ''}`}
                        title={`Paragraph ${item.name} at line ${item.lineNum}`}
                      >
                        <span className="ide-outline-item-name">{item.name}</span>
                        <span className="ide-outline-item-line">L{item.lineNum}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* D. External CALLs */}
            {outline.calls.length > 0 && filterList(outline.calls).length > 0 && (
              <div className="ide-outline-group">
                <button onClick={() => toggleGroup('calls')} className="ide-outline-group-hdr">
                  <span className="ide-outline-chevron">
                    {groupOpen.calls ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <GitFork size={13} color="var(--accent-amber)" />
                  <span className="ide-outline-group-title">CALLS</span>
                  <span className="ide-outline-group-count">{filterList(outline.calls).length}</span>
                </button>

                {groupOpen.calls && (
                  <div className="ide-outline-group-items">
                    {filterList(outline.calls).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectLine(item.lineNum)}
                        className={`ide-outline-item ${isCurrentSymbolActive(item.lineNum) ? 'active' : ''}`}
                        title={`${item.name} at line ${item.lineNum}`}
                      >
                        <span className="ide-outline-item-name">{item.name}</span>
                        <span className="ide-outline-item-line">L{item.lineNum}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* E. Included Copybooks */}
            {outline.copybooks.length > 0 && filterList(outline.copybooks).length > 0 && (
              <div className="ide-outline-group">
                <button onClick={() => toggleGroup('copybooks')} className="ide-outline-group-hdr">
                  <span className="ide-outline-chevron">
                    {groupOpen.copybooks ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <FileText size={13} color="var(--accent-purple)" />
                  <span className="ide-outline-group-title">COPYBOOKS</span>
                  <span className="ide-outline-group-count">{filterList(outline.copybooks).length}</span>
                </button>

                {groupOpen.copybooks && (
                  <div className="ide-outline-group-items">
                    {filterList(outline.copybooks).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectLine(item.lineNum)}
                        className={`ide-outline-item ${isCurrentSymbolActive(item.lineNum) ? 'active' : ''}`}
                        title={`${item.name} at line ${item.lineNum}`}
                      >
                        <span className="ide-outline-item-name">{item.name}</span>
                        <span className="ide-outline-item-line">L{item.lineNum}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* F. SQL Operations */}
            {outline.sqlOps.length > 0 && filterList(outline.sqlOps).length > 0 && (
              <div className="ide-outline-group">
                <button onClick={() => toggleGroup('sql')} className="ide-outline-group-hdr">
                  <span className="ide-outline-chevron">
                    {groupOpen.sql ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <Database size={13} color="var(--accent-rose)" />
                  <span className="ide-outline-group-title">SQL OPERATIONS</span>
                  <span className="ide-outline-group-count">{filterList(outline.sqlOps).length}</span>
                </button>

                {groupOpen.sql && (
                  <div className="ide-outline-group-items">
                    {filterList(outline.sqlOps).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectLine(item.lineNum)}
                        className={`ide-outline-item ${isCurrentSymbolActive(item.lineNum) ? 'active' : ''}`}
                        title={`${item.name} at line ${item.lineNum}`}
                      >
                        <span className="ide-outline-item-name">{item.name}</span>
                        <span className="ide-outline-item-line">L{item.lineNum}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* G. JCL EXEC Steps */}
            {outline.jclSteps.length > 0 && filterList(outline.jclSteps).length > 0 && (
              <div className="ide-outline-group">
                <button onClick={() => toggleGroup('jclSteps')} className="ide-outline-group-hdr">
                  <span className="ide-outline-chevron">
                    {groupOpen.jclSteps ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <Terminal size={13} color="var(--accent-amber)" />
                  <span className="ide-outline-group-title">JCL STEPS</span>
                  <span className="ide-outline-group-count">{filterList(outline.jclSteps).length}</span>
                </button>

                {groupOpen.jclSteps && (
                  <div className="ide-outline-group-items">
                    {filterList(outline.jclSteps).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectLine(item.lineNum)}
                        className={`ide-outline-item ${isCurrentSymbolActive(item.lineNum) ? 'active' : ''}`}
                        title={`JCL Step: ${item.name} at line ${item.lineNum}`}
                      >
                        <span className="ide-outline-item-name">{item.name}</span>
                        <span className="ide-outline-item-line">L{item.lineNum}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* H. JCL DD Statements */}
            {outline.jclDd.length > 0 && filterList(outline.jclDd).length > 0 && (
              <div className="ide-outline-group">
                <button onClick={() => toggleGroup('jclDd')} className="ide-outline-group-hdr">
                  <span className="ide-outline-chevron">
                    {groupOpen.jclDd ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <FileText size={13} color="var(--text-muted)" />
                  <span className="ide-outline-group-title">DD STATEMENTS</span>
                  <span className="ide-outline-group-count">{filterList(outline.jclDd).length}</span>
                </button>

                {groupOpen.jclDd && (
                  <div className="ide-outline-group-items">
                    {filterList(outline.jclDd).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectLine(item.lineNum)}
                        className={`ide-outline-item ${isCurrentSymbolActive(item.lineNum) ? 'active' : ''}`}
                        title={`DD Statement: ${item.name} at line ${item.lineNum}`}
                      >
                        <span className="ide-outline-item-name">{item.name}</span>
                        <span className="ide-outline-item-line">L{item.lineNum}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Outline Footer Info */}
      <div className="ide-outline-footer">
        <span>Click symbol to navigate code</span>
      </div>
    </aside>
  );
}
