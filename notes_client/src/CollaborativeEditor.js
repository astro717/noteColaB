import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { debounce } from './debounce';
import './Editor.css';

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SAVE_DELAY = 1000;

const StatusIndicator = ({ currentStatus, isConnected, collaborators }) => {
  const getStatusConfig = () => {
    if (!isConnected) {
      return {
        className: 'status-offline',
        text: 'Offline'
      };
    }
    switch (currentStatus) {
      case 'saving':
        return {
          className: 'status-saving',
          text: 'Saving...'
        };
      case 'saved':
        return {
          className: 'status-saved',
          text: 'Saved'
        };
      case 'error':
        return {
          className: 'status-error',
          text: 'Error saving'
        };
      default:
        return {
          className: '',
          text: ''
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className={`status-indicator ${statusConfig.className}`}>
      <div className="collaborators">
        {collaborators.map((collaborator) => (
          <div
            key={collaborator.id}
            className="collaborator-avatar"
            style={{ backgroundColor: collaborator.color }}
            title={`Collaborator ${collaborator.id}`}
          />
        ))}
      </div>
      <div className="status-content">
        <span className="status-dot" />
        <span className="status-text">{statusConfig.text}</span>
      </div>
    </div>
  );
};

const CollaborativeEditor = ({ noteId, onSave, initialContent }) => {
  const [editorStatus, setEditorStatus] = useState('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);
  const lastContentRef = useRef(initialContent || '');
  const isLocalUpdateRef = useRef(false);
  const isSavingRef = useRef(false);
  const editorRef = useRef(null);
  const currentNoteIdRef = useRef(noteId);

  const userColor = useMemo(() => 
    '#' + Math.floor(Math.random()*16777215).toString(16),
  []);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || '',
    onUpdate: ({ editor }) => {
      if (isLocalUpdateRef.current) {
        isLocalUpdateRef.current = false;
        return;
      }
      const html = editor.getHTML();
      handleContentUpdate(html, false);
    }
  });

  const cleanupWebSocket = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'userDisconnected'
        }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setCollaborators([]);
  }, []);

  const performSave = useCallback(async (html) => {
    if (!onSave || isSavingRef.current || html === lastContentRef.current) return;
    
    try {
      isSavingRef.current = true;
      setEditorStatus('saving');
      await onSave(html);
      lastContentRef.current = html;
      setEditorStatus('saved');
    } catch (error) {
      console.error('Error saving:', error);
      setEditorStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave]);

  const debouncedSave = useMemo(
    () => debounce((html) => performSave(html), SAVE_DELAY),
    [performSave]
  );

  const handleContentUpdate = useCallback((content, isRemote = false) => {
    if (!editorRef.current) return;

    if (isRemote) {
      isLocalUpdateRef.current = true;
      const currentSelection = editorRef.current.state.selection;
      editorRef.current.commands.setContent(content, false);
      editorRef.current.commands.setTextSelection(currentSelection);
    } else {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'contentUpdate',
          content: content
        }));
      }
      debouncedSave(content);
    }
  }, [debouncedSave]);

  const connectWebSocket = useCallback(() => {
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnectingRef.current = true;
    cleanupWebSocket();
    
    const socket = new WebSocket(`ws://localhost:8080/notes/ws/${currentNoteIdRef.current}`);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      isConnectingRef.current = false;
      
      socket.send(JSON.stringify({
        type: 'userConnected',
        color: userColor
      }));

      // Solicitar contenido actual
      socket.send(JSON.stringify({
        type: 'requestContent'
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'contentUpdate':
            if (data.content && data.userId !== wsRef.current?.userId) {
              handleContentUpdate(data.content, true);
            }
            if (data.note?.content) {
              lastContentRef.current = data.note.content;
            }
            break;

          case 'userConnected':
            if (data.userId) {
              setCollaborators(prev => {
                const existingCollaborator = prev.find(c => c.id === data.userId);
                if (!existingCollaborator) {
                  return [...prev, { id: data.userId, color: data.color }];
                }
                return prev;
              });
            }
            break;

          case 'userDisconnected':
            if (data.userId) {
              setCollaborators(prev => prev.filter(c => c.id !== data.userId));
            }
            break;

          default:
            console.log('Unknown message type:', data.type);
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    socket.onclose = (event) => {
      if (!event.wasClean) {
        console.log('WebSocket connection lost');
        setIsConnected(false);
        wsRef.current = null;

        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current++;
            connectWebSocket();
          }, delay);
        }
      }
      isConnectingRef.current = false;
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnectingRef.current = false;
    };
  }, [userColor, handleContentUpdate, cleanupWebSocket]);

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  useEffect(() => {
    if (noteId !== currentNoteIdRef.current) {
      currentNoteIdRef.current = noteId;
      if (editor) {
        editor.commands.setContent(initialContent || '');
        lastContentRef.current = initialContent || '';
      }
      cleanupWebSocket();
      connectWebSocket();
    }
  }, [noteId, initialContent, editor, connectWebSocket, cleanupWebSocket]);

  useEffect(() => {
    if (!editor || !noteId) return;
    
    connectWebSocket();
    
    return () => {
      cleanupWebSocket();
    };
  }, [connectWebSocket, editor, noteId, cleanupWebSocket]);

  if (!editor) {
    return <div className="editor-loading">Loading editor...</div>;
  }

  return (
    <div className="editor-container">
      <StatusIndicator 
        currentStatus={editorStatus}
        isConnected={isConnected}
        collaborators={collaborators}
      />
      <EditorContent editor={editor} />
    </div>
  );
};

export default CollaborativeEditor;
