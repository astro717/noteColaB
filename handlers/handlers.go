package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"noteColaB/middleware"
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

func EnableCors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
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

	// iniciamos sesion automaticamente
	http.SetCookie(w, &http.Cookie{
		Name:  "session_id",
		Value: req.Username,
		Path:  "/",
	})

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("user registeres succesfully"))
}

// GetUserIDHandler handles requests to retrieve the current user's ID
func GetUserIDHandler(w http.ResponseWriter, r *http.Request) {
	// Set response headers
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Content-Type", "application/json")

	// Get user ID from the session
	userID, err := middleware.GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Send the user ID as a JSON response
	response := map[string]int{"user_id": userID}
	json.NewEncoder(w).Encode(response)
}
