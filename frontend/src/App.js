import React, { useState, useEffect } from 'react';
import { ProjectService } from './services/projectService';
import './App.css';

function App() {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Fetch projects on component mount
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await ProjectService.listProjects();
      setProjects(response);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  const createProject = async () => {
    try {
      await ProjectService.createProject(
        projectName, 
        username || 'anonymous'
      );
      
      // Refresh project list
      fetchProjects();
      
      // Reset input fields
      setProjectName('');
      setUsername('');
    } catch (error) {
      console.error('Failed to create project', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cloud Collaboration Platform</h1>
        
        <div className="project-creation">
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your Username"
          />
          <input 
            type="text" 
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project Name"
          />
          <button onClick={createProject}>Create Project</button>
        </div>

        <div className="project-list">
          <h2>Your Projects</h2>
          {projects.map(project => (
            <div key={project.id} className="project-item">
              <span>{project.name}</span>
              <small>Owner: {project.owner}</small>
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;
