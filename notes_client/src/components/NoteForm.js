// src/components/NoteForm.js
import React, { useState } from 'react';
import { createNote } from '../services/api';

const NoteForm = () => {
    const [note, setNote] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (note.trim()) {
            const newNote = { content: note };
            const response = await createNote(newNote);
            if (response) {
                alert('Nota agregada exitosamente');
                setNote(''); // Limpia el formulario
            } else {
                alert('Error al agregar la nota');
            }
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3>Agregar una nueva nota</h3>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Escribe tu nota aquí"
            ></textarea>
            <button type="submit">Agregar Nota</button>
        </form>
    );
};

export default NoteForm;
