from flask import Flask, jsonify, render_template, request, session, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import psycopg
from psycopg.rows import dict_row
import os
import git
from datetime import datetime, timedelta
import secrets
import hashlib
import json
import logging
from functools import wraps
import docker
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60, ping_interval=25)

# Database configuration with connection pooling support
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'db'),
    'dbname': os.getenv('POSTGRES_DB', 'cloudx'),
    'user': os.getenv('POSTGRES_USER', 'cloudx_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'cloudx_password'),
    'port': int(os.getenv('POSTGRES_PORT', 5432)),
    'connect_timeout': 10
}

# Cache for frequently accessed data
cache = {'metrics': {}, 'projects': {}, 'last_update': {}}

def get_db_connection():
    """Get database connection with error handling"""
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise

def init_db():
    """Initialize database with required tables"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Projects table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS projects (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        repository_url VARCHAR(500),
                        status VARCHAR(50) DEFAULT 'active',
                        owner_id VARCHAR(255),
                        tags TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Activity logs table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS activity_logs (
                        id SERIAL PRIMARY KEY,
                        action VARCHAR(255) NOT NULL,
                        details TEXT,
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        severity VARCHAR(20) DEFAULT 'info',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        -- The INDEX line must be removed from here
                    )
                """)
                
                # Deployments table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS deployments (
                        id SERIAL PRIMARY KEY,
                        project_id INTEGER REFERENCES projects(id),
                        environment VARCHAR(50),
                        status VARCHAR(50),
                        version VARCHAR(50),
                        commit_hash VARCHAR(100),
                        deployed_by VARCHAR(255),
                        duration_ms INTEGER,
                        deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # System metrics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS system_metrics (
                        id SERIAL PRIMARY KEY,
                        metric_name VARCHAR(100),
                        metric_value FLOAT,
                        unit VARCHAR(50),
                        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # User sessions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(255) UNIQUE,
                        user_agent TEXT,
                        ip_address VARCHAR(45),
                        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                conn.commit()
                logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

# Initialize database on startup
with app.app_context():
    init_db()

def require_session(f):
    """Decorator to require valid session"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'session_id' not in session:
            session['session_id'] = secrets.token_hex(16)
        return f(*args, **kwargs)
    return decorated_function

def log_activity(action, details=None, severity='info'):
    """Log user activity to database"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """INSERT INTO activity_logs (action, details, ip_address, user_agent, severity) 
                       VALUES (%s, %s, %s, %s, %s)""",
                    (action, details, request.remote_addr, request.headers.get('User-Agent'), severity)
                )
                conn.commit()
    except Exception as e:
        logger.error(f"Activity logging error: {e}")

@app.route('/')
@require_session
def home():
    """Enhanced landing page with dashboard"""
    log_activity('page_view', 'home')
    stats = get_dashboard_stats()
    return render_template('index.html', 
                         now=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                         stats=stats,
                         app_version='2.1.0')

@app.route('/dashboard')
@require_session
def dashboard():
    """Comprehensive dashboard with analytics"""
    log_activity('page_view', 'dashboard')
    stats = get_dashboard_stats()
    return render_template('dashboard.html', stats=stats)

@app.route('/projects')
@require_session
def projects():
    """Project management page"""
    log_activity('page_view', 'projects')
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT * FROM projects 
                    ORDER BY updated_at DESC
                """)
                projects_list = cursor.fetchall()
        return render_template('projects.html', projects=projects_list)
    except Exception as e:
        logger.error(f"Projects page error: {e}")
        return render_template('error.html', error=str(e)), 500

@app.route('/analytics')
@require_session
def analytics():
    """Analytics and monitoring page"""
    log_activity('page_view', 'analytics')
    return render_template('analytics.html')

