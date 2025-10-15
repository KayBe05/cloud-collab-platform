"""
CloudX Prototype - Flask Web Application
A simple web app that demonstrates database connectivity
and serves as the main application for our development environment.
"""

from flask import Flask, jsonify
import git
import os
from datetime import datetime
import psycopg

# Initializing
app = Flask(__name__)

# Database configuration from environment variables
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'db'),
    'database': os.getenv('POSTGRES_DB', 'cloudx'),
    'user': os.getenv('POSTGRES_USER', 'cloudx_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'cloudx_password'),
    'port': 5432
}

@app.route('/')
def home():
    """Main landing page for CloudX prototype"""
    return """
    <html>
        <head>
            <title>CloudX Prototype</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; text-align: center; }
                .status { padding: 15px; margin: 10px 0; border-radius: 5px; }
                .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
                .links { margin: 20px 0; }
                .links a { display: inline-block; margin: 10px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
                .links a:hover { background: #0056b3; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1> Welcome to CloudX Prototype by Kritarth</h1>
                <div class="status success">
                    <strong>Status:</strong> Flask application is running successfully!
                </div>
                <p>This is a cloud-based collaborative development environment prototype featuring:</p>
                <ul>
                    <li>Flask web application (this page)</li>
                    <li>PostgreSQL database</li>
                    <li>VS Code in the browser (Code-Server)</li>
                    <li>Docker containerization</li>
                </ul>
                <div class="links">
                    <a href="/dbtest">Test Database Connection</a>
                    <a href="http://localhost:8080" target="_blank">Open VS Code Editor</a>
                </div>
                <p><em>Started at: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """</em></p>
            </div>
        </body>
    </html>
    """

@app.route('/dbtest')
def test_database():
    """Test the PostgreSQL database connection"""
    try:
        # Attempt to connect to the database
        connection = psycopg.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
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
        
        # Get the inserted record ID
        record_id = cursor.fetchone()[0]
        
        # Fetch recent records
        cursor.execute(
            "SELECT id, message, created_at FROM test_table ORDER BY created_at DESC LIMIT 5"
        )
        recent_records = cursor.fetchall()
        
        # Commit changes and close connection
        connection.commit()
        cursor.close()
        connection.close()
        
        # Build HTML response
        records_html = ""
        for record in recent_records:
            records_html += f"<tr><td>{record[0]}</td><td>{record[1]}</td><td>{record[2]}</td></tr>"
        
        return f"""
        <html>
            <head>
                <title>Database Test - CloudX</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
                    .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .success {{ padding: 15px; margin: 15px 0; background: #d4edda; border: 1px solid #c3e6cb; color: #155724; border-radius: 5px; }}
                    table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                    th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
                    th {{ background-color: #f2f2f2; }}
                    a {{ color: #007bff; text-decoration: none; }}
                    a:hover {{ text-decoration: underline; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Database Connection Test</h1>
                    <div class="success">
                        <strong>Success!</strong> Connected to PostgreSQL database successfully.
                        <br>New record created with ID: {record_id}
                    </div>
                    
                    <h3>Recent Database Records:</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Message</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records_html}
                        </tbody>
                    </table>
                    
                    <p><a href="/">← Back to Home</a></p>
                </div>
            </body>
        </html>
        """
        
    except Exception as e:
        # Return error information if connection fails
        return f"""
        <html>
            <head>
                <title>Database Error - CloudX</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
                    .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .error {{ padding: 15px; margin: 15px 0; background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; border-radius: 5px; }}
                    a {{ color: #007bff; text-decoration: none; }}
                    a:hover {{ text-decoration: underline; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Database Connection Failed</h1>
                    <div class="error">
                        <strong>Error:</strong> Could not connect to database.
                        <br><strong>Details:</strong> {str(e)}
                    </div>
                    <p>Make sure the PostgreSQL container is running and properly configured.</p>
                    <p><a href="/">← Back to Home</a></p>
                </div>
            </body>
        </html>
        """

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
    # Debug mode enabled for development
    app.run(host='0.0.0.0', port=5000, debug=True)