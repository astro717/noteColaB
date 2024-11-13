import React from 'react';

function CreateNote() {
    return (
        <div>
            <h2>Crear Nueva Nota</h2>
            <form action="/notes" method="post">
                <label>Título:</label>
                <input type="text" name="title" />
                <label>Contenido:</label>
                <textarea name="content"></textarea>
                <button type="submit">Guardar Nota</button>
            </form>
        </div>
    );
}

export default CreateNote;
