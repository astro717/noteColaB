package routes

import (
	"net/http"
	"noteColaB/handlers"

	"github.com/gorilla/mux"
)

func SetupRoutes() *mux.Router {

	r := mux.NewRouter()

	// rutas de API
	r.HandleFunc("/", HomeHandler).Methods("GET")
	r.HandleFunc("/login", handlers.LoginHandler).Methods("POST")
	r.HandleFunc("/register", handlers.RegisterHandler).Methods("POST")
	r.HandleFunc("/notes", handlers.GetNotes).Methods("GET")
	r.HandleFunc("/notes", handlers.CreateNote).Methods("POST")

	return r
}

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Welcome to the Homepage"))
}
