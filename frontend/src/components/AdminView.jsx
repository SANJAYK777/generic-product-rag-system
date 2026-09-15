import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  FileSpreadsheet,
  Folder,
  Plus,
  Trash2,
  BookOpen,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  X,
  Upload
} from 'lucide-react';
import {
  fetchKnowledgeBase,
  fetchCategories,
  createCategory,
  deleteCategory,
  addKnowledgeItem,
  deleteKnowledgeItem,
  importExcelKnowledge
} from '../api';

export function AdminView({ onKnowledgeUpdated }) {
  const [categories, setCategories] = useState([]);
  const [qaList, setQaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Modal States
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetFolder, setImportTargetFolder] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // Folder specific + Add Q&A inline form state
  const [activeAddFolder, setActiveAddFolder] = useState(null); // folder name or null
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [submittingQA, setSubmittingQA] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, items] = await Promise.all([
        fetchCategories(),
        fetchKnowledgeBase()
      ]);

      // Ensure all categories present in Q&A items are included
      const allCatNames = new Set(cats);
      items.forEach(item => {
        if (item.category) allCatNames.add(item.category);
      });
      const combinedCats = Array.from(allCatNames);
      if (combinedCats.length === 0) {
        combinedCats.push('General');
      }

      setCategories(combinedCats);
      setQaList(items);

      if (onKnowledgeUpdated) onKnowledgeUpdated(items.length);
    } catch (err) {
      showAlert('error', 'Failed to load knowledge base data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 6000);
  };

  // 1. Create Folder Handler
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      showAlert('error', 'Please enter a folder name.');
      return;
    }

    setCreatingFolder(true);
    try {
      await createCategory(newFolderName.trim());
      showAlert('success', `Folder "${newFolderName.trim()}" created successfully!`);
      setNewFolderName('');
      setShowCreateFolderModal(false);
      await loadData();
    } catch (err) {
      showAlert('error', err.message || 'Failed to create folder.');
    } finally {
      setCreatingFolder(false);
    }
  };

  // Delete Folder Handler
  const handleDeleteFolder = async (folderName) => {
    if (!window.confirm(`Are you sure you want to delete folder "${folderName}" and all its Q&A entries?`)) {
      return;
    }
    try {
      await deleteCategory(folderName);
      showAlert('success', `Folder "${folderName}" deleted.`);
      await loadData();
    } catch (err) {
      showAlert('error', 'Failed to delete folder.');
    }
  };

  // 2. Add Q&A Handler (from folder's + Add Q&A option)
  const handleAddQASubmit = async (e, folderName) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      showAlert('error', 'Please enter both a Question and an Answer.');
      return;
    }

    setSubmittingQA(true);
    try {
      await addKnowledgeItem(newQuestion.trim(), newAnswer.trim(), folderName);
      showAlert('success', `New Q&A entry added to folder "${folderName}" and indexed successfully!`);
      setNewQuestion('');
      setNewAnswer('');
      setActiveAddFolder(null);
      await loadData();
    } catch (err) {
      showAlert('error', err.message || 'Error adding knowledge item.');
    } finally {
      setSubmittingQA(false);
    }
  };

  // 3. Delete Single Q&A Handler
  const handleDeleteQA = async (id) => {
    if (!window.confirm('Are you sure you want to remove this Q&A entry?')) {
      return;
    }
    try {
      await deleteKnowledgeItem(id);
      showAlert('success', 'Knowledge entry removed.');
      await loadData();
    } catch (err) {
      showAlert('error', 'Failed to delete knowledge item.');
    }
  };

  // 4. Excel Import Handler
  const handleExcelImport = async (e) => {
    e.preventDefault();
    const targetCat = importTargetFolder || (categories[0] || 'General');

    if (!importFile) {
      showAlert('error', 'Please select an Excel file to upload.');
      return;
    }

    setImporting(true);
    setImportSummary(null);

    try {
      const result = await importExcelKnowledge(importFile, targetCat);
      setImportSummary(result);
      if (result.status === 'success') {
        showAlert('success', `Excel import completed successfully! ${result.successfully_imported} entries added to "${targetCat}".`);
      } else {
        showAlert('error', result.message || 'Excel import finished with warnings.');
      }
      setImportFile(null);
      await loadData();
    } catch (err) {
      showAlert('error', err.message || 'Excel import failed. Please verify file structure.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Knowledge Categories & <span className="gradient-text">Excel Management</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Organize knowledge base into categories, add individual Q&As, or bulk import entries via Excel.
        </p>
      </div>

      {alert && (
        <div className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {alert.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Admin Action Bar: Create Folder & Import Excel */}
      <div className="admin-action-bar">
        <button
          id="btn-open-create-folder"
          className="btn btn-primary"
          onClick={() => setShowCreateFolderModal(true)}
        >
          <FolderPlus size={18} />
          + Create Folder
        </button>

        <button
          id="btn-open-import-excel"
          className="btn btn-secondary"
          onClick={() => {
            setImportTargetFolder(categories[0] || 'General');
            setImportSummary(null);
            setShowImportModal(true);
          }}
        >
          <FileSpreadsheet size={18} color="var(--accent-emerald)" />
          Import Excel
        </button>
      </div>

      {/* Folder & Q&A Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          Loading knowledge folders and Q&A entries...
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Folder size={48} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Knowledge Folders Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            Click <strong>"+ Create Folder"</strong> to create a knowledge category folder (e.g. Electronics, Clothing, Furniture).
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateFolderModal(true)}
          >
            <FolderPlus size={18} /> Create First Folder
          </button>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} color="var(--primary-purple)" />
            Knowledge Categories ({categories.length})
          </h2>

          {categories.map((folderName) => {
            const folderQAs = qaList.filter(item => (item.category || 'General') === folderName);
            const isAddQAOpen = activeAddFolder === folderName;

            return (
              <div key={folderName} className="folder-card" id={`folder-card-${folderName.toLowerCase().replace(/\s+/g, '-')}`}>
                {/* Folder Header */}
                <div className="folder-header">
                  <div className="folder-title">
                    <Folder color="var(--accent-amber)" size={24} />
                    <span>📁 {folderName}</span>
                    <span className="badge-count">{folderQAs.length} Q&A</span>
                  </div>

                  <div className="folder-actions">
                    <button
                      id={`add-qa-btn-${folderName.toLowerCase().replace(/\s+/g, '-')}`}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                      onClick={() => {
                        if (isAddQAOpen) {
                          setActiveAddFolder(null);
                        } else {
                          setActiveAddFolder(folderName);
                          setNewQuestion('');
                          setNewAnswer('');
                        }
                      }}
                    >
                      <Plus size={16} />
                      + Add Q&A
                    </button>

                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      onClick={() => handleDeleteFolder(folderName)}
                      title="Delete Folder"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline "+ Add Q&A" Form for this folder */}
                {isAddQAOpen && (
                  <div className="glass-panel" style={{ background: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.3)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Add Knowledge Entry
                      </h3>
                      <button
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        onClick={() => setActiveAddFolder(null)}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={(e) => handleAddQASubmit(e, folderName)}>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label">Category</label>
                        <input
                          type="text"
                          className="form-input"
                          value={folderName}
                          disabled
                          style={{ opacity: 0.85, cursor: 'not-allowed' }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor={`question-input-${folderName}`}>Question</label>
                        <input
                          id={`question-input-${folderName}`}
                          type="text"
                          className="form-input"
                          placeholder="e.g. What is the battery capacity?"
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          disabled={submittingQA}
                          autoFocus
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor={`answer-input-${folderName}`}>Answer</label>
                        <textarea
                          id={`answer-input-${folderName}`}
                          className="form-textarea"
                          placeholder="e.g. The battery capacity is 4000mAh with fast charging support."
                          value={newAnswer}
                          onChange={(e) => setNewAnswer(e.target.value)}
                          disabled={submittingQA}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setActiveAddFolder(null)}
                          disabled={submittingQA}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={submittingQA}
                        >
                          {submittingQA ? (
                            <>
                              <div className="spinner"></div> Saving...
                            </>
                          ) : (
                            <>
                              <Plus size={16} /> Add Q&A
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Display Q&A items in this folder */}
                {folderQAs.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem', fontStyle: 'italic', padding: '0.75rem 0' }}>
                    No Q&A entries under <strong>{folderName}</strong>. Click "+ Add Q&A" to add knowledge.
                  </div>
                ) : (
                  <div className="qa-grid" style={{ marginTop: '0.5rem' }}>
                    {folderQAs.map((item) => (
                      <div key={item.id} className="qa-card">
                        <div>
                          <div className="qa-question">
                            <span style={{ color: 'var(--primary-indigo)' }}>Q:</span>
                            <span>{item.question}</span>
                          </div>
                          <div className="qa-answer">
                            <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>A:</strong>
                            {item.answer}
                          </div>
                        </div>
                        <div className="qa-footer">
                          <span>ID: {item.id.slice(0, 8)}</span>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleDeleteQA(item.id)}
                            title="Delete Entry"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- CREATE FOLDER MODAL ---------------- */}
      {showCreateFolderModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateFolderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderPlus color="var(--primary-indigo)" size={22} />
                Create New Folder
              </h2>
              <button
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setShowCreateFolderModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-folder-name-input">Folder Name</label>
                <input
                  id="new-folder-name-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Electronics, Clothing, Appliances"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  disabled={creatingFolder}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateFolderModal(false)}
                  disabled={creatingFolder}
                >
                  Cancel
                </button>
                <button
                  id="create-folder-submit-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingFolder || !newFolderName.trim()}
                >
                  {creatingFolder ? (
                    <>
                      <div className="spinner"></div> Creating...
                    </>
                  ) : (
                    'Create Folder'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- IMPORT EXCEL MODAL ---------------- */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet color="var(--accent-emerald)" size={22} />
                Import Knowledge from Excel
              </h2>
              <button
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setShowImportModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExcelImport}>
              <div className="form-group">
                <label className="form-label" htmlFor="import-folder-select">Select Folder</label>
                <select
                  id="import-folder-select"
                  className="form-input"
                  value={importTargetFolder}
                  onChange={(e) => setImportTargetFolder(e.target.value)}
                  disabled={importing}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      📁 {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="excel-file-input">Select Excel File (.xlsx)</label>
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx, .xls"
                  className="form-input"
                  style={{ padding: '0.6rem' }}
                  onChange={(e) => setImportFile(e.target.files[0] || null)}
                  disabled={importing}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
                  Excel file must contain two required columns: <strong>questions</strong> and <strong>answers</strong>.
                </p>
              </div>

              {/* Import Summary Result Box */}
              {importSummary && (
                <div className="summary-box">
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: importSummary.status === 'success' ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                    Excel import completed successfully.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', color: 'var(--text-main)', margin: '0.5rem 0' }}>
                    <div>Folder: <strong>{importSummary.folder}</strong></div>
                    <div>Total rows: <strong>{importSummary.total_rows}</strong></div>
                    <div>Successfully imported: <strong style={{ color: 'var(--accent-emerald)' }}>{importSummary.successfully_imported}</strong></div>
                    <div>Skipped: <strong style={{ color: importSummary.skipped > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>{importSummary.skipped}</strong></div>
                  </div>

                  {importSummary.skipped_details && importSummary.skipped_details.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-amber)', marginTop: '0.5rem' }}>
                        Skipped rows:
                      </div>
                      <ul className="skipped-list">
                        {importSummary.skipped_details.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
                >
                  Close
                </button>
                <button
                  id="excel-import-submit-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={importing || !importFile}
                >
                  {importing ? (
                    <>
                      <div className="spinner"></div> Importing & Indexing...
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Import Q&A
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminView;
