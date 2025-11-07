import React, { useState, useEffect } from 'react';
import { Input, InputNumber, Typography, Space, Dropdown, Menu, Button } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';

const TaskTreeNode = ({
  nodeData,
  metrics,
  onTitleChange,
  onTimeChange,
  onAddChild,
  onAddSibling,
  onDeleteNode,
  onCopyToNextDay,
  onMoveToNextDay,
  onCopyToDate,
  onMoveToDate,
  onCopyToToday
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(nodeData.title);

  useEffect(() => {
    setTitle(nodeData.title);
  }, [nodeData.title]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (title.trim() === '') {
      setTitle(nodeData.title); // revert if empty
      return;
    }
    onTitleChange(nodeData.id, title);
  };

  const handleTitleClick = () => {
    setIsEditing(true);
  };

  const isLeaf = metrics?.isLeaf;

  const menuItems = [
    { key: 'add_child', label: 'Add child', onClick: () => onAddChild(nodeData.id) },
    { key: 'add_sibling', label: 'Add sibling', onClick: () => onAddSibling(nodeData.id) },
    { type: 'divider' },
  ];

  if (onCopyToToday) {
    menuItems.push({ key: 'copy_today', label: 'Copy to Today', onClick: () => onCopyToToday(nodeData.id) });
  }
  if (onCopyToDate) {
    menuItems.push({ key: 'copy_date', label: 'Copy to Date...', onClick: () => onCopyToDate(nodeData.id) });
  }

  // For Home page
  if (onCopyToNextDay) {
    menuItems.push({ key: 'copy_next_day', label: 'Copy to next day', onClick: () => onCopyToNextDay(nodeData.id) });
  }
  if (onMoveToNextDay) {
    menuItems.push({ key: 'move_next_day', label: 'Move to next day', onClick: () => onMoveToNextDay(nodeData.id) });
  }
  if (onMoveToDate) {
    menuItems.push({ key: 'move_date', label: 'Move to date...', onClick: () => onMoveToDate(nodeData.id) });
  }

  menuItems.push({ type: 'divider' });
  menuItems.push({ key: 'delete', label: 'Delete', danger: true, onClick: () => onDeleteNode(nodeData.id) });

  const menu = <Menu items={menuItems} />;

  const handleKeyDown = (event) => {
    if (isEditing) {
      return;
    }

    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        onDeleteNode(nodeData.id);
        break;
      case 'a':
        event.preventDefault();
        onAddChild(nodeData.id);
        break;
      case 'c':
        event.preventDefault();
        onCopyToNextDay(nodeData.id);
        break;
      default:
        break;
    }
  };

  return (
    <div onKeyDown={handleKeyDown} style={{ width: '100%', display: 'flex', gap: '10%' }}>
      <div style={{ flex: 1 }}>
        {isEditing ? (
          <Input.TextArea
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            // onPressEnter={handleTitleBlur}
            autoFocus
            variant="borderless"
            style={{ flex: 1, width: '100%', minWidth: 400, padding: '2px 0', lineHeight: 1.5 }}
            autoSize={{ minRows: 1, maxRows: 24 }}
          />
        ) : (
          <div onClick={handleTitleClick} style={{ cursor: 'pointer', flex: 1 }}>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, padding: '2px 0', margin: 0 }}>{nodeData.title}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, placeSelf: 'center' }}>
        {isLeaf ? (
          <>
            <InputNumber
              min={0}
              value={nodeData.time_estimated_minutes}
              onChange={(value) => onTimeChange(nodeData.id, 'time_estimated_minutes', value)}
              placeholder="Est"
              step={30}
              size="small"
              style={{ width: 70, maxHeight: 25 }}
            />
            <InputNumber
              min={0}
              value={nodeData.time_taken_minutes}
              onChange={(value) => onTimeChange(nodeData.id, 'time_taken_minutes', value)}
              placeholder="Taken"
              step={30}
              size="small"
              style={{ width: 70, maxHeight: 25 }}
            />
          </>
        ) : (
          <>
            <Typography.Text type="secondary">
              Σ {metrics?.time_estimated_minutes || 0}m
            </Typography.Text>
            <Typography.Text type="secondary">
              Σ {metrics?.time_taken_minutes || 0}m
            </Typography.Text>
          </>
        )}
        <Dropdown overlay={menu} trigger={['hover']}>
          <Button type="text" size="small" icon={<EllipsisOutlined />} />
        </Dropdown>
      </div>
    </div>
  );
};

export default TaskTreeNode;
