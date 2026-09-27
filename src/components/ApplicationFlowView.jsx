import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { 
  GitFork, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Play, 
  Pause, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  AlertTriangle, 
  ArrowRight,
  Code2,
  Database,
  Layers
} from 'lucide-react';

export default function ApplicationFlowView({ graph, callTrees, parsedFiles, onSelectFileAndLine }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [isHierarchical, setIsHierarchical] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewMode, setActiveViewMode] = useState('graph'); // 'graph' | 'tree'

  // Initialize and update Vis.js network graph
  useEffect(() => {
    if (!containerRef.current || !graph) return;

    // Enhance nodes with colors and visual styling
    const nodes = graph.nodes.map(node => {
      const isEntry = graph.entryPoints.includes(node.id);
      const isMissing = node.isMissing;

      let bgColor = '#1e293b';
      let borderColor = '#38bdf8';
      let fontColor = '#f8fafc';

      if (isMissing) {
        bgColor = '#451a1a';
        borderColor = '#f43f5e';
        fontColor = '#fecdd3';
      } else if (isEntry) {
        bgColor = '#064e3b';
        borderColor = '#10b981';
        fontColor = '#a7f3d0';
      }

      return {
        ...node,
        color: {
          background: bgColor,
          border: borderColor,
          highlight: {
            background: isMissing ? '#881337' : isEntry ? '#047857' : '#0284c7',
            border: '#fbbf24'
          }
        },
        font: {
          color: fontColor,
          face: 'JetBrains Mono, monospace',
          size: 13,
          bold: true
        },
        borderWidth: 2,
        margin: 12,
        shadow: {
          enabled: true,
          color: isMissing ? 'rgba(244, 63, 94, 0.4)' : isEntry ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.3)',
          size: 10,
          x: 0,
          y: 0
        }
      };
    });

    const edges = graph.edges.map(edge => ({
      ...edge,
      smooth: { type: 'cubicBezier', forceDirection: 'none', roundness: 0.2 }
    }));

    const options = {
      nodes: {
        shape: 'box',
        shapeProperties: {
          borderRadius: 6
        }
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.8 } },
        color: { color: '#475569', highlight: '#fbbf24' },
        width: 1.5
      },
      physics: {
        enabled: physicsEnabled,
        solver: isHierarchical ? 'hierarchicalRepulsion' : 'barnesHut',
        barnesHut: {
          gravitationalConstant: -3500,
          centralGravity: 0.3,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.09
        },
        hierarchicalRepulsion: {
          nodeDistance: 180
        }
      },
      layout: {
        hierarchical: isHierarchical ? {
          direction: 'LR',
          sortMethod: 'directed',
          levelSeparation: 220,
          nodeSpacing: 120
        } : false
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        navigationButtons: false,
        keyboard: false
      }
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    // Node click handler
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const nodeInfo = graph.nodes.find(n => n.id === nodeId);
        setSelectedNode(nodeInfo || null);
      } else {
        setSelectedNode(null);
      }
    });

    return () => {
      network.destroy();
    };
  }, [graph, isHierarchical]);

  // Handle physics toggle
  const togglePhysics = () => {
    if (networkRef.current) {
      networkRef.current.setOptions({ physics: { enabled: !physicsEnabled } });
      setPhysicsEnabled(!physicsEnabled);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale * 1.3, animation: { duration: 300 } });
    }
  };

  const handleZoomOut = () => {
    if (networkRef.current) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale * 0.7, animation: { duration: 300 } });
    }
  };

  const handleFit = () => {
    if (networkRef.current) {
      networkRef.current.fit({ animation: { duration: 400 } });
    }
  };

  // Search node in graph
  const handleSearchNode = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query || !networkRef.current) return;

    const matchedNode = graph.nodes.find(n => n.id.toLowerCase().includes(query.toLowerCase()));
    if (matchedNode) {
      networkRef.current.selectNodes([matchedNode.id]);
      networkRef.current.focus(matchedNode.id, { scale: 1.2, animation: { duration: 400 } });
      setSelectedNode(matchedNode);
    }
  };

  // Program details lookup
  const selectedProgramFile = selectedNode && !selectedNode.isMissing
    ? parsedFiles.find(f => f.programId === selectedNode.id)
    : null;

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Title & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Application Flows & Call Chains</h2>
            <span className="badge badge-info">{graph.edges.length} Call Relationships</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Interactive dependency map illustrating end-to-end execution paths, root batch entry points, and missing call targets.
          </p>
        </div>

        {/* View Switcher: Graph vs Tree */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '3px', borderRadius: 'var(--radius-md)', display: 'flex' }}>
            <button
              onClick={() => setActiveViewMode('graph')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: activeViewMode === 'graph' ? '600' : '400',
                background: activeViewMode === 'graph' ? 'var(--accent-blue)' : 'transparent',
                color: activeViewMode === 'graph' ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              Interactive Graph
            </button>
            <button
              onClick={() => setActiveViewMode('tree')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: activeViewMode === 'tree' ? '600' : '400',
                background: activeViewMode === 'tree' ? 'var(--accent-blue)' : 'transparent',
                color: activeViewMode === 'tree' ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              Hierarchical Tree
            </button>
          </div>
        </div>
      </div>

      {activeViewMode === 'graph' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 340px' : '1fr', gap: '20px' }}>
          {/* Graph Canvas Container */}
          <div className="glass-card" style={{ position: 'relative', height: '640px', overflow: 'hidden' }}>
            {/* Top Graph Overlay Bar */}
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              right: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              {/* Search input in overlay */}
              <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    placeholder="Focus program..."
                    value={searchQuery}
                    onChange={handleSearchNode}
                    style={{
                      background: 'rgba(10, 14, 23, 0.85)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 10px 6px 30px',
                      fontSize: '0.8rem',
                      width: '180px',
                      backdropFilter: 'blur(8px)'
                    }}
                  />
                </div>

                <button
                  onClick={() => setIsHierarchical(!isHierarchical)}
                  className="btn-secondary"
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    background: isHierarchical ? 'rgba(56, 189, 248, 0.2)' : 'rgba(10, 14, 23, 0.85)',
                    backdropFilter: 'blur(8px)'
                  }}
                  title="Toggle between Force-Directed and Hierarchical Layout"
                >
                  {isHierarchical ? 'Layout: Hierarchical' : 'Layout: Force'}
                </button>
              </div>

              {/* Graph Toolbar */}
              <div style={{ pointerEvents: 'auto', display: 'flex', gap: '6px', background: 'rgba(10, 14, 23, 0.85)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backdropFilter: 'blur(8px)' }}>
                <button onClick={handleZoomIn} style={{ padding: '6px', color: 'var(--text-muted)' }} title="Zoom In">
                  <ZoomIn size={16} />
                </button>
                <button onClick={handleZoomOut} style={{ padding: '6px', color: 'var(--text-muted)' }} title="Zoom Out">
                  <ZoomOut size={16} />
                </button>
                <button onClick={handleFit} style={{ padding: '6px', color: 'var(--text-muted)' }} title="Fit all to view">
                  <Maximize2 size={16} />
                </button>
                <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 2px' }} />
                <button onClick={togglePhysics} style={{ padding: '6px', color: physicsEnabled ? 'var(--accent-blue)' : 'var(--text-dim)' }} title={physicsEnabled ? 'Pause Physics' : 'Resume Physics'}>
                  {physicsEnabled ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            </div>

            {/* Legend Overlay at bottom-left */}
            <div style={{
              position: 'absolute',
              bottom: '14px',
              left: '14px',
              zIndex: 10,
              background: 'rgba(10, 14, 23, 0.85)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              gap: '14px',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#064e3b', border: '1px solid #10b981' }} />
                <span>Entry Point</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#1e293b', border: '1px solid #38bdf8' }} />
                <span>Present Program</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#451a1a', border: '1px dashed #f43f5e' }} />
                <span style={{ color: '#fb7185' }}>Missing Target [!]</span>
              </div>
            </div>

            {/* The Actual Graph Canvas */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Node Inspector Drawer */}
          {selectedNode && (
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className={`badge ${selectedNode.isMissing ? 'badge-critical' : graph.entryPoints.includes(selectedNode.id) ? 'badge-success' : 'badge-info'}`}>
                    {selectedNode.isMissing ? 'MISSING TARGET' : graph.entryPoints.includes(selectedNode.id) ? 'ROOT ENTRY POINT' : 'PROGRAM'}
                  </span>
                  <code style={{ fontSize: '1.2rem', fontWeight: '800', display: 'block', marginTop: '6px' }}>
                    {selectedNode.id}
                  </code>
                </div>
                <button onClick={() => setSelectedNode(null)} style={{ color: 'var(--text-dim)', padding: '4px' }}>✕</button>
              </div>

              {selectedNode.isMissing ? (
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-rose)', fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <AlertTriangle size={16} />
                    Unresolved Dependency
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    This subprogram is referenced via <code>CALL</code> statements but its source code is not present in the workspace.
                  </p>
                </div>
              ) : selectedProgramFile ? (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    File: <strong>{selectedProgramFile.filename}</strong> ({selectedProgramFile.codeLines} LOC)
                  </div>

                  {/* Outgoing Calls */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: '600' }}>
                      Calls Outgoing ({selectedProgramFile.calls.length})
                    </div>
                    {selectedProgramFile.calls.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Leaf program (no subprogram calls)</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedProgramFile.calls.map((call, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
                            <code style={{ color: graph.nodes.find(n => n.id === call.target)?.isMissing ? 'var(--accent-rose)' : 'var(--accent-blue)' }}>
                              {call.target}
                            </code>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>L{call.lineNum}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Copybooks Used */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: '600' }}>
                      Copybooks Referenced ({selectedProgramFile.copybooks.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedProgramFile.copybooks.map((cb, idx) => (
                        <span key={idx} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                          {cb.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Database Tables Access */}
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: '600' }}>
                      Database Queries ({selectedProgramFile.sqlOps.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedProgramFile.sqlOps.flatMap(op => op.tables).map((tbl, idx) => (
                        <span key={idx} className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                          {tbl}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectFileAndLine && onSelectFileAndLine(selectedProgramFile.filename, 1)}
                    className="btn-secondary"
                    style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                  >
                    <Code2 size={16} />
                    <span>View Source Code</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        /* Hierarchical Call Tree Explorer */
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>
              Hierarchical Execution Call Trees
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Traces deep nested subprogram invocation chains starting from root batch entry points down to leaf modules.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {callTrees.map((tree, idx) => (
              <CallTreeNode 
                key={idx} 
                node={tree} 
                level={0} 
                onSelectFileAndLine={onSelectFileAndLine}
                parsedFiles={parsedFiles}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Recursive Call Tree Node component
 */
function CallTreeNode({ node, level, onSelectFileAndLine, parsedFiles }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isMissing = node.isMissing;

  const targetFile = !isMissing ? parsedFiles.find(f => f.programId === node.name) : null;

  return (
    <div style={{ marginLeft: level > 0 ? '24px' : '0px', marginTop: '6px' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        background: isMissing ? 'rgba(244, 63, 94, 0.1)' : level === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
        border: isMissing ? '1px dashed #f43f5e' : level === 0 ? '1px solid #10b981' : '1px solid var(--border-color)'
      }}>
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} style={{ color: 'var(--text-muted)', display: 'flex' }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span style={{ width: '14px', display: 'inline-block' }} />
        )}

        <code style={{ fontSize: '0.85rem', fontWeight: '700', color: isMissing ? 'var(--accent-rose)' : '#ffffff' }}>
          {node.name}
        </code>

        {isMissing && (
          <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
            MISSING TARGET
          </span>
        )}

        {level === 0 && (
          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
            ENTRY POINT
          </span>
        )}

        {node.isCycle && (
          <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>
            ↺ RECURSION / CYCLE
          </span>
        )}

        {targetFile && (
          <button
            onClick={() => onSelectFileAndLine && onSelectFileAndLine(targetFile.filename, 1)}
            style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', marginLeft: '6px' }}
          >
            [View Source]
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div style={{ borderLeft: '1px dashed rgba(255, 255, 255, 0.1)', marginLeft: '12px' }}>
          {node.children.map((child, idx) => (
            <CallTreeNode 
              key={idx} 
              node={child} 
              level={level + 1} 
              onSelectFileAndLine={onSelectFileAndLine}
              parsedFiles={parsedFiles}
            />
          ))}
        </div>
      )}
    </div>
  );
}
