import os
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

class CollaborativePlatform:
    def __init__(self):
        self.projects = {}
        self.users = {}

    def create_project(self, project_name, owner):
        project_id = len(self.projects) + 1
        self.projects[project_id] = {
            'name': project_name,
            'owner': owner,
            'collaborators': [],
            'code_files': {},
            'version_history': []
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
    project_id = platform.create_project(data['name'], data['owner'])
    return jsonify({'project_id': project_id}), 201

@app.route('/add_collaborator', methods=['POST'])
def add_collaborator():
    data = request.get_json()
    success = platform.add_collaborator(data['project_id'], data['username'])
    return jsonify({'success': success}), 200

if __name__ == '__main__':
    app.run(debug=True)
