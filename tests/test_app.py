import pytest
from app import CollaborativePlatform

def test_create_project():
    platform = CollaborativePlatform()
    project_id = platform.create_project("Test Project", "testuser")
    assert project_id == 1
    assert platform.projects[project_id]['name'] == "Test Project"
    assert platform.projects[project_id]['owner'] == "testuser"

def test_add_collaborator():
    platform = CollaborativePlatform()
    project_id = platform.create_project("Collab Project", "owner")
    result = platform.add_collaborator(project_id, "newuser")
    assert result is True
    assert "newuser" in platform.projects[project_id]['collaborators']
