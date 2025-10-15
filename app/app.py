# app/app.py

"""
CloudX Prototype - Flask Web Application
A simple web app that demonstrates database connectivity
and serves as the main application for our development environment.
"""

from flask import Flask, jsonify, render_template
import git
import os
import psycopg
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)

# Database configuration from environment variables
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'db'),
    'dbname': os.getenv('POSTGRES_DB', 'cloudx'),
    'user': os.getenv('POSTGRES_USER', 'cloudx_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'cloudx_password'),
    'port': 5432
}

@app.route('/')
def home():
    """Main landing page for CloudX prototype"""
    return render_template('index.html', now=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

@app.route('/dbtest')
def test_database():
    """Test the PostgreSQL database connection"""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        # Attempt to connect to the database
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cursor:
                # Create a simple test table if it doesn't exist
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS test_table (
                        id SERIAL PRIMARY KEY,
                        message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Insert a test record
                cursor.execute(
                    "INSERT INTO test_table (message) VALUES (%s) RETURNING id",
                    ("Database connection successful!",)
                )
                record_id = cursor.fetchone()[0]
                
                # Fetch recent records
                cursor.execute(
                    "SELECT id, message, created_at FROM test_table ORDER BY created_at DESC LIMIT 5"
                )
                recent_records = cursor.fetchall()
                
                # Commit is handled automatically by 'with' statement
        
        return render_template('db_success.html', now=now_str, record_id=record_id, records=recent_records)
        
    except Exception as e:
        # Return error information if connection fails
        return render_template('db_error.html', now=now_str, error=str(e))

@app.route('/health')
def health_check():
    """Simple health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'CloudX Flask App'
    })

if __name__ == '__main__':
    # Run the Flask application
    app.run(host='0.0.0.0', port=5000, debug=True)