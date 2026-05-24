from flask import Flask, jsonify, render_template, request, session, redirect, url_for, flash
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    login_required, current_user
)
from werkzeug.security import generate_password_hash, check_password_hash
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
import threading

try:
    import google.generativeai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None
    _GENAI_AVAILABLE = False
    logging.warning("google-generativeai not installed. AI assistant will be disabled.")

try:
    from monitor import SystemMonitor
except ImportError:
    SystemMonitor = None
    logging.warning("monitor.py not found. Real-time stats will be disabled.")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=120, ping_interval=25)

login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'


class User(UserMixin):
    """Lightweight User model backed by PostgreSQL."""
    def __init__(self, id, username, email, password_hash, created_at=None):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.created_at = created_at

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @staticmethod
    def get_by_id(user_id):
        try:
            with get_db_connection() as conn:
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                    row = cur.fetchone()
                    if row:
                        return User(**row)
        except Exception as e:
            logger.error(f"User.get_by_id error: {e}")
        return None

    @staticmethod
    def get_by_username(username):
        try:
            with get_db_connection() as conn:
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute("SELECT * FROM users WHERE username = %s", (username,))
                    row = cur.fetchone()
                    if row:
                        return User(**row)
        except Exception as e:
            logger.error(f"User.get_by_username error: {e}")
        return None

    @staticmethod
    def get_by_email(email):
        try:
            with get_db_connection() as conn:
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                    row = cur.fetchone()
                    if row:
                        return User(**row)
        except Exception as e:
            logger.error(f"User.get_by_email error: {e}")
        return None


@login_manager.user_loader
def load_user(user_id):
    return User.get_by_id(int(user_id))


DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'db'),
    'dbname': os.getenv('POSTGRES_DB', 'cloudx'),
    'user': os.getenv('POSTGRES_USER', 'cloudx_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'cloudx_password'),
    'port': int(os.getenv('POSTGRES_PORT', 5432)),
    'connect_timeout': 10
}

cache = {'metrics': {}, 'projects': {}, 'last_update': {}}


def get_db_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise


