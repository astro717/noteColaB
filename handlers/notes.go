package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"noteColaB/utils"
)

type Note struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

func GetNotes(w http.ResponseWriter, r *http.Request) {

	// Implementacion de logica para obtener notas
	w.Write([]byte("Get Notes endpoint"))
}

func CreateNote(w http.ResponseWriter, r *http.Request) {

	// Implemetacion de logica para crear notas
	w.Write([]byte("Create Note endpoint"))
}

func createNoteHandler(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		http.Error(w, "Forbidden method", http.StatusMethodNotAllowed)
		return
	}

	var newNote Note
	err := json.NewDecoder(r.Body).Decode(&newNote)
	if err != nil {
		http.Error(w, "Error when decoding the request", http.StatusBadRequest)
		return
	}

	_, err = utils.Db.Exec(`INSERT INTO notes (title, notes) VALUES (?, ?)`,
		newNote.Title, newNote.Content)
	if err != nil {
		log.Println("Error when inserting in database", err)
		http.Error(w, "Error saving the note", http.StatusInternalServerError)
		return
	}

	// si no da error
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Note created"))
}
