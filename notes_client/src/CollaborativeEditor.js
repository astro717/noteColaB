import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider('ws://localhost:1234', 'my-roomname', ydoc);
const awareness = provider.awareness;

const CollaborativeEditor = () => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Collaboration.configure({
                document: ydoc,
            }),
            CollaborationCursor.configure({
                provider: awareness,
                user: {
                    name: 'User',
                    color: '#f783ac',
                },
            }),
        ],
    });
    useEffect(() => {
        return () => {
            editor?.destroy();
            provider.disconnect();
        };
    }, [editor]);
    
    return <EditorContent editor={editor} />;
};

export default CollaborativeEditor;