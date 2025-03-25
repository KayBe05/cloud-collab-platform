import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const ProjectService = {
  createProject: async (projectName, owner) => {
    try {
      const response = await axios.post(`${BASE_URL}/create_project`, {
        name: projectName,
        owner: owner
      });
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  listProjects: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/projects`);
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  addCollaborator: async (projectId, username) => {
    try {
      const response = await axios.post(`${BASE_URL}/add_collaborator`, {
        project_id: projectId,
        username: username
      });
      return response.data;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }
  }
};
