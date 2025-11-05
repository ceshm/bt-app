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
                        onMoveToDate
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

  const menu = (
    <Menu>
      <Menu.Item key="1" onClick={() => onAddChild(nodeData.id)}>Add child</Menu.Item>
      <Menu.Item key="2" onClick={() => onAddSibling(nodeData.id)}>Add sibling</Menu.Item>
      <Menu.Divider />
      <Menu.Item key="4" onClick={() => onCopyToNextDay(nodeData.id)}>Copy to next day</Menu.Item>
      <Menu.Item key="5" onClick={() => onMoveToNextDay(nodeData.id)}>Move to next day</Menu.Item>
      <Menu.Item key="6" onClick={() => onCopyToDate(nodeData.id)}>Copy to date...</Menu.Item>
      <Menu.Item key="7" onClick={() => onMoveToDate(nodeData.id)}>Move to date...</Menu.Item>
      <Menu.Divider />
      <Menu.Item key="3" danger onClick={() => onDeleteNode(nodeData.id)}>Delete</Menu.Item>
    </Menu>
  );

  return (
    <div style={{ width: '100%', display: 'flex', gap: '20%' }}>
      <div style={{ flex: 1 }}>
        {isEditing ? (
          <Input
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onPressEnter={handleTitleBlur}
            autoFocus
            style={{ flex: 1, width: '100%', minWidth: 400 }}
          />
        ) : (
          <div onClick={handleTitleClick} style={{ cursor: 'pointer', flex: 1 }}>
            <Typography.Text>{nodeData.title}</Typography.Text>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {isLeaf ? (
          <>
            <InputNumber
              min={0}
              value={nodeData.time_estimated_minutes}
              onChange={(value) => onTimeChange(nodeData.id, 'time_estimated_minutes', value)}
              placeholder="Est"
              style={{ width: 70 }}
            />
            <InputNumber
              min={0}
              value={nodeData.time_taken_minutes}
              onChange={(value) => onTimeChange(nodeData.id, 'time_taken_minutes', value)}
              placeholder="Taken"
              style={{ width: 70 }}
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
