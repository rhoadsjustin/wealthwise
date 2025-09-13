import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Button } from './Button';
import { Input } from './Input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/useToast';
import { useData, Category } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import CreateCategoryModal from './CreateCategoryModal';
import CategoryStatsCard from './CategoryStatsCard';
import CategoryListItem from './CategoryListItem';

interface EditCategoryData {
  name: string;
  budget: string;
}

export default function CategoriesManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getCategories, updateCategory, deleteCategory, getTransactions } = useData();
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editData, setEditData] = useState<EditCategoryData>({ name: '', budget: '' });

  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Category> }) => {
      return await updateCategory(id, updates);
    },
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast({
        title: 'Category Updated',
        description: `${updatedCategory.name} has been updated successfully.`,
      });
      setEditingCategory(null);
    },
    onError: (error) => {
      console.error('Category update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await deleteCategory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast({
        title: 'Category Deleted',
        description: 'The category has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Category deletion error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete category. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditData({
      name: category.name,
      budget: category.budget,
    });
  };

  const handleSaveEdit = () => {
    if (!editingCategory) return;

    if (!editData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    if (
      editData.budget &&
      (isNaN(parseFloat(editData.budget)) || parseFloat(editData.budget) < 0)
    ) {
      toast({
        title: 'Validation Error',
        description: 'Budget must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    updateCategoryMutation.mutate({
      id: editingCategory.id,
      updates: {
        name: editData.name.trim(),
        budget: editData.budget || '0',
      },
    });
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategoryMutation.mutate(category.id),
        },
      ]
    );
  };

  const totalBudget = categories.reduce((sum, category) => sum + parseFloat(category.budget), 0);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-foreground-secondary">Loading categories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text className="text-foreground-primary mt-4 text-center text-lg font-semibold">
          Failed to load categories
        </Text>
        <Button onPress={() => refetch()} className="mt-4">
          <Text>Try Again</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="bg-background-primary flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="border-border-default bg-background-secondary border-b px-6 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-foreground-primary text-2xl font-bold">Categories</Text>
              <Text className="text-foreground-secondary text-sm">
                ${totalBudget.toFixed(2)} total
              </Text>
            </View>
            <Button
              onPress={() => setShowCreateCategory(true)}
              size="sm"
              className="flex-row items-center">
              <Ionicons name="add" size={16} color="white" />
              <Text className="ml-1 font-medium text-white">Add</Text>
            </Button>
          </View>
        </View>

        {/* Categories List */}
        <View className="p-6">
          {categories.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="folder-open-outline" size={64} color="#9CA3AF" />
              <Text className="text-foreground-secondary mt-4 text-center text-lg">
                No categories yet
              </Text>
              <Text className="text-foreground-muted mt-2 text-center">
                Create your first category to get started
              </Text>
              <Button onPress={() => setShowCreateCategory(true)} className="mt-6">
                <Text>Create Category</Text>
              </Button>
            </View>
          ) : (
            <View className="space-y-3">
              {categories.map((category) => {
                // Calculate spent amount for this category
                const spent = transactions
                  .filter((t) => t.type === 'expense' && t.categoryId === category.id)
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                return (
                  <CategoryListItem
                    key={category.id}
                    category={category}
                    mode="display"
                    spent={spent}
                    onEdit={() => handleEditCategory(category)}
                    onDelete={() => handleDeleteCategory(category)}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Category Modal */}
      <Modal visible={showCreateCategory} animationType="slide" presentationStyle="pageSheet">
        <CreateCategoryModal onClose={() => setShowCreateCategory(false)} />
      </Modal>

      {/* Edit Category Modal */}
      <Modal visible={!!editingCategory} animationType="slide" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="bg-background-primary w-full max-w-md rounded-xl p-6">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-foreground-primary text-lg font-semibold">Edit Category</Text>
              <TouchableOpacity onPress={() => setEditingCategory(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-foreground-primary mb-2 text-sm font-medium">Name</Text>
                <Input
                  value={editData.name}
                  onChangeText={(value) => setEditData({ ...editData, name: value })}
                  placeholder="Category name"
                  variant="outline"
                />
              </View>

              <View>
                <Text className="text-foreground-primary mb-2 text-sm font-medium">
                  Monthly Budget
                </Text>
                <Input
                  keyboardType="numeric"
                  value={editData.budget}
                  onChangeText={(value) => {
                    const cleaned = value.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    const formatted =
                      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                    setEditData({ ...editData, budget: formatted });
                  }}
                  placeholder="0.00"
                  variant="outline"
                />
              </View>
            </View>

            <View className="mt-6 flex-row gap-3">
              <Button variant="outline" onPress={() => setEditingCategory(null)} className="flex-1">
                <Text>Cancel</Text>
              </Button>
              <Button
                onPress={handleSaveEdit}
                disabled={updateCategoryMutation.isPending}
                loading={updateCategoryMutation.isPending}
                className="flex-1">
                <Text>Save Changes</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