def init_db():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id            SERIAL PRIMARY KEY,
                        username      VARCHAR(80)  NOT NULL UNIQUE,
                        email         VARCHAR(255) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS projects (
                        id             SERIAL PRIMARY KEY,
                        name           VARCHAR(255) NOT NULL,
                        description    TEXT,
                        repository_url VARCHAR(500),
                        status         VARCHAR(50)  DEFAULT 'active',
                        owner_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        tags           TEXT,
                        env_vars       JSONB        DEFAULT '{}'::jsonb,
                        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                cursor.execute("""
                    ALTER TABLE projects
                        ADD COLUMN IF NOT EXISTS env_vars JSONB DEFAULT '{}'::jsonb
                """)

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS activity_logs (
                        id         SERIAL PRIMARY KEY,
                        user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        action     VARCHAR(255) NOT NULL,
                        details    TEXT,
                        ip_address VARCHAR(45),
                        user_agent TEXT,
                        severity   VARCHAR(20) DEFAULT 'info',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS deployments (
                        id          SERIAL PRIMARY KEY,
                        project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                        environment VARCHAR(50),
                        status      VARCHAR(50),
                        version     VARCHAR(50),
                        commit_hash VARCHAR(100),
                        deployed_by VARCHAR(255),
                        duration_ms INTEGER,
                        deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS system_metrics (
                        id           SERIAL PRIMARY KEY,
                        metric_name  VARCHAR(100),
                        metric_value FLOAT,
                        unit         VARCHAR(50),
                        recorded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id            SERIAL PRIMARY KEY,
                        session_id    VARCHAR(255) UNIQUE,
                        user_agent    TEXT,
                        ip_address    VARCHAR(45),
                        connected_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                conn.commit()
                logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")


with app.app_context():
    init_db()


def log_activity(action, details=None, severity='info'):
    """Log user activity to database, scoped to the current authenticated user."""
    try:
        user_id = current_user.id if current_user.is_authenticated else None
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """INSERT INTO activity_logs
                           (user_id, action, details, ip_address, user_agent, severity)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (user_id, action, details,
                     request.remote_addr, request.headers.get('User-Agent'), severity)
                )
                conn.commit()
    except Exception as e:
        logger.error(f"Activity logging error: {e}")


@app.route('/workspace')
@login_required
def workspace():
    return render_template('workspace.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        remember = request.form.get('remember') == 'on'

        if not username or not password:
            flash('Username and password are required.', 'error')
            return render_template('login.html')

        user = User.get_by_username(username)
        if user and user.check_password(password):
            login_user(user, remember=remember)
            log_activity('user_login', f"User '{username}' logged in")
            next_page = request.args.get('next')
            return redirect(next_page or url_for('home'))

        flash('Invalid username or password.', 'error')

    return render_template('login.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('home'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm  = request.form.get('confirm_password', '')

        errors = []
        if not username or len(username) < 3:
            errors.append('Username must be at least 3 characters.')
        if not email or '@' not in email:
            errors.append('A valid email is required.')
        if len(password) < 8:
            errors.append('Password must be at least 8 characters.')
        if password != confirm:
            errors.append('Passwords do not match.')

        if not errors:
            if User.get_by_username(username):
                errors.append('Username already taken.')
            if User.get_by_email(email):
                errors.append('Email already registered.')

        if errors:
            for err in errors:
                flash(err, 'error')
            return render_template('signup.html',
                                   form_username=username, form_email=email)

        try:
            password_hash = generate_password_hash(password)
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO users (username, email, password_hash)
                           VALUES (%s, %s, %s) RETURNING id""",
                        (username, email, password_hash)
                    )
                    new_id = cur.fetchone()[0]
                    conn.commit()

            user = User.get_by_id(new_id)
            login_user(user)
            log_activity('user_signup', f"New user '{username}' registered")
            flash(f'Welcome to CloudX, {username}!', 'success')
            return redirect(url_for('home'))

        except Exception as e:
            logger.error(f"Signup error: {e}")
            flash('Registration failed. Please try again.', 'error')

    return render_template('signup.html')


@app.route('/logout')
@login_required
def logout():
    log_activity('user_logout', f"User '{current_user.username}' logged out")
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))



@app.route('/')
@login_required
def home():
    log_activity('page_view', 'home')
    stats = get_dashboard_stats()
    return render_template('index.html',
                           now=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                           stats=stats,
                           app_version='2.1.0')


@app.route('/dashboard')
@login_required
def dashboard():
    log_activity('page_view', 'dashboard')
    stats = get_dashboard_stats()
    return render_template('dashboard.html', stats=stats)


@app.route('/projects')
@login_required
def projects():
    log_activity('page_view', 'projects')
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT * FROM projects
                    WHERE owner_id = %s
                    ORDER BY updated_at DESC
                """, (current_user.id,))
                projects_list = cursor.fetchall()
        return render_template('projects.html', projects=projects_list)
    except Exception as e:
        logger.error(f"Projects page error: {e}")
        return render_template('error.html', error=str(e)), 500


@app.route('/analytics')
@login_required
def analytics():
    log_activity('page_view', 'analytics')
    return render_template('analytics.html')


@app.route('/settings')
@login_required
def settings():
    log_activity('page_view', 'settings')
    stats = get_dashboard_stats()
    return render_template('settings.html', stats=stats)


@app.route('/instances')
@login_required
def instances():
    return render_template('instances.html')


# ── API: PROJECTS (tenant-isolated) ───────────────────────────────────────────

@app.route('/api/projects', methods=['GET', 'POST'])
@login_required
def api_projects():
    """API endpoint for project management with Strict Tenant Isolation"""
    if request.method == 'POST':
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        env_vars = data.get('env_vars') or {}
        if not isinstance(env_vars, dict):
            return jsonify({'success': False,
                            'error': "'env_vars' must be a JSON object (key-value pairs)."}), 400

        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """INSERT INTO projects
                               (name, description, repository_url, status, owner_id, tags, env_vars)
                           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                        (
                            data.get('name'),
                            data.get('description'),
                            data.get('repository_url'),
                            'active',
                            current_user.id,
                            data.get('tags'),
                            json.dumps(env_vars),   # psycopg will pass this as JSONB
                        )
                    )
                    project_id = cursor.fetchone()[0]
                    conn.commit()

            log_activity('project_created', f"Project: {data.get('name')} by User: {current_user.username}")
            return jsonify({'success': True, 'project_id': project_id, 'message': 'Project created successfully'}), 201
        except Exception as e:
            logger.error(f"Project creation error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400

    # GET: only fetch projects belonging to the logged-in user
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit

        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT * FROM projects
                    WHERE owner_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, (current_user.id, limit, offset))
                projects_list = cursor.fetchall()

                cursor.execute("SELECT COUNT(*) as total FROM projects WHERE owner_id = %s", (current_user.id,))
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


