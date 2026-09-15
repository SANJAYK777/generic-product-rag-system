import React from 'react';
import { Database, Search, Cpu, CheckCircle2, XCircle } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, backendStatus, totalItems }) {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <div className="brand-icon">
            <Cpu size={24} />
          </div>
          <div>
            <span>Omni<span className="gradient-text">RAG</span></span>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              Generic Product Q&A System
            </div>
          </div>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
            id="nav-user-btn"
          >
            <Search size={18} />
            User Search
          </button>
          <button
            className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
            id="nav-admin-btn"
          >
            <Database size={18} />
            Admin Interface
          </button>
        </div>

        <div className="status-badge" title="Backend Connection Status">
          {backendStatus ? (
            <>
              <span className="status-dot"></span>
              <span>Backend Ready ({totalItems} Q&As)</span>
            </>
          ) : (
            <>
              <XCircle size={14} color="var(--accent-rose)" />
              <span style={{ color: 'var(--accent-rose)' }}>Connecting...</span>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
