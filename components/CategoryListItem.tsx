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
      const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
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
            className="w-20 text-right border-gray-400 bg-white text-base"
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
        <View className="flex-row items-center gap-3 flex-1">
          <View 
            className="w-8 h-8 rounded-full justify-center items-center"
            style={{ backgroundColor: category.color + '20' }}
          >
            <Text className="text-lg">{category.icon}</Text>
          </View>
          <Text className="text-base font-medium text-gray-700 flex-1" numberOfLines={1}>
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
          style={{ backgroundColor: category.color + '20' }}
        >
          <Text className="text-lg">{category.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-foreground-primary text-base font-semibold">
            {category.name}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-foreground-secondary text-sm">
              Budget: ${parseFloat(category.budget).toFixed(2)}/month
            </Text>
            {mode === 'display' && spent > 0 && (
              <Text className="text-foreground-secondary text-sm">
                Spent: ${spent.toFixed(2)}
              </Text>
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
              className="bg-background-primary h-10 w-10 items-center justify-center rounded-lg"
            >
              <Ionicons name="pencil" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              className="bg-error-50 h-10 w-10 items-center justify-center rounded-lg"
            >
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return null;
  };

  const baseClasses = mode === 'onboarding' 
    ? "flex-row justify-between items-center py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 min-w-full"
    : "bg-background-secondary border-border-default rounded-xl border p-4";

  return (
    <View className={`${baseClasses} ${className}`} style={mode === 'onboarding' ? { minWidth: '100%' } : undefined}>
      {mode === 'onboarding' ? (
        <>
          <View className="flex-row items-center gap-3 flex-1 min-w-0">
            <View 
              className="w-8 h-8 rounded-full justify-center items-center flex-shrink-0"
              style={{ backgroundColor: category.color + '20' }}
            >
              <Text className="text-lg">{category.icon}</Text>
            </View>
            <Text className="text-base font-medium text-gray-700 flex-1" numberOfLines={1}>
              {category.name}
            </Text>
          </View>
          <View className="flex-row items-center gap-1 flex-shrink-0">
            <Text className="text-base font-medium text-gray-700">$</Text>
            <Input
              value={category.budget}
              onChangeText={handleBudgetChange}
              placeholder="0"
              keyboardType="numeric"
              className="w-20 text-right border-gray-400 bg-white text-base"
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
