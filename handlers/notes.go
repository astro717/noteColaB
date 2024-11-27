package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"noteColaB/middleware"
	"noteColaB/utils"
	"strconv"

	"github.com/gorilla/mux"
)

type Note struct {
	ID               int    `json:"id"`
	Title            string `json:"title"`
	Content          string `json:"content"`
	UserID           int    `json:"user_id"`
	HasCollaborators bool   `json:"has_collaborators"`
}

func GetNotes(w http.ResponseWriter, r *http.Request) {

	// Implementacion de logica para obtener notas
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "user not authenticated", http.StatusUnauthorized)
		log.Println("Error getting cookie", err)
		return
	}

	userID, err := utils.GetUserIDBySession(cookie.Value)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		log.Println("Error getting user id", err)
		return
	}

	// aqui usamos query porque el user puede tener mas de una nota
	notes := []Note{}
	rows, err := utils.Db.Query(`
  		SELECT DISTINCT Notes.id, Notes.title, Notes.content, Notes.user_id,
  		CASE WHEN EXISTS (
    	SELECT 1 FROM NoteCollaborators WHERE note_id = Notes.id
  		) THEN 1 ELSE 0 END AS has_collaborators
  		FROM Notes
  		LEFT JOIN NoteCollaborators ON Notes.id = NoteCollaborators.note_id
  		WHERE Notes.user_id = ? OR NoteCollaborators.user_id = ?
		`, userID, userID)
	if err != nil {
		http.Error(w, "Error fetching your notes", http.StatusInternalServerError)
		log.Println("error in sql query", err)
		return
	}

	// para evitar fugas de memoria con la base de datos y liberar conexiones
	// para optimizar el rendimiento
	defer rows.Close()

	for rows.Next() {
		var note Note
		if err := rows.Scan(&note.ID, &note.Title, &note.Content, &note.UserID, &note.HasCollaborators); err != nil {
			http.Error(w, "Error scanning your notes", http.StatusInternalServerError)
			log.Println("error scanning rows", err)
			return
		}
		notes = append(notes, note)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Error reading your notes", http.StatusInternalServerError)
		log.Println("error reading rows", err)
		return
	}

	// convertimos a json y enviamos por compatibilidad con // frontend en javascript
	w.Header().Set("Content-type", "application/json")
	if err := json.NewEncoder(w).Encode(notes); err != nil {
		http.Error(w, "Error encoding notes to JSON", http.StatusInternalServerError)
		log.Println("error coding json", err)
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

	// Verify note access before updating
	var count int
	err = utils.Db.QueryRow(`
        SELECT COUNT(*)
        FROM Notes
        LEFT JOIN NoteCollaborators ON Notes.id = NoteCollaborators.note_id
        WHERE Notes.id = ? AND (Notes.user_id = ? OR NoteCollaborators.user_id = ?)
    `, noteID, userID, userID).Scan(&count)
	if err != nil || count == 0 {
		http.Error(w, "Note not found or unauthorized", http.StatusNotFound)
		return
	}

	// Actualizar la nota permitiendo que colaboradores modifiquen
	_, err = utils.Db.Exec(`
        UPDATE Notes 
        SET title = ?, content = ? 
        WHERE id = ? AND EXISTS (
            SELECT 1 
            FROM Notes n
            LEFT JOIN NoteCollaborators nc ON n.id = nc.note_id
            WHERE n.id = ? AND (n.user_id = ? OR nc.user_id = ?)
        )`,
		updatedNote.Title, updatedNote.Content, noteID, noteID, userID, userID)

	if err != nil {
		log.Printf("Error updating note: %v", err)
		http.Error(w, "Error updating note", http.StatusInternalServerError)
		return
	}

	// Recuperar la nota actualizada para confirmar los cambios
	var updatedContent Note
	err = utils.Db.QueryRow(`
        SELECT id, title, content, user_id,
        CASE WHEN EXISTS (
            SELECT 1 FROM NoteCollaborators WHERE note_id = Notes.id
        ) THEN 1 ELSE 0 END AS has_collaborators
        FROM Notes
        WHERE id = ?
    `, noteID).Scan(
		&updatedContent.ID,
		&updatedContent.Title,
		&updatedContent.Content,
		&updatedContent.UserID,
		&updatedContent.HasCollaborators,
	)

	if err != nil {
		log.Printf("Error fetching updated note: %v", err)
		http.Error(w, "Error confirming update", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(updatedContent)
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

type CollaboratorRequest struct {
	Username string `json:"username"`
}

func AddCollaboratorHandler(w http.ResponseWriter, r *http.Request) {
	// Set appropriate headers
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Content-Type", "application/json")

	// Parse the note ID from the URL
	vars := mux.Vars(r)
	noteIDStr := vars["noteID"]
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		http.Error(w, "Invalid note ID", http.StatusBadRequest)
		return
	}

	// Get the current user ID from the session
	userID, err := middleware.GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if the user has access to the note
	hasAccess, err := utils.UserHasAccessToNote(userID, noteID)
	if err != nil || !hasAccess {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Decode the request body
	var collaboratorReq CollaboratorRequest
	err = json.NewDecoder(r.Body).Decode(&collaboratorReq)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get the collaborator's user ID
	collaboratorID, err := utils.GetUserIDByUsername(collaboratorReq.Username)
	if err != nil {
		http.Error(w, "Collaborator not found", http.StatusNotFound)
		return
	}

	// Add the collaborator to the note
	err = utils.AddCollaboratorToNote(noteID, collaboratorID)
	if err != nil {
		log.Printf("Error adding collaborator to note: %v", err)
		http.Error(w, "Error adding collaborator", http.StatusInternalServerError)
		return
	}

}
