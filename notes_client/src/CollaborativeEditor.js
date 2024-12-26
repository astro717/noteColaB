import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { debounce } from './debounce';
import './Editor.css';

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SAVE_DELAY = 1000;

const COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Gray', value: '#9BA3AF' },
  { name: 'Purple', value: '#0066cc' }, 
  { name: 'Red', value: '#FF5C5C' },
  { name: 'Green', value: '#4CAF50' }
];

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


const FloatingMenu = ({ editor }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!editor) return null;

  return (
    <BubbleMenu 
      className="floating-menu" 
      tippyOptions={{ duration: 100 }} 
      editor={editor}
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`menu-item-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
        title="Bold (Ctrl/Cmd + B)"
      >
        <i className="fas fa-bold"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`menu-item-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
        title="Italic (Ctrl/Cmd + I)"
      >
        <i className="fas fa-italic"></i>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`menu-item-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
      >
        <i className="fas fa-heading"></i>
      </button>
      <div className="color-picker-container">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="menu-item-btn"
        >
          <i className="fas fa-palette"></i>
        </button>
        {showColorPicker && (
          <div className="color-options">
            {COLORS.map((color) => (
              <button
                key={color.value}
                className="color-option"
                style={{ backgroundColor: color.value }}
                onClick={() => {
                  editor.chain().focus().setColor(color.value).run();
                  setShowColorPicker(false);
                }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </div>
    </BubbleMenu>
  );
};


const CollaborativeEditor = ({ noteId, onSave, initialContent }) => {
  const [editorStatus, setEditorStatus] = useState('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState(new Map());
  const currentUserIdRef = useRef(null);
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
    extensions: [StarterKit, TextStyle, Color],
    content: initialContent || '',
    onUpdate: ({ editor }) => {
      if (isLocalUpdateRef.current) {
        isLocalUpdateRef.current = false;
        return;
      }
      const html = editor.getHTML();
      handleContentUpdate(html, false);
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key.toLowerCase()) {
            case 'b':
              event.preventDefault();
              editor.chain().focus().toggleBold().run();
              return true;
            case 'i':
              event.preventDefault();
              editor.chain().focus().toggleItalic().run();
              return true;
            default:
              return false;
          }
        }
        return false;
      }
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
        const messages = event.data.split('\n');
        messages.forEach(msg => {
          if (!msg.trim()) return;
          const data = JSON.parse(msg);
          switch(data.type) {
            case 'contentUpdate': 
            if (data.content && data.userId !== currentUserIdRef.current) {
              handleContentUpdate(data.content, true);
            }
            break;

            case 'userConnected':
              if (data.userId) {
                setCollaborators(prev => {
                  const next = new Map(prev);
                  //dont add if user is current
                  if (data.userId !== currentUserIdRef.current) {
                    next.set(data.userId, {
                      id: data.userId,
                      color: data.color
                    });
                  }
                  return next;
                });
              }
          break;
          case 'userInfo':
            currentUserIdRef.current = data.userId;
            break;
          
          case 'userDisconnected':
            if (data.userId) {
              setCollaborators(prev => {
                const next = new Map(prev);
                next.delete(data.userId);
                return next;
              });
            }
            break;

            default: 
              console.log('Unknown message type:', data.type);
              break;
          }
        });
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
        collaborators={[...collaborators.values()]}
      />
      <EditorContent editor={editor} />
      <FloatingMenu editor={editor}/>
    </div>
  );
};

export default CollaborativeEditor;
