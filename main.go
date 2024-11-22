package main

import (
	"log"
	"net/http"
	"noteColaB/handlers"
	"noteColaB/middleware"
	"noteColaB/routes"
	"noteColaB/utils"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	_ "github.com/mattn/go-sqlite3" // solo se ejecuta el init que registra el driver
) // en database/sql (por eso el _)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true //this allows all origins might need to change this in production
	},
}

func main() {

	// inicializar database
	err := utils.InitDB("notes.db")
	if err != nil {
		log.Fatalf("Error inicializing the database: %v", err)
	}

	// inicialize hub
	go RunHub()

	// configurar enrutador
	r := routes.SetupRoutes()
	r.Use(handlers.EnableCors)

	// ruta protegida con middleware autenticacion
	protected := r.PathPrefix("/notes").Subrouter()
	protected.Use(middleware.AuthMiddleware)
	protected.HandleFunc("/", handlers.GetNotes).Methods("GET", "OPTIONS")
	protected.HandleFunc("/", handlers.CreateNote).Methods("POST", "OPTIONS")
	protected.HandleFunc("/{id}", handlers.UpdateNote).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/{id}", handlers.DeleteNote).Methods("DELETE", "OPTIONS")
	protected.HandleFunc("/ws/{noteID}", handleWebSocket).Methods("GET", "OPTIONS")
	protected.HandleFunc("/{noteID}/collaborators", handlers.AddCollaboratorHandler).Methods("POST", "OPTIONS")
	protected.HandleFunc("/getUserID", handlers.GetUserIDHandler).Methods("GET", "OPTIONS")

	log.Println("Servidor iniciado en http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", r))

}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	noteIDStr := vars["noteID"]

	// convert noteID to int
	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		http.Error(w, "Invalid note ID", http.StatusBadRequest)
		return
	}

	userID, err := middleware.GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Verificar que el usuario tenga acceso a la nota
	hasAccess, err := utils.UserHasAccessToNote(userID, noteID)
	if err != nil || !hasAccess {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Actualizar la solicitud inicial a una conexión WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error al actualizar a WebSocket:", err)
		return
	}

	client := &Client{
		NoteID: noteID,
		Conn:   conn,
		Send:   make(chan []byte),
	}

	// Registrar el cliente
	register <- client

	// Manejar lectura y escritura en goroutines
	go client.WriteMessages()
	client.ReadMessages()
}
