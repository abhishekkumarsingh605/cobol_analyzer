import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Upload, 
  FolderPlus, 
  FileCode, 
  Trash2, 
  X, 
  Sparkles, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  GitBranch,
  FolderGit2,
  HardDrive,
  Globe,
  Loader2
} from 'lucide-react';
import { fetchGithubRepoBrowser } from '../services/gitBrowserService.js';

export default function UploadModal({ 
  isOpen, 
  onClose, 
  onFilesLoaded, 
  onLoadSample,
  initialTab = 'upload-button'
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'upload-button' | 'git-repo' | 'paste'
  
  // Staged files for Option 1
  const [stagedFiles, setStagedFiles] = useState([]);
  
  // Git Repo state for Option 2
  const [gitMode, setGitMode] = useState('remote'); // 'remote' | 'local'
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [localRepoPath, setLocalRepoPath] = useState('');
  const [isGitLoading, setIsGitLoading] = useState(false);
  
  // Direct Paste state
  const [pastedName, setPastedName] = useState('PROGRAM1.cbl');
  const [pastedContent, setPastedContent] = useState('');
  
  // Status and error
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  if (!isOpen) return null;

  // Option 1: File & ZIP upload handler
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg('');
    setStatusMsg('Extracting files...');
    const newStaged = [...stagedFiles];

    try {
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          const entries = Object.keys(zip.files);
          let extractedCount = 0;
          for (const filename of entries) {
            const entry = zip.files[filename];
            if (!entry.dir && /\.(cbl|cob|cpy|inc|pco|sqb|jcl|job|cntl|proc|prc|sql|ddl|bms|txt)$/i.test(filename)) {
              const content = await entry.async('string');
              const cleanName = filename.split('/').pop();
              if (cleanName && !cleanName.startsWith('.')) {
                newStaged.push({
                  name: cleanName,
                  path: filename,
                  content,
                  sizeBytes: entry._data?.uncompressedSize || content.length,
                  lastModified: entry.date ? entry.date.toISOString() : new Date().toISOString()
                });
                extractedCount++;
              }
            }
          }
          if (extractedCount === 0) {
            setErrorMsg(`ZIP archive "${file.name}" contained no recognized mainframe files (.cbl, .cob, .cpy, .jcl).`);
          }
        } else {
          const content = await file.text();
          newStaged.push({
            name: file.name,
            path: file.webkitRelativePath || file.name,
            content,
            sizeBytes: file.size || content.length,
            lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString()
          });
        }
      }
      setStagedFiles(newStaged);
      setStatusMsg('');
    } catch (err) {
      setErrorMsg('Failed to process uploaded file: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveStaged = (index) => {
    setStagedFiles(stagedFiles.filter((_, i) => i !== index));
  };

  // Option 2: Clone or Read from Git Repository
  const handleGitSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setIsGitLoading(true);

    try {
      if (gitMode === 'remote') {
        const cleanUrl = repoUrl.trim();
        if (!cleanUrl) {
          throw new Error('Please enter a Git repository URL.');
        }

        setStatusMsg(`Cloning repository ${cleanUrl}...`);

        let data = null;
        let response = null;

        // Step 1: Try standard API endpoint (/api/git/clone)
        try {
          response = await fetch('/api/git/clone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl: cleanUrl, branch: branch.trim() })
          });
        } catch (fetchErr) {
          console.warn('POST /api/git/clone network error:', fetchErr);
        }

        // Step 2: If 404 (e.g. deployed on Netlify directly), try /.netlify/functions/git-clone
        if (!response || response.status === 404) {
          try {
            response = await fetch('/.netlify/functions/git-clone', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ repoUrl: cleanUrl, branch: branch.trim() })
            });
          } catch (funcErr) {
            console.warn('POST /.netlify/functions/git-clone network error:', funcErr);
          }
        }

        // Step 3: Handle response if server endpoint answered
        if (response && response.ok) {
          data = await response.json();
        } else if (response && response.status !== 404) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned error (${response.status}) while cloning repository.`);
        }

        // Step 4: If serverless endpoint returned 404 or was unreachable, fallback to browser-direct fetch for GitHub
        if (!data) {
          if (cleanUrl.toLowerCase().includes('github.com')) {
            setStatusMsg('Connecting directly to GitHub repository...');
            data = await fetchGithubRepoBrowser(cleanUrl, branch.trim(), (msg) => setStatusMsg(msg));
          } else {
            throw new Error(
              'Git service endpoint was not found (HTTP 404). If deploying to Netlify, ensure the Netlify Functions are included in your deployment. For public repositories, GitHub URLs (https://github.com/...) are supported with automatic browser-direct cloning.'
            );
          }
        }

        if (!data.files || data.files.length === 0) {
          throw new Error(`Repository cloned successfully, but no COBOL or mainframe files (.cbl, .cob, .cpy, .inc, .pco, .sqb, .jcl) were found in the codebase.`);
        }

        setStatusMsg(`Found ${data.files.length} COBOL artifacts in repository. Loading...`);
        setTimeout(() => {
          onFilesLoaded(data.files);
          onClose();
        }, 500);

      } else {
        // Local Git repo on host
        const cleanLocalPath = localRepoPath.trim();
        if (!cleanLocalPath) {
          throw new Error('Please enter an absolute local repository path.');
        }

        const isHosted = typeof window !== 'undefined' && 
          window.location.hostname !== 'localhost' && 
          window.location.hostname !== '127.0.0.1';

        if (isHosted) {
          throw new Error(
            'Reading local filesystem paths is only available when running locally on your computer (npm run dev). In this cloud deployment, please switch to the "Upload Codebase" tab to select your local folder or ZIP archive.'
          );
        }

        setStatusMsg(`Scanning local repository path: ${cleanLocalPath}...`);
        let response = await fetch('/api/git/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoPath: cleanLocalPath })
        });

        if (response.status === 404) {
          response = await fetch('/.netlify/functions/git-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoPath: cleanLocalPath })
          });
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to read local repository.');
        }

        if (!data.files || data.files.length === 0) {
          throw new Error(`Path found, but no COBOL files (.cbl, .cob, .cpy) were detected in "${cleanLocalPath}".`);
        }

        setStatusMsg(`Found ${data.files.length} COBOL files. Analyzing...`);
        setTimeout(() => {
          onFilesLoaded(data.files);
          onClose();
        }, 500);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsGitLoading(false);
    }
  };

  // Add pasted code to staged
  const handleAddPasted = () => {
    if (!pastedContent.trim()) {
      setErrorMsg('Please enter COBOL source code.');
      return;
    }
    const cleanName = pastedName.trim() || 'UNTITLED.cbl';
    setStagedFiles([...stagedFiles, { name: cleanName, content: pastedContent }]);
    setPastedContent('');
    setErrorMsg('');
    setActiveTab('upload-button');
  };

  // Run Analysis on staged files from Option 1
  const handleAnalyzeStaged = () => {
    if (stagedFiles.length === 0) {
      setErrorMsg('Please select or upload at least one COBOL file.');
      return;
    }
    onFilesLoaded(stagedFiles);
    onClose();
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
      <div className="glass-card" style={{ maxWidth: '780px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.15)' }}>
              <FolderGit2 size={22} color="var(--accent-blue)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Import COBOL Codebase</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Select an input option to analyze legacy architecture, missing components, and call flows
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-dim)', padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* 2 Primary Input Options Tabs (per plan.md lines 8-10) */}
        <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.2)' }}>
          <button
            id="tab-opt-upload"
            onClick={() => { setActiveTab('upload-button'); setErrorMsg(''); }}
            style={{
              padding: '10px 16px',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'upload-button' ? '600' : '400',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'upload-button' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'upload-button' ? 'var(--accent-blue)' : 'var(--text-muted)',
              border: activeTab === 'upload-button' ? '1px solid var(--border-active)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Upload size={16} />
            <span>1. Upload Button (Files, ZIP, Folder)</span>
          </button>

          <button
            id="tab-opt-git"
            onClick={() => { setActiveTab('git-repo'); setErrorMsg(''); }}
            style={{
              padding: '10px 16px',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'git-repo' ? '600' : '400',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'git-repo' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'git-repo' ? '#818cf8' : 'var(--text-muted)',
              border: activeTab === 'git-repo' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <GitBranch size={16} />
            <span>2. Existing Git Repository</span>
          </button>

          <button
            id="tab-opt-paste"
            onClick={() => { setActiveTab('paste'); setErrorMsg(''); }}
            style={{
              padding: '10px 16px',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'paste' ? '600' : '400',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'paste' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeTab === 'paste' ? '#ffffff' : 'var(--text-muted)',
              border: activeTab === 'paste' ? '1px solid var(--border-color)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: 'auto'
            }}
          >
            <FileCode size={16} />
            <span>Paste Code</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {errorMsg && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', color: '#fb7185' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {statusMsg && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--accent-blue)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* TAB 1: OPTION 1 - Using Upload Button */}
          {activeTab === 'upload-button' && (
            <div>
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.01)',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                  <FileCode size={36} color="var(--accent-blue)" />
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '6px' }}>
                  Upload COBOL Codebase via Upload Button
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '520px', margin: '0 auto 20px auto' }}>
                  Select multiple COBOL files (<code>.cbl</code>, <code>.cob</code>, <code>.cpy</code>), upload an entire project folder, or drop a <code>.zip</code> archive.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Select Files / ZIP Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".cbl,.cob,.cpy,.inc,.pco,.sqb,.jcl,.job,.cntl,.proc,.prc,.sql,.ddl,.bms,.txt,.zip"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    id="btn-trigger-files-upload"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="btn-primary"
                    style={{ padding: '10px 18px' }}
                  >
                    <Upload size={16} />
                    <span>Upload COBOL Files / ZIP</span>
                  </button>

                  {/* Select Folder Button */}
                  <input
                    ref={folderInputRef}
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    id="btn-trigger-folder-upload"
                    onClick={() => folderInputRef.current && folderInputRef.current.click()}
                    className="btn-secondary"
                    style={{ padding: '10px 18px' }}
                  >
                    <FolderPlus size={16} />
                    <span>Upload Entire Folder</span>
                  </button>
                </div>
              </div>

              {/* Staged Files List */}
              {stagedFiles.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      Ready to Analyze ({stagedFiles.length} files staged)
                    </span>
                    <button
                      onClick={() => setStagedFiles([])}
                      style={{ fontSize: '0.75rem', color: 'var(--accent-rose)' }}
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {stagedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} color="var(--accent-blue)" />
                          <code>{file.name}</code>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            ({file.content.split('\n').length} lines)
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveStaged(idx)}
                          style={{ color: 'var(--text-dim)', padding: '4px' }}
                          title="Remove file"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OPTION 2 - Existing Git Repository */}
          {activeTab === 'git-repo' && (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setGitMode('remote')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: gitMode === 'remote' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                    border: gitMode === 'remote' ? '1px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                    color: gitMode === 'remote' ? '#ffffff' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    fontWeight: gitMode === 'remote' ? '600' : '400'
                  }}
                >
                  <Globe size={16} color={gitMode === 'remote' ? 'var(--accent-indigo)' : 'var(--text-dim)'} />
                  <span>Remote Git Repository URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGitMode('local')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: gitMode === 'local' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                    border: gitMode === 'local' ? '1px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                    color: gitMode === 'local' ? '#ffffff' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    fontWeight: gitMode === 'local' ? '600' : '400'
                  }}
                >
                  <HardDrive size={16} color={gitMode === 'local' ? 'var(--accent-indigo)' : 'var(--text-dim)'} />
                  <span>Existing Local Git Clone on Disk</span>
                </button>
              </div>

              {gitMode === 'remote' ? (
                /* Remote Git Repository Form */
                <form onSubmit={handleGitSubmit}>
                  <div style={{
                    marginBottom: '18px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GitBranch size={16} color="var(--accent-purple)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-purple)' }}>
                          Clone Remote Git Repository
                        </span>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        Public & Private Repos Supported
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0 }}>
                      Enter your Git HTTPS URL (e.g. GitHub, GitLab, Bitbucket, Azure DevOps) to clone and parse all mainframe programs, copybooks, and JCL jobs.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Git Repository URL (HTTPS or SSH):
                    </label>
                    <input
                      id="input-git-repo-url"
                      type="text"
                      placeholder="e.g. https://github.com/organization/legacy-banking-cobol.git"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      disabled={isGitLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem'
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Supports GitHub, GitLab, Bitbucket, Azure Repos, and internal git servers.
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Target Branch or Tag (Optional, defaults to main/master):
                    </label>
                    <input
                      id="input-git-branch"
                      type="text"
                      placeholder="e.g. main, master, release/v2.0"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      disabled={isGitLoading}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <button
                    id="btn-clone-git-repo"
                    type="submit"
                    disabled={isGitLoading || !repoUrl.trim()}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                      opacity: isGitLoading || !repoUrl.trim() ? 0.6 : 1
                    }}
                  >
                    {isGitLoading ? <Loader2 size={16} className="animate-spin" /> : <GitBranch size={16} />}
                    <span>{isGitLoading ? 'Cloning & Extracting Repository...' : 'Clone & Analyze Git Repository'}</span>
                  </button>
                </form>
              ) : (
                /* Local Git Repository Path */
                <form onSubmit={handleGitSubmit}>
                  {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      color: '#fef08a',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      <AlertCircle size={16} color="#eab308" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Running on Cloud / Netlify:</strong> Scanning local computer filesystem paths is only available when running locally (<code>npm run dev</code>). In this hosted deployment, please use the <strong>Upload Codebase</strong> tab (Folder/ZIP upload) or the <strong>Remote Git Repository URL</strong> tab.
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Local Git Repository Path on Machine:
                    </label>
                    <input
                      id="input-local-git-path"
                      type="text"
                      placeholder="e.g. /Users/abhishek/projects/mainframe-cobol-repo"
                      value={localRepoPath}
                      onChange={(e) => setLocalRepoPath(e.target.value)}
                      disabled={isGitLoading}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem'
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Scans the specified existing repository directory recursively for all COBOL source files and copybooks.
                    </div>
                  </div>

                  <button
                    id="btn-read-local-git"
                    type="submit"
                    disabled={isGitLoading || !localRepoPath.trim()}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                      opacity: isGitLoading || !localRepoPath.trim() ? 0.6 : 1
                    }}
                  >
                    {isGitLoading ? <Loader2 size={16} className="animate-spin" /> : <HardDrive size={16} />}
                    <span>{isGitLoading ? 'Scanning Local Git Repository...' : 'Import from Local Git Repository'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: Direct Paste Tab */}
          {activeTab === 'paste' && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Target Filename:
                </label>
                <input
                  type="text"
                  value={pastedName}
                  onChange={(e) => setPastedName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Paste COBOL Source Code:
                </label>
                <textarea
                  rows={10}
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder="Paste COBOL program or copybook content here..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#070a10',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#e2e8f0',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button onClick={handleAddPasted} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Stage This Program
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'rgba(0, 0, 0, 0.2)' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                onLoadSample();
                onClose();
              }}
              style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} color="var(--accent-emerald)" />
              <span>Load Core Banking Sample</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>

            {activeTab === 'upload-button' && (
              <button
                id="btn-analyze-staged"
                onClick={handleAnalyzeStaged}
                disabled={stagedFiles.length === 0 || isProcessing}
                className="btn-primary"
                style={{ opacity: stagedFiles.length === 0 ? 0.5 : 1 }}
              >
                <CheckCircle2 size={16} />
                <span>{isProcessing ? 'Processing...' : `Analyze (${stagedFiles.length} Files)`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
