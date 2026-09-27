import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  AlertOctagon, 
  Database, 
  GitFork, 
  CheckCircle2 
} from 'lucide-react';

export default function ReportExportModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;
  const { metrics, missingComponents, databaseSchemas, crudMatrix, graph, callTrees } = data;

  // Export as Markdown
  const handleExportMarkdown = () => {
    let md = `# COBOL Analyzer - Enterprise Architecture Assessment Report\n`;
    md += `*Generated: ${new Date().toLocaleString()}*\n\n`;

    md += `## 1. Executive Summary\n`;
    md += `- **Total Files Analyzed**: ${metrics.totalFiles}\n`;
    md += `- **Total Programs**: ${metrics.totalPrograms}\n`;
    md += `- **Total Copybooks**: ${metrics.totalCopybooks}\n`;
    md += `- **Lines of Code (LOC)**: ${metrics.totalLoc}\n`;
    md += `- **Identified Database Tables**: ${metrics.totalDbTables}\n`;
    md += `- **Total Missing Components**: ${metrics.totalMissing}\n`;
    md += `- **Modernization Readiness Score**: ${metrics.resolvedRate}%\n\n`;

    md += `## 2. Missing Components\n`;
    md += `| Component Name | Type | Severity | Impact | Callers / References |\n`;
    md += `|---|---|---|---|---|\n`;
    for (const m of missingComponents) {
      md += `| \`${m.name}\` | ${m.type} | ${m.severity} | ${m.impact} | ${m.callers.map(c => `${c.program}:L${c.lineNum}`).join(', ')} |\n`;
    }
    md += `\n`;

    md += `## 3. Database Entities & Schemas (${databaseSchemas.length} Tables)\n`;
    for (const s of databaseSchemas) {
      md += `### Table: \`${s.tableName}\` (${s.type || (s.declared ? 'Declared Table' : 'Inferred from SQL')})\n`;
      if (s.sourceFile) md += `- **Source Definition**: \`${s.sourceFile}\`\n`;
      if (s.fullName && s.fullName !== s.tableName) md += `- **Dataset / Qualified Name**: \`${s.fullName}\`\n`;
      md += `- **Programs Accessing**: ${s.programsAccessing.length > 0 ? s.programsAccessing.join(', ') : 'Batch / Master'}\n`;
      md += `- **Operations**: ${s.operations.join(', ')}\n\n`;
      md += `\`\`\`sql\n${s.ddl}\n\`\`\`\n\n`;
    }

    md += `### CRUD Matrix\n`;
    md += `| Program | Table | Create (C) | Read (R) | Update (U) | Delete (D) |\n`;
    md += `|---|---|:---:|:---:|:---:|:---:|\n`;
    for (const c of crudMatrix) {
      md += `| \`${c.program}\` | \`${c.table}\` | ${c.C ? '✓' : '-'} | ${c.R ? '✓' : '-'} | ${c.U ? '✓' : '-'} | ${c.D ? '✓' : '-'} |\n`;
    }
    md += `\n`;

    md += `## 4. Application Flows & Call Chains\n`;
    md += `- **Root Entry Points**: ${graph.entryPoints.join(', ')}\n`;
    md += `- **Total Program Invocations**: ${metrics.totalCalls}\n\n`;
    md += `### Hierarchical Call Tree\n`;
    const formatTree = (node, indent = '') => {
      let res = `${indent}- **${node.name}** ${node.isMissing ? '*(MISSING TARGET)*' : ''}\n`;
      if (node.children) {
        for (const child of node.children) {
          res += formatTree(child, indent + '  ');
        }
      }
      return res;
    };
    for (const tree of callTrees) {
      md += formatTree(tree);
    }
    md += `\n`;

    if (data.fileInventory) {
      const inv = data.fileInventory;
      md += `## 5. File Inventory & Mainframe SME Metrics\n`;
      md += `### Summary by Category\n`;
      md += `- **COBOL Files**: ${inv.categories.cobol.count} files (${inv.categories.cobol.totalLines} lines, ${inv.categories.cobol.paragraphsCount} paragraphs, ${inv.categories.cobol.sectionsCount} sections, ${inv.categories.cobol.sizeFormatted})\n`;
      md += `- **Copybook Files**: ${inv.categories.copybook.count} files (${inv.categories.copybook.totalLines} lines, ${inv.categories.copybook.sizeFormatted})\n`;
      md += `- **JCL Batch Files**: ${inv.categories.jcl.count} files (${inv.categories.jcl.totalLines} lines, ${inv.categories.jcl.stepsCount} steps, ${inv.categories.jcl.sizeFormatted})\n`;
      md += `- **Other Files**: ${inv.categories.other.count} files (${inv.categories.other.totalLines} lines, ${inv.categories.other.sizeFormatted})\n\n`;

      md += `### Extension-Wise Breakdown\n`;
      md += `| Extension | Category | Files | Total Lines | Code Lines | Comment Lines | Total Size | % of Codebase |\n`;
      md += `|---|---|:---:|:---:|:---:|:---:|:---:|:---:|\n`;
      for (const ext of inv.extensionBreakdown) {
        md += `| \`${ext.extension}\` | ${ext.category} | ${ext.count} | ${ext.totalLines} | ${ext.codeLines} | ${ext.commentLines} | ${ext.sizeFormatted} | ${ext.percentageOfCodebase}% |\n`;
      }
      md += `\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cobol_modernization_report_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export as self-contained standalone HTML
  const handleExportHtml = () => {
    const reportHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>COBOL Modernization Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 1000px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #1e293b; margin-top: 32px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; }
    code { font-family: monospace; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; }
    pre { background: #0f172a; color: #38bdf8; padding: 14px; border-radius: 6px; overflow-x: auto; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #ffedd5; color: #9a3412; }
    .badge-medium { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <h1>COBOL Analyzer - Enterprise Architecture Assessment Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  
  <h2>1. Executive Modernization Metrics</h2>
  <ul>
    <li><strong>Total Files Analyzed:</strong> ${metrics.totalFiles}</li>
    <li><strong>Total Programs:</strong> ${metrics.totalPrograms}</li>
    <li><strong>Total Copybooks:</strong> ${metrics.totalCopybooks}</li>
    <li><strong>Total Lines of Code:</strong> ${metrics.totalLoc}</li>
    <li><strong>Database Tables Identified:</strong> ${metrics.totalDbTables}</li>
    <li><strong>Missing Components:</strong> ${metrics.totalMissing}</li>
    <li><strong>Readiness Score:</strong> ${metrics.resolvedRate}%</li>
  </ul>

  <h2>2. Missing Components Inventory</h2>
  <table>
    <thead>
      <tr><th>Component</th><th>Type</th><th>Severity</th><th>Impact</th><th>Referencing Callers</th></tr>
    </thead>
    <tbody>
      ${missingComponents.map(m => `
        <tr>
          <td><code>${m.name}</code></td>
          <td>${m.type}</td>
          <td><span class="badge ${m.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}">${m.severity}</span></td>
          <td>${m.impact}</td>
          <td>${m.callers.map(c => `${c.program}:L${c.lineNum}`).join(', ')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>3. Database Schemas</h2>
  ${databaseSchemas.map(s => `
    <h3>Table: <code>${s.tableName}</code> (${s.declared ? 'Declared DCLGEN' : 'Inferred'})</h3>
    <pre>${s.ddl}</pre>
  `).join('')}

  <h2>4. Application Call Chains & Entry Points</h2>
  <p><strong>Entry Points:</strong> ${graph.entryPoints.join(', ')}</p>
  <p><strong>Total Call Relationships:</strong> ${graph.edges.length}</p>
</body>
</html>`;

    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cobol_modernization_report_${Date.now()}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cobol_analysis_data_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-card" style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.15)' }}>
              <FileText size={20} color="var(--accent-blue)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>COBOL Analyzer - Architecture Assessment Report</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Consolidated audit report of missing dependencies, schemas, and call flows
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-dim)', padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Export full architecture audit for stakeholders & development teams:
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleExportHtml} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Download size={14} />
              <span>Download HTML</span>
            </button>
            <button onClick={handleExportMarkdown} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Download size={14} />
              <span>Download Markdown</span>
            </button>
            <button onClick={handleExportJson} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Download size={14} />
              <span>Download JSON</span>
            </button>
            <button onClick={() => window.print()} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Scrollable Report Body Preview */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {/* Executive Summary */}
          <div style={{ marginBottom: '28px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px', color: 'var(--accent-blue)' }}>
              1. Executive Summary & Readiness
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Files Analyzed</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{metrics.totalFiles}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Lines of Code</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{metrics.totalLoc}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Missing Components</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-rose)' }}>{metrics.totalMissing}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Readiness Score</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-emerald)' }}>{metrics.resolvedRate}%</div>
              </div>
            </div>
          </div>

          {/* Missing Components Table */}
          <div style={{ marginBottom: '28px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px', color: 'var(--accent-rose)' }}>
              2. Missing Components & Gaps ({missingComponents.length})
            </h4>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Referenced In</th>
                </tr>
              </thead>
              <tbody>
                {missingComponents.map(m => (
                  <tr key={m.id}>
                    <td><code>{m.name}</code></td>
                    <td>{m.type}</td>
                    <td>
                      <span className={`badge ${m.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>
                        {m.severity}
                      </span>
                    </td>
                    <td>{m.callers.map(c => `${c.program}:L${c.lineNum}`).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Database Schemas */}
          <div style={{ marginBottom: '28px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px', color: 'var(--accent-purple)' }}>
              3. Database Entities & Tables ({databaseSchemas.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {databaseSchemas.map(s => (
                <div key={s.tableName} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ fontSize: '0.95rem', fontWeight: '700', color: '#c084fc' }}>{s.tableName}</code>
                      <span className={`badge ${s.type.includes('Relational') ? 'badge-purple' : s.type.includes('VSAM') ? 'badge-emerald' : s.type.includes('IMS') ? 'badge-amber' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                        {s.type}
                      </span>
                    </div>
                    <span className="badge badge-purple">{s.columns.length} Columns</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {s.sourceFile ? `Source: ${s.sourceFile} • ` : ''}
                    Accessing: {s.programsAccessing.length > 0 ? s.programsAccessing.join(', ') : 'Batch / Master'} • 
                    Columns: {s.columns.slice(0, 6).map(c => c.name).join(', ')}{s.columns.length > 6 ? ` (+${s.columns.length - 6} more)` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Application Flows */}
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px', color: 'var(--accent-emerald)' }}>
              4. Application Call Chains & Entry Points
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Root Dispatcher(s): <strong>{graph.entryPoints.join(', ')}</strong> | Total Inter-program CALLs: <strong>{metrics.totalCalls}</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0, 0, 0, 0.2)' }}>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
