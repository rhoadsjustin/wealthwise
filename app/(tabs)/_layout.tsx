import { Link } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAuth } from '../../context/useAuth';
import { Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HeaderButton } from '../../components/HeaderButton';
import HeaderProfileButton from '../../components/HeaderProfileButton';
import * as React from 'react';
import { useMemo } from 'react';

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
    <NativeTabs minimizeBehavior="automatic">
      <NativeTabs.Trigger name="index">
        <Label>Dashboard</Label>
        <Icon sf={{ default: 'wallet.bifold', selected: 'wallet.bifold.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="insights">
        <Label>Insights</Label>
        <Icon sf={{ default: 'apple.intelligence', selected: 'apple.intelligence' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
