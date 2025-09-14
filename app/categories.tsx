import React from 'react';
import { View } from 'react-native';
import CategoriesManager from '../components/CategoriesManager';

export default function CategoriesScreen() {
  return (
    <View className="flex-1">
      <CategoriesManager />
    </View>
  );
}
