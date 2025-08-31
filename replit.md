# One Piece RPG Discord Bot

## Overview
A comprehensive Discord RPG bot inspired by the One Piece anime/manga series. Players can create unique characters with different races, origins, and dreams, embark on story-driven quests, form crews, and engage in combat across the Grand Line. The bot features character progression, faction systems, crew management, and immersive storytelling elements from the One Piece universe.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Node.js Discord Bot**: Built using Discord.js v14 with slash commands and interactive components
- **Database Layer**: PostgreSQL with connection pooling through the `pg` library and Neon serverless integration
- **ORM**: Drizzle ORM for database operations with schema management
- **Command Structure**: Modular command system with separate files for different game features
- **Event System**: Event-driven architecture handling user interactions, message events, and bot lifecycle

### Database Design
- **Character Management**: Players table storing user characters with stats, progression, and metadata
- **Quest System**: Quests table with dynamic requirements, rewards, and story progression tracking
- **Crew System**: Crews and crew_members tables for player group management with role hierarchies
- **Allies System**: Allies table for recruitable characters with unlock conditions and bond mechanics
- **Progress Tracking**: Player quest progress stored with JSON data for flexible quest state management

### Game Systems Architecture
- **Character Creation**: Multi-step interactive flow using Discord components (buttons, select menus, modals)
- **Quest Manager**: Class-based quest system with BaseQuest inheritance for different story arcs
- **Combat Manager**: Turn-based combat system with stat calculations and session management
- **Player Manager**: Caching layer for frequently accessed player data with automatic cleanup
- **Component Manager**: State management for Discord UI components with timeout handling

### Authentication & Permissions
- **Discord OAuth**: Built-in Discord authentication through bot token
- **Role-based Access**: Admin commands restricted by Discord permissions
- **Guild Isolation**: Player data separated by Discord guild for multi-server support

### Data Models
- **Player Model**: Character stats, experience, equipment, location, and progression data
- **Quest Model**: Story quests with dynamic requirements, rewards, and completion tracking
- **Crew Model**: Pirate crew management with captain hierarchy and member roles
- **Ally Model**: Recruitable characters with unlock conditions and combat bonuses

## External Dependencies

### Core Dependencies
- **Discord.js v14**: Primary Discord API wrapper for bot functionality
- **Node.js**: JavaScript runtime environment
- **dotenv**: Environment variable management for configuration

### Database Stack
- **PostgreSQL**: Primary relational database for data persistence
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe SQL toolkit and ORM for database operations
- **pg**: PostgreSQL client library for Node.js

### WebSocket & Real-time
- **ws**: WebSocket library for real-time connections required by Neon serverless

### Game Content
- **Static JSON Data**: Character races, origins, dreams, and ally information stored in data directory
- **Quest Implementations**: Modular quest classes for different story arcs (Romance Dawn, Orange Town)
- **Constants Configuration**: Game balance, colors, limits, and faction data

### Development & Deployment
- **NPM**: Package management and dependency resolution
- **Environment Variables**: DATABASE_URL, DISCORD_TOKEN, CLIENT_ID, GUILD_ID for configuration