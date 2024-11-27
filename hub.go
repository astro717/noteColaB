package main

import (
	"encoding/json"
	"log"
	"sync"
)

type BroadcastMessage struct {
	noteID int
	data   []byte
	sender *Client
}

type Hub struct {
	clients     map[*Client]bool
	noteClients map[int]map[*Client]bool
	broadcast   chan *BroadcastMessage
	register    chan *Client
	unregister  chan *Client
	mu          sync.RWMutex
}

func newHub() *Hub {
	return &Hub{
		clients:     make(map[*Client]bool),
		noteClients: make(map[int]map[*Client]bool),
		broadcast:   make(chan *BroadcastMessage),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.handleRegister(client)
		case client := <-h.unregister:
			h.handleUnregister(client)
		case message := <-h.broadcast:
			h.handleBroadcast(message)
		}
	}
}

func (h *Hub) handleRegister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[client] = true
	if _, ok := h.noteClients[client.NoteID]; !ok {
		h.noteClients[client.NoteID] = make(map[*Client]bool)
	}
	h.noteClients[client.NoteID][client] = true

	// Enviar información de todos los colaboradores existentes al nuevo cliente
	for existingClient := range h.noteClients[client.NoteID] {
		if existingClient != client {
			existingMessage := Message{
				Type:   "userConnected",
				UserID: existingClient.UserID,
				Color:  existingClient.Color,
			}
			messageBytes, _ := json.Marshal(existingMessage)
			client.Send <- messageBytes
		}
	}

	// Notificar a otros sobre el nuevo cliente
	connectMessage := Message{
		Type:   "userConnected",
		UserID: client.UserID,
		Color:  client.Color,
	}
	messageBytes, _ := json.Marshal(connectMessage)

	h.broadcastToNote(client.NoteID, messageBytes, client)
}

func (h *Hub) handleUnregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		if noteClients, exists := h.noteClients[client.NoteID]; exists {
			delete(noteClients, client)
			if len(noteClients) == 0 {
				delete(h.noteClients, client.NoteID)
			} else {
				disconnectMessage := Message{
					Type:   "userDisconnected",
					UserID: client.UserID,
				}
				messageBytes, _ := json.Marshal(disconnectMessage)
				h.broadcastToNote(client.NoteID, messageBytes, nil)
			}
		}
		close(client.Send)
	}
}

func (h *Hub) handleBroadcast(message *BroadcastMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	h.broadcastToNote(message.noteID, message.data, message.sender)
}

func (h *Hub) broadcastToNote(noteID int, data []byte, sender *Client) {
	if clients, ok := h.noteClients[noteID]; ok {
		for client := range clients {
			if client != sender {
				select {
				case client.Send <- data:
					log.Printf("Broadcasted message to client %d", client.UserID)
				default:
					log.Printf("Failed to broadcast to client %d", client.UserID)
					go h.handleFailedClient(client)
				}
			}
		}
	}
}

func (h *Hub) handleFailedClient(client *Client) {
	h.unregister <- client
}
