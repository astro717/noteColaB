package handlers

import (
	"encoding/json"
	"net/http"
	"noteColaB/utils"
)

type Note struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

func GetNotes(w http.ResponseWriter, r *http.Request) {

	// Implementacion de logica para obtener notas
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "user not authenticated", http.StatusUnauthorized)
		return
	}

	userID := cookie.Value
	// aqui usamos query porque el user puede tener mas de una nota
	rows, err := utils.Db.Query(`SELECT title, content FROM Notes WHERE user_id = ? `, userID)
	if err != nil {
		http.Error(w, "Error fetching your notes", http.StatusInternalServerError)
		return
	}

	// para evitar fugas de memoria con la base de datos y liberar conexiones
	// para optimizar el rendimiento
	defer rows.Close()

	// creamos lista de notas
	var notes []Note
	for rows.Next() {
		var note Note
		if err := rows.Scan(&note.Title, &note.Content); err != nil {
			http.Error(w, "Error scanning your notes", http.StatusInternalServerError)
			return
		}
		notes = append(notes, note)
	}

	// convertimos a json y enviamos por compatibilidad con
	// frontend en javascript
	w.Header().Set("Content-type", "application/json")
	json.NewEncoder(w).Encode(notes)

}

func CreateNote(w http.ResponseWriter, r *http.Request) {

	// Implemetacion de logica para crear notas
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := cookie.Value
	var newNote Note
	if err := json.NewDecoder(r.Body).Decode(&newNote); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	_, err = utils.Db.Exec(`INSERT INTO Notes(title, content, user_id) VALUES (?, ?, ?)`,
		newNote.Title, newNote.Content, userID)
	if err != nil {
		http.Error(w, "Error saving the note", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Note saved!"))
}