@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    "SELECT name FROM projects WHERE id = %s AND owner_id = %s",
                    (project_id, current_user.id)
                )
                project = cursor.fetchone()

                if not project:
                    return jsonify({'success': False, 'error': 'Project not found'}), 404

                cursor.execute(
                    "DELETE FROM deployments WHERE project_id = %s", (project_id,)
                )
                deleted_deployments = cursor.rowcount
                cursor.execute(
                    "DELETE FROM projects WHERE id = %s", (project_id,)
                )
                conn.commit()

        log_activity(
            'project_deleted',
            f"Project '{project['name']}' (ID: {project_id}) and "
            f"{deleted_deployments} deployments deleted",
            severity='warning'
        )
        return jsonify({
            'success': True,
            'message': f"Project '{project['name']}' deleted successfully",
            'deleted_deployments': deleted_deployments
        }), 200
    except Exception as e:
        logger.error(f"Project deletion error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/deployments', methods=['GET', 'POST'])
@login_required
def api_deployments():
    if request.method == 'POST':
        data = request.get_json()
        try:
            with get_db_connection() as conn:
                with conn.cursor(row_factory=dict_row) as cursor:
                    cursor.execute(
                        "SELECT id FROM projects WHERE id = %s AND owner_id = %s",
                        (data.get('project_id'), current_user.id)
                    )
                    if not cursor.fetchone():
                        return jsonify({'success': False,
                                        'error': 'Project not found'}), 404

                    cursor.execute(
                        """INSERT INTO deployments
                               (project_id, environment, status, version,
                                commit_hash, deployed_by, duration_ms)
                           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                        (data.get('project_id'), data.get('environment'), 'pending',
                         data.get('version'), data.get('commit_hash'),
                         current_user.username, data.get('duration_ms'))
                    )
                    deployment_id = cursor.fetchone()[0]
                    conn.commit()

            log_activity('deployment_created', f"Deployment ID: {deployment_id}")
            return jsonify({'success': True, 'deployment_id': deployment_id}), 201
        except Exception as e:
            logger.error(f"Deployment creation error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT d.*, p.name AS project_name
                    FROM deployments d
                    JOIN projects p ON d.project_id = p.id
                    WHERE p.owner_id = %s
                    ORDER BY d.deployed_at DESC LIMIT 50
                """, (current_user.id,))
                deployments = cursor.fetchall()
        return jsonify(deployments)
    except Exception as e:
        logger.error(f"Deployments API error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<int:project_id>/deployments', methods=['GET'])
@login_required
def get_project_deployments(project_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    "SELECT id FROM projects WHERE id = %s AND owner_id = %s",
                    (project_id, current_user.id)
                )
                if not cursor.fetchone():
                    return jsonify({'success': False, 'error': 'Project not found'}), 404

                cursor.execute("""
                    SELECT id, status, version, commit_hash, deployed_by,
                           duration_ms, deployed_at, environment
                    FROM deployments
                    WHERE project_id = %s
                    ORDER BY deployed_at DESC LIMIT 10
                """, (project_id,))
                deployments = cursor.fetchall()

        return jsonify({'success': True, 'deployments': deployments})
    except Exception as e:
        logger.error(f"Error fetching deployments for project {project_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/deployments/redeploy', methods=['POST'])
@login_required
def redeploy():
    data = request.get_json()
    if not data or 'project_id' not in data:
        return jsonify({'success': False, 'error': 'Missing project_id'}), 400

    try:
        project_id = data.get('project_id')

        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    "SELECT id FROM projects WHERE id = %s AND owner_id = %s",
                    (project_id, current_user.id)
                )
                if not cursor.fetchone():
                    return jsonify({'success': False, 'error': 'Project not found'}), 404

        version    = data.get('version', f"v1.0.{secrets.randbelow(100)}")
        commit_hash = secrets.token_hex(4)[:7]
        environment = data.get('environment', 'production')
        duration_ms = secrets.randbelow(5000) + 2000

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """INSERT INTO deployments
                           (project_id, environment, status, version,
                            commit_hash, deployed_by, duration_ms)
                       VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (project_id, environment, 'success', version,
                     commit_hash, current_user.username, duration_ms)
                )
                deployment_id = cursor.fetchone()[0]
                conn.commit()

        log_activity('deployment_redeployed',
                     f"Project {project_id} redeployed – Deployment ID: {deployment_id}")
        return jsonify({
            'success': True,
            'deployment_id': deployment_id,
            'message': 'Deployment completed successfully',
            'deployment': {
                'id': deployment_id, 'status': 'success', 'version': version,
                'commit_hash': commit_hash, 'deployed_by': current_user.username,
                'duration_ms': duration_ms
            }
        }), 201
    except Exception as e:
        logger.error(f"Redeploy error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/metrics')
@login_required
def api_metrics():
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                    SELECT metric_name, metric_value, unit, recorded_at
                    FROM system_metrics
                    WHERE recorded_at > NOW() - INTERVAL '1 hour'
                    ORDER BY recorded_at DESC LIMIT 100
                """)
                metrics = cursor.fetchall()
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Metrics API error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/activities')
@login_required
def api_activities():
    """Return only the current user's activity logs."""
    try:
        limit    = request.args.get('limit', 50, type=int)
        severity = request.args.get('severity', None)

        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                if severity:
                    cursor.execute("""
                        SELECT * FROM activity_logs
                        WHERE user_id = %s AND severity = %s
                        ORDER BY created_at DESC LIMIT %s
                    """, (current_user.id, severity, limit))
                else:
                    cursor.execute("""
                        SELECT * FROM activity_logs
                        WHERE user_id = %s
                        ORDER BY created_at DESC LIMIT %s
                    """, (current_user.id, limit))
                activities = cursor.fetchall()
        return jsonify(activities)
    except Exception as e:
        logger.error(f"Activities API error: {e}")
        return jsonify({'error': str(e)}), 500



_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-latest")

_AI_SYSTEM_PROMPT = """You are an expert software engineering assistant embedded in CloudX,
a cloud collaborative IDE. Your role is to help developers understand, debug, and improve code.

Guidelines:
- Be concise but thorough. Lead with the fix or answer, then explain.
- When suggesting code changes, provide complete, runnable snippets.
- Highlight potential security issues, performance bottlenecks, or anti-patterns.
- Wrap all code blocks in markdown fences with the correct language tag.
- Never refuse a reasonable engineering request. If a task is ambiguous, ask one clarifying question.
"""


def _get_gemini_client():
    """
    Lazily configure and return the Gemini GenerativeModel.
    Uses 'rest' transport to bypass potential gRPC firewall blocks.
    """
    if not _GENAI_AVAILABLE:
        raise RuntimeError("google-generativeai is not installed.")

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("AI assistant is not configured. Set GEMINI_API_KEY.")

    genai.configure(api_key=api_key, transport='rest')

    return genai.GenerativeModel(
        model_name=_GEMINI_MODEL,
        system_instruction=_AI_SYSTEM_PROMPT,
    )


@app.route('/api/ai/assist', methods=['POST'])
@login_required
def ai_assist():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'success': False, 'error': 'Request body must be JSON.'}), 400

    code_context = (data.get('code_context') or '').strip()
    user_query   = (data.get('user_query')   or '').strip()

    if not user_query:
        return jsonify({'success': False, 'error': "'user_query' is required."}), 400

    prompt_parts = []
    if code_context:
        prompt_parts.append(
            f"### Code Context\n```\n{code_context}\n```\n"
        )
    prompt_parts.append(f"### Question / Task\n{user_query}")
    full_prompt = "\n".join(prompt_parts)

    try:
        model = _get_gemini_client()
    except RuntimeError as exc:
        logger.warning("AI assist – configuration error: %s", exc)
        return jsonify({'success': False, 'error': str(exc)}), 503

    try:
        response = model.generate_content(full_prompt)

        suggestion = ""
        if response.candidates:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    suggestion += part.text
        suggestion = suggestion.strip()

        usage = {}
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            usage = {
                'prompt_tokens':     getattr(response.usage_metadata, 'prompt_token_count',     None),
                'candidates_tokens': getattr(response.usage_metadata, 'candidates_token_count', None),
            }

        log_activity(
            'ai_assist_request',
            f"query_len={len(user_query)} ctx_len={len(code_context)} "
            f"tokens={usage.get('prompt_tokens', '?')}",
            severity='info'
        )

        return jsonify({
            'success':    True,
            'suggestion': suggestion,
            'model':      _GEMINI_MODEL,
            'usage':      usage,
        })

    except Exception as exc:
        logger.error("AI assist – Gemini API error: %s", exc, exc_info=True)
        return jsonify({
            'success': False,
            'error':   'The AI assistant encountered an error. Please try again.',
            'detail':  str(exc),   
        }), 502



