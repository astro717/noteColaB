package utils

import (
	"database/sql"
	"log"

	"errors"

	_ "github.com/mattn/go-sqlite3"
)

// puntero a la DB. variables exportadas deben empezar con mayuscula
var Db *sql.DB

func InitDB(dataSourceName string) error {

	var err error
	Db, err = sql.Open("sqlite3", dataSourceName)
	if err != nil {
		return err
	}

	if err = Db.Ping(); err != nil {
		return err
	}

	log.Println("Connection to SQLite stablished")

	if err = createUsersTable(); err != nil {
		return err
	}

	if err = createTableNotes(); err != nil {
		return err
	}

	return nil
}

func createUsersTable() error {
	createUsersTableSQL := `CREATE TABLE IF NOT EXISTS users (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							username TEXT NOT NULL UNIQUE,
							email TEXT NOT NULL UNIQUE,
							hash TEXT NOT NULL
	);`

	_, err := Db.Exec(createUsersTableSQL)
	if err != nil {
		return err
	} else {
		log.Println("Users table created succesfully")
	}
	return nil
}

func createTableNotes() error {
	createTableNotes := `CREATE TABLE IF NOT EXISTS Notes(
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		user_id INTEGER,
		content TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id));`

	// Exec() no devuelve un valor por eso ponemos _ porque en GO las variables que se declaran
	// tienen que usarse por eso ignoramos el valor de retorno
	_, err := Db.Exec(createTableNotes)
	if err != nil {
		return err
	} else {
		log.Println("Table 'Notes' created")
	}
	return nil
}

// GetUserIDBySession recibe el session_id y devuelve el user_id correspondiente
func GetUserIDBySession(sessionID string) (int, error) {
	var userID int
	err := Db.QueryRow(`SELECT id FROM users WHERE username = ?`, sessionID).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, errors.New("user not found")
		}
		return 0, err
	}
	return userID, nil
}
