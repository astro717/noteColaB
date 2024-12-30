import React, { useState, useEffect, useCallback } from 'react';
import CollaborativeEditor from '../CollaborativeEditor';
import { debounce } from '../debounce';
import '../NoteEditor.css';

function NoteEditor({ note, onSave }) {
  const [title, setTitle] = useState(note ? note.title : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
// eslint-disable-next-line react-hooks/exhaustive-deps
  const saveNote = async (updates) => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...note,
        ...updates
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSaveTitle = useCallback(
    debounce(async (newTitle) => {
      try {
        await saveNote({ title: newTitle });
      } catch (err) {
        console.error('Error saving title:', err);
      }
    }, 1000),
    [note]
  );

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSaveTitle(newTitle);
  };

  const handleContentSave = useCallback(async (content) => {
    if (!note?.id) return;
    try {
      await saveNote({ content });
    } catch (err) {
      console.error('Error saving content:', err);
      throw err;
    }
  }, [note, saveNote]);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
    }
  }, [note]);

  return (
    <div className="note-editor">
      <div className="status-bar flex items-center justify-end h-8 px-4">
        {error && (
          <span className="text-red-500 text-sm flex items-center">
            <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
            Error saving
          </span>
        )}
        {saving && (
          <span className="text-blue-500 text-sm flex items-center">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
            Saving...
          </span>
        )}
      </div>
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="note-title w-full px-4 py-2 text-xl font-medium border-none outline-none"
      />
      {note?.id ? (
        <CollaborativeEditor 
          noteId={note.id}
          initialContent={note.content}
          onSave={handleContentSave}
        />
      ) : (
        <div className="save-prompt p-4 text-center text-gray-500">
          Save note to start editing.
        </div>
      )}
    </div>
  );
}

export default NoteEditor;