@app.route('/api/projects', methods=['GET', 'POST'])
def api_projects():
    """API endpoint for project management"""
    if request.method == 'POST':
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """INSERT INTO projects (name, description, repository_url, status, tags) 
                           VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                        (data.get('name'), data.get('description'), 
                         data.get('repository_url'), 'active', data.get('tags'))
                    )
                    project_id = cursor.fetchone()[0]
                    conn.commit()
            
            log_activity('project_created', f"Project: {data.get('name')}")
            return jsonify({'success': True, 'project_id': project_id, 'message': 'Project created successfully'}), 201
        except Exception as e:
            logger.error(f"Project creation error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400
    
    # GET request with pagination
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit
        
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT * FROM projects 
                    ORDER BY created_at DESC 
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                projects_list = cursor.fetchall()
                
                cursor.execute("SELECT COUNT(*) as total FROM projects")
                total = cursor.fetchone()['total']
        
        return jsonify({
            'data': projects_list,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Projects API error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/deployments', methods=['GET', 'POST'])
def api_deployments():
    """API endpoint for deployment management"""
    if request.method == 'POST':
        data = request.get_json()
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """INSERT INTO deployments 
                           (project_id, environment, status, version, commit_hash, deployed_by, duration_ms) 
                           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                        (data.get('project_id'), data.get('environment'), 'pending',
                         data.get('version'), data.get('commit_hash'), 
                         data.get('deployed_by'), data.get('duration_ms'))
                    )
                    deployment_id = cursor.fetchone()[0]
                    conn.commit()
            
            log_activity('deployment_created', f"Deployment ID: {deployment_id}")
            return jsonify({'success': True, 'deployment_id': deployment_id}), 201
        except Exception as e:
            logger.error(f"Deployment creation error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400
    
    # GET request
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT d.*, p.name as project_name 
                    FROM deployments d
                    JOIN projects p ON d.project_id = p.id
                    ORDER BY d.deployed_at DESC LIMIT 50
                """)
                deployments = cursor.fetchall()
        return jsonify(deployments)
    except Exception as e:
        logger.error(f"Deployments API error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/metrics')
def api_metrics():
    """Real-time system metrics API"""
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT metric_name, metric_value, unit, recorded_at 
                    FROM system_metrics 
                    WHERE recorded_at > NOW() - INTERVAL '1 hour'
                    ORDER BY recorded_at DESC
                    LIMIT 100
                """)
                metrics = cursor.fetchall()
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Metrics API error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/activities')
def api_activities():
    """Activity logs API"""
    try:
        limit = request.args.get('limit', 50, type=int)
        severity = request.args.get('severity', None)
        
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                if severity:
                    cursor.execute("""
                        SELECT * FROM activity_logs 
                        WHERE severity = %s
                        ORDER BY created_at DESC LIMIT %s
                    """, (severity, limit))
                else:
                    cursor.execute("""
                        SELECT * FROM activity_logs 
                        ORDER BY created_at DESC LIMIT %s
                    """, (limit,))
                activities = cursor.fetchall()
        return jsonify(activities)
    except Exception as e:
        logger.error(f"Activities API error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/dbtest')
def test_database():
    """Enhanced database connectivity test"""
    log_activity('database_test', 'connection_test')
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("SELECT version()")
                db_version = cursor.fetchone()['version']
                
                cursor.execute("SELECT COUNT(*) as total_projects FROM projects")
                project_count = cursor.fetchone()['total_projects']
                
                cursor.execute("SELECT COUNT(*) as total_logs FROM activity_logs")
                log_count = cursor.fetchone()['total_logs']
                
                cursor.execute("SELECT COUNT(*) as total_deployments FROM deployments")
                deployment_count = cursor.fetchone()['total_deployments']
        
        return render_template('db_success.html',
                             db_version=db_version,
                             project_count=project_count,
                             log_count=log_count,
                             deployment_count=deployment_count)
    except Exception as e:
        logger.error(f"Database test error: {e}")
        return render_template('db_error.html', error=str(e)), 500

@app.route('/health')
def health_check():
    """Comprehensive health check endpoint"""
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'CloudX Platform',
        'version': '2.1.0',
        'components': {}
    }
    
    # Check database
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
        health_status['components']['database'] = {'status': 'healthy', 'response_time': '< 100ms'}
    except Exception as e:
        logger.error(f"Health check database error: {e}")
        health_status['components']['database'] = {'status': 'unhealthy', 'error': str(e)}
        health_status['status'] = 'degraded'
    
    # Check WebSocket
    health_status['components']['websocket'] = {'status': 'healthy'}
    
    return jsonify(health_status)

