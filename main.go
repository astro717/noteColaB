package main

import (
	"log"
	"net/http"
	"noteColaB/routes"
)

func main() {

	http.HandleFunc("/", routes.HomeHandler)

	log.Println("Servidor iniciado en http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))

}
