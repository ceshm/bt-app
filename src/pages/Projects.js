import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  Select,
  Button,
  Tree,
  Typography,
  Space,
  message,
  Modal,
  Empty,
  Layout,
  Tooltip,
  Form,
  Input,
  DatePicker as AntDatePicker,
  Tag,
  Popover,
  Divider
} from 'antd';
import {
  BranchesOutlined,
  PlusOutlined,
  RollbackOutlined,
  SaveOutlined,
  EditOutlined,
  DeleteOutlined,
  ProjectOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import TaskTreeNode from "../components/TaskTreeNode";
import NotesPanel from '../components/NotesPanel';
import './Home.css'; // Reusing styles for now
import { ThemeContext } from '../context/ThemeContext';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

// Utility to convert flat list to tree structure
const buildTree = (items) => {
  if (!items) return [];
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

const ProjectsPage = () => {
  const { theme } = useContext(ThemeContext);
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [originalTreeData, setOriginalTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [notesPanelCollapsed, setNotesPanelCollapsed] = useState(
    localStorage.getItem('notesPanelCollapsed') === 'true'
  );
  const [isProjectModalVisible, setIsProjectModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    localStorage.setItem('notesPanelCollapsed', notesPanelCollapsed);
  }, [notesPanelCollapsed]);

  // Fetch all projects for the selector
  const loadAllProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      message.error('Failed to load projects.');
      console.error(error);
    } else {
      setProjects(data);
      // If no project is selected, or selected one is gone, select the first one
      if (!currentProjectId && data.length > 0) {
        setCurrentProjectId(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllProjects();
  }, []);

  // Fetch tree data for the selected project
  useEffect(() => {
    if (!currentProjectId) {
      setTreeData([]);
      setCurrentProject(null);
      return;
    };

    const fetchProjectData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', currentProjectId)
        .single();

      if (error) {
        message.error('Failed to load project data.');
        console.error(error);
        setTreeData([]);
        setOriginalTreeData([]);
        setCurrentProject(null);
      } else {
        setCurrentProject(data);
        const loadedData = data?.tree_data || [];
        setTreeData(loadedData);
        setOriginalTreeData(JSON.parse(JSON.stringify(loadedData))); // Deep copy
        const initialExpandedKeys = loadedData.filter(node => node.is_collapsed === false || node.is_collapsed === undefined).map(node => node.id);
        setExpandedKeys(initialExpandedKeys);
      }
      setLoading(false);
      setIsDirty(false);
    };

    fetchProjectData();
  }, [currentProjectId]);

  useEffect(() => {
    const keys = treeData.filter(node => node.is_completed).map(node => node.id);
    setCheckedKeys(keys);
  }, [treeData]);

  const handleProjectChange = (projectId) => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        setCurrentProjectId(projectId);
      }
    } else {
      setCurrentProjectId(projectId);
    }
  };

  const handleSave = async () => {
    if (!currentProjectId) return;
    setLoading(true);
    const { error } = await supabase
      .from('projects')
      .update({ tree_data: treeData, updated_at: new Date().toISOString() })
      .eq('id', currentProjectId);

    if (error) {
      message.error('Failed to save project.');
      console.error(error);
    } else {
      message.success('Project saved successfully!');
      setOriginalTreeData(JSON.parse(JSON.stringify(treeData)));
      setIsDirty(false);
    }
    setLoading(false);
  };

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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, handleSave]);

  const handleDrop = (info) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const data = [...treeStructure];

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
    const newTreeData = treeData.map(node => node.id === nodeId ? { ...node, title: newTitle } : node);
    setTreeData(newTreeData);
    setIsDirty(true);
  };

  const handleTimeChange = (nodeId, field, value) => {
    const newTreeData = treeData.map(node => node.id === nodeId ? { ...node, [field]: value } : node);
    setTreeData(newTreeData);
    setIsDirty(true);
  };

  const handleAddChild = (parentId) => {
    const siblings = treeData.filter(n => n.parent_id === parentId);
    const newNode = {
      id: uuidv4(), parent_id: parentId, title: 'New Child Task', position: siblings.length,
      is_completed: false, is_collapsed: false, time_estimated_minutes: null, time_taken_minutes: null,
    };
    setTreeData([...treeData, newNode]);
    setIsDirty(true);
  };

  const handleAddSibling = (nodeId) => {
    const targetNode = treeData.find(n => n.id === nodeId);
    if (!targetNode) return;
    const siblings = treeData.filter(n => n.parent_id === targetNode.parent_id);
    const newNode = {
      id: uuidv4(), parent_id: targetNode.parent_id, title: 'New Sibling Task', position: siblings.length,
      is_completed: false, is_collapsed: false, time_estimated_minutes: null, time_taken_minutes: null,
    };
    setTreeData([...treeData, newNode]);
    setIsDirty(true);
  };

  const handleDeleteNode = (nodeId) => {
    if (!window.confirm('Are you sure you want to delete this task and all its children?')) return;

    let newTreeData = [...treeData];
    const nodesToDelete = new Set([nodeId]);
    const findChildrenRecursive = (id) => {
      newTreeData.filter(n => n.parent_id === id).forEach(child => {
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
        subtree.push(JSON.parse(JSON.stringify(node))); // Deep copy nodes
        const children = allNodes.filter(n => n.parent_id === currentId);
        children.forEach(child => nodesToVisit.push(child.id));
      }
    }
    return subtree;
  };

  // --- Project Modal ---
  const showProjectModal = (project = null) => {
    setEditingProject(project);
    form.setFieldsValue(project ? {
      ...project,
      start_date: project.start_date ? dayjs(project.start_date) : null,
      target_date: project.target_date ? dayjs(project.target_date) : null,
      tags: project.tags?.join(', ')
    } : {
      name: '', description: '', status: 'active', tags: ''
    });
    setIsProjectModalVisible(true);
  };

  const handleProjectModalCancel = () => {
    setIsProjectModalVisible(false);
    setEditingProject(null);
    form.resetFields();
  };

  const handleProjectModalOk = async () => {
    try {
      const values = await form.validateFields();
      const projectData = {
        ...values,
        tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        start_date: values.start_date?.format('YYYY-MM-DD'),
        target_date: values.target_date?.format('YYYY-MM-DD'),
      };

      setLoading(true);
      if (editingProject) {
        // Update existing project
        const { data, error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id)
          .select()
          .single();
        if (error) throw error;
        message.success('Project updated!');
        setProjects(projects.map(p => p.id === data.id ? data : p));
        if(currentProjectId === data.id) setCurrentProject(data);
      } else {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert([{ ...projectData, tree_data: [] }])
          .select()
          .single();
        if (error) throw error;
        message.success('Project created!');
        setProjects([data, ...projects]);
        setCurrentProjectId(data.id); // Switch to the new project
      }
      setIsProjectModalVisible(false);
      setEditingProject(null);
      form.resetFields();
    } catch (error) {
      message.error(`Failed to ${editingProject ? 'update' : 'create'} project.`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;
    if (!window.confirm(`Are you sure you want to delete the project "${currentProject.name}"? This action cannot be undone.`)) return;

    setLoading(true);
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', currentProject.id);

    if (error) {
      message.error('Failed to delete project.');
      console.error(error);
    } else {
      message.success('Project deleted.');
      const newProjects = projects.filter(p => p.id !== currentProject.id);
      setProjects(newProjects);
      setCurrentProjectId(newProjects.length > 0 ? newProjects[0].id : null);
    }
    setLoading(false);
  };


  const computeMetrics = (nodes) => {
    if (!nodes) return {};
    const metrics = {};
    const childrenMap = new Map();

    nodes.forEach(node => {
      metrics[node.id] = {
        time_estimated_minutes: node.time_estimated_minutes || 0,
        time_taken_minutes: node.time_taken_minutes || 0,
        isLeaf: true,
      };
      if (node.parent_id) {
        if (!childrenMap.has(node.parent_id)) childrenMap.set(node.parent_id, []);
        childrenMap.get(node.parent_id).push(node.id);
      }
    });

    const getMetrics = (nodeId) => {
      if (!childrenMap.has(nodeId)) return metrics[nodeId];

      metrics[nodeId].isLeaf = false;
      const childrenIds = childrenMap.get(nodeId);
      const estimated = childrenIds.reduce((sum, childId) => sum + getMetrics(childId).time_estimated_minutes, 0);
      const taken = childrenIds.reduce((sum, childId) => sum + getMetrics(childId).time_taken_minutes, 0);

      metrics[nodeId].time_estimated_minutes = estimated;
      metrics[nodeId].time_taken_minutes = taken;

      return metrics[nodeId];
    }

    nodes.forEach(node => {
      if (!node.parent_id) getMetrics(node.id);
    });

    return metrics;
  };

  const computedMetrics = useMemo(() => computeMetrics(treeData), [treeData]);

  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
  const [modalNodeId, setModalNodeId] = useState(null);
  const [targetDate, setTargetDate] = useState(dayjs());

  const handleCopyToDate = (nodeId) => {
    setModalNodeId(nodeId);
    setIsCopyModalVisible(true);
  };

  const handleCopyToToday = (nodeId) => {
    setModalNodeId(nodeId);
    setTargetDate(dayjs());
    // Directly call the copy logic
    handleCopyModalOk(dayjs());
  };

  const handleCopyModalCancel = () => {
    setIsCopyModalVisible(false);
    setModalNodeId(null);
  };

  const handleCopyModalOk = async (date) => {
    const finalTargetDate = date || targetDate;
    if (!modalNodeId || !finalTargetDate) return;

    setLoading(true);
    setIsCopyModalVisible(false);

    const formattedTargetDate = finalTargetDate.format('YYYY-MM-DD');
    const subtree = getSubtree(modalNodeId, treeData);
    if (subtree.length === 0) {
      setLoading(false);
      return;
    }

    const idMapping = new Map();
    const newSubtree = subtree.map(node => {
      const newId = uuidv4();
      idMapping.set(node.id, newId);
      return { ...node, id: newId, is_completed: false }; // Reset completion status
    });

    newSubtree.forEach(node => {
      if (node.parent_id && idMapping.has(node.parent_id)) {
        node.parent_id = idMapping.get(node.parent_id);
      } else {
        node.parent_id = null; // It's a root of the copied branch
      }
    });

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
    const rootNodeInNewSubtree = newSubtree.find(n => n.id === idMapping.get(modalNodeId));
    if (rootNodeInNewSubtree) {
      rootNodeInNewSubtree.position = targetTreeData.filter(n => !n.parent_id).length;
    }
    const updatedTargetTreeData = [...targetTreeData, ...newSubtree];

    const { error: upsertError } = await supabase
      .from('daily_documents')
      .upsert({ date: formattedTargetDate, tree_data: updatedTargetTreeData }, { onConflict: 'date' });

    if (upsertError) {
      message.error(`Failed to copy tasks.`);
    } else {
      message.success(`Tasks copied to ${formattedTargetDate}.`);
    }

    setLoading(false);
    setModalNodeId(null);
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
        // Project-specific actions
        onCopyToDate={handleCopyToDate}
        onCopyToToday={handleCopyToToday}
      />
    );
  };

  const treeStructure = useMemo(() => buildTree(treeData), [treeData]);

  const pageSummary = useMemo(() => {
    if (!treeData) return { nodeCount: 0, totalEstimated: 0, totalTaken: 0 };
    const rootNodes = treeData.filter(n => !n.parent_id);
    const nodeCount = treeData.length;
    const totalEstimated = rootNodes.reduce((sum, node) => sum + (computedMetrics[node.id]?.time_estimated_minutes || 0), 0);
    const totalTaken = rootNodes.reduce((sum, node) => sum + (computedMetrics[node.id]?.time_taken_minutes || 0), 0);
    return { nodeCount, totalEstimated, totalTaken };
  }, [treeData, computedMetrics]);

  const projectMetadata = currentProject && (
    <div style={{ paddingBottom: '12px', background: theme === 'dark' ? '#1f1f1f' : '#fafafa', borderRadius: '8px' }}>
      <p>{currentProject.description}</p>
      <Space wrap>
        {currentProject.status && <Tag color="blue">{currentProject.status}</Tag>}
        {currentProject.tags?.map(tag => <Tag key={tag}>{tag}</Tag>)}
        {currentProject.start_date && <Text type="secondary">Start: {dayjs(currentProject.start_date).format('MMM D, YYYY')}</Text>}
        {currentProject.target_date && <Text type="secondary">Target: {dayjs(currentProject.target_date).format('MMM D, YYYY')}</Text>}
      </Space>
    </div>
  );

  return (
    <Layout className="layout-cont" style={{ minHeight: '100vh' }}>
      <Content className="content" style={{ padding: '18px 24px', overflow: 'scroll' }}>
        <div className="title-bar" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Select
              variant="borderless"
              value={currentProjectId}
              placeholder="Select a project"
              style={{ minWidth: 155 }}
              onChange={handleProjectChange}
              loading={loading}
              options={projects.map(p => ({ value: p.id, label: p.name }))}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button type="link" onClick={() => showProjectModal()}><PlusOutlined /> Create project</Button>
                </>
              )}
            />
          </Space>
          <div className="title-bar-handle" style={{ display: 'flex', flex: 1, marginLeft: 12, alignItems: 'center' }}>
          </div>
          <Space>
            <Tooltip title="Add new root task"><Button onClick={handleAddNewTree} type="primary"><PlusOutlined style={{ position: 'absolute', right:10, bottom: 7, fontSize: '8px' }} /><BranchesOutlined /></Button></Tooltip>
            <Tooltip title="Save changes (⌘ S)"><Button onClick={handleSave} disabled={!isDirty || loading} loading={loading}><SaveOutlined /></Button></Tooltip>
            <Tooltip title="Discard changes"><Button onClick={handleDiscardChanges} disabled={!isDirty || loading}><RollbackOutlined /></Button></Tooltip>
          </Space>
        </div>


        <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
          {currentProject && projectMetadata}
          {currentProject && (
            <Space style={{ marginLeft: 12 }}>
              <Tooltip title="Edit Project Details"><Button size="small" icon={<EditOutlined />} onClick={() => showProjectModal(currentProject)} /></Tooltip>
              <Tooltip title="Delete Project"><Button size="small" danger icon={<DeleteOutlined />} onClick={handleDeleteProject} /></Tooltip>
            </Space>
          )}</Space>

          <Space style={{ opacity: 0.5 }}>
            <Typography.Text>Total Tasks: {pageSummary.nodeCount}</Typography.Text>
            <Typography.Text>Total Estimated: {pageSummary.totalEstimated}m</Typography.Text>
            <Typography.Text>Total Taken: {pageSummary.totalTaken}m</Typography.Text>
          </Space>
        </Space>

        {currentProjectId ? (
          treeData && treeData.length > 0 ? (
            <Tree
              treeData={treeStructure}
              draggable={{ icon: false }}
              blockNode
              showLine
              onCheck={handleCheck}
              checkedKeys={checkedKeys}
              onExpand={handleExpand}
              expandedKeys={expandedKeys}
              onDrop={handleDrop}
              titleRender={titleRender}
            />
          ) : (
            <Empty description="This project is empty. Add some tasks to get started!" />
          )
        ) : (
          <Empty description="No projects found. Create your first project to begin." />
        )}

        <Modal
          title={`${editingProject ? 'Edit' : 'Create'} Project`}
          visible={isProjectModalVisible}
          onOk={handleProjectModalOk}
          onCancel={handleProjectModalCancel}
          confirmLoading={loading}
        >
          <Form form={form} layout="vertical" name="project_form">
            <Form.Item name="name" label="Project Name" rules={[{ required: true, message: 'Please input the project name!' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="status" label="Status">
              <Select options={[{value: 'active', label: 'Active'}, {value: 'on-hold', label: 'On Hold'}, {value: 'completed', label: 'Completed'}, {value: 'archived', label: 'Archived'}]} />
            </Form.Item>
            <Form.Item name="tags" label="Tags (comma-separated)">
              <Input />
            </Form.Item>
            <Form.Item name="start_date" label="Start Date">
              <AntDatePicker />
            </Form.Item>
            <Form.Item name="target_date" label="Target Date">
              <AntDatePicker />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Copy to..."
          visible={isCopyModalVisible}
          onOk={() => handleCopyModalOk()}
          onCancel={handleCopyModalCancel}
        >
          <AntDatePicker value={targetDate} onChange={setTargetDate} />
        </Modal>
      </Content>
      <Sider
        collapsible
        collapsed={notesPanelCollapsed}
        onCollapse={setNotesPanelCollapsed}
        width={340}
        collapsedWidth={0}
        trigger={null}
        style={{ position: 'relative', height: '100vh', background: theme === 'dark' ? '#242829' : '#f0f2f5' }}
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

export default ProjectsPage;
