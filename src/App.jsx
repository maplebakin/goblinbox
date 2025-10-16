// src/App.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './GoblinBox.css';
import GoblinInput from './components/GoblinInput.jsx';
import GoblinCard from './components/GoblinCard.jsx';
import NestManager from './components/NestManager.jsx';
import { generateInitialKeywords } from './utils/keywordOracle.js';

const DEFAULT_NEST_DEFS = [
  { name: 'Witchy Things', emoji: '🌙' },
  { name: 'Brain Rot', emoji: '🧠' },
  { name: 'Snacks', emoji: '🥨' },
];

function createDefaultNests() {
  return DEFAULT_NEST_DEFS.map(({ name, emoji }) => ({
    name,
    emoji,
    baseKeywords: generateInitialKeywords(name),
    userKeywords: [],
  }));
}

export default function App() {
  const [hoard, setHoard] = useState([]);
  const [customNests, setCustomNests] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showNestManager, setShowNestManager] = useState(false);

  // NEW: active filter
  const [selectedNest, setSelectedNest] = useState('All');

  // Load hoard + nests on mount
  useEffect(() => {
    try {
      const savedH = localStorage.getItem('goblinHoard');
      if (savedH) setHoard(JSON.parse(savedH));
    } catch (err) {
      console.warn('Failed to load hoard from storage', err);
    }
    try {
      const savedN = localStorage.getItem('goblinNests');
      if (savedN) setCustomNests(JSON.parse(savedN));
      else setCustomNests(createDefaultNests());
    } catch (err) {
      console.warn('Failed to load nests from storage', err);
      setCustomNests(createDefaultNests());
    }
    setHasLoaded(true);
  }, []);

  // Save hoard changes
  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem('goblinHoard', JSON.stringify(hoard));
  }, [hoard, hasLoaded]);

  // Save nests changes
  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem('goblinNests', JSON.stringify(customNests));
  }, [customNests, hasLoaded]);

  const updateCard = useCallback((id, patch) => {
    setHoard(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, [setHoard]);
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
    const trimmedName = name.trim();
    if (!trimmedName) return false;
    const duplicate = customNests.some((n) => n.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) return false;

    const cleanedEmoji = (emoji || '✨').trim() || '✨';
    const newNest = {
      name: trimmedName,
      emoji: cleanedEmoji,
      baseKeywords: generateInitialKeywords(trimmedName),
      userKeywords: [],
    };
    setCustomNests((prev) => [...prev, newNest]);
    return true;
  }
  function addKeyword(nestIndex, kw) {
    const trimmed = kw.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    let added = false;
    setCustomNests((prev) =>
      prev.map((n, i) => {
        if (i !== nestIndex) return n;
        const existing = new Set([
          ...(n.baseKeywords || []),
          ...(n.userKeywords || []),
        ].map((k) => String(k).toLowerCase()));
        if (existing.has(lower)) return n;
        added = true;
        return { ...n, userKeywords: [...(n.userKeywords || []), trimmed] };
      })
    );
    return added;
  }
  function deleteNest(index) {
    const target = customNests[index];
    if (!target) return;
    setCustomNests((prev) => prev.filter((_, i) => i !== index));
    setHoard((prev) => prev.map((card) => (
      card.mood === target.name ? { ...card, mood: 'Unsorted' } : card
    )));
    setSelectedNest((curr) => (curr === target.name ? 'All' : curr));
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
