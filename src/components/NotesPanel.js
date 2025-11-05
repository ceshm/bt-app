import React, { useState, useEffect, useContext } from 'react';
import { Button, Typography, Space, message, Empty } from 'antd';
import { getGlobalNotes, addGlobalNote, updateGlobalNote, deleteGlobalNote } from '../lib/supabaseClient';
import NoteCard from './NoteCard';
import { ThemeContext } from '../context/ThemeContext';

const { Title } = Typography;

const NotesPanel = () => {
  const { theme } = useContext(ThemeContext);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      const { data, error } = await getGlobalNotes();

      if (error) {
        message.error('Failed to fetch notes.');
        console.error('Error fetching notes:', error);
      } else {
        setNotes(data);
      }
      setLoading(false);
    };

    fetchNotes();
  }, []);

  const handleAddNewNote = async () => {
    const { data, error } = await addGlobalNote();

    if (error) {
      message.error('Failed to add new note.');
      console.error('Error adding new note:', error);
    } else if (data) {
      setNotes([data[0], ...notes]);
    }
  };

  const handleNoteChange = async (updatedNote, callback) => {
    const { error } = await updateGlobalNote(updatedNote.id, {
      title: updatedNote.title,
      body: updatedNote.body,
    });

    if (error) {
      message.error('Failed to save note.');
      console.error('Error updating note:', error);
      if (callback) callback(false);
    } else {
      // Update local state
      setNotes(notes.map(n => n.id === updatedNote.id ? {
        ...n, ...updatedNote,
        updated_at: new Date().toISOString()
      } : n));
      if (callback) callback(true);
    }
  };

  const handleNoteDelete = async (noteId) => {
    const { error } = await deleteGlobalNote(noteId);

    if (error) {
      message.error('Failed to delete note.');
      console.error('Error deleting note:', error);
    } else {
      setNotes(notes.filter(n => n.id !== noteId));
      message.success('Note deleted.');
    }
  };

  return (
    <div className={`notes-panel ${theme}`} style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: '16px' }}>
        <Title level={5} style={{ margin: 0 }}>Global Notes</Title>
        <Button type="primary" onClick={handleAddNewNote}>+ New Note</Button>
      </Space>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notes.length > 0 ? (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onNoteChange={handleNoteChange}
              onDelete={handleNoteDelete}
              theme={theme}
            />
          ))
        ) : (
          <Empty description="No notes yet. Click '+ New Note' to get started." />
        )}
      </div>
    </div>
  );
};

export default NotesPanel;
