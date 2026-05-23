import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { useForm } from 'react-hook-form';
import { useToast } from '../context/useToast';
import { useData } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  budget: string;
}

interface CreateCategoryModalProps {
  onClose: () => void;
  onCategoryCreated?: (categoryId: number) => void;
}

// Curated icon set for a cleaner first-run experience
const DEFAULT_ICONS = [
  '🏠', // Housing
  '💡', // Utilities
  '🛡️', // Insurance
  '📱', // Cell Phone
  '⛽', // Gas
  '🛒',
  '🍽️',
  '🚗',
  '🎬',
  '🏥',
  '🛍️',
  '💻',
  '🏋️',
  '☕',
  '🎵',
  '🎁',
];

const DEFAULT_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#4CAF50',
  '#FF9800',
  '#E91E63',
  '#9C27B0',
  '#F44336',
  '#3F51B5',
  '#00BCD4',
  '#8BC34A',
  '#607D8B',
  '#FF5722',
  '#795548',
  '#673AB7',
  '#9E9E9E',
  '#FFEB3B',
];

export default function CreateCategoryModal({
  onClose,
  onCategoryCreated,
}: CreateCategoryModalProps) {
  const { bottom } = useSafeAreaInsets();
  const { toast } = useToast();
  const { createCategory } = useData();
  const [submitting, setSubmitting] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      icon: DEFAULT_ICONS[0],
      color: DEFAULT_COLORS[0],
      budget: '',
    },
  });

  React.useEffect(() => {
    setValue('icon', selectedIcon);
    setValue('color', selectedColor);
  }, [selectedIcon, selectedColor, setValue]);

  const submitCreate = async (data: CategoryFormData) => {
    try {
      setSubmitting(true);
      const categoryData = {
        name: data.name.trim(),
        icon: data.icon,
        color: data.color,
        budget: data.budget || '0',
      } as any;
      const newCategory = await createCategory(categoryData);
      toast({
        title: 'Category Created',
        description: `${newCategory.name} has been successfully created.`,
      });
      onCategoryCreated?.(newCategory.id);
      reset();
      onClose();
    } catch (error: any) {
      console.error('Category creation error:', error);
      const message = String(error?.message || '').toUpperCase();
      if (message.includes('CATEGORY_ALREADY_EXISTS')) {
        toast({
          title: 'Duplicate Category',
          description: 'A category with this name already exists.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create category. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (data: CategoryFormData) => {
    // Basic validation
    if (!data.name?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    if (data.budget && (isNaN(parseFloat(data.budget)) || parseFloat(data.budget) < 0)) {
      toast({
        title: 'Validation Error',
        description: 'Budget must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    submitCreate(data);
  };

  return (
    <View className="flex-1 bg-background-primary">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        {/* Scrollable content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: bottom + 200 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="border-b border-border-default bg-background-primary px-6 pb-4 pt-6">
            <View className="flex-row items-center justify-between">
              <Button variant="ghost" size="sm" onPress={onClose} className="px-0">
                <Ionicons name="close" size={24} color="#6B7280" />
              </Button>
              <Text className="text-xl font-semibold text-foreground-primary">Create Category</Text>
              <View className="w-10" />
            </View>
          </View>

          {/* Form Content */}
          <View className="flex-1 px-6 py-6">
            <View className="space-y-6">
              {/* Category Name */}
              <View>
                <Label className="mb-2 text-sm font-medium text-foreground-primary">
                  Category Name
                </Label>
                <Input
                  value={watch('name') || ''}
                  onChangeText={(value) => setValue('name', value)}
                  placeholder="Enter category name"
                  variant="outline"
                />
                {errors.name && (
                  <Text className="mt-1 text-xs text-error-600">
                    {errors.name.message as string}
                  </Text>
                )}
              </View>

              {/* Icon Selection */}
              <View>
                <Label className="mb-2 text-sm font-medium text-foreground-primary">
                  Select Icon
                </Label>
                <View className="flex-row flex-wrap gap-2">
                  {DEFAULT_ICONS.map((icon, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedIcon(icon)}
                      activeOpacity={0.8}
                      className={`h-11 w-11 items-center justify-center rounded-xl border ${
                        selectedIcon === icon
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-border-default bg-background-secondary'
                      }`}>
                      <Text className="text-lg">{icon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Color Selection */}
              <View>
                <Label className="mb-2 text-sm font-medium text-foreground-primary">
                  Select Color
                </Label>
                <View className="flex-row flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedColor(color)}
                      activeOpacity={0.8}
                      className={`h-9 w-9 items-center justify-center rounded-full border-2 ${
                        selectedColor === color ? 'border-gray-300' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}>
                      {selectedColor === color && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Budget Field */}
              <View>
                <Label className="mb-2 text-sm font-medium text-foreground-primary">
                  Monthly Budget (Optional)
                </Label>
                <Input
                  keyboardType="numeric"
                  value={watch('budget') || ''}
                  onChangeText={(value) => {
                    // Only allow numbers and decimal point
                    const cleaned = value.replace(/[^0-9.]/g, '');
                    // Prevent multiple decimal points
                    const parts = cleaned.split('.');
                    const formatted =
                      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                    setValue('budget', formatted);
                  }}
                  placeholder="0.00"
                  variant="outline"
                />
                {errors.budget && (
                  <Text className="mt-1 text-xs text-error-600">
                    {errors.budget.message as string}
                  </Text>
                )}
              </View>

              {/* Preview */}
              <View>
                <Label className="mb-2 text-sm font-medium text-foreground-primary">Preview</Label>
                <View className="rounded-lg border border-border-default bg-background-secondary p-4">
                  <View className="flex-row items-center">
                    <View
                      className="mr-3 h-12 w-12 items-center justify-center rounded-lg"
                      style={{ backgroundColor: selectedColor + '20' }}>
                      <Text className="text-lg">{selectedIcon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-foreground-primary">
                        {watch('name') || 'Category Name'}
                      </Text>
                      {watch('budget') && (
                        <Text className="text-sm text-foreground-secondary">
                          Budget: ${watch('budget')}/month
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <View
          className="border-t border-border-default bg-background-primary px-6 py-4"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <View className="flex-row items-center gap-3">
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              className="flex-1"
              size="lg"
            />
            <Button
              title="Create Category"
              variant="default"
              onPress={handleSubmit(onSubmit)}
              disabled={submitting}
              loading={submitting}
              className="flex-1"
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
