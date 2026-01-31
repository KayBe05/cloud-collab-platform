from app import app, init_db

print("Starting database repair...")
with app.app_context():
    init_db()
    print("SUCCESS: Database tables created successfully!")
    