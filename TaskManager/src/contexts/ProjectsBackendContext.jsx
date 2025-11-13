import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { apiFetch } from '../lib/api';

const ProjectsBackendContext = createContext();

export function useProjectsBackend() {
  const context = useContext(ProjectsBackendContext);
  if (!context) {
    throw new Error('useProjectsBackend must be used within ProjectsBackendProvider');
  }
  return context;
}

export function ProjectsBackendProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all projects from backend
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/projects');
      console.log('[ProjectsBackend] Fetched projects:', data.projects?.length || 0);
      console.log('[ProjectsBackend] First project sample:', data.projects?.[0]);
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Failed to fetch projects');
      // Fallback to empty array on error
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new project
  const createProject = useCallback(async (projectData) => {
    try {
      const data = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData)
      });
      setProjects(prev => [...prev, data.project]);
      return data.project;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  }, []);

  // Update project
  const updateProject = useCallback(async (projectId, updates) => {
    try {
      const data = await apiFetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      setProjects(prev => 
        prev.map(p => p.id === projectId ? { ...data.project } : p)
      );
      return data.project;
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  }, []);

  // Delete project
  const deleteProject = useCallback(async (projectId) => {
    try {
      await apiFetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  }, []);

  // Add task to project
  const addTask = useCallback(async (projectId, taskData) => {
    try {
      const data = await apiFetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      setProjects(prev => 
        prev.map(p => p.id === projectId ? { ...data.project } : p)
      );
      return data.project;
    } catch (err) {
      console.error('Error adding task:', err);
      throw err;
    }
  }, []);

  // Update task in project
  const updateTask = useCallback(async (projectId, taskId, updates) => {
    try {
      console.log('[ProjectsBackend] Updating task:', { projectId, taskId, updates });
      const data = await apiFetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      console.log('[ProjectsBackend] Task updated, new project:', data.project);
      setProjects(prev => 
        prev.map(p => p.id === projectId ? { ...data.project } : p)
      );
      return data.project;
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  }, []);

  // Delete task from project
  const deleteTask = useCallback(async (projectId, taskId) => {
    try {
      const data = await apiFetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      setProjects(prev => 
        prev.map(p => p.id === projectId ? { ...data.project } : p)
      );
      return data.project;
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  }, []);

  // Initialize: fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Socket.IO for real-time updates
  useEffect(() => {
    const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:4003';
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('[ProjectsBackend] Socket connected');
    });

    socket.on('projects:updated', (data) => {
      console.log('[ProjectsBackend] Socket received update:', data.action, 'Project:', data.project);
      console.log('[ProjectsBackend] Tasks in received project:', data.project?.tasks?.length || 0, 'tasks');
      
      switch (data.action) {
        case 'create':
          setProjects(prev => {
            // Avoid duplicates
            if (prev.some(p => p.id === data.project.id)) return prev;
            return [...prev, data.project];
          });
          break;
        
        case 'update':
        case 'task:add':
        case 'task:update':
        case 'task:delete':
          console.log('[ProjectsBackend] Updating project in state:', data.project.id, 'tasks:', data.project.tasks?.length || 0);
          setProjects(prev => {
            const updated = prev.map(p => {
              if (p.id === data.project.id) {
                console.log('[ProjectsBackend] Replacing project', p.id, 'old tasks:', p.tasks?.length, 'new tasks:', data.project.tasks?.length);
                return { ...data.project };
              }
              return p;
            });
            console.log('[ProjectsBackend] Updated projects state, new count:', updated.find(p => p.id === data.project.id)?.tasks?.length || 0);
            return updated;
          });
          break;
        
        case 'delete':
          setProjects(prev => prev.filter(p => p.id !== data.projectId));
          break;
        
        default:
          // Fallback: refetch all
          fetchProjects();
      }
    });

    socket.on('disconnect', () => {
      console.log('[ProjectsBackend] Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchProjects]);

  const value = {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask
  };

  return (
    <ProjectsBackendContext.Provider value={value}>
      {children}
    </ProjectsBackendContext.Provider>
  );
}
