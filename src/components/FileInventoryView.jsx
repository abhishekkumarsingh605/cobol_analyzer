import React, { useState, useMemo } from 'react';
import { 
  FolderTree, 
  FileCode, 
  FileText, 
  Terminal, 
  File, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Calendar, 
  HardDrive, 
  Layers, 
  Code2, 
  Activity, 
  ListTree,
  ExternalLink,
  Table as TableIcon
} from 'lucide-react';

export default function FileInventoryView({ fileInventory, parsedFiles, onSelectFileAndLine }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedFileForSme, setSelectedFileForSme] = useState(null);
  const [expandedDirs, setExpandedDirs] = useState({ 'root': true, 'cbl': true, 'cpy': true, 'jcl': true, 'sql': true });

  const { categories, extensionBreakdown, tree, totalFiles, totalSizeBytes, totalSizeFormatted, totalLines, totalCodeLines } = fileInventory;

  // Toggle directory in tree
  const toggleDir = (dirPath) => {
    setExpandedDirs(prev => {
      const current = prev[dirPath] !== false;
      return {
        ...prev,
        [dirPath]: !current
      };
    });
  };

  const expandAll = () => {
    const all = { 'root': true };
    const traverse = (node) => {
      if (!node) return;
      if (node.isDirectory) {
        if (node.path) all[node.path] = true;
        if (node.name) all[node.name] = true;
        all[node.path || node.name] = true;
        node.children?.forEach(traverse);
      }
    };
    if (tree) traverse(tree);
    setExpandedDirs(all);
  };

  const collapseAll = () => {
    const collapsed = { 'root': true };
    const traverse = (node) => {
      if (!node) return;
      if (node.isDirectory) {
        if (node.path) collapsed[node.path] = false;
        if (node.name) collapsed[node.name] = false;
        collapsed[node.path || node.name] = false;
        node.children?.forEach(traverse);
      }
    };
    if (tree) traverse(tree);
    collapsed['root'] = true;
    setExpandedDirs(collapsed);
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Title & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Codebase File Inventory & Mainframe SME Metrics</h2>
            <span className="badge badge-info">{totalFiles} Total Files</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Hierarchical tree inventory with file sizes, last modified timestamps, COBOL paragraphs/procedures, and extension-wise line counts.
          </p>
        </div>
      </div>

      {/* 4 Category Summary KPI Cards (Extension-wise & Line counts) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* COBOL Files Card */}
        <div className="glass-card" style={{ padding: '20px', borderTop: '3px solid var(--accent-blue)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>COBOL PROGRAMS</span>
            <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.15)' }}>
              <FileCode size={20} color="var(--accent-blue)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
            {categories.cobol.count} <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-dim)' }}>files</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div><strong>{categories.cobol.totalLines}</strong> Total Lines ({categories.cobol.codeLines} Code)</div>
            <div style={{ color: 'var(--accent-blue)' }}>
              {categories.cobol.paragraphsCount} Paragraphs • {categories.cobol.sectionsCount} Sections
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Size: {categories.cobol.sizeFormatted}</div>
          </div>
        </div>

        {/* Copybook Files Card */}
        <div className="glass-card" style={{ padding: '20px', borderTop: '3px solid var(--accent-purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>COPYBOOK DATA LAYOUTS</span>
            <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'rgba(168, 85, 247, 0.15)' }}>
              <FileText size={20} color="var(--accent-purple)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
            {categories.copybook.count} <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-dim)' }}>files</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div><strong>{categories.copybook.totalLines}</strong> Total Lines ({categories.copybook.codeLines} Code)</div>
            <div style={{ color: 'var(--accent-purple)' }}>Shared structures & DCLGEN tables</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Size: {categories.copybook.sizeFormatted}</div>
          </div>
        </div>

        {/* JCL Files Card */}
        <div className="glass-card" style={{ padding: '20px', borderTop: '3px solid var(--accent-amber)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>JCL BATCH JOBS</span>
            <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)' }}>
              <Terminal size={20} color="var(--accent-amber)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
            {categories.jcl.count} <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-dim)' }}>jobs</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div><strong>{categories.jcl.totalLines}</strong> Lines of JCL</div>
            <div style={{ color: 'var(--accent-amber)' }}>
              {categories.jcl.stepsCount} EXEC Steps • Batch Controller
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Size: {categories.jcl.sizeFormatted}</div>
          </div>
        </div>

        {/* Other Files Card */}
        <div className="glass-card" style={{ padding: '20px', borderTop: '3px solid var(--accent-emerald)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>OTHER ARTIFACTS</span>
            <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)' }}>
              <File size={20} color="var(--accent-emerald)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
            {categories.other.count} <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-dim)' }}>files</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div><strong>{categories.other.totalLines}</strong> Lines (SQL, DDL, BMS, etc.)</div>
            <div style={{ color: 'var(--accent-emerald)' }}>Total footprint: {totalSizeFormatted}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Size: {categories.other.sizeFormatted}</div>
          </div>
        </div>
      </div>

      {/* Extension-Wise Detailed Breakdown Table */}
      <div className="glass-card" style={{ padding: '22px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <TableIcon size={18} color="var(--accent-blue)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Total Files & Line Counts (Extension-Wise)</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Extension</th>
                <th>Category</th>
                <th style={{ textAlign: 'center' }}>Total Files</th>
                <th style={{ textAlign: 'right' }}>Total Lines</th>
                <th style={{ textAlign: 'right' }}>Code Lines</th>
                <th style={{ textAlign: 'right' }}>Comment Lines</th>
                <th style={{ textAlign: 'right' }}>Total Size</th>
                <th style={{ textAlign: 'right' }}>% of Codebase</th>
              </tr>
            </thead>
            <tbody>
              {extensionBreakdown.map(ext => (
                <tr key={ext.extension}>
                  <td>
                    <code style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff' }}>
                      {ext.extension}
                    </code>
                  </td>
                  <td>
                    <span className={`badge ${ext.category === 'COBOL' ? 'badge-info' : ext.category === 'COPYBOOK' ? 'badge-purple' : ext.category === 'JCL' ? 'badge-medium' : 'badge-low'}`}>
                      {ext.category}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>
                    {ext.count}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {ext.totalLines}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-emerald)' }}>
                    {ext.codeLines}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-dim)' }}>
                    {ext.commentLines}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {ext.sizeFormatted}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <span>{ext.percentageOfCodebase}%</span>
                      <div style={{ width: '50px', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${ext.percentageOfCodebase}%`, height: '100%', background: 'var(--accent-blue)' }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Grid: Codebase File Tree + Mainframe SME Details Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedFileForSme ? '1fr 380px' : '1fr', gap: '24px' }}>
        {/* Left Column: Interactive Directory Tree */}
        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderTree size={20} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Codebase File Inventory Tree</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Search inside tree */}
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '6px 10px 6px 30px',
                    fontSize: '0.8rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    width: '180px'
                  }}
                />
              </div>

              <button 
                id="btn-inv-expand-all"
                onClick={expandAll} 
                className="btn-secondary" 
                style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Expand all directories"
              >
                <ListTree size={13} />
                <span>Expand All</span>
              </button>
              <button 
                id="btn-inv-collapse-all"
                onClick={collapseAll} 
                className="btn-secondary" 
                style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Collapse all directories"
              >
                <Folder size={13} />
                <span>Collapse All</span>
              </button>
            </div>
          </div>

          {/* Tree View Canvas */}
          <div style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            maxHeight: '600px',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)'
          }}>
            <TreeNode
              node={tree}
              level={0}
              searchTerm={searchTerm}
              expandedDirs={expandedDirs}
              onToggleDir={toggleDir}
              selectedFile={selectedFileForSme}
              onSelectFile={(f) => setSelectedFileForSme(f)}
              onSelectFileAndLine={onSelectFileAndLine}
            />
          </div>
        </div>

        {/* Right Column: Mainframe SME Details Panel */}
        {selectedFileForSme && (
          <div className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className={`badge ${selectedFileForSme.category === 'COBOL' ? 'badge-info' : selectedFileForSme.category === 'COPYBOOK' ? 'badge-purple' : selectedFileForSme.category === 'JCL' ? 'badge-medium' : 'badge-low'}`}>
                  {selectedFileForSme.category}
                </span>
                <code style={{ fontSize: '1.15rem', fontWeight: '800', display: 'block', marginTop: '6px', color: '#ffffff' }}>
                  {selectedFileForSme.name}
                </code>
              </div>
              <button onClick={() => setSelectedFileForSme(null)} style={{ color: 'var(--text-dim)', padding: '4px' }}>✕</button>
            </div>

            {/* Metadata (Size & Last Modified Date) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>File Size:</span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedFileForSme.sizeFormatted} ({selectedFileForSme.sizeBytes.toLocaleString()} bytes)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Modified:</span>
                <strong style={{ color: 'var(--text-main)' }}>{new Date(selectedFileForSme.lastModified).toLocaleDateString()} {new Date(selectedFileForSme.lastModified).toLocaleTimeString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Path:</span>
                <code style={{ color: 'var(--accent-blue)' }}>{selectedFileForSme.path}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lines of Code:</span>
                <span><strong>{selectedFileForSme.codeLines}</strong> code / {selectedFileForSme.totalLines} total</span>
              </div>
            </div>

            {/* COBOL SME Details */}
            {selectedFileForSme.category === 'COBOL' && selectedFileForSme.smeDetails && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Paragraphs and Procedures Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(56, 189, 248, 0.3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PARAGRAPHS</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-blue)' }}>
                      {selectedFileForSme.smeDetails.paragraphsCount}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(168, 85, 247, 0.3)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SECTIONS</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-purple)' }}>
                      {selectedFileForSme.smeDetails.sectionsCount}
                    </div>
                  </div>
                </div>

                {/* Paragraphs List */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
                    Paragraph Names ({selectedFileForSme.smeDetails.paragraphsCount})
                  </div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedFileForSme.smeDetails.paragraphsList.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', fontSize: '0.75rem' }}>
                        <code style={{ color: 'var(--accent-blue)' }}>{p.name}</code>
                        <span style={{ color: 'var(--text-dim)' }}>L{p.lineNum}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sections List */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
                    Procedure Sections ({selectedFileForSme.smeDetails.sectionsCount})
                  </div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedFileForSme.smeDetails.sectionsList.map((s, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', fontSize: '0.75rem' }}>
                        <code style={{ color: 'var(--accent-purple)' }}>{s.name}</code>
                        <span style={{ color: 'var(--text-dim)' }}>L{s.lineNum}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mainframe Complexity Score */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cyclomatic Complexity</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>Score: {selectedFileForSme.smeDetails.cyclomaticComplexity}</div>
                  </div>
                  <span className={`badge ${selectedFileForSme.smeDetails.complexityRating === 'LOW' ? 'badge-success' : selectedFileForSme.smeDetails.complexityRating === 'MODERATE' ? 'badge-medium' : 'badge-critical'}`}>
                    {selectedFileForSme.smeDetails.complexityRating}
                  </span>
                </div>
              </div>
            )}

            {/* JCL SME Details */}
            {selectedFileForSme.category === 'JCL' && selectedFileForSme.smeDetails && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JOB NAME</div>
                  <code style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-amber)' }}>
                    {selectedFileForSme.smeDetails.jobName}
                  </code>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
                    EXEC Steps ({selectedFileForSme.smeDetails.stepsCount})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedFileForSme.smeDetails.stepsList.map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', fontSize: '0.8rem' }}>
                        <span>Step: <strong>{step.stepName}</strong></span>
                        <code style={{ color: 'var(--accent-blue)' }}>PGM={step.pgmName}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
                    DD Cards / Datasets ({selectedFileForSme.smeDetails.ddStatementsCount})
                  </div>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedFileForSme.smeDetails.ddList.map((dd, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', fontSize: '0.75rem' }}>
                        <code style={{ color: 'var(--accent-amber)' }}>{dd.ddName}</code>
                        <span style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{dd.dsn}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action: Open in Source Inspector */}
            <button
              onClick={() => onSelectFileAndLine && onSelectFileAndLine(selectedFileForSme.filename, 1)}
              className="btn-primary"
              style={{ marginTop: 'auto', justifyContent: 'center' }}
            >
              <Code2 size={16} />
              <span>Inspect Source Code</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Recursive Tree Node component with directory and file support
 */
function TreeNode({ node, level, searchTerm, expandedDirs, onToggleDir, selectedFile, onSelectFile, onSelectFileAndLine }) {
  if (!node) return null;

  // Root wrapper
  if (level === 0 && node.name === 'root') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {node.children.map((child, idx) => (
          <TreeNode
            key={idx}
            node={child}
            level={level + 1}
            searchTerm={searchTerm}
            expandedDirs={expandedDirs}
            onToggleDir={onToggleDir}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            onSelectFileAndLine={onSelectFileAndLine}
          />
        ))}
      </div>
    );
  }

  // Directory Node
  if (node.isDirectory) {
    const dirKey = node.path || node.name;
    const isExpanded = expandedDirs[dirKey] !== false;

    return (
      <div style={{ marginLeft: level > 1 ? '16px' : '0px', marginTop: '2px' }}>
        <button
          onClick={() => onToggleDir(dirKey)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 8px',
            borderRadius: 'var(--radius-sm)',
            width: '100%',
            textAlign: 'left',
            color: 'var(--text-main)',
            fontSize: '0.85rem',
            background: 'transparent'
          }}
        >
          {isExpanded ? <ChevronDown size={14} color="var(--text-dim)" /> : <ChevronRight size={14} color="var(--text-dim)" />}
          {isExpanded ? <FolderOpen size={16} color="var(--accent-amber)" /> : <Folder size={16} color="var(--accent-amber)" />}
          <span style={{ fontWeight: '600' }}>{node.name}/</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
            {node.totalFiles} files • {node.totalSizeFormatted}
          </span>
        </button>

        {isExpanded && node.children && (
          <div style={{ borderLeft: '1px dashed rgba(255, 255, 255, 0.1)', marginLeft: '8px', paddingLeft: '8px' }}>
            {node.children.map((child, idx) => (
              <TreeNode
                key={idx}
                node={child}
                level={level + 1}
                searchTerm={searchTerm}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                onSelectFileAndLine={onSelectFileAndLine}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File Node
  const matchesSearch = !searchTerm || node.name.toLowerCase().includes(searchTerm.toLowerCase());
  if (!matchesSearch) return null;

  const isSelected = selectedFile?.name === node.name;
  const isCobol = node.category === 'COBOL';
  const isCopybook = node.category === 'COPYBOOK';
  const isJcl = node.category === 'JCL';

  return (
    <div
      onClick={() => onSelectFile(node)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 8px',
        borderRadius: 'var(--radius-sm)',
        marginLeft: level > 1 ? '16px' : '0px',
        fontSize: '0.8rem',
        background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
        border: isSelected ? '1px solid var(--accent-blue)' : '1px solid transparent',
        cursor: 'pointer',
        transition: 'background 0.15s ease'
      }}
    >
      {isCobol ? <FileCode size={15} color="var(--accent-blue)" /> : isCopybook ? <FileText size={15} color="var(--accent-purple)" /> : isJcl ? <Terminal size={15} color="var(--accent-amber)" /> : <File size={15} color="var(--accent-emerald)" />}
      
      <span style={{ color: isSelected ? '#ffffff' : 'var(--text-main)', fontWeight: isSelected ? '600' : '400' }}>
        {node.name}
      </span>

      {/* Mainframe SME Badges */}
      {isCobol && node.smeDetails && (
        <span style={{ display: 'inline-flex', gap: '4px', marginLeft: '6px' }}>
          <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
            {node.smeDetails.paragraphsCount}P / {node.smeDetails.sectionsCount}S
          </span>
        </span>
      )}

      {isJcl && node.smeDetails && (
        <span className="badge badge-medium" style={{ fontSize: '0.65rem', padding: '1px 5px', marginLeft: '6px' }}>
          {node.smeDetails.stepsCount} Steps
        </span>
      )}

      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 'auto', display: 'flex', gap: '10px' }}>
        <span>{node.codeLines}L</span>
        <span>{node.sizeFormatted}</span>
        <span>{new Date(node.lastModified).toLocaleDateString()}</span>
      </span>
    </div>
  );
}
