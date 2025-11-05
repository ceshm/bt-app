import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Spin, Modal } from 'antd';
import { DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import useDebounce from '../hooks/useDebounce';
import './NoteCard.css';

dayjs.extend(relativeTime);

const { TextArea } = Input;
const { Text } = Typography;

const NoteCard = ({ note, onNoteChange, onDelete, theme }) => {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [savingStatus, setSavingStatus] = useState('idle'); // idle, saving, saved

  const debouncedTitle = useDebounce(title, 1000);
  const debouncedBody = useDebounce(body, 1000);

  useEffect(() => {
    if (debouncedTitle !== note.title || debouncedBody !== note.body) {
      setSavingStatus('saving');
      onNoteChange({ ...note, title: debouncedTitle, body: debouncedBody }, (success) => {
        if (success) {
          setSavingStatus('saved');
          setTimeout(() => setSavingStatus('idle'), 2000);
        } else {
          setSavingStatus('idle'); // Or maybe 'error'
        }
      });
    }
  }, [debouncedTitle, debouncedBody, note, onNoteChange]);

  const handleDelete = () => {
    Modal.confirm({
      title: 'Are you sure you want to delete this note?',
      onOk: () => onDelete(note.id),
    });
  };

  const renderSavingStatus = () => {
    switch (savingStatus) {
      case 'saving':
        return <Spin size="small" />;
      case 'saved':
        return <CheckCircleOutlined style={{ color: 'green' }} />;
      default:
        return null;
    }
  };

  return (
    <Card
      className={`note-card ${theme}`}
      style={{ marginBottom: '16px' }}
      bodyStyle={{ padding: '12px 14px' }}
      headStyle={{ padding: 2 }}
      title={
        <Input
          placeholder="Note title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          bordered={false}
          style={{ fontWeight: 'bold' }}
        />
      }
      extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={handleDelete} />}
    >
      <TextArea
        placeholder="Start typing..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        bordered={false}
        autoSize={{ minRows: 3, maxRows: 12 }}
        style={{ padding: 0 }}
      />
      <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: '4px' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Updated {dayjs(note.updated_at).fromNow()}
        </Text>
        {renderSavingStatus()}
      </Space>
    </Card>
  );
};

export default NoteCard;
