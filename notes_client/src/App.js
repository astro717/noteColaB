// src/App.js
import React from 'react';
import NoteList from './components/NoteList';
import NoteForm from './components/NoteForm';

function App() {
    return (
        <div className="App">
            <h1>Servidor de Notas Colaborativo</h1>
            <NoteForm />
            <NoteList />
        </div>
    );
}

export default App;

