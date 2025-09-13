# Categories Feature Documentation

## Overview

The budget app now includes a comprehensive categories system that allows users to organize their expenses, set budgets, and track spending patterns. This feature includes predefined categories to get users started quickly, along with the ability to create custom categories.

## Features Implemented

### 1. Predefined Categories

The app comes with 18 predefined categories to help users get started:

- **Food & Dining** 🍽️ - Budget: $500/month
- **Groceries** 🛒 - Budget: $400/month
- **Transportation** 🚗 - Budget: $300/month
- **Gas & Fuel** ⛽ - Budget: $200/month
- **Entertainment** 🎬 - Budget: $200/month
- **Utilities** 💡 - Budget: $250/month
- **Healthcare** 🏥 - Budget: $300/month
- **Shopping** 🛍️ - Budget: $300/month
- **Personal Care** 💅 - Budget: $150/month
- **Education** 📚 - Budget: $200/month
- **Travel** ✈️ - Budget: $500/month
- **Home & Garden** 🏠 - Budget: $250/month
- **Technology** 💻 - Budget: $300/month
- **Fitness & Sports** 🏋️ - Budget: $100/month
- **Insurance** 🛡️ - Budget: $400/month
- **Subscriptions** 📱 - Budget: $150/month
- **Gifts & Donations** 🎁 - Budget: $200/month
- **Pet Care** 🐕 - Budget: $150/month
- **Other** 📋 - Budget: $100/month

Each category includes:
- Emoji icon for visual identification
- Color coding for easy recognition
- Default budget allocation
- Category name

### 2. Category Creation

Users can create custom categories with:
- **Custom name**: Any name they choose
- **Icon selection**: Choose from 32+ emoji options
- **Color selection**: Pick from 18 predefined colors
- **Budget setting**: Set monthly budget (optional)
- **Live preview**: See how the category will look before creating

### 3. Categories Management

A dedicated Categories tab provides:
- **Overview statistics**: Total categories and combined budget
- **Category list**: All categories with spending vs budget info
- **Edit functionality**: Modify category name and budget
- **Delete functionality**: Remove categories (with confirmation)
- **Spending insights**: See actual spending per category

### 4. Enhanced Transaction Flow

The Add Transaction modal now includes:
- **Category selection**: Only shown for expenses (not income)
- **Visual category display**: Icons and colors in dropdown
- **Quick category creation**: "Create New" button for instant category creation
- **Budget information**: Shows budget amounts in category selection
- **Auto-selection**: Newly created categories are auto-selected

### 5. Dashboard Integration

The main dashboard features:
- **Category overview card**: Shows top spending categories
- **Budget vs spending**: Visual progress bars for each category
- **Color coding**: Green (under 50%), yellow (50-80%), red (over 80%)
- **Over-budget alerts**: Clear indicators when spending exceeds budget

### 6. Category Statistics

Advanced category analytics include:
- **Spending tracking**: Real-time spending calculations
- **Budget progress**: Visual progress bars with percentage used
- **Over-budget warnings**: Clear indicators for overspending
- **Remaining budget**: Shows how much is left to spend
- **Category ranking**: Sorted by spending percentage or amount

## Technical Implementation

### Components Created

1. **CreateCategoryModal.tsx** - Full-featured category creation modal
2. **CategoriesManager.tsx** - Complete category management interface
3. **CategoryStatsCard.tsx** - Dashboard statistics component
4. **categories.tsx** - New tab screen for category management

### Data Structure

Categories use the following interface:
```typescript
interface Category {
  id: number;
  name: string;
  icon: string;        // Emoji character
  color: string;       // Hex color code
  budget: string;      // Monthly budget amount
  userId: number;      // Associated user
}
```

### Navigation

- Added new "Categories" tab in main navigation
- Accessible via folder icon in tab bar
- Integrated with existing app navigation structure

## User Experience Improvements

### Visual Design
- Consistent color coding throughout the app
- Emoji icons for instant category recognition
- Progress bars for budget tracking
- Clean, modern interface design

### Usability Features
- Quick category creation from transaction screen
- Visual preview during category creation
- Confirmation dialogs for destructive actions
- Loading states and error handling

### Data Persistence
- Categories are stored in offline storage
- Syncs with existing transaction system
- Maintains data integrity across app restarts

## Usage Scenarios

### New User Experience
1. App starts with 18 predefined categories
2. User can immediately start categorizing expenses
3. Default budgets provide spending guidance
4. Categories help organize financial habits

### Power User Features
1. Create unlimited custom categories
2. Fine-tune budgets based on spending patterns
3. Track multiple spending areas with precision
4. Visual insights into spending habits

### Category Management Workflow
1. Go to Categories tab
2. View all categories with spending data
3. Edit existing categories or create new ones
4. Monitor budget performance with visual indicators

## Future Enhancement Opportunities

1. **Category Groups** - Organize categories into larger groups (e.g., "Housing", "Transportation")
2. **Spending Goals** - Set reduction targets for specific categories
3. **Category Rules** - Auto-categorize transactions based on patterns
4. **Export/Import** - Share category setups between users
5. **Category Analytics** - Detailed spending trends and predictions
6. **Subcategories** - Create hierarchical category structures

## Technical Notes

- All components follow the existing app's design system
- Uses the same offline storage and sync mechanisms
- Integrates with existing query caching system
- Maintains backward compatibility with existing data