// src/components/NoteList.js
import React, { useEffect, useState } from 'react';
import { getNotes } from '../services/api';

const NoteList = () => {
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        const fetchNotes = async () => {
            const data = await getNotes();
            setNotes(data);
        };
        fetchNotes();
    }, []);

    return (
        <div>
            <h2>Lista de Notas</h2>
            {notes.length > 0 ? (
                <ul>
                    {notes.map((note, index) => (
                        <li key={index}>{note.content}</li>
                    ))}
                </ul>
            ) : (
                <p>No hay notas disponibles.</p>
            )}
        </div>
    );
};

export default NoteList;
