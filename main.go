package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"noteColaB/handlers"
	"noteColaB/middleware"
	"noteColaB/routes"
	"noteColaB/utils"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	_ "github.com/mattn/go-sqlite3"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	HandshakeTimeout: 10 * time.Second,
}

var hub *Hub

func main() {
	// Inicializar database
	err := utils.InitDB("notes.db")
	if err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}

	// Inicializar hub
	hub = newHub()
	go hub.run()

	// Configurar enrutador
	r := routes.SetupRoutes()
	r.Use(handlers.EnableCors)

	// Rutas protegidas con middleware autenticación
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

	hasAccess, err := utils.UserHasAccessToNote(userID, noteID)
	if err != nil || !hasAccess {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to websocket: %v", err)
		return
	}

	color := fmt.Sprintf("#%06x", rand.Intn(0xFFFFFF))

	client := &Client{
		Hub:    hub,
		NoteID: noteID,
		UserID: userID,
		Color:  color,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}

	client.Hub.register <- client

	go client.writePump()
	client.readPump()
}
