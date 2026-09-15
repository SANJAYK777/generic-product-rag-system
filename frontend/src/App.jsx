import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AdminView } from './components/AdminView';
import { UserView } from './components/UserView';
import { fetchHealth } from './api';

export function App() {
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'admin'
  const [backendConnected, setBackendConnected] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const checkStatus = async () => {
    try {
      const data = await fetchHealth();
      setBackendConnected(true);
      setTotalItems(data.indexed_items || 0);
    } catch (err) {
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendStatus={backendConnected}
        totalItems={totalItems}
      />

      <main className="app-container">
        {activeTab === 'admin' ? (
          <AdminView onKnowledgeUpdated={setTotalItems} />
        ) : (
          <UserView />
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
        OmniRAG &copy; 2026 &bull; Generic Product Knowledge & Semantic Search Application
      </footer>
    </div>
  );
}

export default App;
