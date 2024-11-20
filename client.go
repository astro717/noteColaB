package main

import (
	"log"
	"noteColaB/utils"

	"github.com/gorilla/websocket"
)

// client represents a single chatting user
type Client struct {
	NoteID int
	Conn   *websocket.Conn
	Send   chan []byte
}

// this listens for new messages from the client
func (c *Client) ReadMessages() {
	defer func() {
		unregister <- c
		c.Conn.Close()
	}()
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		// update note in database
		err = utils.UpdateNoteContent(c.NoteID, string(message))
		if err != nil {
			log.Println("Error updating note content:", err)
		}
		broadcast <- Message{
			NoteID:  c.NoteID,
			Content: message,
		}
	}
}

// this sends messages to the client
func (c *Client) WriteMessages() {
	defer c.Conn.Close()
	for message := range c.Send {
		err := c.Conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			break
		}
	}
}
