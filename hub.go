package main

type Message struct {
	NoteID  int
	Content []byte
}

var (
	clients    = make(map[*Client]bool)
	broadcast  = make(chan Message)
	register   = make(chan *Client)
	unregister = make(chan *Client)
)

func RunHub() {
	for {
		select {
		case client := <-register:
			clients[client] = true
		case client := <-unregister:
			if _, ok := clients[client]; ok {
				delete(clients, client)
				close(client.Send)
			}
		case message := <-broadcast:
			for client := range clients {
				if client.NoteID == message.NoteID {
					select {
					case client.Send <- message.Content:
					default:
						close(client.Send)
						delete(clients, client)
					}
				}
			}
		}
	}
}
