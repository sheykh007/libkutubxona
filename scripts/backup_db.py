import os
import shutil
from datetime import datetime
from pathlib import Path

def backup_database():
    # Path configuration
    BASE_DIR = Path(__file__).resolve().parent.parent
    db_path = BASE_DIR / 'db.sqlite3'
    backup_dir = BASE_DIR / 'backups'
    
    # Create backup directory if not exists
    if not backup_dir.exists():
        backup_dir.mkdir()
        print(f"Created backup directory at {backup_dir}")

    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f"backup_{timestamp}.sqlite3"

    try:
        if db_path.exists():
            shutil.copy2(db_path, backup_file)
            print(f"✅ Backup successful: {backup_file}")
            
            # Optional: Here you could add AWS S3 upload logic using boto3
            # s3.upload_file(str(backup_file), bucket_name, f"backups/{backup_file.name}")
        else:
            print("❌ Error: db.sqlite3 not found.")
    except Exception as e:
        print(f"❌ Backup failed: {str(e)}")

if __name__ == "__main__":
    backup_database()
