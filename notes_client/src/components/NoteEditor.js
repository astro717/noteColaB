import React, { useState, useEffect, useRef } from 'react';

import '../NoteEditor.css'

  

function NoteEditor({ note, onSave }) {
    const [title, setTitle] = useState(note ? note.title : '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const contentRef = useRef(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

  
  

useEffect(() => {

setTitle(note ? note.title: '');

if (contentRef.current) {

contentRef.current.textContent = note ? note.content: '';

}

}, [note]);

  
const handleDelete = async () => {
    try {
      const response = await fetch(`http://localhost:8080/notes/${note.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Error deleting note');
      }

      // Call onSave to refresh notes list
      onSave();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };


  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
        const method = note?.id ? 'PUT' : 'POST';
        const url = note?.id
            ? `http://localhost:8080/notes/${note.id}`
            : 'http://localhost:8080/notes';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Important!
            body: JSON.stringify({ 
                title, 
                content: contentRef.current.textContent 
            }),
        });

        if (!response.ok) {
            throw new Error('Error saving note');
        }

        setSaveMessage('Note saved!')
        onSave();
        setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
        console.error(error);
        alert('Error saving note');
    } finally {
        setIsSaving(false);
    }
};
  

// NoteEditor.js
return (
    <div className='note-editor'>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className='note-title'
      />
      <div
        className='note-content'
        contentEditable
        suppressContentEditableWarning
        ref={contentRef}
        onInput={(e) => {
          // const newContent = e.currentTarget.textContent || '';
          // setContent(newContent);
        }}
      />
      
      <div className="editor-actions">
        <button 
          className="delete-btn" 
          onClick={() => setShowDeleteModal(true)}
        >
          <i className="fas fa-trash"></i>
        </button>
        <button 
          className="save-btn" 
          onClick={handleSave} 
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
  
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Delete Note?</h3>
            <p className="modal-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn" 
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default NoteEditor;
