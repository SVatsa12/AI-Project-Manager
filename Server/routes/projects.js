const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const { id, title, description, startDate, endDate, techStack, maxMembers, status } = req.body;
    
    if (!id || !title || !startDate || !endDate || !maxMembers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const project = new Project({
      id,
      title,
      description: description || '',
      startDate,
      endDate,
      techStack: techStack || '',
      maxMembers: parseInt(maxMembers),
      status: status || 'active',
      tasks: []
    });

    await project.save();
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('projects:updated', { action: 'create', project });
    }

    res.status(201).json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Project with this ID already exists' });
    }
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { title, description, startDate, endDate, techStack, maxMembers, status, tasks, members, userProgress } = req.body;
    
    const updateData = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (techStack !== undefined) updateData.techStack = techStack;
    if (maxMembers !== undefined) updateData.maxMembers = parseInt(maxMembers);
    if (status !== undefined) updateData.status = status;
    if (tasks !== undefined) updateData.tasks = tasks;
    if (members !== undefined) updateData.members = members;
    if (userProgress !== undefined) updateData.userProgress = userProgress;

    const project = await Project.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('projects:updated', { action: 'update', project });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error updating project:', error.message, error);
    res.status(500).json({ error: 'Failed to update project', details: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ id: req.params.id });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('projects:updated', { action: 'delete', projectId: req.params.id });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add task to project
router.post('/:id/tasks', async (req, res) => {
  try {
    const { taskId, title, status, assignee, description } = req.body;
    
    if (!taskId || !title) {
      return res.status(400).json({ error: 'Task ID and title are required' });
    }

    const project = await Project.findOne({ id: req.params.id });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const task = {
      id: taskId,
      title,
      status: status || 'todo',
      assignee: assignee || '',
      description: description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    project.tasks.push(task);
    project.updatedAt = new Date();
    await project.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('projects:updated', { action: 'task:add', project });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Update task in project
router.put('/:id/tasks/:taskId', async (req, res) => {
  try {
    const { title, status, assignee, description } = req.body;
    
    const project = await Project.findOne({ id: req.params.id });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const task = project.tasks.find(t => t.id === req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (title !== undefined) task.title = title;
    if (status !== undefined) task.status = status;
    if (assignee !== undefined) task.assignee = assignee;
    if (description !== undefined) task.description = description;
    task.updatedAt = new Date();

    project.updatedAt = new Date();
    await project.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('projects:updated', { action: 'task:update', project });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task from project
router.delete('/:id/tasks/:taskId', async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.tasks = project.tasks.filter(t => t.id !== req.params.taskId);
    project.updatedAt = new Date();
    await project.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('projects:updated', { action: 'task:delete', project });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
