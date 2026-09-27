import React, { useState, useMemo } from 'react';
import { 
  AlertOctagon, 
  Search, 
  Filter, 
  Download, 
  FileCode, 
  ExternalLink, 
  CheckCircle2, 
  Code,
  Sparkles,
  Info
} from 'lucide-react';

export default function MissingComponentsView({ missingComponents, onSelectFileAndLine }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState(null);

  // Filtered list
  const filtered = useMemo(() => {
    return missingComponents.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.impact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.callers.some(c => c.program.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = 
        typeFilter === 'ALL' ||
        (typeFilter === 'COPYBOOK' && item.type.toLowerCase().includes('copybook')) ||
        (typeFilter === 'PROGRAM' && item.type.toLowerCase().includes('subprogram')) ||
        (typeFilter === 'TABLE' && item.type.toLowerCase().includes('table'));

      const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;

      return matchesSearch && matchesType && matchesSeverity;
    });
  }, [missingComponents, searchTerm, typeFilter, severityFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Component Name', 'Type', 'Severity', 'Impact', 'Referencing Programs', 'Line Numbers', 'Recommendation'];
    const rows = filtered.map(m => [
      m.name,
      m.type,
      m.severity,
      `"${m.impact}"`,
      `"${m.callers.map(c => c.program).join(', ')}"`,
      `"${m.callers.map(c => `${c.program}:${c.lineNum}`).join(', ')}"`,
      `"${m.recommendation}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `missing_components_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Title & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Missing Components Identification</h2>
            <span className="badge badge-critical">{missingComponents.length} Discovered</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Comprehensive inventory of missing copybooks, unresolved external subprograms, and undeclared database entities.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportCSV} className="btn-secondary" id="btn-export-missing-csv">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          flex: '1 1 280px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-dim)' }} />
          <input
            id="input-search-missing"
            type="text"
            placeholder="Search by component name, caller, impact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Type:</span>
          <select
            id="select-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem'
            }}
          >
            <option value="ALL">All Types</option>
            <option value="COPYBOOK">Copybooks & Includes</option>
            <option value="PROGRAM">Subprograms & APIs</option>
            <option value="TABLE">Database Entities</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Severity:</span>
          <select
            id="select-severity-filter"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem'
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
          Showing <strong>{filtered.length}</strong> of {missingComponents.length} items
        </div>
      </div>

      {/* Main Table View */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="modern-table">
          <thead>
            <tr>
              <th style={{ width: '220px' }}>Component Name</th>
              <th style={{ width: '150px' }}>Type</th>
              <th style={{ width: '110px' }}>Severity</th>
              <th>Impact / Modernization Risk</th>
              <th>Referenced By (Callers)</th>
              <th style={{ width: '130px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No missing components match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id}>
                  {/* Name */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertOctagon size={16} color={item.severity === 'CRITICAL' ? 'var(--accent-rose)' : item.severity === 'HIGH' ? 'var(--accent-amber)' : 'var(--accent-blue)'} />
                      <code style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>
                        {item.name}
                      </code>
                    </div>
                  </td>

                  {/* Type */}
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      {item.type}
                    </span>
                  </td>

                  {/* Severity */}
                  <td>
                    <span className={`badge ${item.severity === 'CRITICAL' ? 'badge-critical' : item.severity === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>
                      {item.severity}
                    </span>
                  </td>

                  {/* Impact */}
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '3px' }}>
                      {item.impact}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      💡 {item.recommendation}
                    </div>
                  </td>

                  {/* Callers */}
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {item.callers.map((caller, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSelectFileAndLine && onSelectFileAndLine(caller.file, caller.lineNum)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--accent-blue)',
                            cursor: 'pointer'
                          }}
                          title={`Click to view ${caller.file} at line ${caller.lineNum}`}
                        >
                          <span>{caller.program}</span>
                          <span style={{ color: 'var(--text-dim)' }}>:L{caller.lineNum}</span>
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Action */}
                  <td>
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Inspect Stub
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stub / Remediation Drawer Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ maxWidth: '650px', width: '100%', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Code size={20} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '600' }}>
                  Remediation & Stub for {selectedItem.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                style={{ fontSize: '1.25rem', color: 'var(--text-dim)', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>Impact Analysis</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{selectedItem.impact}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>Recommended Modernization Action</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                {selectedItem.recommendation}
              </p>
            </div>

            {/* Generated COBOL or Schema Stub */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Synthesized Source Stub</span>
                <button
                  onClick={() => {
                    const text = selectedItem.type.includes('Copybook')
                      ? `* SYNTHESIZED COPYBOOK STUB FOR ${selectedItem.name}\n 01  WS-${selectedItem.name}-DATA.\n     05  WS-${selectedItem.name}-ID   PIC 9(10).\n     05  WS-${selectedItem.name}-STATUS PIC X(2).`
                      : `       IDENTIFICATION DIVISION.\n       PROGRAM-ID. ${selectedItem.name}.\n       ENVIRONMENT DIVISION.\n       DATA DIVISION.\n       LINKAGE SECTION.\n       01 LS-PARAM PIC X(100).\n       PROCEDURE DIVISION USING LS-PARAM.\n           DISPLAY 'MOCK CALLED: ${selectedItem.name}'\n           GOBACK.`;
                    navigator.clipboard.writeText(text);
                  }}
                  style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Sparkles size={12} />
                  Copy Stub
                </button>
              </div>

              <pre style={{
                background: '#070a10',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#38bdf8',
                overflowX: 'auto',
                border: '1px solid var(--border-color)'
              }}>
                {selectedItem.type.includes('Copybook') ? (
`* SYNTHESIZED COPYBOOK STUB FOR ${selectedItem.name}
 01  WS-${selectedItem.name}-DATA.
     05  WS-${selectedItem.name}-ID      PIC 9(10).
     05  WS-${selectedItem.name}-STATUS  PIC X(2).`
                ) : (
`       IDENTIFICATION DIVISION.
       PROGRAM-ID. ${selectedItem.name}.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       LINKAGE SECTION.
       01  LS-PARAM-DATA       PIC X(100).
       PROCEDURE DIVISION USING LS-PARAM-DATA.
       0000-ENTRY.
           DISPLAY 'STUB EXECUTED: ${selectedItem.name}'
           GOBACK.`
                )}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedItem(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
