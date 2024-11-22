import React, { useState, useEffect, useRef } from 'react';

import '../NoteEditor.css'
import Collaborative 
  

function NoteEditor({ note, onSave }) {
    const [title, setTitle] = useState(note ? note.title : '');
    const [isSaving, setIsSaving] = useState(false);
    const [content, setContent] = useState(note ? note.content : '');
    const [saveMessage, setSaveMessage] = useState('');
    const contentRef = useRef(null);
    const wsRef = useRef(null);
    const isUpdatingRef = useRef(false);
    


useEffect(() => {

setTitle(note ? note.title: '');
setContent(note ? note.content: '');

if (contentRef.current) {

contentRef.current.textContent = note ? note.content: '';

}

// close last connection if it exists
if (wsRef.current) {
    wsRef.current.close();
}

if (note && note.id) {
  const ws = new WebSocket(`ws://localhost:8080/notes/ws/${note.id}`);
  wsRef.current = ws;

  ws.onopen = () => {
    console.log('WebSocket conectado');
  };

  ws.onmessage = (event) => {
    const updatedContent = event.data;
    if (contentRef.current && updatedContent !== content) {
      isUpdatingRef.current = true;
      setContent(updatedContent);
      isUpdatingRef.current = false;
    }
  };

  ws.onclose = () => {
    console.log('WebSocket cerrado');
  };

  ws.onerror = (error) => {
    console.error('Error en WebSocket:', error);
  };
}

  return () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

}, [note]);

useEffect(() => {
  if (contentRef.current && !isUpdatingRef.current) {
    if (contentRef.current.innerText !== content) {
      isUpdatingRef.current = true;
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null; 
      const pos = range.startOffset;

      contentRef.current.innerText = content;

      if (range) {
        const restoredRange = document.createRange();
        restoredRange.setStart(contentRef.current.firstChild || contentRef.current, range.startOffset);
        restoredRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(restoredRange);
      }
      isUpdatingRef.current = false;
    }
  }
}, [content]);

// Enviar contenido al servidor al cambiar
const handleInput = (e) => {
  const newContent = e.currentTarget.innerText;
  setContent(newContent);
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isUpdatingRef.current) {
    wsRef.current.send(newContent);
  }
};

// Actualizar título
const handleTitleChange = (e) => {
  setTitle(e.target.value);
};

  

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
        const method = note?.id ? 'PUT' : 'POST';
        const url = note?.id
            ? `http://localhost:8080/notes/${note.id}`
            : 'http://localhost:8080/notes/';

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
        onChange={handleTitleChange}
        //onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className='note-title'
      />
      <div
        className='note-content'
        contentEditable
        suppressContentEditableWarning
        ref={contentRef}
        onInput={handleInput}
        //onInput={(e) => {}}
      />
      
      <div className="editor-actions">
        <button 
          className="save-btn" 
          onClick={handleSave} 
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
  
    </div>
  );
}
export default NoteEditor;
