// src/services/api.js

const API_URL = 'http://localhost:8080'; // URL del servidor Go

// Función para obtener las notas desde el backend
export const getNotes = async () => {
    try {
        const response = await fetch(`${API_URL}/notes`);
        if (!response.ok) {
            throw new Error('Error al obtener las notas');
        }
        return response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
};

// Función para crear una nueva nota en el backend
export const createNote = async (note) => {
    try {
        const response = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(note),
        });
        if (!response.ok) {
            throw new Error('Error al crear la nota');
        }
        return response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
};
