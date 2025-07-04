# MoodScale Database Schema Documentation

## Overview

MoodScale uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The database is designed to handle user mood tracking, music analysis, and AI-powered recommendations.

## Tables

### Users (`users`)
Stores user account information and Spotify integration data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique user identifier |
| username | TEXT | NOT NULL, UNIQUE | User's chosen username |
| spotify_id | TEXT | NULLABLE | Spotify user ID |
| spotify_access_token | TEXT | NULLABLE | Encrypted Spotify access token |
| spotify_refresh_token | TEXT | NULLABLE | Encrypted Spotify refresh token |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |

### Mood Entries (`mood_entries`)
Stores individual mood log entries from users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique entry identifier |
| user_id | INTEGER | NOT NULL, FK to users.id | User who created the entry |
| mood_score | INTEGER | NOT NULL, CHECK (1-10) | Mood rating from 1-10 |
| emotions | TEXT[] | NULLABLE | Array of emotion tags |
| notes | TEXT | NULLABLE | Optional user notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Entry creation timestamp |

### Music Analysis (`music_analysis`)
Stores analysis results for Spotify tracks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique analysis identifier |
| user_id | INTEGER | NOT NULL, FK to users.id | User who analyzed the track |
| spotify_track_id | TEXT | NOT NULL | Spotify track identifier |
| track_name | TEXT | NOT NULL | Name of the track |
| artist_name | TEXT | NOT NULL | Primary artist name |
| album_image | TEXT | NULLABLE | Album cover image URL |
| audio_features | JSONB | NULLABLE | Spotify audio features data |
| predicted_mood | TEXT | NULLABLE | AI-predicted mood |
| mood_confidence | REAL | NULLABLE | Confidence score (0-1) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Analysis timestamp |

### Recommendations (`recommendations`)
Stores AI-generated music recommendations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique recommendation identifier |
| user_id | INTEGER | NOT NULL, FK to users.id | Target user |
| mood_entry_id | INTEGER | NULLABLE, FK to mood_entries.id | Related mood entry |
| spotify_track_id | TEXT | NOT NULL | Recommended track ID |
| track_name | TEXT | NOT NULL | Track name |
| artist_name | TEXT | NOT NULL | Artist name |
| album_image | TEXT | NULLABLE | Album cover URL |
| reason | TEXT | NULLABLE | AI explanation for recommendation |
| match_score | REAL | NULLABLE | Match confidence (0-1) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Recommendation timestamp |

### Personality Insights (`personality_insights`)
Stores AI-generated personality profiles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique insight identifier |
| user_id | INTEGER | NOT NULL, FK to users.id | Target user |
| music_dna | TEXT | NULLABLE | Musical personality description |
| energy_level | REAL | NULLABLE | Energy preference (0-1) |
| positivity_level | REAL | NULLABLE | Positivity level (0-1) |
| ai_suggestion | TEXT | NULLABLE | Personalized AI suggestion |
| generated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Generation timestamp |

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_mood_entries_user_created ON mood_entries(user_id, created_at DESC);
CREATE INDEX idx_music_analysis_user_created ON music_analysis(user_id, created_at DESC);
CREATE INDEX idx_recommendations_user_created ON recommendations(user_id, created_at DESC);
CREATE INDEX idx_personality_insights_user_generated ON personality_insights(user_id, generated_at DESC);

-- Search indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_music_analysis_track ON music_analysis(spotify_track_id);
```

## Security Features

### Data Encryption
- Spotify tokens are encrypted at rest using AES-256-GCM
- Sensitive user data is protected with application-level encryption

### Access Controls
- All queries use parameterized statements to prevent SQL injection
- Input validation and sanitization on all user inputs
- Rate limiting on API endpoints to prevent abuse

### Audit Trail
- All database operations are logged with timestamps
- User actions are tracked for security monitoring

## Performance Optimizations

### Connection Pooling
- Production uses PostgreSQL connection pooling
- Configurable pool size and timeout settings
- Health checks for connection monitoring

### Query Optimization
- Proper indexing on frequently queried columns
- Limit clauses to prevent large result sets
- Efficient JOIN operations where needed

### Caching Strategy
- Application-level caching for frequently accessed data
- Query result caching for expensive operations
- Cache invalidation on data updates

## Backup and Recovery

### Automated Backups
- Daily automated backups using pg_dump
- Compressed backup files to save storage
- Configurable retention period (default: 30 days)

### Recovery Procedures
- Point-in-time recovery capability
- Backup verification and testing
- Disaster recovery documentation

## Migration Strategy

### Schema Changes
- Version-controlled migration files
- Rollback capabilities for failed migrations
- Testing migrations on staging environment

### Data Migration
- Safe data transformation procedures
- Validation of migrated data
- Minimal downtime deployment strategy

## Monitoring and Alerting

### Health Monitoring
- Database connection health checks
- Query performance monitoring
- Storage usage tracking

### Alerting
- Automated alerts for connection failures
- Performance degradation notifications
- Storage capacity warnings

## Development Guidelines

### Best Practices
- Use Drizzle ORM for all database operations
- Validate all inputs using Zod schemas
- Implement proper error handling
- Follow naming conventions for tables and columns

### Testing
- Unit tests for all repository functions
- Integration tests for complex queries
- Performance tests for critical operations
- Mock data for development and testing

## Environment Configuration

### Required Environment Variables
```bash
DATABASE_URL=postgresql://user:password@host:port/database
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
ENCRYPTION_KEY=your-32-byte-encryption-key
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
```

### Development Setup
1. Install PostgreSQL locally or use Docker
2. Create database: `createdb moodscale_dev`
3. Run migrations: `npm run db:push`
4. Seed test data if needed

### Production Deployment
1. Set up PostgreSQL instance with SSL
2. Configure connection pooling
3. Set up automated backups
4. Enable monitoring and alerting
5. Run security audit