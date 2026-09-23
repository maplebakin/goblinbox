// src/components/GoblinCard.jsx
import React, { useEffect, useMemo, useState } from 'react';

export default function GoblinCard({ card, customNests = [], onUpdate }) {
  const { id, text, link, timestamp, image, imageName } = card;
  const nest = card.nest ?? card.mood ?? 'Unsorted';

  const [editing, setEditing] = useState(false);
  const [localText, setLocalText] = useState(text || '');
  const [localLink, setLocalLink] = useState(link || '');
  const [localNest, setLocalNest] = useState(nest);

  // keep local state in sync if card changes externally
  useEffect(() => {
    setLocalText(text || '');
    setLocalLink(link || '');
    setLocalNest(nest);
  }, [id, text, link, nest]);

  const nestOptions = useMemo(
    () => ['Unsorted', ...customNests.map(n => n.name)],
    [customNests]
  );

  const formattedDate = new Date(timestamp).toLocaleString('en-CA', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const handleAssign = (newNest) => {
    setLocalNest(newNest);
    onUpdate?.(id, { nest: newNest }); // immediate move
  };

  const handleSave = () => {
    onUpdate?.(id, { text: localText.trim(), link: localLink.trim(), nest: localNest });
    setEditing(false);
  };

  const handleCancel = () => {
    setLocalText(text || '');
    setLocalLink(link || '');
    setLocalNest(nest);
    setEditing(false);
  };

  return (
    <div className="goblin-card">
      <div className="card-top">
        <span className="mood-badge">{localNest}</span>
        <span className="card-date">{formattedDate}</span>

        <div className="card-controls">
          <label className="inline-select" title="Assign to a nest">
            <span className="label">Assign</span>
            <select
              value={localNest}
              onChange={(e) => handleAssign(e.target.value)}
            >
              {nestOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>

          <button
            className="icon-button"
            type="button"
            onClick={() => setEditing((v) => !v)}
            title={editing ? 'Close editor' : 'Edit text/link'}
          >
            {editing ? '✖' : '✏️'}
          </button>
        </div>
      </div>

      {image && (
        <div className="card-image">
          <img src={image} alt={imageName || 'saved image'} />
          {imageName && <div className="card-image-name">{imageName}</div>}
        </div>
      )}

      {!editing ? (
        <>
          {text && <blockquote>{text}</blockquote>}
          {link && (
            <p className="card-link">
              🔗 <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
            </p>
          )}
        </>
      ) : (
        <div className="card-editor">
          <textarea
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            rows={3}
            placeholder="Edit note…"
          />
          <input
            type="url"
            value={localLink}
            onChange={(e) => setLocalLink(e.target.value)}
            placeholder="Edit link…"
          />
          <div className="editor-actions">
            <button className="pill save" type="button" onClick={handleSave}>Save</button>
            <button className="pill ghost" type="button" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
