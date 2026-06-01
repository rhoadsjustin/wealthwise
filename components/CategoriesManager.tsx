import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Button } from './Button';
import { Input } from './Input';
import { useToast } from '../context/useToast';
import { useData, Category } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import CreateCategoryModal from './CreateCategoryModal';
import CategoryListItem from './CategoryListItem';
import { AppText } from '@/components/AppText';
import { useAppData, useCategoryData } from '@/app/_layout';

interface EditCategoryData {
  name: string;
  budget: string;
}

export default function CategoriesManager() {
  const { toast } = useToast();
  const { updateCategory, deleteCategory, updateTransaction } = useData();
  const { categories, transactions, categorySpendMap, categoryLoading, refreshCategoryData } =
    useCategoryData();
  const { refreshSummaryData } = useAppData();
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editData, setEditData] = useState<EditCategoryData>({ name: '', budget: '' });
  const [isSaving, setIsSaving] = useState(false);

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

    setIsSaving(true);
    updateCategory(editingCategory.id, {
      name: editData.name.trim(),
      budget: editData.budget || '0',
    })
      .then(async (updated) => {
        toast({
          title: 'Category Updated',
          description: `${updated.name} has been updated successfully.`,
        });
        setEditingCategory(null);
        await Promise.all([refreshCategoryData(), refreshSummaryData()]);
      })
      .catch((error) => {
        console.error('Category update error:', error);
        toast({
          title: 'Error',
          description: 'Failed to update category. Please try again.',
          variant: 'destructive',
        });
      })
      .finally(() => setIsSaving(false));
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${category.name}"? Transactions in this category will be moved to Uncategorized.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setIsSaving(true);
            // Move transactions to uncategorized (null) then delete category
            Promise.resolve()
              .then(async () => {
                const affected = transactions.filter((t) => t.categoryId === category.id);
                await Promise.allSettled(
                  affected.map((transaction) =>
                    updateTransaction(transaction.id, { categoryId: null } as any)
                  )
                );
                await deleteCategory(category.id);
              })
              .then(async () => {
                toast({
                  title: 'Category Deleted',
                  description: 'Transactions moved to Uncategorized.',
                });
                await Promise.all([refreshCategoryData(), refreshSummaryData()]);
              })
              .catch((error) => {
                console.error('Category deletion error:', error);
                toast({
                  title: 'Error',
                  description: 'Failed to delete category. Please try again.',
                  variant: 'destructive',
                });
              })
              .finally(() => setIsSaving(false));
          },
        },
      ]
    );
  };

  const totalBudget = categories.reduce((sum, category) => sum + parseFloat(category.budget), 0);

  if (categoryLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <AppText variant="body" className="text-app-text-soft">
          Loading categories...
        </AppText>
      </View>
    );
  }

  // Basic error UI omitted since DataContext handles local data; retries are simple reloads

  return (
    <View className="flex-1 bg-background-primary">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="border-b border-border-default bg-background-secondary px-6 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <AppText variant="page-title" className="text-app-text-strong">
                Categories
              </AppText>
              <AppText variant="hint" className="text-app-text-soft">
                ${totalBudget.toFixed(2)} total
              </AppText>
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
              <AppText variant="section" className="mt-4 text-center text-app-text-soft">
                No categories yet
              </AppText>
              <AppText variant="body" className="mt-2 text-center text-app-text-faint">
                Create your first category to get started
              </AppText>
              <Button onPress={() => setShowCreateCategory(true)} className="mt-6">
                <Text>Create Category</Text>
              </Button>
            </View>
          ) : (
            <View className="space-y-3">
              {categories.map((category) => {
                const spent = categorySpendMap.get(category.id) || 0;

                return (
                  <View key={category.id} className="space-y-1">
                    <CategoryListItem
                      category={category}
                      mode="display"
                      spent={spent}
                      onEdit={() => handleEditCategory(category)}
                      onDelete={() => handleDeleteCategory(category)}
                    />
                    <AppText variant="hint" className="px-2 text-app-text-faint">
                      Budgets are monthly.
                    </AppText>
                  </View>
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
          <View className="w-full max-w-md rounded-xl bg-background-primary p-6">
            <View className="mb-6 flex-row items-center justify-between">
              <AppText variant="title" className="text-app-text-strong">
                Edit Category
              </AppText>
              <TouchableOpacity onPress={() => setEditingCategory(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <AppText variant="form-label" className="mb-2 text-app-text-strong">
                  Name
                </AppText>
                <Input
                  value={editData.name}
                  onChangeText={(value) => setEditData({ ...editData, name: value })}
                  placeholder="Category name"
                  variant="outline"
                />
              </View>

              <View>
                <AppText variant="form-label" className="mb-2 text-app-text-strong">
                  Monthly Budget
                </AppText>
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
                disabled={isSaving}
                loading={isSaving}
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
