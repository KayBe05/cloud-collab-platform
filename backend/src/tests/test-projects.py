import pytest
from src.models.project import Project

def test_create_project():
    project = Project(name="Test Project", owner="testuser")
    
    assert project.name == "Test Project"
    assert project.owner == "testuser"
    assert len(project.collaborators) == 0
    assert project.id is not None

def test_add_collaborator():
    project = Project(name="Collab Project", owner="owner")
    project.add_collaborator("newuser")
    
    assert "newuser" in project.collaborators
    
    # Test duplicate collaborator
    project.add_collaborator("newuser")
    assert project.collaborators.count("newuser") == 1

def test_remove_collaborator():
    project = Project(name="Team Project", owner="owner")
    project.add_collaborator("user1")
    project.add_collaborator("user2")
    
    project.remove_collaborator("user1")
    
    assert "user1" not in project.collaborators
    assert "user2" in project.collaborators
