import React, { useState, useEffect, useMemo, useContext } from 'react';
import { DatePicker, Button, Tree, Typography, Space, message, Modal, Empty, Layout } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import TaskTreeNode from "../components/TaskTreeNode";
import NotesPanel from '../components/NotesPanel';
import './Home.css';
import { ThemeContext } from '../context/ThemeContext';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

// Utility to convert flat list to tree structure
const buildTree = (items) => {
  const itemMap = {};
  const roots = [];

  items.forEach(item => {
    itemMap[item.id] = { ...item, children: [], key: item.id }; // Add key for AntD Tree
  });

  items.forEach(item => {
    if (item.parent_id) {
      if (itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      }
    } else {
      roots.push(itemMap[item.id]);
    }
  });

  // Sort children by position
  for (const item of Object.values(itemMap)) {
    if (item.children) {
      item.children.sort((a, b) => a.position - b.position);
    }
  }
  // Sort roots by position
  roots.sort((a, b) => a.position - b.position);


  return roots;
};


const HomePage = () => {
  const { theme } = useContext(ThemeContext);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [treeData, setTreeData] = useState([]);
  const [originalTreeData, setOriginalTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [notesPanelCollapsed, setNotesPanelCollapsed] = useState(
    localStorage.getItem('notesPanelCollapsed') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('notesPanelCollapsed', notesPanelCollapsed);
  }, [notesPanelCollapsed]);

  const formattedDate = useMemo(() => selectedDate.format('YYYY-MM-DD'), [selectedDate]);

  useEffect(() => {
    const keys = treeData.filter(node => node.is_completed).map(node => node.id);
    setCheckedKeys(keys);
  }, [treeData]);

  useEffect(() => {
    const fetchTreeData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_documents')
        .select('tree_data')
        .eq('date', formattedDate)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
        message.error('Failed to load tasks.');
        console.error(error);
        setTreeData([]);
        setOriginalTreeData([]);
      } else {
        const loadedData = data?.tree_data || [];
        setTreeData(loadedData);
        setOriginalTreeData(JSON.parse(JSON.stringify(loadedData))); // Deep copy
        const initialExpandedKeys = loadedData.filter(node => node.is_collapsed === false || node.is_collapsed === undefined).map(node => node.id);
        setExpandedKeys(initialExpandedKeys);
      }
      setLoading(false);
      setIsDirty(false);
    };

    fetchTreeData();
  }, [formattedDate]);

  const handleDateChange = (date) => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        setSelectedDate(date);
      }
    } else {
      setSelectedDate(date);
    }
  };

  const handlePrevDay = () => handleDateChange(selectedDate.subtract(1, 'day'));
  const handleNextDay = () => handleDateChange(selectedDate.add(1, 'day'));

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('daily_documents')
      .upsert({ date: formattedDate, tree_data: treeData }, { onConflict: 'date' });

    if (error) {
      message.error('Failed to save tasks.');
      console.error(error);
    } else {
      message.success('Tasks saved successfully!');
      setOriginalTreeData(JSON.parse(JSON.stringify(treeData)));
      setIsDirty(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (isDirty) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDirty, handleSave]);

  const handleDiscardChanges = () => {
    if (window.confirm('Are you sure you want to discard all changes?')) {
      setTreeData(JSON.parse(JSON.stringify(originalTreeData)));
      setIsDirty(false);
    }
  }

  const handleAddNewTree = () => {
    const newRootNode = {
      id: uuidv4(),
      parent_id: null,
      title: 'New Task',
      position: treeData.filter(node => !node.parent_id).length,
      is_completed: false,
      is_collapsed: false,
      time_estimated_minutes: null,
      time_taken_minutes: null,
    };
    setTreeData([...treeData, newRootNode]);
    setIsDirty(true);
  };

  const handleDrop = (info) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const data = [...treeStructure]; // Use the nested structure

    // Find dragObject
    let dragObj;
    const loop = (data, key, callback) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          callback(data[i], i, data);
          return;
        }
        if (data[i].children) {
          loop(data[i].children, key, callback);
        }
      }
    };

    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      // Drop on the content
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj);
      });
    } else {
      let ar;
      let i;
      loop(data, dropKey, (item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj);
      } else {
        ar.splice(i + 1, 0, dragObj);
      }
    }

    const flatten = (tree, parent_id = null) => {
      let list = [];
      tree.forEach((node, i) => {
        const { children, key, ...rest } = node;
        const newNode = { ...rest, id: key, parent_id, position: i };
        list.push(newNode);
        if (children && children.length) {
          list = list.concat(flatten(children, node.key));
        }
      });
      return list;
    }

    const newFlatData = flatten(data);
    setTreeData(newFlatData);
    setIsDirty(true);
  };

  const handleCheck = (checkedKeysValue) => {
    const newTreeData = treeData.map(node => ({
      ...node,
      is_completed: checkedKeysValue.includes(node.id)
    }));
    setTreeData(newTreeData);
    setIsDirty(true);
  };

  const handleExpand = (newExpandedKeys) => {
    setExpandedKeys(newExpandedKeys);

    const newTreeData = treeData.map(node => {
      const isParent = treeData.some(child => child.parent_id === node.id);
      if (isParent) {
        const isExpanded = newExpandedKeys.includes(node.id);
        return { ...node, is_collapsed: !isExpanded };
      }
      return node;
    });

    setTreeData(newTreeData);
    setIsDirty(true);
  };

  const handleTitleChange = (nodeId, newTitle) => {
    const newTreeData = treeData.map(node => {
      if (node.id === nodeId) {
        return { ...node, title: newTitle };
      }
      return node;
    });
    setTreeData(newTreeData);
    setIsDirty(true);
  };

  const handleTimeChange = (nodeId, field, value) => {
    const newTreeData = treeData.map(node => {
      if (node.id === nodeId) {
        return { ...node, [field]: value };
      }
      return node;
    });
    setTreeData(newTreeData);
    setIsDirty(true);
  };

  const handleAddChild = (parentId) => {
    const siblings = treeData.filter(n => n.parent_id === parentId);
    const newNode = {
      id: uuidv4(),
      parent_id: parentId,
      title: 'New Child Task',
      position: siblings.length,
      is_completed: false,
      is_collapsed: false,
      time_estimated_minutes: null,
      time_taken_minutes: null,
    };
    setTreeData([...treeData, newNode]);
    setIsDirty(true);
  };

  const handleAddSibling = (nodeId) => {
    const targetNode = treeData.find(n => n.id === nodeId);
    if (!targetNode) return;
    const siblings = treeData.filter(n => n.parent_id === targetNode.parent_id);
    const newNode = {
      id: uuidv4(),
      parent_id: targetNode.parent_id,
      title: 'New Sibling Task',
      position: siblings.length,
      is_completed: false,
      is_collapsed: false,
      time_estimated_minutes: null,
      time_taken_minutes: null,
    };
    setTreeData([...treeData, newNode]);
    setIsDirty(true);
  };

  const handleDeleteNode = (nodeId, skipConfirmation = false) => {
    if (!skipConfirmation && !window.confirm('Are you sure you want to delete this task and all its children?')) {
      return;
    }

    let newTreeData = [...treeData];
    const nodesToDelete = new Set([nodeId]);

    const findChildrenRecursive = (id) => {
      const children = newTreeData.filter(n => n.parent_id === id);
      children.forEach(child => {
        nodesToDelete.add(child.id);
        findChildrenRecursive(child.id);
      });
    };

    findChildrenRecursive(nodeId);

    newTreeData = newTreeData.filter(n => !nodesToDelete.has(n.id));

    setTreeData(newTreeData);
    setIsDirty(true);
  };

  const getSubtree = (nodeId, allNodes) => {
    const subtree = [];
    const nodesToVisit = [nodeId];
    const visited = new Set();

    while (nodesToVisit.length > 0) {
      const currentId = nodesToVisit.pop();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = allNodes.find(n => n.id === currentId);
      if (node) {
        subtree.push(node);
        const children = allNodes.filter(n => n.parent_id === currentId);
        children.forEach(child => nodesToVisit.push(child.id));
      }
    }
    return subtree;
  };

  const handleCopyToNextDay = async (nodeId) => {
    setLoading(true);
    const subtree = getSubtree(nodeId, treeData);
    if (subtree.length === 0) {
      setLoading(false);
      return;
    }

    const nextDay = selectedDate.add(1, 'day').format('YYYY-MM-DD');

    const idMapping = new Map();
    const newSubtree = subtree.map(node => {
      const newId = uuidv4();
      idMapping.set(node.id, newId);
      return { ...node, id: newId };
    });

    newSubtree.forEach(node => {
      if (node.parent_id) {
        const newParentId = idMapping.get(node.parent_id);
        if (newParentId) {
          node.parent_id = newParentId;
        } else {
          node.parent_id = null;
        }
      }
    });

    const rootNodeInNewSubtree = newSubtree.find(n => n.id === idMapping.get(nodeId));
    if (rootNodeInNewSubtree) {
      rootNodeInNewSubtree.parent_id = null;
    }

    const { data: nextDayDoc, error: fetchError } = await supabase
      .from('daily_documents')
      .select('tree_data')
      .eq('date', nextDay)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      message.error('Failed to fetch data for the next day.');
      setLoading(false);
      return;
    }

    const nextDayTreeData = nextDayDoc?.tree_data || [];
    const rootPosition = nextDayTreeData.filter(n => !n.parent_id).length;
    if (rootNodeInNewSubtree) {
      rootNodeInNewSubtree.position = rootPosition;
    }
    const updatedNextDayTreeData = [...nextDayTreeData, ...newSubtree];

    const { error: upsertError } = await supabase
      .from('daily_documents')
      .upsert({ date: nextDay, tree_data: updatedNextDayTreeData }, { onConflict: 'date' });

    if (upsertError) {
      message.error('Failed to copy tasks.');
    } else {
      message.success('Tasks copied to the next day.');
    }
    setLoading(false);
  };

  const handleMoveToNextDay = async (nodeId) => {
    setLoading(true);
    const subtree = getSubtree(nodeId, treeData);
    if (subtree.length === 0) {
      setLoading(false);
      return;
    }

    const nextDay = selectedDate.add(1, 'day').format('YYYY-MM-DD');

    const idMapping = new Map();
    const newSubtree = subtree.map(node => {
      const newId = uuidv4();
      idMapping.set(node.id, newId);
      return { ...node, id: newId };
    });

    newSubtree.forEach(node => {
      if (node.parent_id) {
        const newParentId = idMapping.get(node.parent_id);
        if (newParentId) {
          node.parent_id = newParentId;
        } else {
          node.parent_id = null;
        }
      }
    });

    const rootNodeInNewSubtree = newSubtree.find(n => n.id === idMapping.get(nodeId));
    if (rootNodeInNewSubtree) {
      rootNodeInNewSubtree.parent_id = null;
    }

    const { data: nextDayDoc, error: fetchError } = await supabase
      .from('daily_documents')
      .select('tree_data')
      .eq('date', nextDay)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      message.error('Failed to fetch data for the next day.');
      setLoading(false);
      return;
    }

    const nextDayTreeData = nextDayDoc?.tree_data || [];
    const rootPosition = nextDayTreeData.filter(n => !n.parent_id).length;
    if (rootNodeInNewSubtree) {
      rootNodeInNewSubtree.position = rootPosition;
    }
    const updatedNextDayTreeData = [...nextDayTreeData, ...newSubtree];

    const { error: upsertError } = await supabase
      .from('daily_documents')
      .upsert({ date: nextDay, tree_data: updatedNextDayTreeData }, { onConflict: 'date' });

    if (upsertError) {
      message.error('Failed to move tasks.');
    } else {
      message.success('Tasks moved to the next day.');
      handleDeleteNode(nodeId, true);
    }
    setLoading(false);
  };

  const computeMetrics = (nodes) => {
    const metrics = {};
    const childrenMap = new Map();

    nodes.forEach(node => {
      metrics[node.id] = {
        time_estimated_minutes: node.time_estimated_minutes || 0,
        time_taken_minutes: node.time_taken_minutes || 0,
        isLeaf: true,
      };
      if (node.parent_id) {
        if (!childrenMap.has(node.parent_id)) {
          childrenMap.set(node.parent_id, []);
        }
        childrenMap.get(node.parent_id).push(node.id);
      }
    });

    const getMetrics = (nodeId) => {
      if (!childrenMap.has(nodeId)) { // It's a leaf node in this context
        return metrics[nodeId];
      }

      metrics[nodeId].isLeaf = false;
      const childrenIds = childrenMap.get(nodeId);
      const estimated = childrenIds.reduce((sum, childId) => sum + getMetrics(childId).time_estimated_minutes, 0);
      const taken = childrenIds.reduce((sum, childId) => sum + getMetrics(childId).time_taken_minutes, 0);

      metrics[nodeId].time_estimated_minutes = estimated;
      metrics[nodeId].time_taken_minutes = taken;

      return metrics[nodeId];
    }

    nodes.forEach(node => {
      if (!node.parent_id) {
        getMetrics(node.id);
      }
    });

    return metrics;
  };

  const computedMetrics = useMemo(() => computeMetrics(treeData), [treeData]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [modalNodeId, setModalNodeId] = useState(null);
  const [targetDate, setTargetDate] = useState(dayjs());

  const handleCopyToDate = (nodeId) => {
    setModalNodeId(nodeId);
    setModalAction('copy');
    setIsModalVisible(true);
  };

  const handleMoveToDate = (nodeId) => {
    setModalNodeId(nodeId);
    setModalAction('move');
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setModalNodeId(null);
    setModalAction(null);
  };

  const handleModalOk = async () => {
    if (!modalNodeId || !modalAction || !targetDate) return;

    setLoading(true);
    setIsModalVisible(false);

    const formattedTargetDate = targetDate.format('YYYY-MM-DD');

    const subtree = getSubtree(modalNodeId, treeData);
    if (subtree.length === 0) {
      setLoading(false);
      return;
    }

    const idMapping = new Map();
    const newSubtree = subtree.map(node => {
      const newId = uuidv4();
      idMapping.set(node.id, newId);
      return { ...node, id: newId };
    });

    newSubtree.forEach(node => {
      if (node.parent_id) {
        const newParentId = idMapping.get(node.parent_id);
        if (newParentId) {
          node.parent_id = newParentId;
        } else {
          node.parent_id = null;
        }
      }
    });

    const rootNodeInNewSubtree = newSubtree.find(n => n.id === idMapping.get(modalNodeId));
    if (rootNodeInNewSubtree) {
      rootNodeInNewSubtree.parent_id = null;
    }

    const { data: targetDoc, error: fetchError } = await supabase
      .from('daily_documents')
      .select('tree_data')
      .eq('date', formattedTargetDate)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      message.error(`Failed to fetch data for ${formattedTargetDate}.`);
      setLoading(false);
      return;
    }

    const targetTreeData = targetDoc?.tree_data || [];
    const rootPosition = targetTreeData.filter(n => !n.parent_id).length;
    if (rootNodeInNewSubtree) {
      rootNodeInNewSubtree.position = rootPosition;
    }
    const updatedTargetTreeData = [...targetTreeData, ...newSubtree];

    const { error: upsertError } = await supabase
      .from('daily_documents')
      .upsert({ date: formattedTargetDate, tree_data: updatedTargetTreeData }, { onConflict: 'date' });

    if (upsertError) {
      message.error(`Failed to ${modalAction} tasks.`);
    } else {
      message.success(`Tasks ${modalAction}ed to ${formattedTargetDate}.`);
      if (modalAction === 'move') {
        handleDeleteNode(modalNodeId, true);
      }
    }

    setLoading(false);
    setModalNodeId(null);
    setModalAction(null);
  };


  const titleRender = (node) => {
    const metrics = computedMetrics[node.key];
    return (
      <TaskTreeNode
        nodeData={node}
        metrics={metrics}
        onTitleChange={handleTitleChange}
        onTimeChange={handleTimeChange}
        onAddChild={handleAddChild}
        onAddSibling={handleAddSibling}
        onDeleteNode={handleDeleteNode}
        onCopyToNextDay={handleCopyToNextDay}
        onMoveToNextDay={handleMoveToNextDay}
        onCopyToDate={handleCopyToDate}
        onMoveToDate={handleMoveToDate}
      />
    );
  };

  const treeStructure = useMemo(() => buildTree(treeData), [treeData]);

  const pageSummary = useMemo(() => {
    const rootNodes = treeData.filter(n => !n.parent_id);
    const nodeCount = treeData.length;
    const totalEstimated = rootNodes.reduce((sum, node) => sum + (computedMetrics[node.id]?.time_estimated_minutes || 0), 0);
    const totalTaken = rootNodes.reduce((sum, node) => sum + (computedMetrics[node.id]?.time_taken_minutes || 0), 0);

    return { nodeCount, totalEstimated, totalTaken };
  }, [treeData, computedMetrics]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '18px 24px', background: 'transparent' }}>
        <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button icon={<LeftOutlined />} onClick={handlePrevDay} />
            <DatePicker value={selectedDate} onChange={handleDateChange} allowClear={false} />
            <Button icon={<RightOutlined />} onClick={handleNextDay} />
            <Title level={4} style={{ margin: 0 }}>{selectedDate.format('dddd, MMMM D')}</Title>
          </Space>
          <Space>
            <Button onClick={handleAddNewTree} type="primary">Add New Tree</Button>
            <Button onClick={handleSave} disabled={!isDirty || loading} loading={loading}>
              Save <Text keyboard>⌘ S</Text>
            </Button>
            <Button onClick={handleDiscardChanges} disabled={!isDirty || loading}>Discard Changes</Button>
          </Space>
        </Space>
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text>Total Tasks: {pageSummary.nodeCount}</Typography.Text>
          <Typography.Text>Total Estimated: {pageSummary.totalEstimated}m</Typography.Text>
          <Typography.Text>Total Taken: {pageSummary.totalTaken}m</Typography.Text>
        </Space>

        {treeData.length > 0 ? (
          <Tree
            treeData={treeStructure}
            draggable
            blockNode
            showLine
            // checkable
            onCheck={handleCheck}
            checkedKeys={checkedKeys}
            onExpand={handleExpand}
            expandedKeys={expandedKeys}
            onDrop={handleDrop}
            titleRender={titleRender}
          />
        ) : (
          <Empty description={`Start adding tasks for ${selectedDate.format('MMMM D')}`} />
        )}

        <Modal
          title={`${modalAction === 'copy' ? 'Copy' : 'Move'} to...`}
          visible={isModalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
        >
          <DatePicker value={targetDate} onChange={setTargetDate} />
        </Modal>
      </Content>
      <Sider
        collapsible
        collapsed={notesPanelCollapsed}
        onCollapse={setNotesPanelCollapsed}
        width={340}
        collapsedWidth={0}
        trigger={null}
        style={{
          position: 'relative',
          height: '100vh',
          background: theme === 'dark' ? '#242829' : '#f0f2f5'
        }}
      >
        <NotesPanel />
        <Button
          className="sider-trigger"
          type="default"
          size="small"
          onClick={() => setNotesPanelCollapsed(!notesPanelCollapsed)}
        >
          Notes
        </Button>
      </Sider>
    </Layout>
  );
};

export default HomePage;
