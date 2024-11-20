package middleware

import (
	"net/http"
	"noteColaB/utils"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// buscamos cookie de sesion
		_, err := r.Cookie("session_id")
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		// si la cookie existe:
		next.ServeHTTP(w, r)
	})
}

func GetUserIDFromRequest(r *http.Request) (int, error) {
	// Implementar la lógica para obtener el ID de usuario de la solicitud
	sessionID, err := r.Cookie("session_id")
	if err != nil {
		return 0, err
	}
	userID, err := utils.GetUserIDBySession(sessionID.Value)
	if err != nil {
		return 0, err
	}
	return userID, nil
}
