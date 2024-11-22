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

	if err = createTableNoteCollaborators(); err != nil {
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

func createTableNoteCollaborators() error {
	createTableNoteCollaborators := `CREATE TABLE IF NOT EXISTS NoteCollaborators(
		note_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		FOREIGN KEY(note_id) REFERENCES Notes(id),
		FOREIGN KEY(user_id) REFERENCES users(id),
		PRIMARY KEY (note_id, user_id)
	);`

	_, err := Db.Exec(createTableNoteCollaborators)
	if err != nil {
		return err
	} else {
		log.Println("Table 'NoteCollaborators' created")
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

func GetDB() *sql.DB {
	return Db
}

func UserHasAccessToNote(userID, noteID int) (bool, error) {
	db := GetDB()
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM notes WHERE id = ? AND user_id = ?", noteID, userID).Scan(&count)
	if err != nil {
		return false, err
	}
	if count > 0 {
		return true, nil
	}

	err = db.QueryRow("SELECT COUNT(*) FROM NoteCollaborators WHERE note_id = ? AND user_id = ?", noteID, userID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func UpdateNoteContent(noteID int, content string) error {
	db := GetDB()
	_, err := db.Exec("UPDATE notes SET content = ? WHERE id = ?", content, noteID)
	if err != nil {
		return err
	}
	return nil
}

func GetNoteContent(noteID int) (string, error) {
	db := GetDB()
	var content string
	err := db.QueryRow("SELECT content FROM notes WHERE id = ?", noteID).Scan(&content)
	if err != nil {
		return "", err
	}
	return content, nil
}

func AddCollaborator(noteID int, username string) error {
	db := GetDB()
	var userID int
	err := db.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("user not found")
		}
		return err
	}

	_, err = db.Exec("INSERT INTO NoteCollaborators (note_id, user_id) VALUES (?, ?)", noteID, userID)
	if err != nil {
		return err
	}
	return nil
}

func GetUserIDByUsername(username string) (int, error) {
	db := GetDB()
	var userID int
	err := db.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, errors.New("user not found")
		}
		return 0, err
	}
	return userID, nil
}

func AddCollaboratorToNote(noteID int, collaboratorID int) error {
	_, err := Db.Exec("INSERT INTO NoteCollaborators (note_id, user_id) VALUES (?, ?)", noteID, collaboratorID)
	return err
}
