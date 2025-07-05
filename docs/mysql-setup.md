# MySQL Database Setup for MoodScale

## Prerequisites

1. **MySQL Server**: Install MySQL 8.0 or higher
2. **Database Access**: Ensure you have root access or create a dedicated user

## Database Configuration

### Connection Details
- **Host**: localhost
- **Port**: 3306
- **Username**: root
- **Password**: Sandeep@2004
- **Database**: MoodScale

### Environment Variables
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Sandeep@2004
DB_NAME=MoodScale
DATABASE_URL=mysql://root:Sandeep@2004@localhost:3306/MoodScale
```

## Setup Instructions

### 1. Install MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# macOS (using Homebrew)
brew install mysql

# Windows
# Download from https://dev.mysql.com/downloads/mysql/
```

### 2. Start MySQL Service
```bash
# Ubuntu/Debian
sudo systemctl start mysql
sudo systemctl enable mysql

# macOS
brew services start mysql

# Windows
# Use MySQL Workbench or Services panel
```

### 3. Create Database
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE MoodScale CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user (optional but recommended)
CREATE USER 'moodscale'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON MoodScale.* TO 'moodscale'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Run Application
```bash
# Install dependencies
npm install

# Initialize database (creates tables automatically)
npm run dev
```

## Database Schema

The application automatically creates the following tables:

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  spotify_id VARCHAR(255),
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Mood Entries Table
```sql
CREATE TABLE mood_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mood_score INT NOT NULL CHECK (mood_score >= 1 AND mood_score <= 10),
  emotions JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Music Analysis Table
```sql
CREATE TABLE music_analysis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  spotify_track_id VARCHAR(255) NOT NULL,
  track_name VARCHAR(500) NOT NULL,
  artist_name VARCHAR(500) NOT NULL,
  album_image TEXT,
  audio_features JSON,
  predicted_mood VARCHAR(100),
  mood_confidence FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Recommendations Table
```sql
CREATE TABLE recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mood_entry_id INT,
  spotify_track_id VARCHAR(255) NOT NULL,
  track_name VARCHAR(500) NOT NULL,
  artist_name VARCHAR(500) NOT NULL,
  album_image TEXT,
  reason TEXT,
  match_score FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Personality Insights Table
```sql
CREATE TABLE personality_insights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  music_dna TEXT,
  energy_level FLOAT,
  positivity_level FLOAT,
  ai_suggestion TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Performance Optimizations

### Indexes
The application automatically creates these indexes:
- `idx_username` on users(username)
- `idx_user_created` on mood_entries(user_id, created_at)
- `idx_track` on music_analysis(spotify_track_id)
- `idx_user_created` on music_analysis(user_id, created_at)
- `idx_user_created` on recommendations(user_id, created_at)
- `idx_user_generated` on personality_insights(user_id, generated_at)

### Connection Pooling
- Maximum connections: 20
- Connection timeout: 5 seconds
- Idle timeout: 30 seconds

## Security Features

### Data Protection
- Spotify tokens are encrypted using AES-256-GCM
- Input validation and sanitization
- SQL injection prevention through parameterized queries
- Rate limiting on API endpoints

### Access Control
- Foreign key constraints maintain data integrity
- User data isolation (users can only access their own data)
- Secure connection configuration

## Backup and Recovery

### Automated Backups
```bash
# Create manual backup
npm run db:backup create

# List available backups
npm run db:backup list

# Restore from backup
npm run db:backup restore backup_file.sql
```

### Backup Configuration
- Daily automated backups (if enabled)
- Compressed backup files
- 30-day retention period (configurable)
- Backup location: `./backups/`

## Monitoring

### Health Checks
```bash
# Start monitoring dashboard
npm run db:monitor
```

### Database Statistics
- Connection pool status
- Query performance metrics
- Table row counts
- Storage usage

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if MySQL is running
   sudo systemctl status mysql
   
   # Start MySQL if stopped
   sudo systemctl start mysql
   ```

2. **Access Denied**
   ```bash
   # Reset root password
   sudo mysql_secure_installation
   ```

3. **Database Not Found**
   ```sql
   -- Create database manually
   CREATE DATABASE MoodScale;
   ```

4. **Character Set Issues**
   ```sql
   -- Set proper character set
   ALTER DATABASE MoodScale CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### Performance Issues

1. **Slow Queries**
   - Check if indexes are created
   - Monitor query execution plans
   - Increase connection pool size if needed

2. **Memory Usage**
   - Adjust MySQL configuration
   - Monitor connection pool usage
   - Implement query result caching

## Development vs Production

### Development
- Single connection for simplicity
- Detailed error logging
- Sample data creation
- No SSL required

### Production
- Connection pooling enabled
- SSL connections recommended
- Automated backups
- Performance monitoring
- Error logging to files

## Migration from PostgreSQL

If migrating from PostgreSQL:

1. Export data from PostgreSQL
2. Transform data types (SERIAL → AUTO_INCREMENT, JSONB → JSON)
3. Update foreign key constraints
4. Import data to MySQL
5. Update application configuration
6. Test all functionality

The application handles the differences automatically through the Drizzle ORM abstraction layer.