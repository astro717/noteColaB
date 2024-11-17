package handlers

import (
	"encoding/json"
	"net/http"
	"noteColaB/utils"

	"github.com/gorilla/mux"
)

type Note struct {
	ID      string `json:"id"`
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

	userID, err := utils.GetUserIDBySession(cookie.Value)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	// aqui usamos query porque el user puede tener mas de una nota
	notes := []Note{}
	rows, err := utils.Db.Query(`SELECT id, title, content FROM Notes WHERE user_id = ? `, userID)
	if err != nil {
		http.Error(w, "Error fetching your notes", http.StatusInternalServerError)
		return
	}

	// para evitar fugas de memoria con la base de datos y liberar conexiones
	// para optimizar el rendimiento
	defer rows.Close()

	for rows.Next() {
		var note Note
		if err := rows.Scan(&note.ID, &note.Title, &note.Content); err != nil {
			http.Error(w, "Error scanning your notes", http.StatusInternalServerError)
			return
		}
		notes = append(notes, note)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Error reading your notes", http.StatusInternalServerError)
		return
	}

	// convertimos a json y enviamos por compatibilidad con // frontend en javascript
	w.Header().Set("Content-type", "application/json")
	if err := json.NewEncoder(w).Encode(notes); err != nil {
		http.Error(w, "Error encoding notes to JSON", http.StatusInternalServerError)
	}

}

func CreateNote(w http.ResponseWriter, r *http.Request) {

	// Implemetacion de logica para crear notas
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := utils.GetUserIDBySession(cookie.Value)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

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

func UpdateNote(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := utils.GetUserIDBySession(cookie.Value)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	noteID := vars["id"]

	var updatedNote Note
	if err := json.NewDecoder(r.Body).Decode(&updatedNote); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Verify note ownership before updating
	var count int
	err = utils.Db.QueryRow(`SELECT COUNT(*) FROM Notes WHERE id = ? AND user_id = ?`,
		noteID, userID).Scan(&count)
	if err != nil || count == 0 {
		http.Error(w, "Note not found or unauthorized", http.StatusNotFound)
		return
	}

	_, err = utils.Db.Exec(`UPDATE Notes SET title = ?, content = ? WHERE id = ? AND user_id = ?`,
		updatedNote.Title, updatedNote.Content, noteID, userID)
	if err != nil {
		http.Error(w, "Error updating note", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(updatedNote)
}

func DeleteNote(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := utils.GetUserIDBySession(cookie.Value)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	noteID := vars["id"]

	// Verify note ownership before deleting
	var count int
	err = utils.Db.QueryRow(`SELECT COUNT (*) FROM Notes WHERE id = ? AND user_id = ?`,
		noteID, userID).Scan(&count)
	if err != nil || count == 0 {
		http.Error(w, "Note not found or unauthorized", http.StatusNotFound)
		return
	}

	_, err = utils.Db.Exec(`DELETE FROM Notes WHERE id = ? AND user_id = ?`,
		noteID, userID)
	if err != nil {
		http.Error(w, "Error deleting note", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
