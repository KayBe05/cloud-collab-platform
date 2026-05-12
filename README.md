# CloudX: Enterprise Cloud Orchestration Platform

CloudX is a sophisticated cloud management and container orchestration platform designed for secure, isolated, and scalable development environments. It allows administrators to provision, monitor, and manage containerized workspaces with real-time telemetry and a high-performance terminal interface.

##  Features

* **Secure Tenant Isolation:** Multi-user architecture with strict project ownership and persistent storage volumes for every workspace.
* **Real-time Infrastructure Monitoring:** Visualized system metrics (CPU, RAM, Disk, Network) and live deployment success rates via Chart.js.
* **Orchestration Engine:** Automated Docker container provisioning with persistent project-specific storage mounts.
* **Advanced Web Terminal:** Integrated Xterm.js-based terminal providing low-latency SSH and interactive shell access directly in the browser.
* **Network Topology Visualization:** Dynamic mapping of orchestrator-to-worker nodes and active data-flow streams using Vis-Network.
* **Centralized Activity Logs:** Comprehensive audit trails for user actions, deployments, and system events with severity-based filtering.

## Tech Stack

* **Backend:** Python 3.x, Flask, Flask-SocketIO (WebSocket), Flask-Login, Flask-CORS.
* **Database:** PostgreSQL (Primary), SQLite (Development), Psycopg3.
* **Infrastructure:** Docker, Docker SDK for Python.
* **Frontend:** HTML5/CSS3 (Modern UI/UX with Glassmorphism), JavaScript (ES6+), Chart.js, Vis-Network, Xterm.js.
* **Styling:** Custom CSS featuring mesh gradients, 3D perspective grids, and responsive design systems.

## Prerequisites

* Docker & Docker Compose
* Python 3.8+
* PostgreSQL (or use the provided Docker-Compose setup)

## Installation & Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/KayBe05/cloud-collab-platform.git
    cd cloud-collab-platform
    ```

2.  **Environment Configuration:**
    Create a `.env` file in the root directory and populate it with your credentials (refer to `.env.example` for the required keys).
    ```bash
    POSTGRES_USER=cloudx_user
    POSTGRES_PASSWORD=your_secure_password
    POSTGRES_DB=cloudx
    SECRET_KEY=your_flask_secret_key
    GEMINI_API_KEY=your_google_api_key
    ```

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    The application will be accessible at `http://localhost:5000`.

## Usage

* **Login/Signup:** Access the two-panel authenticated portal to manage your identity.
* **Dashboard:** Monitor high-level system performance and active deployments.
* **Projects:** Create new projects, link GitHub repositories, and manage your containerized workspaces.
* **Analytics:** View real-time logs and network topology animations.

## Security

* **Environment Variables:** Sensitive keys are managed via `.env` and excluded from source control via `.gitignore`.
* **Authentication:** Robust session management and password hashing using Flask-Login and Werkzeug.
* **Tenant Isolation:** Users can only view and manage containers and projects they own.

## License

This project is licensed under the **Apache License 2.0**.

---
*Developed by Kritarth Bijalwan*
