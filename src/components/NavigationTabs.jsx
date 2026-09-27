import React from 'react';
import { 
  BarChart3, 
  FolderTree,
  AlertOctagon, 
  Database, 
  GitFork, 
  Code2, 
  FileCheck 
} from 'lucide-react';

export default function NavigationTabs({ activeTab, onTabChange, metrics }) {
  const tabs = [
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: BarChart3
    },
    {
      id: 'inventory',
      label: 'File Inventory & SME Metrics',
      icon: FolderTree,
      count: metrics?.totalFiles,
      badgeColor: 'badge-info'
    },
    {
      id: 'missing',
      label: 'Missing Components',
      icon: AlertOctagon,
      count: metrics?.totalMissing,
      badgeColor: metrics?.totalMissing > 0 ? 'badge-critical' : 'badge-success'
    },
    {
      id: 'schemas',
      label: 'Database Schemas',
      icon: Database,
      count: metrics?.totalDbTables,
      badgeColor: 'badge-purple'
    },
    {
      id: 'flows',
      label: 'Application Flows (Call Chain)',
      icon: GitFork,
      count: metrics?.totalCalls,
      badgeColor: 'badge-info'
    },
    {
      id: 'source',
      label: 'COBOL Source Inspector',
      icon: Code2,
      count: metrics?.totalFiles,
      badgeColor: 'badge-secondary'
    },
    {
      id: 'report',
      label: 'Modernization Report',
      icon: FileCheck
    }
  ];

  return (
    <div style={{
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(17, 24, 39, 0.5)',
      padding: '0 24px'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 18px',
                fontSize: '0.875rem',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                background: isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={18} color={isActive ? 'var(--accent-blue)' : 'var(--text-dim)'} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`badge ${tab.badgeColor || ''}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
