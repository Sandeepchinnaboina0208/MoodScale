# MoodScale - Music & Mood Intelligence

## Overview

MoodScale is a full-stack web application that tracks user moods, analyzes music preferences, and provides AI-powered insights into emotional patterns. The application combines mood journaling with music analysis using Spotify integration and OpenAI for intelligent recommendations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom mood-based color scheme
- **UI Components**: Radix UI primitives with shadcn/ui component system
- **State Management**: TanStack Query for server state and data fetching
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints with JSON responses
- **Error Handling**: Centralized error middleware with structured responses
- **Request Processing**: Express middleware for JSON parsing and CORS handling

### Data Storage Solutions
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured via Neon serverless)
- **Schema Definition**: Centralized schema in `/shared/schema.ts`
- **Migrations**: Drizzle Kit for database schema management
- **Storage Interface**: Abstract storage layer with in-memory fallback for development

## Key Components

### Database Schema
- **Users**: Authentication and Spotify integration data
- **Mood Entries**: User mood logs with scores (1-10) and emotional tags
- **Music Analysis**: Spotify track analysis with AI-predicted moods
- **Recommendations**: AI-generated music suggestions based on mood patterns
- **Personality Insights**: Long-term behavioral analysis and music DNA profiles

### API Endpoints
- `/api/mood-entries/*` - CRUD operations for mood logging
- `/api/mood-trends/*` - Aggregated mood data over time periods
- `/api/user-stats/*` - User analytics and summary statistics
- `/api/music-analysis/*` - Spotify track analysis results
- `/api/recommendations/*` - Personalized music recommendations
- `/api/personality-insights/*` - AI-generated personality profiles

### External Service Integrations
- **Spotify Web API**: Track search, audio features, and user playlists
- **OpenAI GPT-4**: Mood analysis, personality profiling, and recommendation generation
- **Authentication**: Spotify OAuth for music service integration

## Data Flow

1. **Mood Entry Flow**: User logs mood → Validates with Zod → Stores in database → Updates trends
2. **Music Analysis Flow**: User searches tracks → Spotify API → Audio features → OpenAI analysis → Store results
3. **Recommendation Flow**: Mood patterns → AI analysis → Spotify track matching → Personalized suggestions
4. **Insights Flow**: Historical data → OpenAI processing → Personality profiling → User dashboard

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Type-safe database operations
- **openai**: GPT-4 integration for AI features
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **zod**: Runtime type validation

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **chart.js**: Data visualization for mood trends
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

## Deployment Strategy

### Development Environment
- **Dev Server**: Vite development server with HMR
- **API Server**: Express with TypeScript compilation via tsx
- **Database**: Neon PostgreSQL with connection pooling
- **Environment Variables**: DATABASE_URL, OPENAI_API_KEY, SPOTIFY_CLIENT_ID/SECRET

### Production Build
- **Frontend**: Vite production build to `/dist/public`
- **Backend**: ESBuild compilation to `/dist/index.js`
- **Assets**: Static file serving via Express
- **Database**: Persistent PostgreSQL with connection pooling

### Configuration Files
- **TypeScript**: Shared config for client/server/shared code
- **Tailwind**: Custom design system with mood-based colors
- **Drizzle**: PostgreSQL dialect with schema-first migrations
- **Vite**: React plugin with path aliases and Replit integration

## Changelog

```
Changelog:
- July 02, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```