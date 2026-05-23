import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Button } from './Button';
import { Input } from './Input';
import { useToast } from '../context/useToast';
import { useData, Category } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import CreateCategoryModal from './CreateCategoryModal';
import CategoryListItem from './CategoryListItem';

interface EditCategoryData {
  name: string;
  budget: string;
}

export default function CategoriesManager() {
  const { toast } = useToast();
  const {
    getCategories,
    updateCategory,
    deleteCategory,
    getTransactions,
    updateTransaction,
    isInitialized,
    dataVersion,
  } = useData();
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editData, setEditData] = useState<EditCategoryData>({ name: '', budget: '' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [cats, txs] = await Promise.all([getCategories(), getTransactions()]);
      setCategories(cats);
      setTransactions(txs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    load();
    // re-run when underlying data changes (adds/edits/deletes)
  }, [isInitialized, dataVersion]);

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
      .then((updated) => {
        toast({
          title: 'Category Updated',
          description: `${updated.name} has been updated successfully.`,
        });
        setEditingCategory(null);
        load();
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
            getTransactions()
              .then(async (txs) => {
                const affected = txs.filter((t: any) => t.categoryId === category.id);
                for (const t of affected) {
                  try {
                    await updateTransaction(t.id, { categoryId: null } as any);
                  } catch (e) {}
                }
                await deleteCategory(category.id);
              })
              .then(() => {
                toast({
                  title: 'Category Deleted',
                  description: 'Transactions moved to Uncategorized.',
                });
                load();
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

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-foreground-secondary">Loading categories...</Text>
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
              <Text className="text-2xl font-bold text-foreground-primary">Categories</Text>
              <Text className="text-sm text-foreground-secondary">
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
              <Text className="mt-4 text-center text-lg text-foreground-secondary">
                No categories yet
              </Text>
              <Text className="mt-2 text-center text-foreground-muted">
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
                  <View key={category.id} className="space-y-1">
                    <CategoryListItem
                      category={category}
                      mode="display"
                      spent={spent}
                      onEdit={() => handleEditCategory(category)}
                      onDelete={() => handleDeleteCategory(category)}
                    />
                    <Text className="px-2 text-xs text-foreground-muted">Budgets are monthly.</Text>
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
              <Text className="text-lg font-semibold text-foreground-primary">Edit Category</Text>
              <TouchableOpacity onPress={() => setEditingCategory(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="mb-2 text-sm font-medium text-foreground-primary">Name</Text>
                <Input
                  value={editData.name}
                  onChangeText={(value) => setEditData({ ...editData, name: value })}
                  placeholder="Category name"
                  variant="outline"
                />
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-foreground-primary">
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
