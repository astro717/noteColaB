package main

import (
	"log"
	"net/http"
	"noteColaB/handlers"
	"noteColaB/middleware"
	"noteColaB/routes"
	"noteColaB/utils"

	_ "github.com/mattn/go-sqlite3" // solo se ejecuta el init que registra el driver
) // en database/sql (por eso el _)

func main() {

	// inicializar database
	err := utils.InitDB("notes.db")
	if err != nil {
		log.Fatalf("Error inicializing the database: %v", err)
	}

	// configurar enrutador
	r := routes.SetupRoutes()

	// ruta protegida con middleware autenticacion
	protected := r.PathPrefix("/notes").Subrouter()
	protected.Use(middleware.AuthMiddleware)
	protected.HandleFunc("/", handlers.GetNotes).Methods("GET")
	protected.HandleFunc("/", handlers.CreateNote).Methods("POST")

	log.Println("Servidor iniciado en http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", r))

}
