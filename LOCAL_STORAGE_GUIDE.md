# Local Storage Guide

## Overview

This budget app uses a simple local storage solution with expo-sqlite. All data is stored locally on the device with no sync or network operations.

## Architecture

### Local Storage (`lib/local-storage.ts`)
- Direct SQLite database operations using expo-sqlite
- Simple CRUD operations for all data types
- No sync queues or offline metadata
- Clean database schema

### DataContext (`context/DataContext.tsx`)  
- Manages all data operations through local storage
- Provides React hooks for data access
- Handles demo data initialization
- Calculates dashboard summaries locally

### React Query Integration
- Uses standard QueryClient for caching
- No offline-specific query behaviors
- Simple data fetching and mutation patterns

## Data Flow

1. **App Initialization**: 
   - Initialize SQLite database with tables
   - Load or create demo data if needed

2. **Data Operations**:
   - All CRUD operations go directly to SQLite
   - React Query handles caching and UI updates
   - No network requests or sync operations

3. **Development Mode**:
   - Clears all data on app launch
   - Reinitializes with fresh demo data
   - Useful for testing and development

## Usage

The app works completely offline with all data stored locally. There are no network dependencies or sync capabilities - perfect for a local-only budget app.

### Key Features
- ✅ Local SQLite storage
- ✅ Demo data initialization  
- ✅ React Query caching
- ✅ TypeScript support
- ❌ No network sync
- ❌ No offline conflict resolution
- ❌ No background sync

## File Structure

```
lib/
├── local-storage.ts     # SQLite operations
├── schema/
│   └── schema.ts       # Data type definitions
└── hooks.ts            # React Query hooks

context/
└── DataContext.tsx     # Main data provider
```
