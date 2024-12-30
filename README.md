# noteColaB
#### Video Demo:  <https://youtu.be/JSP4MmIBSMQ>
#### Description:
noteColaB is a collaborative note-taking web application where multiple users can edit the same note simultaneously, similar to Google Docs. The project combines the collaborative power of Google Docs with the modern design aesthetics of Notion and Obsidian. While it doesn't match the full capabilities of these established platforms, it demonstrates a functional approach to real-time collaborative note-taking for my CS50 final project.

### Core Features
- Real-time collaborative note editing
- Live collaborator presence indicators
- Simple username-based collaboration system
- Status indicators for note changes
- Text formatting options (bold, italic, headers, colors)
- Practical keyboard shortcuts for efficient use
- Essential features including authentication, note management, and collaboration controls

### Design Philosophy
The application merges design elements from Notion and Obsidian, aiming for a clean and modern interface. With some help from ChatGPT, I found the right libraries to achieve this design goal. The layout consists of a functional sidebar for note organization and user controls, paired with a clean editor space. This design approach is consistent throughout the application, including modals and navigation elements.


### Technologies used Frontend
- React and Javascript for user interface
- TipTap for the text formatting 
- WebSockets for the real time communication
- shadcn/ui for UI components
- Font Awesome for iconography
- Tailwind for CSS styles


### Technologies used for Backend
- Go (Golang) for the server
- Gorilla WebSocket for connection management
- SQLite for the database
- Authentication system based on cookies

### Main Frontend Files
- CollaborativeEditor.js : component that manages the collaborative editor (where do you edit the notes)
- NotesPage.js : components that manages all the sidebar with its funcionality
- Editor.css: manages the css styles of the editor

### Main Bakckend files
- main.go : enter point of the server
- handlers.go : manages HTTP routes
- hub.go : manages WebSocket connections
- client.go : manages individual clients

### Key decisions
- SQLite : I chose it due to the fact that i was already familiar with it and it is more than enough for this app.
- WeBSockets: for the real time updates in the notes
- Authetication based on cookies: to manage efficiently the multiple different users.
- Golang: This was a programming language that I wanted to learn and I took the opportunity to learn it in practice with the final project due to its great compatibility with webapps.
- Javascript and CSS: already familiar with them thanks to cs50 and consider them essential for web development.
- React: more complex and easier in my opinion than html.

### Development Challenges
Throughout development, I encountered several significant challenges:

1. **UI Implementation**: Getting from design concept to actual code was challenging until finding the right UI libraries.

2. **Editor Design**: Creating a polished editing experience beyond basic text input took considerable research and testing.

3. **Auto-save Feature**: Moving from manual saves to automatic saving required solving several technical challenges, including page refresh issues and performance concerns.

4. **Collaboration System**: This proved to be the most demanding aspect, taking up about 70% of development time. Main challenges included:
   - Managing accurate user presence tracking
   - Implementing real-time updates
   - Synchronizing the database effectively
   - Resolving interconnected issues where solutions often created new challenges

The collaborative functionality especially taught me valuable lessons about handling real-time data synchronization and user state management. Despite the challenges, seeing everything work together made the effort worthwhile.