def _get_user_project_ids():
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("SELECT id FROM projects WHERE owner_id = %s", (current_user.id,))
                return {str(row['id']) for row in cursor.fetchall()}
    except Exception as e:
        logger.error(f"Error fetching user project IDs: {e}")
        return set()


def _container_belongs_to_user(container_name, user_project_ids):
    try:
        name = container_name.lstrip('/')

        if name.startswith('cloudx-project-'):
            parts = name.split('-')
            if len(parts) >= 3:
                project_id_str = str(parts[2])
                return project_id_str in user_project_ids
    except Exception:
        pass
    return False


@app.route('/api/containers', methods=['GET'])
@login_required
def list_containers():
    try:
        user_project_ids = _get_user_project_ids()
        client = docker.from_env()

        all_containers = client.containers.list(all=True)

        container_list = []
        for c in all_containers:
            if _container_belongs_to_user(c.name, user_project_ids):
                container_list.append({
                    'id':      c.short_id,
                    'name':    c.name,
                    'status':  c.status,
                    'image':   c.image.tags[0] if c.image.tags else 'unknown',
                    'created': c.attrs['Created'],
                    'ports':   c.ports
                })

        return jsonify({'success': True, 'containers': container_list})
    except Exception as e:
        logger.error(f"Error listing containers: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/containers/<container_id>/action', methods=['POST'])
@login_required
def container_action(container_id):
    """Allow stop/restart/delete only for containers the user owns."""
    data   = request.json
    action = data.get('action')

    try:
        user_project_ids = _get_user_project_ids()
        client    = docker.from_env()
        container = client.containers.get(container_id)

        if not _container_belongs_to_user(container.name, user_project_ids):
            return jsonify({'success': False, 'error': 'Access denied'}), 403

        if action == 'stop':
            container.stop()
            msg = "Container stopped successfully"
        elif action == 'restart':
            container.restart()
            msg = "Container restarted successfully"
        elif action == 'delete':
            container.remove(force=True)
            msg = "Container deleted successfully"
        else:
            return jsonify({'success': False, 'error': 'Invalid action'}), 400

        return jsonify({'success': True, 'message': msg})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/containers/<container_id>/logs', methods=['GET'])
@login_required
def container_logs(container_id):
    try:
        user_project_ids = _get_user_project_ids()
        client    = docker.from_env()
        container = client.containers.get(container_id)

        if not _container_belongs_to_user(container.name, user_project_ids):
            return jsonify({'success': False, 'error': 'Access denied'}), 403

        logs = container.logs(tail=100).decode('utf-8')
        return jsonify({'success': True, 'logs': logs})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/projects/<int:project_id>/launch', methods=['POST'])
@login_required
def launch_workspace(project_id):
    """Orchestrator Endpoint - Secured with Tenant Isolation & Persistent Storage"""

    # ── Authorization + project data fetch (combined into one query) ──────────
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """SELECT id, repository_url, env_vars
                       FROM projects
                       WHERE id = %s AND owner_id = %s""",
                    (project_id, current_user.id)
                )
                project = cursor.fetchone()
                if not project:
                    return jsonify({'success': False,
                                    'error': 'Unauthorized: You do not own this project.'}), 403
    except Exception:
        return jsonify({'success': False,
                        'error': 'Database error during authorization check.'}), 500

    try:
        client = docker.from_env()
        session_password = secrets.token_hex(4)

        container_name = f"cloudx-project-{project_id}-{secrets.token_hex(2)}"
        volume_name    = f"cloudx_data_u{current_user.id}_p{project_id}"


        user_env_vars = project.get('env_vars') or {}
        if not isinstance(user_env_vars, dict):
            user_env_vars = {}

        environment = {
            **user_env_vars,            
            "PASSWORD": session_password,  
        }

        router_name  = f"cloudx-proj-{project_id}"
        service_name = f"cloudx-proj-{project_id}"

        traefik_labels = {
            "traefik.enable": "true",
            f"traefik.http.routers.{router_name}.rule":
                f"Host(`proj{project_id}.cloudx.local`)",
            f"traefik.http.routers.{router_name}.entrypoints": "web",
            f"traefik.http.services.{service_name}.loadbalancer.server.port": "8080",
        }

        container = client.containers.run(
            image="cloudx-workspace:latest",
            detach=True,
            environment={"PASSWORD": session_password},
            name=container_name,
            volumes={volume_name: {'bind': '/workspace', 'mode': 'rw'}},
            network="cloudx_cloudx-network",
            labels={
                "traefik.enable": "true",
                f"traefik.http.routers.cloudx-proj-{project_id}.rule": f"Host(`proj{project_id}.cloudx.local`)",
                f"traefik.http.services.cloudx-proj-{project_id}.loadbalancer.server.port": "8080"
            },
            mem_limit='512m',
            nano_cpus=1_000_000_000,  
        )

        time.sleep(2)
        container.reload()

        repository_url = (project.get('repository_url') or '').strip()
        clone_result   = None

        if repository_url:
            check_empty = container.exec_run("sh -c '[ -z \"$(ls -A /workspace)\" ]'")
            workspace_is_empty = (check_empty.exit_code == 0)

            if workspace_is_empty:
                clone_cmd = f"git clone {repository_url} /workspace"
                clone_result = container.exec_run(
                    cmd=["sh", "-c", clone_cmd],
                    workdir="/",
                    demux=False,
                )
                if clone_result.exit_code == 0:
                    logger.info(
                        "Cloned %s into /workspace for project %s",
                        repository_url, project_id
                    )
                    clone_result = {'status': 'cloned', 'repo': repository_url}
                else:
                    error_output = clone_result.output.decode('utf-8', errors='ignore').strip()
                    logger.warning(
                        "git clone failed for project %s (exit %s): %s",
                        project_id, clone_result.exit_code, error_output
                    )
                    clone_result = {
                        'status': 'clone_failed',
                        'repo': repository_url,
                        'detail': error_output,
                    }
            else:
                logger.info(
                    "Skipping clone for project %s – /workspace already has content.",
                    project_id
                )
                clone_result = {'status': 'skipped', 'reason': 'workspace_not_empty'}

        log_activity('workspace_provisioned',
                     f"Launched {container_name} by {current_user.username}")

        response_payload = {
            'success': True,
            'status': 'provisioned',
            'connection': {
                'web_url':     f"http://proj{project_id}.cloudx.local",
                'password':    session_password,
            },
        }

        if clone_result is not None:
            response_payload['repository'] = clone_result

        return jsonify(response_payload)

    except Exception as e:
        logger.error(f"Provisioning Failure: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ── API: WORKSPACE FILE I/O ───────────────────────────────────────────────────

def _get_project_container(project_id: int):
    """
    Return the first running container whose name matches
    the cloudx-project-<project_id>-* pattern, or None.
    """
    client = docker.from_env()
    for c in client.containers.list(all=True):
        name = c.name.lstrip('/')
        if name.startswith(f'cloudx-project-{project_id}-'):
            return c
    return None


@app.route('/api/workspace/<int:project_id>/files', methods=['GET', 'POST'])
@login_required
def workspace_files(project_id):
    """
    GET  ?path=relative/path   → read file content from the container's /workspace
    POST {"path": ..., "content": ...} → write file content into the container
    """
    # ── Authorise: caller must own the project ──────────────────────────────
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    "SELECT id FROM projects WHERE id = %s AND owner_id = %s",
                    (project_id, current_user.id)
                )
                if not cur.fetchone():
                    return jsonify({'success': False, 'error': 'Project not found'}), 404
    except Exception as e:
        logger.error(f"workspace_files auth error: {e}")
        return jsonify({'success': False, 'error': 'Database error'}), 500

    # ── Locate running container ─────────────────────────────────────────────
    container = _get_project_container(project_id)
    if not container:
        return jsonify({
            'success': False,
            'error': 'No running container found for this project. '
                     'Launch the workspace first.'
        }), 404

    # ── GET: read file ───────────────────────────────────────────────────────
    if request.method == 'GET':
        rel_path = request.args.get('path', 'main.py').lstrip('/')
        # Prevent path traversal outside /workspace
        if '..' in rel_path or rel_path.startswith('/'):
            return jsonify({'success': False, 'error': 'Invalid path'}), 400

        full_path = f'/workspace/{rel_path}'
        result = container.exec_run(
            cmd=['cat', full_path],
            workdir='/workspace',
            demux=False,
        )

        if result.exit_code != 0:
            error_msg = result.output.decode('utf-8', errors='ignore').strip()
            # File not found → return empty template rather than hard error
            return jsonify({
                'success': True,
                'content': f'# {rel_path}\n# (new file – start editing here)\n',
                'path': rel_path,
                'warning': error_msg,
            })

        content = result.output.decode('utf-8', errors='replace')
        log_activity('file_read', f'Project {project_id}: {rel_path}')
        return jsonify({'success': True, 'content': content, 'path': rel_path})

    # ── POST: write file ─────────────────────────────────────────────────────
    data = request.get_json(silent=True)
    if not data or 'path' not in data or 'content' not in data:
        return jsonify({'success': False, 'error': "Both 'path' and 'content' are required."}), 400

    rel_path = data['path'].lstrip('/')
    if '..' in rel_path or rel_path.startswith('/'):
        return jsonify({'success': False, 'error': 'Invalid path'}), 400

    content  = data['content']
    full_path = f'/workspace/{rel_path}'

    # Ensure parent directory exists
    parent_dir = full_path.rsplit('/', 1)[0]
    container.exec_run(cmd=['mkdir', '-p', parent_dir])

    # Write via tee (handles arbitrary content safely without shell escaping)
    result = container.exec_run(
        cmd=['tee', full_path],
        stdin=True,
        socket=False,
        demux=False,
    )
    # exec_run with stdin=True doesn't pipe directly; use exec_create/start instead
    client = docker.from_env()
    exec_inst = client.api.exec_create(
        container.id,
        cmd=['tee', full_path],
        stdin=True,
        stdout=True,
        stderr=True,
    )
    sock = client.api.exec_start(exec_inst['Id'], detach=False, socket=True)
    raw = sock._sock if hasattr(sock, '_sock') else sock
    try:
        raw.sendall(content.encode('utf-8'))
        raw.shutdown(1)  # signal EOF on stdin
    finally:
        raw.close()

    inspect = client.api.exec_inspect(exec_inst['Id'])
    exit_code = inspect.get('ExitCode', -1)

    if exit_code != 0:
        logger.error(f"tee write failed (exit {exit_code}) for {full_path}")
        return jsonify({'success': False, 'error': f'Write failed (exit {exit_code})'}), 500

    log_activity('file_write', f'Project {project_id}: {rel_path} ({len(content)} bytes)')
    return jsonify({
        'success': True,
        'message': f'{rel_path} saved successfully',
        'path': rel_path,
        'bytes': len(content.encode('utf-8')),
    })


