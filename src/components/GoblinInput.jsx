// src/components/GoblinInput.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

function detectVibe(text, link, nests = [], filename = '') {
  const lower = (text + ' ' + link + ' ' + filename).toLowerCase();
  for (const nest of nests) {
    const all = [...(nest.baseKeywords || []), ...(nest.userKeywords || [])]
      .map(k => String(k).toLowerCase());
    if (all.some(kw => lower.includes(kw))) return nest.name;
  }
  return 'Unsorted';
}

function looksLikeUrl(s = '') {
  try { new URL(s); return true; } catch { return false; }
}

export default function GoblinInput({ onAdd, customNests = [] }) {
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [imageData, setImageData] = useState('');   // data URL
  const [imageName, setImageName] = useState('');

  const fileInputRef = useRef(null);

  const predictedMood = useMemo(
    () => detectVibe(text, link, customNests, imageName),
    [text, link, customNests, imageName]
  );
  const [selectedMood, setSelectedMood] = useState('Unsorted');
  const [userOverrode, setUserOverrode] = useState(false);

  useEffect(() => {
    if (!userOverrode) setSelectedMood(predictedMood);
  }, [predictedMood, userOverrode]);

  useEffect(() => {
    if (!text && !link && !imageData) {
      setUserOverrode(false);
      setSelectedMood('Unsorted');
    }
  }, [text, link, imageData]);

  const hasContent = Boolean(text.trim() || link.trim() || imageData);

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  async function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type?.startsWith('image/')) return; // MVP: images only
    const data = await readFileAsDataURL(file);
    setImageData(data);
    setImageName(file.name || '');
  }

  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    // 1) Files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
      return;
    }
    // 2) URL / text
    const uriList = e.dataTransfer.getData('text/uri-list');
    const plain = e.dataTransfer.getData('text');
    const candidate = uriList || plain;
    if (candidate) {
      if (looksLikeUrl(candidate)) setLink(candidate.trim());
      else setText((t) => (t ? t + '\n' + candidate : candidate));
    }
  }

  async function handlePaste(e) {
    const items = e.clipboardData?.items || [];
    // Prefer image from clipboard
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) {
          await handleFiles([file]);
          e.preventDefault();
          return;
        }
      }
    }
    // Fallback: If it’s a URL, pop it in link
    const textData = e.clipboardData?.getData('text');
    if (textData && looksLikeUrl(textData)) {
      setLink(textData.trim());
      e.preventDefault();
    }
  }

  function clearImage() {
    setImageData('');
    setImageName('');
  }

  const moodOptions = ['Unsorted', ...customNests.map(n => n.name)];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasContent) return;

    const newCard = {
      id: Date.now(),
      text: text.trim(),
      link: link.trim(),
      image: imageData || undefined,
      imageName: imageName || undefined,
      mood: selectedMood || predictedMood || 'Unsorted',
      timestamp: new Date().toISOString(),
    };

    onAdd(newCard);
    setText('');
    setLink('');
    clearImage();
    setUserOverrode(false);
    setSelectedMood('Unsorted');
  };

  return (
    <form className="goblin-input" onSubmit={handleSubmit} onPaste={handlePaste}>
      {/* Dropzone */}
      <div
        className={`dropzone ${imageData ? 'has-image' : ''}`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        title="Click to choose an image, or drag & drop an image/URL here"
      >
        {!imageData ? (
          <div className="drop-hint">
            <div>🧺 Drag & drop image or URL here</div>
            <div className="drop-sub">or click to choose a file</div>
          </div>
        ) : (
          <div className="preview-wrap">
            <img src={imageData} alt={imageName || 'dropped image'} />
            <div className="preview-meta">
              <span className="name">{imageName || 'image'}</span>
              <button
                className="pill small danger"
                type="button"
                onClick={(e) => { e.stopPropagation(); clearImage(); }}
              >
                Remove
              </button>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Optional text + link */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="(Optional) Add a note or caption…"
        rows={3}
      />
      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="(Optional) Link or source"
      />

      {/* Vibe row */}
      <div className="vibe-row">
        <span className="auto-hint">
          auto: <strong>{detectVibe(text, link, customNests, imageName)}</strong>
        </span>

        <label className="mood-select">
          <span className="label">Nest</span>
          <select
            value={selectedMood}
            onChange={(e) => { setSelectedMood(e.target.value); setUserOverrode(true); }}
          >
            {moodOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <button type="submit" disabled={!hasContent} title={!hasContent ? 'Add text, link, or image' : 'Add to Hoard'}>
          Add to Hoard
        </button>
      </div>
    </form>
  );
}
