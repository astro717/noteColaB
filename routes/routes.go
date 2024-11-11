package routes

import (
	"noteColaB/handlers"

	"github.com/gorilla/mux"
)

func SetupRoutes() *mux.Router {

	router := mux.NewRouter()
	router.HandleFunc("/notes", handlers.GetNotes).Methods("GET")
	router.HandleFunc("/notes", handlers.CreateNote).Methods("POST")
	return router
}
