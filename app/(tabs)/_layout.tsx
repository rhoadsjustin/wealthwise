import { Link, Tabs } from 'expo-router';
import { useAuth } from '../../context/useAuth';
import { Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HeaderButton } from '../../components/HeaderButton';

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const colors = {
    primary: '#0EA5E9', // Sky blue - primary brand color
    primaryDark: '#0284C7', // Darker blue for active states
    success: '#22C55E', // Green for positive financial data
    background: '#FAFAFA', // Light gray background
    cardBackground: '#FFFFFF', // Pure white for cards
    text: '#1F2937', // Dark gray for text
    textMuted: '#6B7280', // Muted gray for secondary text
    border: '#E5E7EB', // Light border color
    inactive: '#9CA3AF', // Inactive tab color
  };

  return (
    <Tabs
      screenOptions={{
        // Tab bar styling
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },

        // Header styling
        headerStyle: {
          backgroundColor: colors.cardBackground,
          borderBottomWidth: 2,
          borderBottomColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 4,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: colors.text,
        },
        headerTintColor: colors.primary,

        // Background color for screens
        sceneContainerStyle: {
          backgroundColor: colors.background,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={size} color={color} />
          ),
          headerRight: () =>
            isAuthenticated ? (
              <Link href="/modal" asChild>
                <HeaderButton />
              </Link>
            ) : null,
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'analytics' : 'analytics-outline'}
              size={size}
              color={color}
            />
          ),
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
          },
        }}
      />

      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'bulb' : 'bulb-outline'} size={size} color={color} />
          ),
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
          },
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'folder' : 'folder-outline'} size={size} color={color} />
          ),
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
          },
        }}
      />

      <Tabs.Screen
        name="gamify"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
          ),
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
          },
        }}
      />
    </Tabs>
  );
}