@app.route('/dbtest')
@login_required
def test_database():
    log_activity('database_test', 'connection_test')
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("SELECT version()")
                db_version = cursor.fetchone()['version']

                cursor.execute(
                    "SELECT COUNT(*) as total_projects FROM projects WHERE owner_id = %s",
                    (current_user.id,)
                )
                project_count = cursor.fetchone()['total_projects']

                cursor.execute(
                    "SELECT COUNT(*) as total_logs FROM activity_logs WHERE user_id = %s",
                    (current_user.id,)
                )
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
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'CloudX Platform',
        'version': '2.1.0',
        'components': {}
    }
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
        health_status['components']['database'] = {
            'status': 'healthy', 'response_time': '< 100ms'
        }
    except Exception as e:
        health_status['components']['database'] = {
            'status': 'unhealthy', 'error': str(e)
        }
        health_status['status'] = 'degraded'

    health_status['components']['websocket'] = {'status': 'healthy'}
    return jsonify(health_status)


def get_dashboard_stats():
    stats = {
        'total_projects': 0,
        'active_deployments': 0,
        'total_activities': 0,
        'recent_activities': [],
        'system_health': 'healthy',
        'deployment_success_rate': 0
    }
    if not current_user.is_authenticated:
        return stats

    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    "SELECT COUNT(*) as count FROM projects WHERE owner_id = %s",
                    (current_user.id,)
                )
                stats['total_projects'] = cursor.fetchone()['count']

                cursor.execute("""
                    SELECT COUNT(*) as count FROM deployments d
                    JOIN projects p ON d.project_id = p.id
                    WHERE d.status = 'active' AND p.owner_id = %s
                """, (current_user.id,))
                stats['active_deployments'] = cursor.fetchone()['count']

                cursor.execute(
                    "SELECT COUNT(*) as count FROM activity_logs WHERE user_id = %s",
                    (current_user.id,)
                )
                stats['total_activities'] = cursor.fetchone()['count']

                cursor.execute("""
                    SELECT action, details, created_at
                    FROM activity_logs
                    WHERE user_id = %s
                    ORDER BY created_at DESC LIMIT 15
                """, (current_user.id,))
                stats['recent_activities'] = cursor.fetchall()
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")

    return stats


