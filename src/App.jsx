// src/App.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './GoblinBox.css';
import GoblinInput from './components/GoblinInput.jsx';
import GoblinCard from './components/GoblinCard.jsx';
import NestManager from './components/NestManager.jsx';
import { generateInitialKeywords } from './utils/keywordOracle.js';
import { loadHoard, saveHoard } from './utils/hoardStorage.js';

const DEFAULT_NEST_DEFS = [
  { name: 'Witchy Things', emoji: '🌙' },
  { name: 'Brain Rot', emoji: '🧠' },
  { name: 'Snacks', emoji: '🥨' },
];

function createDefaultNests() {
  return DEFAULT_NEST_DEFS.map(({ name, emoji }) => ({
    id: `default-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    emoji,
    baseKeywords: generateInitialKeywords(name),
    userKeywords: [],
  }));
}

function ensureNestIds(nests) {
  return nests.map((nest) => nest.id ? nest : {
    ...nest,
    id: globalThis.crypto?.randomUUID?.() || `nest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
}

function migrateCard(card) {
  const { mood, ...metadata } = card;
  return { ...metadata, nest: card.nest ?? mood ?? 'Unsorted' };
}

export default function App() {
  const [hoard, setHoard] = useState([]);
  const [customNests, setCustomNests] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showNestManager, setShowNestManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [forageCards, setForageCards] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const inputRef = useRef(null);
  const importInputRef = useRef(null);

  // NEW: active filter
  const [selectedNest, setSelectedNest] = useState('All');

  // Load hoard + nests on mount
  useEffect(() => {
    loadHoard().then((cards) => setHoard(cards.map(migrateCard))).catch((error) => console.error('Could not load hoard', error)).finally(() => setHasLoaded(true));
    try {
      const savedN = localStorage.getItem('goblinNests');
      if (savedN) setCustomNests(ensureNestIds(JSON.parse(savedN)));
      else setCustomNests(createDefaultNests());
    } catch (err) {
      console.warn('Failed to load nests from storage', err);
      setCustomNests(createDefaultNests());
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

  async function imageAsDataUrl(image) {
    if (!image) return undefined;
    if (typeof image === 'string' && image.startsWith('data:')) return image;
    const blob = image instanceof Blob ? image : await fetch(image).then((response) => response.blob());
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function exportBackup() {
    const cards = await Promise.all(hoard.map(async (card) => ({
      ...card,
      image: await imageAsDataUrl(card.image),
    })));
    const backup = { format: 'goblinbox-backup', version: 1, exportedAt: new Date().toISOString(), nests: customNests, cards };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `goblinbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!Array.isArray(backup.cards) || !Array.isArray(backup.nests)) throw new Error('This file is not a GoblinBox backup.');
      const importedCards = backup.cards.map(migrateCard);
      const importedNests = ensureNestIds(backup.nests);
      if (importMode === 'replace' && !window.confirm('Replace your current hoard and nests with this backup?')) return;
      if (importMode === 'replace') {
        setHoard(importedCards);
        setCustomNests(importedNests);
      } else {
        setHoard((current) => {
          const knownIds = new Set(current.map((card) => String(card.id)));
          return [...current, ...importedCards.filter((card) => !knownIds.has(String(card.id)))];
        });
        setCustomNests((current) => {
          const knownNames = new Set(current.map((nest) => nest.name.toLowerCase()));
          return [...current, ...importedNests.filter((nest) => !knownNames.has(nest.name.toLowerCase()))];
        });
      }
      setForageCards(null);
      setSelectedNest('All');
      setSearchQuery('');
    } catch (error) {
      window.alert(`Could not import backup: ${error.message}`);
    }
  }

  function startForage() {
    const chosen = [...hoard]
      .sort((a, b) => new Date(a.lastViewed || a.timestamp) - new Date(b.lastViewed || b.timestamp))
      .slice(0, 5);
    const viewedAt = new Date().toISOString();
    const chosenIds = new Set(chosen.map((card) => card.id));
    setHoard((prev) => prev.map((card) => chosenIds.has(card.id) ? { ...card, lastViewed: viewedAt } : card));
    setForageCards(chosen.map((card) => ({ ...card, lastViewed: viewedAt })));
  }

  // Nest ops
  function addNest(name, emoji = '✨') {
    const trimmedName = name.trim();
    if (!trimmedName) return false;
    const duplicate = customNests.some((n) => n.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) return false;

    const cleanedEmoji = (emoji || '✨').trim() || '✨';
    const newNest = {
      id: globalThis.crypto?.randomUUID?.() || `nest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
      (card.nest ?? card.mood) === target.name ? { ...card, nest: 'Unsorted' } : card
    )));
    setSelectedNest((curr) => (curr === target.name ? 'All' : curr));
  }

  // Filtered hoard by selected nest + live search
  const filteredHoard = useMemo(() => hoard.filter((card) => {
    const assignedNest = card.nest ?? card.mood;
    const matchesNest = selectedNest === 'All' || assignedNest === selectedNest;
    const nestName = customNests.find((nest) => nest.name === assignedNest)?.name || assignedNest || '';
    const searchable = [card.text, card.link, card.imageName, nestName].join(' ').toLowerCase();
    return matchesNest && searchable.includes(searchQuery.trim().toLowerCase());
  }), [hoard, selectedNest, searchQuery, customNests]);

  // Forage view derives from the filtered hoard, so it must come after it.
  const forageIdSet = forageCards && new Set(forageCards.map((card) => card.id));
  const visibleCards = forageCards
    ? hoard.filter((card) => forageIdSet.has(card.id))
    : filteredHoard;

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
        <button className="cta" onClick={() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth' });
          inputRef.current?.querySelector('textarea')?.focus({ preventScroll: true });
        }}>Click. Hoard. Repeat.</button>
        <p className="question">What will you save?</p>

        <div className="topbar">
          <button className="pill" onClick={startForage}>🔎 Forage</button>
          <button className="pill" onClick={exportBackup}>⬇ Export</button>
          <label className="backup-import">
            <span className="sr-only">Import backup file</span>
            <select aria-label="Import behavior" value={importMode} onChange={(event) => setImportMode(event.target.value)}>
              <option value="merge">Merge</option>
              <option value="replace">Replace</option>
            </select>
            <button className="pill" type="button" onClick={() => importInputRef.current?.click()}>⬆ Import</button>
          </label>
          <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
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

      <div ref={inputRef}>
        <GoblinInput onAdd={addToHoard} customNests={customNests} />
      </div>

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

        {customNests.map((n) => {
          const count = hoard.filter((h) => (h.nest ?? h.mood) === n.name).length;
          const active = selectedNest === n.name;
          return (
            <div
              key={n.id}
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
        {forageCards ? <span className="chip">Forage: five forgotten shinies</span> : <span className="chip">{selectedNest === 'All' ? 'Showing: All' : `Showing: ${selectedNest}`}</span>}
        {forageCards && <button className="pill ghost" onClick={() => setForageCards(null)}>Back to hoard</button>}
        <label className="hoard-search">
          <span className="sr-only">Search your hoard</span>
          <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search your hoard…" />
        </label>
        {selectedNest !== 'All' && (
          <button className="pill ghost" onClick={() => setSelectedNest('All')}>Clear filter</button>
        )}
      </section>

      {/* Hoard list (filtered) */}
      <section className="hoard-list">
  {visibleCards.length === 0 ? (
    <div style={{ opacity: 0.8, fontStyle: 'italic' }}>{forageCards ? 'Your hoard is empty. Save a shiny and come forage later.' : 'No items here yet.'}</div>
  ) : (
    visibleCards.map((card) => (
      <React.Fragment key={card.id}>
      {forageCards && new Date(card.timestamp).getMonth() === new Date().getMonth() && new Date(card.timestamp).getDate() === new Date().getDate() && <p className="chip anniversary">✨ From this day in hoard history</p>}
      <GoblinCard
        card={card}
        customNests={customNests}
        onUpdate={updateCard}
      />
      </React.Fragment>
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
