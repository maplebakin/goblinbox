// src/components/NestManager.jsx
import React, { useState } from 'react';

export default function NestManager({ nests, addNest, addKeyword, deleteNest }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [keywordInputs, setKeywordInputs] = useState({}); // per-nest temp

  const submitNest = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addNest(name.trim(), emoji || '✨');
    setName('');
    setEmoji('✨');
  };

  const submitKeyword = (idx) => {
    const kw = (keywordInputs[idx] || '').trim();
    if (!kw) return;
    addKeyword(idx, kw);
    setKeywordInputs((s) => ({ ...s, [idx]: '' }));
  };

  return (
    <section className="nest-manager">
      <h3>🪺 Nests</h3>
      <form className="nest-add" onSubmit={submitNest}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New nest name (e.g., Witchy Snacks)"
        />
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="Emoji"
          style={{ width: '5rem', textAlign: 'center' }}
        />
        <button type="submit">Add Nest</button>
      </form>

      <div className="nest-list">
        {nests.map((n, idx) => (
          <div key={idx} className="nest-row">
            <div className="nest-head">
              <span className="nest-emoji">{n.emoji}</span>
              <strong className="nest-name">{n.name}</strong>
              <button className="danger" onClick={() => deleteNest(idx)} type="button">Delete</button>
            </div>

            <div className="nest-keys">
              <div className="key-group">
                <em>base</em>
                <div className="chips">
                  {(n.baseKeywords || []).map((k, i) => (
                    <span key={'b'+i} className="chip base">{k}</span>
                  ))}
                </div>
              </div>

              <div className="key-group">
                <em>user</em>
                <div className="chips">
                  {(n.userKeywords || []).map((k, i) => (
                    <span key={'u'+i} className="chip user">{k}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="nest-keyadd">
              <input
                value={keywordInputs[idx] || ''}
                onChange={(e) => setKeywordInputs(s => ({ ...s, [idx]: e.target.value }))}
                placeholder="Add keyword to this nest…"
              />
              <button onClick={() => submitKeyword(idx)} type="button">Add</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
