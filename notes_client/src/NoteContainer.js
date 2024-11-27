import React, { useState } from 'react';
import NoteEditor from './NoteEditor';

function NoteContainer() {
  const [currentNote, setCurrentNote] = useState(null);

  const handleSave = async (noteData) => {
    try {
        console.log('Saving note:', noteData);
        const response = await fetch(`/api/notes/${noteData.id}`, {
            method: 'PUT',
            headers: {
            'Content-Type': 'application/json',
            'Credentials': 'include' // Para incluir las cookies
        },
        body: JSON.stringify({
          title: noteData.title,
          content: noteData.content
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save note: ${response.status.Text}');
      }
      
      const updatedNote = await response.json();
      console.log('Note saved:', updatedNote);
      return updatedNote;
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  };

  return (
    <div className="note-container">
      {/* Otros componentes de tu aplicación */}
      <NoteEditor 
        note={currentNote} 
        onSave={handleSave}
      />
    </div>
  );
}

export default NoteContainer;