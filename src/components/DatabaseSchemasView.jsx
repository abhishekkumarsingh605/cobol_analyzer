import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Table as TableIcon, 
  Code, 
  Download, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  ArrowRight,
  Search,
  Filter,
  FileText,
  Key,
  ShieldCheck,
  Server
} from 'lucide-react';

export default function DatabaseSchemasView({ databaseSchemas = [], crudMatrix = [], onSelectFileAndLine }) {
  const [selectedTable, setSelectedTable] = useState(databaseSchemas[0]?.tableName || '');
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('columns'); // 'columns' | 'ddl' | 'indexes' | 'access'
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'DB2' | 'VSAM' | 'IMS'
  const [searchQuery, setSearchQuery] = useState('');
  const [crudSearch, setCrudSearch] = useState('');

  // Counts by entity type
  const counts = useMemo(() => {
    let db2 = 0;
    let vsam = 0;
    let ims = 0;
    databaseSchemas.forEach(s => {
      const type = (s.type || '').toUpperCase();
      if (type.includes('RELATIONAL') || type.includes('DB2')) db2++;
      else if (type.includes('VSAM')) vsam++;
      else if (type.includes('IMS')) ims++;
      else vsam++; // batch datasets count under VSAM/File entities
    });
    return { all: databaseSchemas.length, db2, vsam, ims };
  }, [databaseSchemas]);

  // Filtered tables list
  const filteredSchemas = useMemo(() => {
    return databaseSchemas.filter(s => {
      const type = (s.type || '').toUpperCase();
      const matchesType = typeFilter === 'ALL' ||
        (typeFilter === 'DB2' && (type.includes('RELATIONAL') || type.includes('DB2'))) ||
        (typeFilter === 'VSAM' && (type.includes('VSAM') || type.includes('ENTITY'))) ||
        (typeFilter === 'IMS' && type.includes('IMS'));

      if (!matchesType) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.tableName.toLowerCase().includes(q) ||
        (s.sourceFile && s.sourceFile.toLowerCase().includes(q)) ||
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.columns && s.columns.some(c => c.name.toLowerCase().includes(q)));
    });
  }, [databaseSchemas, typeFilter, searchQuery]);

  const currentSchema = databaseSchemas.find(s => s.tableName === selectedTable) || filteredSchemas[0] || databaseSchemas[0];

  // Filtered CRUD matrix
  const filteredCrud = useMemo(() => {
    if (!crudSearch.trim()) return crudMatrix;
    const q = crudSearch.toLowerCase();
    return crudMatrix.filter(c => c.program.toLowerCase().includes(q) || c.table.toLowerCase().includes(q));
  }, [crudMatrix, crudSearch]);

  // 1-Click Copy DDL
  const handleCopyDdl = () => {
    if (!currentSchema) return;
    navigator.clipboard.writeText(currentSchema.ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download all DDL
  const handleDownloadAllDdl = () => {
    const fullSql = `-- GENERATED ENTERPRISE DATABASE DDL SCHEMA FROM MAINFRAME ARTIFACTS\n` +
      `-- Total Tables & Entities: ${databaseSchemas.length}\n` +
      `-- Generated at: ${new Date().toISOString()}\n\n` +
      databaseSchemas.map(s => `-- Table: ${s.tableName} (${s.type || 'Entity'})\n${s.ddl}`).join('\n\n');

    const blob = new Blob([fullSql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mainframe_database_schemas_${Date.now()}.sql`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeClass = (typeStr = '') => {
    const upper = typeStr.toUpperCase();
    if (upper.includes('RELATIONAL') || upper.includes('DB2')) return 'badge-purple';
    if (upper.includes('VSAM')) return 'badge-emerald';
    if (upper.includes('IMS')) return 'badge-amber';
    return 'badge-info';
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Database Schemas & Data Entities</h2>
            <span className="badge badge-purple">{databaseSchemas.length} Entities Captured</span>
            <span className="badge badge-success">{crudMatrix.length} CRUD Paths Mapped</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Complete enterprise data layer: Relational DB2 DDL tables, VSAM KSDS indexed datasets, and IMS hierarchical databases with field picture layouts and CRUD matrices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleDownloadAllDdl} className="btn-accent" id="btn-download-all-ddl">
            <Download size={16} />
            <span>Download All DDL (.sql)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Table Selector + Right Schema Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left Column: Table List & Filter */}
        <div style={{ flex: '1 1 360px', maxWidth: '440px' }}>
          <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '12px', overflowX: 'auto' }}>
              <button
                onClick={() => setTypeFilter('ALL')}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: typeFilter === 'ALL' ? '700' : '400',
                  borderRadius: 'var(--radius-sm)',
                  background: typeFilter === 'ALL' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                  color: typeFilter === 'ALL' ? '#ffffff' : 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}
              >
                All ({counts.all})
              </button>
              <button
                onClick={() => setTypeFilter('DB2')}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: typeFilter === 'DB2' ? '700' : '400',
                  borderRadius: 'var(--radius-sm)',
                  background: typeFilter === 'DB2' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                  color: typeFilter === 'DB2' ? '#c084fc' : 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}
              >
                DB2 ({counts.db2})
              </button>
              <button
                onClick={() => setTypeFilter('VSAM')}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: typeFilter === 'VSAM' ? '700' : '400',
                  borderRadius: 'var(--radius-sm)',
                  background: typeFilter === 'VSAM' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                  color: typeFilter === 'VSAM' ? '#34d399' : 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}
              >
                VSAM ({counts.vsam})
              </button>
              <button
                onClick={() => setTypeFilter('IMS')}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: typeFilter === 'IMS' ? '700' : '400',
                  borderRadius: 'var(--radius-sm)',
                  background: typeFilter === 'IMS' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                  color: typeFilter === 'IMS' ? '#fbbf24' : 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}
              >
                IMS ({counts.ims})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search tables, columns, sources..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 30px',
                  fontSize: '0.8rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff'
                }}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
              Matching Entities ({filteredSchemas.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto' }}>
              {filteredSchemas.map(schema => {
                const isSelected = schema.tableName === (currentSchema?.tableName);
                const badgeCls = getBadgeClass(schema.type);
                return (
                  <button
                    key={schema.tableName}
                    onClick={() => setSelectedTable(schema.tableName)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent-purple)' : '1px solid var(--border-color)',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ flex: '1 1 auto', marginRight: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <TableIcon size={15} color={isSelected ? 'var(--accent-purple)' : 'var(--text-dim)'} />
                        <code style={{ fontSize: '0.88rem', fontWeight: '700', color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                          {schema.tableName}
                        </code>
                        <span className={`badge ${badgeCls}`} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                          {schema.type?.replace('Relational Table', 'DB2').replace('Indexed Table (KSDS)', 'VSAM KSDS').replace('Hierarchical Database (DL/I)', 'IMS')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {schema.columns.length} columns • {schema.programsAccessing.length} programs
                        {schema.sourceFile ? ` • ${schema.sourceFile}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span className={`badge ${schema.declared ? 'badge-success' : 'badge-medium'}`} style={{ fontSize: '0.62rem' }}>
                        {schema.declared ? 'DECLARED' : 'INFERRED'}
                      </span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <span className={`crud-pill ${schema.operations.includes('INSERT') || schema.operations.includes('WRITE') || schema.operations.includes('ISRT') ? 'crud-c' : 'crud-none'}`} style={{ width: '16px', height: '16px', lineHeight: '16px', fontSize: '0.6rem' }}>C</span>
                        <span className={`crud-pill ${schema.operations.includes('SELECT') || schema.operations.includes('SELECT_CURSOR') || schema.operations.includes('READ') || schema.operations.includes('GU') ? 'crud-r' : 'crud-none'}`} style={{ width: '16px', height: '16px', lineHeight: '16px', fontSize: '0.6rem' }}>R</span>
                        <span className={`crud-pill ${schema.operations.includes('UPDATE') || schema.operations.includes('REWRITE') || schema.operations.includes('REPL') ? 'crud-u' : 'crud-none'}`} style={{ width: '16px', height: '16px', lineHeight: '16px', fontSize: '0.6rem' }}>U</span>
                        <span className={`crud-pill ${schema.operations.includes('DELETE') || schema.operations.includes('DLET') ? 'crud-d' : 'crud-none'}`} style={{ width: '16px', height: '16px', lineHeight: '16px', fontSize: '0.6rem' }}>D</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Schema Inspector & CRUD Traceability */}
        <div style={{ flex: '2 1 600px' }}>
          {currentSchema && (
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
              {/* Table Title and Sub-Tabs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <code style={{ fontSize: '1.3rem', fontWeight: '800', color: '#c084fc' }}>
                      {currentSchema.tableName}
                    </code>
                    <span className={`badge ${getBadgeClass(currentSchema.type)}`}>
                      {currentSchema.type}
                    </span>
                    <span className={`badge ${currentSchema.declared ? 'badge-success' : 'badge-medium'}`}>
                      {currentSchema.declared ? 'Declared Schema' : 'Inferred from COBOL'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {currentSchema.fullName && currentSchema.fullName !== currentSchema.tableName && (
                      <span style={{ marginRight: '12px' }}>Dataset / Catalog: <strong style={{ color: 'var(--text-main)' }}>{currentSchema.fullName}</strong></span>
                    )}
                    {currentSchema.sourceFile && (
                      <span style={{ marginRight: '12px' }}>
                        Source Definition:{' '}
                        <button
                          onClick={() => onSelectFileAndLine && onSelectFileAndLine(currentSchema.sourceFile, 1)}
                          style={{ color: '#38bdf8', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                        >
                          {currentSchema.sourceFile}
                        </button>
                      </span>
                    )}
                    <span>Accessing Programs: <strong>{currentSchema.programsAccessing.length > 0 ? currentSchema.programsAccessing.join(', ') : 'Batch / Master Catalog'}</strong></span>
                  </div>
                </div>

                {/* Sub Tab Buttons */}
                <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                  <button
                    onClick={() => setActiveSubTab('columns')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: activeSubTab === 'columns' ? '600' : '400',
                      borderRadius: 'var(--radius-sm)',
                      background: activeSubTab === 'columns' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                      color: activeSubTab === 'columns' ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >
                    Columns ({currentSchema.columns.length})
                  </button>
                  <button
                    onClick={() => setActiveSubTab('ddl')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: activeSubTab === 'ddl' ? '600' : '400',
                      borderRadius: 'var(--radius-sm)',
                      background: activeSubTab === 'ddl' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                      color: activeSubTab === 'ddl' ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >
                    Generated DDL
                  </button>
                  {currentSchema.indexes && currentSchema.indexes.length > 0 && (
                    <button
                      onClick={() => setActiveSubTab('indexes')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: activeSubTab === 'indexes' ? '600' : '400',
                        borderRadius: 'var(--radius-sm)',
                        background: activeSubTab === 'indexes' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                        color: activeSubTab === 'indexes' ? '#ffffff' : 'var(--text-muted)'
                      }}
                    >
                      Indexes ({currentSchema.indexes.length})
                    </button>
                  )}
                  <button
                    onClick={() => setActiveSubTab('access')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: activeSubTab === 'access' ? '600' : '400',
                      borderRadius: 'var(--radius-sm)',
                      background: activeSubTab === 'access' ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                      color: activeSubTab === 'access' ? '#ffffff' : 'var(--text-muted)'
                    }}
                  >
                    Programs ({currentSchema.programsAccessing.length})
                  </button>
                </div>
              </div>

              {/* Sub-Tab 1: Columns */}
              {activeSubTab === 'columns' && (
                <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Column Name</th>
                        <th>Target SQL Type</th>
                        <th>COBOL Picture / Usage</th>
                        <th>Constraint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSchema.columns.map((col, idx) => {
                        const isPk = col.type.includes('PRIMARY KEY') || idx === 0;
                        return (
                          <tr key={`${col.name}-${idx}`}>
                            <td style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{idx + 1}</td>
                            <td>
                              <code style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ffffff' }}>
                                {col.name}
                              </code>
                            </td>
                            <td>
                              <span style={{ color: '#38bdf8', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                                {col.type.replace('PRIMARY KEY', '').trim()}
                              </span>
                            </td>
                            <td>
                              {col.pic ? (
                                <span style={{ color: '#34d399', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                                  {col.pic}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>-</span>
                              )}
                            </td>
                            <td>
                              {isPk ? (
                                <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>PRIMARY KEY</span>
                              ) : col.type.includes('NOT NULL') ? (
                                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>NOT NULL</span>
                              ) : (
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>NULLABLE</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-Tab 2: Generated DDL */}
              {activeSubTab === 'ddl' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Ready-to-execute ANSI SQL / PostgreSQL / Relational Schema Definition
                    </span>
                    <button onClick={handleCopyDdl} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                      {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                    </button>
                  </div>
                  <pre style={{
                    background: '#070a10',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    color: '#c084fc',
                    fontSize: '0.85rem',
                    overflowX: 'auto',
                    lineHeight: '1.6'
                  }}>
                    {currentSchema.ddl}
                  </pre>
                </div>
              )}

              {/* Sub-Tab 3: Indexes */}
              {activeSubTab === 'indexes' && (
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Database Indexes & Alternate Access Paths for <strong>{currentSchema.tableName}</strong>:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {currentSchema.indexes?.map((idx, i) => (
                      <div key={i} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <code style={{ fontSize: '0.9rem', fontWeight: '700', color: '#38bdf8' }}>{idx.name}</code>
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>INDEX</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Indexed Columns: <code style={{ color: '#ffffff' }}>{idx.columns}</code> • Defined in: {idx.sourceFile}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: Accessing Programs */}
              {activeSubTab === 'access' && (
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    COBOL programs referencing <strong>{currentSchema.tableName}</strong>:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {currentSchema.programsAccessing.length > 0 ? (
                      currentSchema.programsAccessing.map(pgm => (
                        <div key={pgm} style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={14} color="#38bdf8" />
                          <code style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff' }}>{pgm}</code>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                        No direct program calls detected; accessed via batch IDCAMS or system utility scripts.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full CRUD Matrix Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Enterprise Program-to-Database CRUD Matrix</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Complete traceability of which COBOL programs Create (C), Read (R), Update (U), or Delete (D) database entities across SQL, CICS, and Batch I/O.
                </p>
              </div>

              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Filter CRUD matrix..."
                  value={crudSearch}
                  onChange={e => setCrudSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    fontSize: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff'
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Database Entity</th>
                    <th>Access Layer</th>
                    <th style={{ textAlign: 'center', width: '60px' }}>Create</th>
                    <th style={{ textAlign: 'center', width: '60px' }}>Read</th>
                    <th style={{ textAlign: 'center', width: '60px' }}>Update</th>
                    <th style={{ textAlign: 'center', width: '60px' }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCrud.map((item, idx) => (
                    <tr key={`${item.program}-${item.table}-${idx}`}>
                      <td>
                        <code style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-blue)' }}>
                          {item.program}
                        </code>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.85rem', fontWeight: '600', color: '#c084fc' }}>
                          {item.table}
                        </code>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                          {item.accessType || 'SQL'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`crud-pill ${item.C ? 'crud-c' : 'crud-none'}`}>C</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`crud-pill ${item.R ? 'crud-r' : 'crud-none'}`}>R</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`crud-pill ${item.U ? 'crud-u' : 'crud-none'}`}>U</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`crud-pill ${item.D ? 'crud-d' : 'crud-none'}`}>D</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
