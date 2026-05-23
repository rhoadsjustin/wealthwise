import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Input } from './Input';
import { Ionicons } from '@expo/vector-icons';

interface CategoryListItemProps {
  category: {
    name: string;
    icon: string;
    color: string;
    budget: string;
  };
  mode?: 'display' | 'edit' | 'onboarding';
  spent?: number;
  onBudgetChange?: (newBudget: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export default function CategoryListItem({
  category,
  mode = 'display',
  spent = 0,
  onBudgetChange,
  onEdit,
  onDelete,
  className = '',
}: CategoryListItemProps) {
  const handleBudgetChange = (value: string) => {
    if (mode === 'onboarding') {
      // Only allow numeric input with optional decimal for onboarding
      const numericValue = value.replace(/[^0-9.]/g, '');
      const parts = numericValue.split('.');
      const formattedValue =
        parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
      onBudgetChange?.(formattedValue);
    } else {
      // For other modes, allow the parent to handle validation
      onBudgetChange?.(value);
    }
  };

  const renderBudgetInput = () => {
    if (mode === 'onboarding') {
      return (
        <View className="flex-row items-center gap-1">
          <Text className="text-base font-medium text-gray-700">$</Text>
          <Input
            value={category.budget}
            onChangeText={handleBudgetChange}
            placeholder="0"
            keyboardType="numeric"
            className="w-20 border-gray-400 bg-white text-right text-base"
            style={{ color: '#000000' }}
            {...{ placeholderTextColor: '#9CA3AF', selectionColor: '#000000' }}
          />
        </View>
      );
    }
    return null;
  };

  const renderCategoryInfo = () => {
    if (mode === 'onboarding') {
      return (
        <View className="flex-1 flex-row items-center gap-3">
          <View
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: category.color + '20' }}>
            <Text className="text-lg">{category.icon}</Text>
          </View>
          <Text className="flex-1 text-base font-medium text-gray-700" numberOfLines={1}>
            {category.name}
          </Text>
        </View>
      );
    }

    // Display mode (for CategoriesManager)
    return (
      <View className="flex-1 flex-row items-center">
        <View
          className="mr-3 h-12 w-12 items-center justify-center rounded-lg"
          style={{ backgroundColor: category.color + '20' }}>
          <Text className="text-lg">{category.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground-primary">{category.name}</Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-sm text-foreground-secondary">
              Budget: ${parseFloat(category.budget).toFixed(2)}/month
            </Text>
            {mode === 'display' && spent > 0 && (
              <Text className="text-sm text-foreground-secondary">Spent: ${spent.toFixed(2)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderActions = () => {
    if (mode === 'display' && (onEdit || onDelete)) {
      return (
        <View className="flex-row items-center gap-2">
          {onEdit && (
            <TouchableOpacity
              onPress={onEdit}
              className="h-10 w-10 items-center justify-center rounded-lg bg-background-primary">
              <Ionicons name="pencil" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              className="h-10 w-10 items-center justify-center rounded-lg bg-error-50">
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return null;
  };

  const baseClasses =
    mode === 'onboarding'
      ? 'flex-row justify-between items-center py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 min-w-full'
      : 'bg-background-secondary border-border-default rounded-xl border p-4';

  return (
    <View
      className={`${baseClasses} ${className}`}
      style={mode === 'onboarding' ? { minWidth: '100%' } : undefined}>
      {mode === 'onboarding' ? (
        <>
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <View
              className="h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: category.color + '20' }}>
              <Text className="text-lg">{category.icon}</Text>
            </View>
            <Text className="flex-1 text-base font-medium text-gray-700" numberOfLines={1}>
              {category.name}
            </Text>
          </View>
          <View className="flex-shrink-0 flex-row items-center gap-1">
            <Text className="text-base font-medium text-gray-700">$</Text>
            <Input
              value={category.budget}
              onChangeText={handleBudgetChange}
              placeholder="0"
              keyboardType="numeric"
              className="w-20 border-gray-400 bg-white text-right text-base"
              style={{ color: '#000000', minWidth: 80 }}
              {...{ placeholderTextColor: '#9CA3AF', selectionColor: '#000000' }}
            />
          </View>
        </>
      ) : (
        <View className="flex-row items-center justify-between">
          {renderCategoryInfo()}
          {renderActions()}
        </View>
      )}
    </View>
  );
}
