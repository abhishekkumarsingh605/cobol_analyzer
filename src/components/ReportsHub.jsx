import React from 'react';
import { 
  BarChart3, 
  Database, 
  GitFork, 
  FolderTree, 
  FileCheck, 
  Download 
} from 'lucide-react';
import OverviewDashboard from './OverviewDashboard';
import DatabaseSchemasView from './DatabaseSchemasView';
import ApplicationFlowView from './ApplicationFlowView';
import FileInventoryView from './FileInventoryView';

export default function ReportsHub({
  data,
  subTab = 'audit',
  onSubTabChange,
  onSelectFileAndLine,
  onOpenExport
}) {
  const tabs = [
    { id: 'audit', label: 'Architecture Audit', icon: BarChart3, count: `${data.metrics?.totalPrograms || 0} Pgms` },
    { id: 'schemas', label: 'Database Schemas', icon: Database, count: `${data.metrics?.totalDbTables || 0} Tables` },
    { id: 'flows', label: 'Application Flows', icon: GitFork, count: `${data.metrics?.totalCalls || 0} Calls` },
    { id: 'inventory', label: 'File Inventory & SME', icon: FolderTree, count: `${data.fileInventory?.totalFiles || 0} Files` }
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Reports Top Navigation Bar */}
      <div style={{
        padding: '12px 24px',
        background: '#0b0f19',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        flexShrink: 0,
        zIndex: 5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSubTabChange(t.id)}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: isActive ? '1px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: isActive ? '600' : '500'
                }}
              >
                <Icon size={15} color={isActive ? 'var(--accent-indigo)' : 'var(--text-dim)'} />
                <span>{t.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-dim)'
                }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenExport}
          className="btn-primary"
          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
        >
          <Download size={14} />
          <span>Export Assessment Report</span>
        </button>
      </div>

      {/* SubTab Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}>
        {subTab === 'audit' && (
          <OverviewDashboard data={data} onTabChange={() => {}} />
        )}

        {subTab === 'schemas' && (
          <DatabaseSchemasView
            databaseSchemas={data.databaseSchemas}
            crudMatrix={data.crudMatrix}
            onSelectFileAndLine={onSelectFileAndLine}
          />
        )}

        {subTab === 'flows' && (
          <ApplicationFlowView
            graph={data.graph}
            callTrees={data.callTrees}
            parsedFiles={data.parsedFiles}
            onSelectFileAndLine={onSelectFileAndLine}
          />
        )}

        {subTab === 'inventory' && (
          <FileInventoryView
            fileInventory={data.fileInventory}
            parsedFiles={data.parsedFiles}
            onSelectFileAndLine={onSelectFileAndLine}
          />
        )}
      </div>
    </div>
  );
}
