import React from 'react';
import { 
  AlertOctagon, 
  Database, 
  GitFork, 
  FileCode, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  Activity,
  Layers,
  Table
} from 'lucide-react';

export default function OverviewDashboard({ data, onTabChange }) {
  if (!data) return null;
  const { metrics, missingComponents, databaseSchemas, graph } = data;

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Banner / Modernization Readiness */}
      <div className="glass-card" style={{
        padding: '24px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
        borderLeft: '4px solid var(--accent-blue)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="badge badge-info">Architecture Audit Complete</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Analyzed {metrics.totalFiles} legacy artifacts ({metrics.totalLoc} lines of code)
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px' }}>
            COBOL System Modernization Health Score
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '700px' }}>
            Identified <strong style={{ color: 'var(--accent-rose)' }}>{metrics.totalMissing} missing dependencies</strong> across copybooks, external subprogram call chains, and database entities.
            Resolved dependency integrity is at <strong>{metrics.resolvedRate}%</strong>.
          </p>
        </div>

        {/* Readiness Meter Gauge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '16px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ position: 'relative', width: '70px', height: '70px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={metrics.resolvedRate > 80 ? '#10B981' : metrics.resolvedRate > 60 ? '#F59E0B' : '#F43F5E'}
                strokeWidth="3.5"
                strokeDasharray={`${metrics.resolvedRate}, 100`}
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: '700'
            }}>
              {metrics.resolvedRate}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
              Resolution Readiness
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: metrics.resolvedRate > 75 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {metrics.resolvedRate > 75 ? 'Moderate Integrity' : 'Requires Stubs'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {metrics.criticalMissing} critical blockers
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Card 1: Missing Components */}
        <div 
          className="glass-card" 
          onClick={() => onTabChange('missing')}
          style={{ padding: '20px', cursor: 'pointer', borderTop: '3px solid var(--accent-rose)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              MISSING COMPONENTS
            </span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.15)' }}>
              <AlertOctagon size={20} color="var(--accent-rose)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-rose)', marginBottom: '4px' }}>
            {metrics.totalMissing}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{metrics.criticalMissing} Critical Copybooks & Subprograms</span>
            <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--accent-rose)' }} />
          </div>
        </div>

        {/* Card 2: Database Schemas */}
        <div 
          className="glass-card" 
          onClick={() => onTabChange('schemas')}
          style={{ padding: '20px', cursor: 'pointer', borderTop: '3px solid var(--accent-purple)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              DATABASE SCHEMAS
            </span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(168, 85, 247, 0.15)' }}>
              <Database size={20} color="var(--accent-purple)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-purple)', marginBottom: '4px' }}>
            {metrics.totalDbTables}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Tables mapped with CRUD matrix</span>
            <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--accent-purple)' }} />
          </div>
        </div>

        {/* Card 3: Application Call Chains */}
        <div 
          className="glass-card" 
          onClick={() => onTabChange('flows')}
          style={{ padding: '20px', cursor: 'pointer', borderTop: '3px solid var(--accent-blue)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              APPLICATION CALL FLOWS
            </span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.15)' }}>
              <GitFork size={20} color="var(--accent-blue)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-blue)', marginBottom: '4px' }}>
            {metrics.totalCalls} Calls
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{graph.entryPoints.length} Entry Point Root Dispatcher(s)</span>
            <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--accent-blue)' }} />
          </div>
        </div>

        {/* Card 4: Codebase Size */}
        <div 
          className="glass-card" 
          onClick={() => onTabChange('source')}
          style={{ padding: '20px', cursor: 'pointer', borderTop: '3px solid var(--accent-emerald)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              COBOL ARTIFACTS
            </span>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)' }}>
              <FileCode size={20} color="var(--accent-emerald)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-emerald)', marginBottom: '4px' }}>
            {metrics.totalFiles} Files
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{metrics.totalPrograms} Programs • {metrics.totalCopybooks} Copybooks</span>
            <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--accent-emerald)' }} />
          </div>
        </div>
      </div>

      {/* Two Column Section: Top Missing Blockers vs Schemas Quick Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Missing Blockers Panel */}
        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="var(--accent-rose)" />
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Missing Component Discovery</h3>
            </div>
            <button 
              onClick={() => onTabChange('missing')}
              style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View All ({metrics.totalMissing})</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {missingComponents.slice(0, 4).map(item => (
              <div 
                key={item.id}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <code style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>{item.name}</code>
                    <span className={`badge ${item.severity === 'CRITICAL' ? 'badge-critical' : item.severity === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>
                      {item.severity}
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{item.type}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Referenced by: {item.callers.map(c => c.program).join(', ')}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                  {item.callers.length} reference{item.callers.length > 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database Schemas & CRUD Summary */}
        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--accent-purple)" />
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Database Tables & Schemas</h3>
            </div>
            <button 
              onClick={() => onTabChange('schemas')}
              style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View Schema Details</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {databaseSchemas.map(tbl => (
              <div 
                key={tbl.tableName}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <code style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: '600' }}>{tbl.tableName}</code>
                    <span className={`badge ${tbl.type?.includes('Relational') ? 'badge-purple' : tbl.type?.includes('VSAM') ? 'badge-emerald' : tbl.type?.includes('IMS') ? 'badge-amber' : 'badge-info'}`} style={{ fontSize: '0.62rem' }}>
                      {tbl.type || (tbl.declared ? 'Declared Table' : 'Inferred')}
                    </span>
                    {tbl.sourceFile && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        ({tbl.sourceFile})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Columns: {tbl.columns.length} • Accessed by: {tbl.programsAccessing.length > 0 ? tbl.programsAccessing.join(', ') : 'Batch / Master'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '3px' }}>
                  <span className={`crud-pill ${tbl.operations.includes('INSERT') || tbl.operations.includes('WRITE') || tbl.operations.includes('ISRT') ? 'crud-c' : 'crud-none'}`}>C</span>
                  <span className={`crud-pill ${tbl.operations.includes('SELECT') || tbl.operations.includes('SELECT_CURSOR') || tbl.operations.includes('READ') || tbl.operations.includes('GU') ? 'crud-r' : 'crud-none'}`}>R</span>
                  <span className={`crud-pill ${tbl.operations.includes('UPDATE') || tbl.operations.includes('REWRITE') || tbl.operations.includes('REPL') ? 'crud-u' : 'crud-none'}`}>U</span>
                  <span className={`crud-pill ${tbl.operations.includes('DELETE') || tbl.operations.includes('DLET') ? 'crud-d' : 'crud-none'}`}>D</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modernization Action Plan */}
      <div className="glass-card" style={{ padding: '22px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--accent-blue)" />
          Recommended Modernization Trajectory
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
            <div style={{ fontWeight: '600', color: 'var(--accent-rose)', fontSize: '0.875rem', marginBottom: '6px' }}>
              Phase 1: Stub Missing Components
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Synthesize missing copybook record definitions (e.g. <code>BATCTL</code>) and mock external subprogram interfaces (<code>SECUPROV</code>, <code>TAXCALC</code>, <code>NOTIFYM</code>) to unblock isolated testing.
            </p>
          </div>

          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <div style={{ fontWeight: '600', color: 'var(--accent-purple)', fontSize: '0.875rem', marginBottom: '6px' }}>
              Phase 2: Database Migration DDL
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Export generated relational DDL schemas (5 tables identified) directly into PostgreSQL/MySQL, preserving primary keys and column types inferred from host variables.
            </p>
          </div>

          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <div style={{ fontWeight: '600', color: 'var(--accent-blue)', fontSize: '0.875rem', marginBottom: '6px' }}>
              Phase 3: Microservice Decomposition
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Decouple monolithic batch driver <code>BATMN01</code> into independent domain microservices: Account Service (<code>ACCTVAL</code>), Transaction Service (<code>TXNPOST</code>), and Telemetry (<code>DBLOGR</code>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
