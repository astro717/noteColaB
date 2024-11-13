package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"noteColaB/utils"

	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {

	var req LoginRequest

	//decodificar el Json
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}

	// buscamos user en DB
	var hashedPassword string

	// queryRow porque solo queremos una fila que sera la del user
	// Exec se usa para insert, delete, update que no devuelven filas
	err := utils.Db.QueryRow(`SELECT hash FROM users WHERE username = ? `,
		req.Username).Scan(&hashedPassword)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Username or password incorrect", http.StatusUnauthorized)
		} else {
			http.Error(w, "Server error", http.StatusInternalServerError)
		}
		return
	}

	// comparamos passwords
	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword),
		[]byte(req.Password)); err != nil {
		http.Error(w, "username or password incorrect", http.StatusUnauthorized)
		return
	}

	// creamos cookie de sesion si password es correcta
	http.SetCookie(w, &http.Cookie{
		Name:  "session_id",
		Value: req.Username,
		Path:  "/",
	})

	w.Write([]byte("Logged in successfully!"))

}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {

	var req RegisterRequest

	// decodificar solicitud JSON
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}

	// hasheamos password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// Insertamos nuevo user en la tabla
	_, err = utils.Db.Exec(`INSERT INTO users (username, email, hash) VALUES (?, ?, ?)`,
		req.Username, req.Email, hashedPassword)

	if err != nil {
		http.Error(w, "Username already exists", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("user registeres succesfully"))
}
