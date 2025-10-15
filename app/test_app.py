"""
Test suite for CloudX Flask application
Run with: pytest app/test_app.py
"""

import pytest
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app

@pytest.fixture
def client():
    """Create a test client for the Flask application"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_home_page(client):
    """Test the home page loads correctly"""
    response = client.get('/')
    assert response.status_code == 200
    assert b'Welcome to CloudX Prototype' in response.data
    assert b'Flask application is running successfully!' in response.data

def test_health_check(client):
    """Test the health check endpoint"""
    response = client.get('/health')
    assert response.status_code == 200
    
    # Check if response is JSON
    json_data = response.get_json()
    assert json_data is not None
    assert json_data['status'] == 'healthy'
    assert 'timestamp' in json_data
    assert json_data['service'] == 'CloudX Flask App'

def test_dbtest_page_loads(client):
    """Test that the database test page loads (may fail if DB not available)"""
    response = client.get('/dbtest')
    assert response.status_code == 200
    # The page should load even if DB connection fails
    assert b'Database' in response.data

def test_nonexistent_route(client):
    """Test that non-existent routes return 404"""
    response = client.get('/nonexistent-route')
    assert response.status_code == 404