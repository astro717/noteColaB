package routes

import (
	"net/http"
	"noteColaB/handlers"

	"github.com/gorilla/mux"
)

func SetupRoutes() *mux.Router {

	router := mux.NewRouter()
	router.HandleFunc("/notes", handlers.GetNotes).Methods("GET")
	router.HandleFunc("/notes", handlers.CreateNote).Methods("POST")
	return router
}

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Welcome to the Homepage"))
}
