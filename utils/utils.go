package utils

import (
	"database/sql"
	"log"

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

	createTableNotes := `CREATE TABLE Notes (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						title TEXT NOT NULL,
						content TEXT NOT NULL,
						created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`

	// Exec() no devuelve un valor por eso ponemos _ porque en GO las variables que se declaran
	// tienen que usarse por eso ignoramos el valor de retorno
	_, err = Db.Exec(createTableNotes)
	if err != nil {
		log.Fatal("Error creating table:", err) // detener ejecucion si ocurre error critico
	} else {
		log.Println("Table 'Notes' created")
	}
	return nil
}