# ── WEBSOCKET EVENTS

@socketio.on('connect')
def handle_connect():
    session_id = secrets.token_hex(16)
    emit('connection_response', {
        'data': 'Connected to CloudX Platform',
        'session_id': session_id,
        'timestamp': datetime.now().isoformat()
    })
    log_activity('websocket_connect', f'Session: {session_id}')


@socketio.on('disconnect')
def handle_disconnect():
    log_activity('websocket_disconnect', 'Client disconnected')


@socketio.on('request_metrics')
def handle_metrics_request():
    pass


@socketio.on('join')
def handle_join(data):
    room = data.get('room')
    join_room(room)
    emit('status', {'msg': f'Joined room {room}'})


@socketio.on('leave')
def handle_leave(data):
    room = data.get('room')
    leave_room(room)
    emit('status', {'msg': f'Left room {room}'})


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def server_error(error):
    logger.error(f"Server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500


# ── TERMINAL SESSIONS ───────

terminal_sessions = {}

TERMINAL_BUFFER_BYTES    = int(os.getenv("TERMINAL_BUFFER_BYTES",    4096))
TERMINAL_FLUSH_INTERVAL  = float(os.getenv("TERMINAL_FLUSH_INTERVAL", 0.05))


def _buffered_docker_reader(container_id: str, exec_sock, sid: str):
    raw_sock = exec_sock._sock if hasattr(exec_sock, '_sock') else exec_sock

    raw_sock.setblocking(False)

    buf: list[bytes] = []
    buf_size: int = 0
    last_flush: float = time.monotonic()

    def flush():
        nonlocal buf, buf_size, last_flush
        if not buf:
            return
        payload = b"".join(buf).decode("utf-8", errors="ignore")
        socketio.emit("terminal_output", {"output": payload}, room=sid)
        buf = []
        buf_size = 0
        last_flush = time.monotonic()

    try:
        import select  # POSIX-only; available on Linux containers

        while True:
            now = time.monotonic()
            time_until_flush = TERMINAL_FLUSH_INTERVAL - (now - last_flush)

            readable, _, _ = select.select(
                [raw_sock], [], [],
                max(0.0, time_until_flush)
            )

            if readable:
                try:
                    chunk = raw_sock.recv(4096)
                except BlockingIOError:
                    chunk = b""

                if not chunk:
                    # EOF – the container exec session ended
                    break

                buf.append(chunk)
                buf_size += len(chunk)

                # Size-based flush
                if buf_size >= TERMINAL_BUFFER_BYTES:
                    flush()
            else:
                flush()

    except Exception as exc:
        logger.error("Terminal reader error (sid=%s): %s", sid, exc)
    finally:
        flush()
        logger.debug("Terminal reader exited (sid=%s)", sid)


@socketio.on('terminal_join')
def on_terminal_join(data):
    container_id = data.get('container_id')
    sid = request.sid

    try:
        user_project_ids = _get_user_project_ids()
        client    = docker.from_env()
        container = client.containers.get(container_id)
        if not _container_belongs_to_user(container.name, user_project_ids):
            emit('terminal_output', {
                'output': '\r\n\x1b[31mAccess denied.\x1b[0m\r\n'
            })
            return
    except Exception as e:
        emit('terminal_output', {
            'output': f"\r\n\x1b[31mError: {e}\x1b[0m\r\n"
        })
        return

    try:
        exec_inst = client.api.exec_create(
            container_id, "/bin/bash",
            stdin=True, tty=True, stdout=True, stderr=True
        )
        sock = client.api.exec_start(exec_inst['Id'], detach=False, tty=True, socket=True)
        terminal_sessions[sid] = sock

        socketio.start_background_task(
            target=_buffered_docker_reader,
            container_id=container_id,
            exec_sock=sock,
            sid=sid,
        )

    except Exception as e:
        logger.error(f"Terminal connect error: {e}")
        emit('terminal_output', {
            'output': f"\r\n\x1b[31mError connecting to container: {e}\x1b[0m\r\n"
        })


@socketio.on('terminal_input')
def on_terminal_input(data):
    sid = request.sid
    if sid in terminal_sessions:
        sock = terminal_sessions[sid]
        try:
            raw_sock = sock._sock if hasattr(sock, '_sock') else sock
            raw_sock.send(data['input'].encode())
        except Exception as e:
            logger.error(f"Terminal write error: {e}")


@socketio.on('disconnect')
def on_disconnect_cleanup():
    sid = request.sid
    if sid in terminal_sessions:
        try:
            sock = terminal_sessions[sid]
            raw_sock = sock._sock if hasattr(sock, '_sock') else sock
            raw_sock.close()
        except Exception:
            pass
        del terminal_sessions[sid]

if __name__ == '__main__':
    if SystemMonitor:
        monitor = SystemMonitor(socketio)
        monitor.daemon = True
        monitor.start()
        logger.info("Background SystemMonitor started")

    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=os.getenv('FLASK_DEBUG', False),
        allow_unsafe_werkzeug=True
    )