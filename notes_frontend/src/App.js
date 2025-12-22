import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

// Types
/**
 * Note = {
 *   id: string,
 *   title: string,
 *   content: string,
 *   createdAt: number,
 *   updatedAt: number
 * }
 */

// Utilities
const STORAGE_KEY = 'browserNotesApp_notes_v1';

function loadNotesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

function saveNotesToStorage(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore quota or serialization errors for this lightweight app
  }
}

// PUBLIC_INTERFACE
export function formatDate(ts) {
  /** Format a timestamp to a short human-readable string. */
  const d = new Date(ts);
  return d.toLocaleString();
}

/**
 * Toolbar button component for consistency
 */
function ToolbarButton({ children, onClick, variant = 'primary', type = 'button', ariaLabel }) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      type={type}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

// PUBLIC_INTERFACE
export function NotesList({ notes, onDelete, onEdit }) {
  /** Render a list of notes with edit and delete actions. */
  if (!notes.length) {
    return (
      <div className="empty-state" role="status" aria-live="polite">
        <div className="empty-icon">📝</div>
        <div className="empty-title">No notes yet</div>
        <div className="empty-subtitle">Add your first note using the form.</div>
      </div>
    );
  }

  return (
    <ul className="notes-list" aria-label="Notes list">
      {notes.map((n) => (
        <li key={n.id} className="note-card">
          <div className="note-card-head">
            <h3 className="note-title">{n.title || 'Untitled'}</h3>
            <div className="note-meta">
              <span title={`Created ${formatDate(n.createdAt)}`}>
                Created {formatDate(n.createdAt)}
              </span>
              <span aria-hidden="true">•</span>
              <span title={`Updated ${formatDate(n.updatedAt)}`}>
                Updated {formatDate(n.updatedAt)}
              </span>
            </div>
          </div>
          <p className="note-content">{n.content}</p>
          <div className="note-actions">
            <ToolbarButton variant="outline" onClick={() => onEdit(n)} ariaLabel="Edit note">
              ✏️ Edit
            </ToolbarButton>
            <ToolbarButton
              variant="danger"
              onClick={() => onDelete(n.id)}
              ariaLabel="Delete note"
            >
              🗑️ Delete
            </ToolbarButton>
          </div>
        </li>
      ))}
    </ul>
  );
}

// PUBLIC_INTERFACE
export function NoteForm({ initialNote, onCancel, onSave }) {
  /** Add/Edit note form. */
  const isEditing = Boolean(initialNote);
  const [title, setTitle] = useState(initialNote?.title ?? '');
  const [content, setContent] = useState(initialNote?.content ?? '');

  useEffect(() => {
    setTitle(initialNote?.title ?? '');
    setContent(initialNote?.content ?? '');
  }, [initialNote]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle && !trimmedContent) {
      // Nothing to save
      onCancel?.();
      return;
    }
    const payload = {
      ...(initialNote || {}),
      title: trimmedTitle,
      content: trimmedContent,
    };
    onSave(payload);
    setTitle('');
    setContent('');
  }

  const canSave = (title.trim().length + content.trim().length) > 0;

  return (
    <form className="note-form" onSubmit={handleSubmit} aria-label="Note form">
      <div className="form-row">
        <label className="label" htmlFor="note-title">Title</label>
        <input
          id="note-title"
          className="input"
          type="text"
          placeholder="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Note title"
        />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="note-content">Content</label>
        <textarea
          id="note-content"
          className="textarea"
          placeholder="Write your note..."
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label="Note content"
        />
      </div>
      <div className="form-actions">
        <ToolbarButton type="submit" variant="primary" ariaLabel={isEditing ? 'Save changes' : 'Add note'} >
          {isEditing ? 'Save Changes' : 'Add Note'}
        </ToolbarButton>
        {isEditing && (
          <ToolbarButton variant="ghost" onClick={onCancel} ariaLabel="Cancel edit">
            Cancel
          </ToolbarButton>
        )}
      </div>
    </form>
  );
}

// PUBLIC_INTERFACE
function App() {
  /**
   * Notes App - single page UI to add, edit, delete notes in browser memory.
   * - Keeps notes in React state and persists to localStorage.
   * - Clean, modern light theme using specified color accents.
   */
  const [theme] = useState('light'); // fixed light theme as requested
  const [notes, setNotes] = useState(() => loadNotesFromStorage());
  const [editingNote, setEditingNote] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    saveNotesToStorage(notes);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    return [...notes]
      .filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q)
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, query]);

  function handleSave(notePartial) {
    const now = Date.now();
    if (notePartial.id) {
      // update existing
      setNotes(prev =>
        prev.map(n =>
          n.id === notePartial.id
            ? { ...n, ...notePartial, updatedAt: now }
            : n
        )
      );
    } else {
      const newNote = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(now) + Math.random().toString(36).slice(2),
        title: notePartial.title,
        content: notePartial.content,
        createdAt: now,
        updatedAt: now,
      };
      setNotes(prev => [newNote, ...prev]);
    }
    setEditingNote(null);
  }

  function handleDelete(id) {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (editingNote?.id === id) setEditingNote(null);
  }

  function startEdit(note) {
    setEditingNote(note);
    // Scroll to form for better UX on mobile
    const form = document.getElementById('note-form-anchor');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="App app-root" data-theme={theme}>
      <header className="topbar" role="banner">
        <div className="container">
          <div className="brand">
            <span className="brand-icon">🗒️</span>
            <span className="brand-text">Browser Notes</span>
          </div>
          <div className="top-actions">
            <div className="env-chip" title="Environment">
              {process.env.REACT_APP_NODE_ENV || 'development'}
            </div>
          </div>
        </div>
      </header>

      <main className="container main" role="main">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{editingNote ? 'Edit Note' : 'Add Note'}</h2>
          </div>
          <div id="note-form-anchor" />
          <NoteForm
            initialNote={editingNote}
            onCancel={() => setEditingNote(null)}
            onSave={handleSave}
          />
        </section>

        <section className="panel">
          <div className="panel-head list-head">
            <h2 className="panel-title">Your Notes</h2>
            <div className="search">
              <input
                className="input search-input"
                type="search"
                placeholder="Search notes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search notes"
              />
            </div>
          </div>
          <NotesList notes={filteredNotes} onDelete={handleDelete} onEdit={startEdit} />
        </section>
      </main>

      <footer className="footer" role="contentinfo">
        <div className="container">
          <span className="footer-text">
            Notes are stored locally in your browser. No data is sent to any server.
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
