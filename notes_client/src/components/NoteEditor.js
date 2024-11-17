import React, { useState, useEffect, useRef } from 'react';

import '../NoteEditor.css'

  

function NoteEditor({ note, onSave }) {

const [title, setTitle] = useState(note ? note.title : '');

// const [content, setContent] = useState(note ? note.content : '');

const [isSaving, setIsSaving] = useState(false);

const [saveMessage, setSaveMessage] = useState('');

const contentRef = useRef(null);

  
  

useEffect(() => {

setTitle(note ? note.title: '');

if (contentRef.current) {

contentRef.current.textContent = note ? note.content: '';

}

}, [note]);

  
  

const handleSave = async () => {

if (isSaving) return;

setIsSaving(true);

setSaveMessage('');

  

try {

const method = note?.id ? 'PUT' : 'POST'; // Si existe un ID, usa PUT para actualizar

const url = note?.id

? `http://localhost:8080/notes/${note.id}`

: 'http://localhost:8080/notes';

  

const response = await fetch(url, {

method,

headers: {

'Content-Type': 'application/json',

},

credentials: 'include',

body: JSON.stringify({ title, content: contentRef.current.textContent }), // datos de la nota

});

if (!response.ok) {

throw new Error('Error saving note');

}

  

setSaveMessage('Note saved!')

onSave(); // actualizamos lista de notas

  

// eliminamos mensaje guardado al cabo de unos 3 segundos

setTimeout(() => setSaveMessage(''), 3000);

} catch (error) {

console.error(error);

alert('Error saving note');

} finally {

setIsSaving(false); // reactivamos boton

}

};

  

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

// const newContent = e.currentTarget.textContent || ''; // Capturar el contenido

// setContent(newContent); // Actualizar el estado del contenido

}}

>

</div>

  

<button onClick={handleSave} disabled={isSaving}>

{isSaving ? 'Saving...': 'Save'}

</button>

{saveMessage && <div className='save-message'>{saveMessage}</div>}

</div>

);

}

  

export default NoteEditor;
