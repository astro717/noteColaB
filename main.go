package main

import (
	"database/sql"
	"log"
	"net/http"
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

	r := routes.SetupRoutes()
	r.HandleFunc("/", routes.HomeHandler).Methods("GET")

	log.Println("Servidor iniciado en http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))

}

// devuelve puntero a sql.DB y un posible error
func initDB() (*sql.DB, error) {

	db, err := sql.Open("sqlite3", "./notes.db")
	if err != nil {
		return nil, err
	}

	// verify conection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	log.Println("Conection to SQLite stablished")
	return db, nil
}
