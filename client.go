package main

import (
	"encoding/json"
	"log"
	"noteColaB/utils"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 * 1024
)

type Client struct {
	Hub    *Hub
	NoteID int
	UserID int
	Color  string
	Conn   *websocket.Conn
	Send   chan []byte
	mu     sync.Mutex
}

type Message struct {
	Type     string          `json:"type"`
	Content  string          `json:"content,omitempty"`
	UserID   int             `json:"userId,omitempty"`
	Color    string          `json:"color,omitempty"`
	Position json.RawMessage `json:"position,omitempty"`
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			w.Write(message)

			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	userInfo := struct {
		Type   string `json:"type"`
		UserID int    `json:"userId"`
	}{
		Type:   "userInfo",
		UserID: c.UserID,
	}

	infoBytes, _ := json.Marshal(userInfo)
	c.Send <- infoBytes

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, rawMessage, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var message Message
		if err := json.Unmarshal(rawMessage, &message); err != nil {
			log.Printf("error unmarshaling message: %v", err)
			continue
		}

		message.UserID = c.UserID
		message.Color = c.Color

		switch message.Type {
		case "contentUpdate":
			c.handleContentUpdate(&message)

		case "requestContent":
			c.handleRequestContent()

		case "userConnected":
			c.handleUserConnected(&message)

		case "userDisconnected":
			c.handleUserDisconnected(&message)
		}
	}
}

func (c *Client) handleContentUpdate(message *Message) {
	c.mu.Lock()
	err := utils.UpdateNoteContent(c.NoteID, message.Content)
	c.mu.Unlock()

	if err != nil {
		log.Printf("error updating note content: %v", err)
		return
	}

	noteData, err := utils.GetNoteWithCollaborators(c.NoteID)
	if err != nil {
		log.Printf("error getting updated note: %v", err)
		return
	}

	updateMessage := struct {
		Type    string      `json:"type"`
		Content string      `json:"content"`
		Note    *utils.Note `json:"note"`
		UserID  int         `json:"userId"`
	}{
		Type:    "contentUpdate",
		Content: message.Content,
		Note:    noteData,
		UserID:  c.UserID,
	}

	messageBytes, _ := json.Marshal(updateMessage)
	c.Hub.broadcast <- &BroadcastMessage{
		noteID: c.NoteID,
		data:   messageBytes,
		sender: c,
	}
}

func (c *Client) handleRequestContent() {
	noteData, err := utils.GetNoteWithCollaborators(c.NoteID)
	if err != nil {
		log.Printf("error getting note content: %v", err)
		return
	}

	updateMessage := struct {
		Type    string      `json:"type"`
		Content string      `json:"content"`
		Note    *utils.Note `json:"note"`
	}{
		Type:    "contentUpdate",
		Content: noteData.Content,
		Note:    noteData,
	}

	messageBytes, _ := json.Marshal(updateMessage)
	select {
	case c.Send <- messageBytes:
	default:
		log.Printf("Failed to send content to client %d", c.UserID)
	}
}

func (c *Client) handleUserConnected(message *Message) {
	messageBytes, _ := json.Marshal(message)
	c.Hub.broadcast <- &BroadcastMessage{
		noteID: c.NoteID,
		data:   messageBytes,
		sender: c,
	}
}

func (c *Client) handleUserDisconnected(message *Message) {
	messageBytes, _ := json.Marshal(message)
	c.Hub.broadcast <- &BroadcastMessage{
		noteID: c.NoteID,
		data:   messageBytes,
		sender: c,
	}
}
