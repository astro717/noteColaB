package routes

import (
	"net/http"
	"noteColaB/handlers"

	"github.com/gorilla/mux"
)

func SetupRoutes() *mux.Router {

	r := mux.NewRouter()

	// rutas de API. el options es necesario para que el navegador sepa que el
	// dominio de origen tiene permiso para acceder a los recursos solicitados
	r.HandleFunc("/", HomeHandler).Methods("GET")
	r.HandleFunc("/login", handlers.LoginHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/register", handlers.RegisterHandler).Methods("POST", "OPTIONS")
	//r.HandleFunc("/notes", handlers.GetNotes).Methods("GET", "OPTIONS")
	//r.HandleFunc("/notes", handlers.CreateNote).Methods("POST", "OPTIONS")
	//r.HandleFunc("/notes/{id}", handlers.UpdateNote).Methods("PUT", "OPTIONS")

	return r
}

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Welcome to the Homepage"))
}
