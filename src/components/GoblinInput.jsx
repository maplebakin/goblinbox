// src/components/GoblinInput.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

function tokenize(raw = '') {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}

function scoreKeyword(keyword, haystackRaw, tokenSet) {
  const normalized = String(keyword || '').toLowerCase().trim();
  if (!normalized) return 0;

  const tokens = tokenize(normalized);
  if (!tokens.length) return 0;

  if (tokens.length === 1) {
    const token = tokens[0];
    if (tokenSet.has(token)) return token.length >= 6 ? 10 : 8;
    if (haystackRaw.includes(normalized)) return 4;
    return 0;
  }

  const hits = tokens.filter((token) => tokenSet.has(token));
  if (hits.length === tokens.length) return 12;
  if (hits.length > 0) return 6;
  if (haystackRaw.includes(normalized)) return 8;
  return 0;
}

function extractUrlTokens(rawUrl = '') {
  if (!rawUrl) return [];
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./i, '');
    const hostParts = host.split('.').filter(Boolean);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const searchParts = [];
    url.searchParams.forEach((value, key) => {
      searchParts.push(key, value);
    });
    const hashParts = url.hash.replace(/^#/, '').split(/[^a-z0-9]+/i).filter(Boolean);
    return [host, ...hostParts, ...pathParts, ...searchParts, ...hashParts];
  } catch {
    return tokenize(rawUrl);
  }
}

function detectVibe(text, link, nests = [], filename = '') {
  const textTokens = tokenize(text);
  const imageTokens = tokenize(String(filename || '').replace(/\.[^.]+$/, ' '));
  const urlTokens = extractUrlTokens(link).flatMap((part) => tokenize(part));
  const allTokens = [...textTokens, ...imageTokens, ...urlTokens];
  const haystackRaw = allTokens.join(' ');
  const tokenSet = new Set(allTokens);
  const emojiHaystack = `${text || ''} ${filename || ''} ${link || ''}`;

  let bestNest = 'Unsorted';
  let bestScore = 0;
  let bestUserHits = 0;

  for (const nest of nests) {
    const baseKeywords = Array.isArray(nest.baseKeywords) ? nest.baseKeywords : [];
    const userKeywords = Array.isArray(nest.userKeywords) ? nest.userKeywords : [];

    let score = 0;
    let userHitCount = 0;

    for (const kw of baseKeywords) {
      score += scoreKeyword(kw, haystackRaw, tokenSet);
    }

    for (const kw of userKeywords) {
      const kwScore = scoreKeyword(kw, haystackRaw, tokenSet);
      if (kwScore > 0) userHitCount += 1;
      score += kwScore * 2; // user-curated keywords get extra weight
    }

    score += Math.floor(scoreKeyword(nest.name, haystackRaw, tokenSet) / 2);

    if (nest.emoji && emojiHaystack.includes(nest.emoji)) {
      score += 5;
    }

    if (score > bestScore || (score === bestScore && userHitCount > bestUserHits)) {
      bestNest = nest.name;
      bestScore = score;
      bestUserHits = userHitCount;
    }
  }

  return bestScore > 0 ? bestNest : 'Unsorted';
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

  const predictedNest = useMemo(
    () => detectVibe(text, link, customNests, imageName),
    [text, link, customNests, imageName]
  );
  const [selectedNest, setSelectedNest] = useState('Unsorted');
  const [userOverrode, setUserOverrode] = useState(false);

  useEffect(() => {
    if (!userOverrode) setSelectedNest(predictedNest);
  }, [predictedNest, userOverrode]);

  useEffect(() => {
    if (!text && !link && !imageData) {
      setUserOverrode(false);
      setSelectedNest('Unsorted');
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

  const nestOptions = ['Unsorted', ...customNests.map(n => n.name)];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasContent) return;

    const newCard = {
      id: Date.now(),
      text: text.trim(),
      link: link.trim(),
      image: imageData || undefined,
      imageName: imageName || undefined,
      nest: selectedNest || predictedNest || 'Unsorted',
      timestamp: new Date().toISOString(),
    };

    onAdd(newCard);
    setText('');
    setLink('');
    clearImage();
    setUserOverrode(false);
    setSelectedNest('Unsorted');
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
          auto: <strong>{predictedNest}</strong>
        </span>

        <label className="mood-select">
          <span className="label">Nest</span>
          <select
            value={selectedNest}
            onChange={(e) => { setSelectedNest(e.target.value); setUserOverrode(true); }}
          >
            {nestOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <button type="submit" disabled={!hasContent} title={!hasContent ? 'Add text, link, or image' : 'Add to Hoard'}>
          Add to Hoard
        </button>
      </div>
    </form>
  );
}
