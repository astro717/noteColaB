import React, { useState, useEffect, useRef } from 'react';
import NoteEditor from './NoteEditor';
import '../NotesPage.css';
import { useNavigate } from 'react-router-dom';
import './Modal.css';

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
  const [activeNoteMenu, setActiveNoteMenu] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const navigate = useNavigate();
  // para la version movil
  const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState(false);
  const [showCollaborateModal, setShowCollaborateModal] = useState(false);
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [collaborateError, setCollaborateError] = useState('');
  const [collaborateNoteId, setCollaborateNoteId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const isMobile = window.innerWidth <= 768;

  const handleSaveNote = async (updatedNote) => {
    try {
      const url = updatedNote.id 
        ? `http://localhost:8080/notes/${updatedNote.id}`
        : 'http://localhost:8080/notes/';
      
      const method = updatedNote.id ? 'PUT' : 'POST';
  
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedNote),
      });
  
      if (!response.ok) {
        throw new Error('failed to save the note');
      }
  
      try {
        const savedNote = await response.json();
        if (!updatedNote.id) {
          setSelectedNote(savedNote);
          setNotes(prevNotes => [...prevNotes, savedNote]);
        } else {
          setNotes(prevNotes =>
            prevNotes.map(note => 
              note.id === savedNote.id ? savedNote : note
            )
          );
        }
        return savedNote;
      } catch (jsonError) {
        fetchNotes();
        const latestNote = (await fetch('http://localhost:8080/notes/',{
          credentials: 'include',
        }).then(r=> r.json())).pop();
        setSelectedNote(latestNote);
        return latestNote;
      }
    } catch (error) {
      console.error('error saving note:', error);
      throw error;
    }
  };
  

  const handleLogout = () => {
    try {
      document.cookie = "session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      setUsername('');
      setNotes([]);
      setSelectedNote(null);
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleNoteOptions = (e, noteId) => {
    e.stopPropagation();
    setActiveNoteMenu(activeNoteMenu === noteId ? null : noteId);
  };
  
  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8080/notes/', {
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
  const handleDeleteNote = async (noteId) => {
    try {
      const response = await fetch(`http://localhost:8080/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
        
      if (!response.ok) {
        throw new Error('Error deleting note');
      }
  
      // Actualizar estado de forma atómica
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
      setSelectedNote(prev => prev?.id === noteId ? null : prev);
      setNoteToDelete(null);
      setActiveNoteMenu(null);
  
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Error deleting note'); // Añadir manejo de error visual
    }
  };


  useEffect(() => {
    const initializeNotes = async () => {
      if (!username) return; // Solo cargar notas si hay usuario
      await fetchNotes();
    };
    initializeNotes();
  }, [username]); 


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
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
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


  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch('http://localhost:8080/notes/getUserID', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.user_id);
        } else {
          console.error('Failed to fetch user ID');
        }
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    };
    fetchUserId();
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


  const handleCollaborate = async () => {
    if (!collaborateNoteId) {
      setCollaborateError('No note selected');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/notes/${collaborateNoteId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username: collaboratorUsername }),
      });
      if (response.ok) {
        closeCollaborateModal();
      } else {
        const errorText = await response.text();
        setCollaborateError(errorText);
      } 
    } catch (error) {
      setCollaborateError('Error adding collaborator. Please try again.');
    }
  };

  const closeCollaborateModal = () => {
    setShowCollaborateModal(false);
    setCollaborateNoteId(null);
    setCollaboratorUsername('');
    setCollaborateError('');
  };

  
    return (
      <div className="notes-page">
        
        <div
          ref={sidebarRef}
          className={`sidebar ${isMobile && isMobileSidebarVisible ? 'visible' : ''}`}
          style={{
            width: isSidebarVisible ? `${sidebarWidth}px` : '0',
            visibility: isSidebarVisible ? 'visible' : 'hidden',
            transition: isDragging ? 'none' : 'width 0.3s ease, visibility 0.15s ease',
          }}
        >
          <button className="new-note-btn" onClick={handleNewNote}>
            + New Note
          </button>
          <div className="notes-list">
            {notes?.map((note) => (
              <div
                key={note.id}
                className={`note-item ${selectedNote?.id === note.id ? 'active' : ''}`}
                onClick={() => handleSelectNote(note)}
              >
                <span>{note.title || 'Untitled'}
                  {note.user_id !== currentUserId && (
                    <i className= "fas fa-user-friends" title= "ColaBing"></i>
                  )}
                  {note.has_collaborators && (
                    <i className= "fas fa-user-friends" title= "ColaBing"></i>
                  )}
                </span>
                <button
                  className="note-options-btn"
                  onClick={(e) => handleNoteOptions(e, note.id)}
                >
                  <i className="fas fa-ellipsis-v"></i>
                </button>
                {activeNoteMenu === note.id && (
                  <div className="note-options-menu">
                    {note.user_id === currentUserId && (
                    <div
                      className="note-option delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(note);
                        setActiveNoteMenu(null);
                      }}
                    >
                      <i className="fas fa-trash"></i>
                      Delete
                    </div>
                    )}
                    <div
                      className="note-option collaborate"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollaborateNoteId(note.id);
                        setShowCollaborateModal(true);
                        setActiveNoteMenu(null);
                      }}
                    >
                      <i className="fas fa-user-plus"></i>
                      Collaborate
                    </div>
                  </div>
                )}
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
  
        {/* Overlay para móviles */}
        {isMobile && isMobileSidebarVisible && (
          <div
            className="sidebar-overlay"
            onClick={() => setIsMobileSidebarVisible(false)}
          ></div>
        )}
  
        {/* Contenido principal */}
        <div
          className="note-editor-container"
          style={{
            flex: 1,
            padding: '16px',
          }}
        >
          {selectedNote ? (
            <NoteEditor note={selectedNote} onSave={handleSaveNote} />
          ) : (
            <div className="empty-state">
              Select or create a new note to start editing or...<br />
              <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                Create a new note using (Ctrl + O)
              </span>
            </div>
          )}
        </div>
  
        {/* Modales */}
        {noteToDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Delete Note?</h3>
              <p className="modal-text">This action cannot be undone.</p>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setNoteToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={() => handleDeleteNote(noteToDelete.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {showLogoutModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Are you sure you want to log out?</h3>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowLogoutModal(false)}
                >
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
                  <span className="shortcut-key">Ctrl/Cmd + K</span>
                  <span className="shortcut-desc">Toggle Sidebar</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Ctrl/Cmd + O</span>
                  <span className="shortcut-desc">New Note</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Ctrl/Cmd + B</span>
                  <span className="shortcut-desc">Toggle Bold</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-key">Ctrl/Cmd + I</span>
                  <span className="shortcut-desc">Toggle Italic</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {showCollaborateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Add Collaborator</h3>
            <div className="form-group">
              <input
                type="text"
                value={collaboratorUsername}
                onChange={(e) => setCollaboratorUsername(e.target.value)}
                placeholder="Enter username to ColaB"
              />
              {collaborateError && <p className="error-message">{collaborateError}</p>}
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeCollaborateModal}>Cancel</button>
              <button className="add-btn" onClick={() => handleCollaborate()}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  
  export default NotesPage;