from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

class CollaborativePlatform:
    def __init__(self):
        self.projects = {}
        self.users = {}

    def create_project(self, project_name, owner):
        project_id = str(uuid.uuid4())
        self.projects[project_id] = {
            'id': project_id,
            'name': project_name,
            'owner': owner,
            'collaborators': [],
            'created_at': str(datetime.now())
        }
        return project_id

    def add_collaborator(self, project_id, username):
        if project_id in self.projects:
            self.projects[project_id]['collaborators'].append(username)
            return True
        return False

platform = CollaborativePlatform()

@app.route('/create_project', methods=['POST'])
def create_project():
    data = request.get_json()
    project_id = platform.create_project(
        data.get('name'), 
        data.get('owner', 'anonymous')
    )
    return jsonify({'project_id': project_id}), 201

@app.route('/add_collaborator', methods=['POST'])
def add_collaborator():
    data = request.get_json()
    success = platform.add_collaborator(
        data.get('project_id'), 
        data.get('username')
    )
    return jsonify({'success': success}), 200

@app.route('/projects', methods=['GET'])
def list_projects():
    return jsonify(list(platform.projects.values())), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