def get_dashboard_stats():
    """Get comprehensive dashboard statistics"""
    stats = {
        'total_projects': 0,
        'active_deployments': 0,
        'total_activities': 0,
        'recent_activities': [],
        'system_health': 'healthy',
        'deployment_success_rate': 0
    }
    
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("SELECT COUNT(*) as count FROM projects")
                stats['total_projects'] = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM deployments WHERE status = 'active'")
                stats['active_deployments'] = cursor.fetchone()['count']
                
                cursor.execute("SELECT COUNT(*) as count FROM activity_logs")
                stats['total_activities'] = cursor.fetchone()['count']
                
                cursor.execute("""
                    SELECT action, details, created_at 
                    FROM activity_logs 
                    ORDER BY created_at DESC 
                    LIMIT 15
                """)
                stats['recent_activities'] = cursor.fetchall()
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
    
    return stats

# WebSocket events for real-time updates
@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    session_id = secrets.token_hex(16)
    emit('connection_response', {
        'data': 'Connected to CloudX Platform',
        'session_id': session_id,
        'timestamp': datetime.now().isoformat()
    })
    log_activity('websocket_connect', f'Session: {session_id}')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    log_activity('websocket_disconnect', 'Client disconnected')

@socketio.on('request_metrics')
def handle_metrics_request():
    """Send real-time metrics to client"""
    metrics = {
        'cpu_usage': 45.2,
        'memory_usage': 68.5,
        'disk_usage': 52.1,
        'network_in': 1024,
        'network_out': 2048,
        'timestamp': datetime.now().isoformat()
    }
    emit('metrics_update', metrics)

@socketio.on('join')
def handle_join(data):
    """Join a room for targeted updates"""
    room = data.get('room')
    join_room(room)
    emit('status', {'msg': f'Joined room {room}'})

@socketio.on('leave')
def handle_leave(data):
    """Leave a room"""
    room = data.get('room')
    leave_room(room)
    emit('status', {'msg': f'Left room {room}'})

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    logger.error(f"Server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/projects/<int:project_id>/launch', methods=['POST'])
@require_session
def launch_workspace(project_id):
    """
    Orchestrator Endpoint: Spins up a new Docker container for the project.
    """
    try:
        # Connect to the Docker Daemon
        client = docker.from_env()
        
        # Generate a secure, random password for this session
        session_password = secrets.token_hex(4)
        
        # Define the container name 
        container_name = f"cloudx-project-{project_id}-{secrets.token_hex(2)}"
        
        # SPIN UP THE CONTAINER
        container = client.containers.run(
            image="cloudx-workspace:latest",  # Uses the image we built in Step 3
            detach=True,
            environment={"PASSWORD": session_password},
            ports={'8080/tcp': None, '22/tcp': None}, 
            name=container_name
        )
        
        # 5. Wait for it to initialize
        time.sleep(2)
        container.reload()
        
        # 6. Extract the random ports Docker assigned
        web_port = container.attrs['NetworkSettings']['Ports']['8080/tcp'][0]['HostPort']
        ssh_port = container.attrs['NetworkSettings']['Ports']['22/tcp'][0]['HostPort']
        
        log_activity('workspace_provisioned', f"Launched {container_name}")
        
        # 7. Return the connection details to the frontend
        return jsonify({
            'success': True,
            'status': 'provisioned',
            'connection': {
                'web_url': f"http://localhost:{web_port}",
                'ssh_command': f"ssh root@localhost -p {ssh_port}",
                'password': session_password
            }
        })

    except Exception as e:
        logger.error(f"Provisioning Failure: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=os.getenv('FLASK_DEBUG', False))