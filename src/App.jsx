// src/App.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './GoblinBox.css';
import GoblinInput from './components/GoblinInput.jsx';
import GoblinCard from './components/GoblinCard.jsx';
import NestManager from './components/NestManager.jsx';
import { generateInitialKeywords } from './utils/keywordOracle.js';
import { loadHoard, saveHoard } from './utils/hoardStorage.js';

export default function App() {
  const [hoard, setHoard] = useState([]);
  const [customNests, setCustomNests] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showNestManager, setShowNestManager] = useState(false);

  // NEW: active filter
  const [selectedNest, setSelectedNest] = useState('All');

  // Defaults (first run)
  const defaultNests = [
    { name: 'Witchy Things', emoji: '🌙', baseKeywords: generateInitialKeywords('Witchy Things'), userKeywords: [] },
    { name: 'Brain Rot',     emoji: '🧠', baseKeywords: generateInitialKeywords('Brain Rot'),     userKeywords: [] },
    { name: 'Snacks',        emoji: '🥨', baseKeywords: generateInitialKeywords('Snacks'),        userKeywords: [] },
  ];

  // Load hoard + nests on mount
  useEffect(() => {
    loadHoard().then(setHoard).catch((error) => console.error('Could not load hoard', error)).finally(() => setHasLoaded(true));
    try {
      const savedN = localStorage.getItem('goblinNests');
      if (savedN) setCustomNests(JSON.parse(savedN));
      else setCustomNests(defaultNests);
    } catch {
      setCustomNests(defaultNests);
    }
  }, []);

  // Save hoard changes
  useEffect(() => {
    if (!hasLoaded) return;
    saveHoard(hoard).catch((error) => console.error('Could not save hoard', error));
  }, [hoard, hasLoaded]);

  // Save nests changes
  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem('goblinNests', JSON.stringify(customNests));
  }, [customNests, hasLoaded]);

const updateCard = (id, patch) => {
  setHoard(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
};
  // Close dropdown with Escape
  useEffect(() => {
    if (!showNestManager) return;
    const onKey = (e) => e.key === 'Escape' && setShowNestManager(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showNestManager]);

  // Hoard ops
  const addToHoard = (card) => setHoard((prev) => [card, ...prev]);

  // Nest ops
  function addNest(name, emoji = '✨') {
    const newNest = {
      name,
      emoji,
      baseKeywords: generateInitialKeywords(name),
      userKeywords: [],
    };
    setCustomNests((prev) => [...prev, newNest]);
  }
  function addKeyword(nestIndex, kw) {
    setCustomNests((prev) =>
      prev.map((n, i) =>
        i === nestIndex ? { ...n, userKeywords: [...(n.userKeywords || []), kw] } : n
      )
    );
  }
  function deleteNest(index) {
    setCustomNests((prev) => prev.filter((_, i) => i !== index));
    // If you delete the active one, fall back to All
    setSelectedNest((curr) => (index >= 0 && curr === customNests[index]?.name ? 'All' : curr));
  }

  // Filtered hoard by selected nest
  const filteredHoard = useMemo(() => {
    if (selectedNest === 'All') return hoard;
    return hoard.filter((c) => c.mood === selectedNest);
  }, [hoard, selectedNest]);

  // Helpers for clicking/toggling a nest
  function selectNest(name) {
    setSelectedNest((curr) => (curr === name ? 'All' : name));
  }
  function handleNestKey(e, name) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectNest(name);
    }
  }

  return (
    <div className="goblinbox-container">
      <header>
        <h1>🟢 GOBLINBOX</h1>
        <p className="subtitle">A delightfully messy place to hoard your strange digital treasures.</p>
        <button className="cta">Click. Hoard. Repeat.</button>
        <p className="question">What will you save?</p>

        <div className="topbar">
          <button
            className="pill"
            onClick={() => setShowNestManager((s) => !s)}
            aria-expanded={showNestManager}
            aria-controls="nest-dropdown"
          >
            🪺 Manage Nests {showNestManager ? '▴' : '▾'}
          </button>
        </div>
      </header>

      {showNestManager && (
        <>
          <div className="scrim" onClick={() => setShowNestManager(false)} aria-hidden="true" />
          <div id="nest-dropdown" className="dropdown-panel" role="dialog" aria-label="Nest Manager">
            <NestManager
              nests={customNests}
              addNest={addNest}
              addKeyword={addKeyword}
              deleteNest={deleteNest}
            />
          </div>
        </>
      )}

      <GoblinInput onAdd={addToHoard} customNests={customNests} />

      <section className="hoard-status">
        <h2>Your Hoard</h2>
        <p>You’ve gathered {hoard.length} shiny things.</p>
      </section>

      {/* Nests row with clickable filter */}
      <section className="nests">
        {/* All tile */}
        <div
          className={`nest-card ${selectedNest === 'All' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          aria-pressed={selectedNest === 'All'}
          onClick={() => setSelectedNest('All')}
          onKeyDown={(e) => handleNestKey(e, 'All')}
          title="Show all items"
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '.25rem' }}>✨ All</div>
          <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>{hoard.length} items</div>
        </div>

        {customNests.map((n, i) => {
          const count = hoard.filter((h) => h.mood === n.name).length;
          const active = selectedNest === n.name;
          return (
            <div
              key={i}
              className={`nest-card ${active ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => selectNest(n.name)}
              onKeyDown={(e) => handleNestKey(e, n.name)}
              title={`Filter by ${n.name}`}
            >
              <div style={{ fontSize: '1.2rem', marginBottom: '.25rem' }}>
                {n.emoji} {n.name}
              </div>
              <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>{count} items</div>
            </div>
          );
        })}
      </section>

      {/* Filter bar */}
      <section className="filter-bar">
        <span className="chip">{selectedNest === 'All' ? 'Showing: All' : `Showing: ${selectedNest}`}</span>
        {selectedNest !== 'All' && (
          <button className="pill ghost" onClick={() => setSelectedNest('All')}>Clear filter</button>
        )}
      </section>

      {/* Hoard list (filtered) */}
      <section className="hoard-list">
  {filteredHoard.length === 0 ? (
    <div style={{ opacity: 0.8, fontStyle: 'italic' }}>No items here yet.</div>
  ) : (
    filteredHoard.map((card) => (
      <GoblinCard
        key={card.id}
        card={card}
        customNests={customNests}
        onUpdate={updateCard}
      />
    ))
  )}
</section>

      <footer>
        <p><strong>Forage:</strong> Rediscover shinies</p>
        <p>© 2025 Mira Ashe</p>
      </footer>
    </div>
  );
}
