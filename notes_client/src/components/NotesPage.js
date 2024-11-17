import React, { useState, useEffect, useRef } from 'react';
import NoteEditor from './NoteEditor';
import '../NotesPage.css';

function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sidebarRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const minWidth = 200;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [username, setUsername] = useState('');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const handleLogout = () => {
    // add logout logic here
    //navigate('/login');
  };

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8080/notes', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Error fetching notes');
      const data = await response.json();
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError('Error fetching the notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);


  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const cookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('session_id='));
        if (cookie) {
          const username = cookie.split('=')[1];
          setUsername(username);
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      }
    };
  
    fetchUsername();
  }, []);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarVisible((prev) => !prev);
      }
      // Add new shortcut for Ctrl+N
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleNewNote();
      }
    };
  
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectNote = (note) => {
    setSelectedNote(note);
  };

  const handleNewNote = () => {
    setSelectedNote({ id: null, title: '', content: '' });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newWidth = Math.max(minWidth, e.clientX);
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  if (loading) return <p>Loading notes...</p>;
  if (error) return <p>{error}</p>;

// NotesPage.js - Modify the return section
return (
  <div className="notes-page">
    <div
      ref={sidebarRef}
      className="sidebar"
      style={{
        width: isSidebarVisible ? `${sidebarWidth}px` : '0',
        visibility: isSidebarVisible ? 'visible' : 'hidden',
        transition: isDragging ? 'none' : 'width 0.3s ease, visibility 0.15s ease'
      }}
    >
      <button className="new-note-btn" onClick={handleNewNote}>
        + New Note
      </button>
      <div className="notes-list">
        {notes?.map((note) => (  // Add optional chaining
          <div
            key={note.id}
            className={`note-item ${selectedNote?.id === note.id ? 'active' : ''}`}
            onClick={() => handleSelectNote(note)}
          >
            {note.title || 'Untitled'}
          </div>
        ))}
      </div>

      <div className="user-bar">
        <div className="user-bar-left">
          <button 
            className="shortcuts-btn" 
            onClick={() => setShowShortcutsModal(true)}
          >
            <i className="fas fa-keyboard"></i>
          </button>
          <span className="user-name">{username || 'User'}</span>
        </div>
        <button 
          className="logout-btn" 
          onClick={() => setShowLogoutModal(true)}
        >
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>

      <div
        className="sidebar-resizer"
        onMouseDown={handleMouseDown}
        style={{ cursor: 'col-resize' }}
      />
    </div>

    <div 
      className="note-editor-container" 
      style={{ 
        flex: 1,
        padding: '16px',
      }}
    >
      {selectedNote ? (
        <NoteEditor note={selectedNote} onSave={fetchNotes} />
      ) : (
        <div className="empty-state">
          Select or create a new note to start editing or...<br/>
          <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
            Create a new note using (Ctrl + O)
          </span>
        </div>
      )}
    </div>
    
    {showLogoutModal && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3 className="modal-title">Are you sure you want to log out?</h3>
          <div className="modal-actions">
            <button className="cancel-btn" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </button>
            <button className="confirm-btn" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </div>
      </div>
    )}

    {showShortcutsModal && (
      <div className="modal-overlay">
        <div className="modal-content shortcuts-modal">
          <button 
            className="close-modal-btn"
            onClick={() => setShowShortcutsModal(false)}
          >
            <i className="fas fa-times"></i>
          </button>
          <h3 className="modal-title">Keyboard Shortcuts</h3>
          <div className="shortcuts-list">
            <div className="shortcut-item">
              <span className="shortcut-key">Ctrl + B</span>
              <span className="shortcut-desc">Toggle Sidebar</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">Ctrl + O</span>
              <span className="shortcut-desc">New Note</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}

export default NotesPage;