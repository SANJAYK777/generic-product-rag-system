import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, MicOff, Sparkles, AlertTriangle, HelpCircle, Folder, Volume2, VolumeX, Square } from 'lucide-react';
import { askQuestion, fetchCategories } from '../api';

export function UserView() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [warning, setWarning] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Text-to-Speech States
  const [ttsSupported, setTtsSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false); // Default OFF
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);

  // Check TTS support on mount and handle cleanup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      setTtsSupported(true);
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Fetch dynamic categories from backend
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await fetchCategories();
        setCategories(cats);
        // Automatically select first category if available
        if (cats && cats.length > 0) {
          setSelectedCategory(cats[0]);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Initialize Speech Recognition if browser supports it
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setQuery(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setQuery('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    if (!selectedCategory) {
      setWarning('Please select a product/category before asking a question.');
      return;
    }

    if (!query.trim()) return;

    // Stop any previous speaking before performing new search
    if (ttsSupported && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setWarning('');
    setLoading(true);
    setResult(null);

    try {
      const data = await askQuestion(query.trim(), selectedCategory);
      setResult(data);

      // Trigger Text-to-Speech if enabled and answer exists
      if (ttsEnabled && ttsSupported && window.speechSynthesis && data && data.answer) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.answer);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setResult({
        status: 'error',
        answer: err.message || 'An error occurred while connecting to the RAG backend.',
        similarity_score: 0.0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Product Knowledge <span className="gradient-accent">Search Engine</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          Select a category folder and ask any question. Powered by category-filtered semantic RAG retrieval & Text-to-Speech.
        </p>
      </div>

      {/* Warning Notification Banner */}
      {warning && (
        <div className="alert alert-error" style={{ marginBottom: 0 }}>
          <AlertTriangle size={18} />
          <span>{warning}</span>
        </div>
      )}

      {/* Search Input Box */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <form onSubmit={handleSearch}>
          {/* Category Dropdown */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="user-category-select" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Folder size={16} color="var(--accent-amber)" />
              Select Product / Category
            </label>
            <select
              id="user-category-select"
              className="form-input"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setWarning('');
              }}
              disabled={loading}
              style={{ fontSize: '1rem', fontWeight: 600, height: '48px', cursor: 'pointer' }}
            >
              <option value="">-- Select a category folder --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  📁 {cat}
                </option>
              ))}
            </select>
          </div>

          <label className="form-label" htmlFor="user-query-input">Your Question</label>
          <div className="search-box-wrapper">
            <div className="search-input-group">
              <input
                id="user-query-input"
                type="text"
                className="form-input"
                placeholder={isListening ? "Listening... Speak your question now" : "e.g., Is that warm?"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              {speechSupported && (
                <button
                  type="button"
                  className={`search-mic-btn ${isListening ? 'active' : ''}`}
                  onClick={toggleVoiceInput}
                  title={isListening ? "Stop listening" : "Click to speak your question"}
                  id="user-mic-btn"
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}
            </div>
            <button
              id="user-ask-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !query.trim()}
              style={{ minWidth: '130px', height: '52px' }}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <Search size={18} />
                  Ask
                </>
              )}
            </button>
          </div>

          {/* Text-to-Speech Option Toggle */}
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {ttsEnabled ? <Volume2 size={18} color="var(--primary-indigo)" /> : <VolumeX size={18} color="var(--text-muted)" />}
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Read answers aloud</span>
            </div>

            {ttsSupported ? (
              <button
                id="tts-toggle-btn"
                type="button"
                className={`btn ${ttsEnabled ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 16px', fontSize: '0.85rem', minWidth: '70px' }}
                onClick={() => {
                  const nextState = !ttsEnabled;
                  setTtsEnabled(nextState);
                  if (!nextState && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                  }
                }}
              >
                {ttsEnabled ? 'ON' : 'OFF'}
              </button>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Text-to-Speech is not supported in this browser.
              </span>
            )}
          </div>
        </form>

        {isListening && (
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
            <span className="status-dot" style={{ background: 'var(--accent-rose)', boxShadow: '0 0 8px var(--accent-rose)' }}></span>
            Listening to speech input... speak clearly into your microphone.
          </div>
        )}
      </div>

      {/* Loading state skeleton */}
      {loading && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 1rem auto' }}></div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Filtering by "{selectedCategory}" & Computing Vector Embeddings...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Performing semantic vector search strictly within category: <strong>{selectedCategory}</strong></p>
        </div>
      )}

      {/* Answer Output Section */}
      {result && !loading && (
        <div className={`result-card ${result.status === 'success' ? 'success' : 'no-match'}`}>
          <div className="result-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {result.status === 'success' ? (
                <Sparkles color="var(--accent-emerald)" size={24} />
              ) : (
                <HelpCircle color="var(--accent-amber)" size={24} />
              )}
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {result.status === 'success' ? 'Retrieved Answer' : 'Knowledge Base Result'}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Searched Category: <strong>📁 {selectedCategory}</strong>
                </div>
              </div>
            </div>

            {result.similarity_score > 0 && (
              <div className={`similarity-badge ${result.status === 'success' ? 'high' : 'low'}`}>
                Semantic Confidence: {(result.similarity_score * 100).toFixed(1)}%
              </div>
            )}
          </div>

          {/* Active Speech Control Bar */}
          {isSpeaking && (
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: 'var(--text-main)', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Volume2 size={18} color="var(--primary-indigo)" />
                <span style={{ fontWeight: 600 }}>🔊 Speaking answer aloud...</span>
              </div>
              <button
                id="tts-stop-btn"
                type="button"
                className="btn btn-danger"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => {
                  if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                  setIsSpeaking(false);
                }}
              >
                <Square size={12} /> Stop
              </button>
            </div>
          )}

          <div className="answer-body">
            {result.answer}
          </div>

          {result.matched_question && result.status === 'success' && (
            <div className="matched-meta">
              Matched Knowledge Entry: <strong>"{result.matched_question}"</strong>
            </div>
          )}

          {result.status === 'no_match' && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.85rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              Category filter active: Search performed strictly within folder "{selectedCategory}". No other folders were queried.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserView;
