import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Progress } from './Progress';
import { showToast } from './Toast';
// CategoryListItem not used in this editor view
import { Input } from './Input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from './Select';
import CreateCategoryModal from './CreateCategoryModal';
import { useCategories, useData } from '@/context/DataContext';

interface BudgetSetupFlowProps {
  onFinish: () => Promise<void> | void;
}

export default function BudgetSetupFlow({ onFinish }: BudgetSetupFlowProps) {
  const { bottom, top } = useSafeAreaInsets();
  const { getCategories, updateCategory } = useCategories();
  const { isInitialized, dataVersion } = useData();
  const [categories, setCategories] = useState<any[]>([]);

  const [stepIndex, setStepIndex] = useState(0);
  const [localEdits, setLocalEdits] = useState<
    Record<number, { name: string; icon: string; budget: string }>
  >({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const INITIAL_NAMES = useMemo(
    () => ['Housing', 'Utilities', 'Insurance', 'Cell Phone', 'Gas'],
    []
  );
  const setupCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [] as typeof categories;
    const preferred = categories.filter((c) => INITIAL_NAMES.includes(c.name));
    if (preferred.length > 0) return preferred;
    return categories.slice(0, 5);
  }, [categories, INITIAL_NAMES]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isInitialized) return;
      const cats = await getCategories();
      if (mounted) setCategories(cats);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isInitialized, dataVersion, getCategories]);

  const totalSteps = useMemo(() => Math.max(setupCategories.length, 1), [setupCategories.length]);
  const progress = ((Math.min(stepIndex, totalSteps - 1) + 1) / totalSteps) * 100;

  useEffect(() => {
    if (setupCategories.length > 0) {
      // Initialize local edits with existing values
      const initial: Record<number, { name: string; icon: string; budget: string }> = {};
      setupCategories.forEach(
        (c) => (initial[c.id] = { name: c.name, icon: c.icon, budget: c.budget })
      );
      setLocalEdits(initial);
    }
  }, [setupCategories]);

  const currentCategory = setupCategories[stepIndex];

  const handleBudgetChange = (value: string) => {
    if (!currentCategory) return;
    // numeric only with optional decimal
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setLocalEdits((prev) => ({
      ...prev,
      [currentCategory.id]: { ...(prev[currentCategory.id] || {}), budget: formatted },
    }));
  };

  const handleNameChange = (value: string) => {
    if (!currentCategory) return;
    setLocalEdits((prev) => ({
      ...prev,
      [currentCategory.id]: { ...(prev[currentCategory.id] || {}), name: value },
    }));
  };

  const handleIconChange = (value: string) => {
    if (!currentCategory) return;
    setLocalEdits((prev) => ({
      ...prev,
      [currentCategory.id]: { ...(prev[currentCategory.id] || {}), icon: value },
    }));
  };

  // Default emoji mapping for suggestions
  const defaultEmojiForName = useMemo(
    () => ({
      Housing: '🏠',
      Utilities: '💡',
      Insurance: '🛡️',
      'Cell Phone': '📱',
      Gas: '⛽',
    }),
    []
  );

  const applySuggestion = (label: string) => {
    handleNameChange(label);
    const emj = (defaultEmojiForName as any)[label];
    if (emj) handleIconChange(emj);
  };

  const goNext = () => {
    // basic validation for current step
    if (currentCategory) {
      const edit = localEdits[currentCategory.id] || {
        name: currentCategory.name,
        budget: currentCategory.budget,
        icon: currentCategory.icon,
      };
      if (!edit.name || !edit.name.trim()) {
        showToast.error('Title required', 'Please enter a category name');
        return;
      }
      const val = parseFloat(edit.budget || '');
      if (isNaN(val) || val < 0) {
        showToast.error('Invalid amount', 'Enter a valid non-negative number');
        return;
      }
    }
    if (stepIndex < totalSteps - 1) setStepIndex((i) => i + 1);
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const finish = async () => {
    // Validate last step as well
    if (currentCategory) {
      const edit = localEdits[currentCategory.id] || {
        name: currentCategory.name,
        budget: currentCategory.budget,
        icon: currentCategory.icon,
      };
      if (!edit.name || !edit.name.trim()) {
        showToast.error('Title required', 'Please enter a category name');
        return;
      }
      const val = parseFloat(edit.budget || '');
      if (isNaN(val) || val < 0) {
        // showToast.error('Invalid amount', 'Enter a valid non-negative number');
        return;
      }
    }
    try {
      // Persist any modified budgets
      await Promise.all(
        setupCategories.map((c) => {
          const edit = localEdits[c.id];
          if (!edit) return Promise.resolve();
          const updates: any = {};
          if (typeof edit.budget === 'string' && edit.budget !== c.budget)
            updates.budget = edit.budget;
          if (edit.name && edit.name !== c.name) updates.name = edit.name.trim();
          if (edit.icon && edit.icon !== c.icon) updates.icon = edit.icon;
          if (Object.keys(updates).length === 0) return Promise.resolve();
          return updateCategory(c.id, updates);
        })
      );
    } catch {
      // Ignore errors here; the outer flow can handle toasts if needed
    }
    await Promise.resolve(onFinish());
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-app-canvas"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ paddingTop: top / 2 }}>
      {/* Sticky Header */}
      <View className="bg-app-canvas px-6 pb-2 pt-6">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm text-app-text-faint">Budget setup</Text>
          <Text className="text-sm text-app-text-faint">
            {totalSteps > 0 ? `Step ${Math.min(stepIndex + 1, totalSteps)} of ${totalSteps}` : '—'}
          </Text>
        </View>
        <Progress value={progress} style={{ height: 8 }} />
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottom + 120, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-6 pt-6">
          <Text className="mb-4 text-center text-2xl font-bold text-app-text-strong">
            Set your starting budgets
          </Text>
          <Text className="mb-6 text-center text-base text-app-text-soft">
            Quickly review the suggested categories. You can fine-tune or add more later.
          </Text>

          {currentCategory ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="rounded-3xl border border-app-border-strong bg-app-surface-1 p-4">
              {/* Editable fields for emoji, title, and amount */}
              <View className="gap-4">
                <View>
                  <Text className="mb-2 text-sm font-medium text-app-text-soft">Emoji</Text>
                  <Select
                    value={localEdits[currentCategory.id]?.icon || currentCategory.icon}
                    onValueChange={handleIconChange}>
                    <SelectTrigger>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg">
                          {localEdits[currentCategory.id]?.icon || currentCategory.icon}
                        </Text>
                        <SelectValue />
                      </View>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectLabel>Common</SelectLabel>
                      <View className="flex-row flex-wrap gap-2 px-2 pb-2 pt-1">
                        {[
                          '🍽️',
                          '🛒',
                          '🚗',
                          '⛽',
                          '🎬',
                          '💡',
                          '🏥',
                          '🛍️',
                          '🏠',
                          '💻',
                          '🏋️',
                          '☕',
                          '🎵',
                          '📚',
                          '✈️',
                          '🐕',
                        ].map((emj) => (
                          <SelectItem key={emj} value={emj} className="px-2 py-2">
                            <Text className="text-lg">{emj}</Text>
                          </SelectItem>
                        ))}
                      </View>
                      <SelectSeparator />
                      <SelectLabel>More</SelectLabel>
                      <View className="flex-row flex-wrap gap-2 px-2 pb-3 pt-1">
                        {['🎁', '📱', '🔧', '🛡️', '📋', '🎮', '🚇', '💊', '⚡', '🏦'].map((emj) => (
                          <SelectItem key={emj} value={emj} className="px-2 py-2">
                            <Text className="text-lg">{emj}</Text>
                          </SelectItem>
                        ))}
                      </View>
                    </SelectContent>
                  </Select>
                </View>

                <View>
                  <Text className="mb-2 text-sm font-medium text-app-text-soft">Title</Text>
                  <Input
                    value={localEdits[currentCategory.id]?.name ?? currentCategory.name}
                    onChangeText={handleNameChange}
                    placeholder="Category name"
                    variant="dark"
                  />
                  {/* Suggested names */}
                  <View className="mt-3">
                    <Text className="mb-2 text-xs font-medium uppercase tracking-wider text-app-text-faint">
                      Suggestions
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {['Housing', 'Utilities', 'Insurance', 'Cell Phone', 'Gas'].map((label) => (
                        <View
                          key={label}
                          className="rounded-full border border-app-border-strong bg-app-surface-2">
                          <Text
                            onPress={() => applySuggestion(label)}
                            className="px-3 py-1 text-sm text-app-text-soft">
                            {label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                <View>
                  <Text className="mb-2 text-sm font-medium text-app-text-soft">
                    Monthly Amount
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-base font-medium text-app-text-soft">$</Text>
                    <Input
                      value={localEdits[currentCategory.id]?.budget ?? currentCategory.budget}
                      onChangeText={handleBudgetChange}
                      keyboardType="numeric"
                      placeholder="0"
                      className="flex-1 text-base"
                      variant="dark"
                    />
                  </View>
                </View>

                <View className="mt-2 rounded-2xl bg-app-surface-2 p-4">
                  <Text className="text-center text-app-text-faint">
                    Remaining categories: {Math.max(totalSteps - (stepIndex + 1), 0)}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : (
            <View className="items-center justify-center">
              <Text className="text-app-text-faint">
                No categories found. Add a category to get started.
              </Text>
            </View>
          )}

          {/* Add more categories section */}
          <View className="mt-8 rounded-3xl border border-app-border-strong bg-app-surface-1 p-4">
            <Text className="mb-2 text-base font-semibold text-app-text-strong">
              Need more categories?
            </Text>
            <Text className="mb-4 text-sm text-app-text-faint">
              You can add more now or anytime from the Categories tab.
            </Text>
            <Button
              title="Add Category"
              variant="outline"
              onPress={() => setShowCreateModal(true)}
              size="md"
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View
        className="bg-app-canvas px-6 pb-6 pt-4"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {stepIndex < totalSteps - 1 ? (
          <View className="flex-row items-center gap-3">
            <Button
              title="Back"
              variant="outline"
              onPress={goBack}
              disabled={stepIndex === 0}
              className="flex-1"
              size="lg"
            />
            <Button title="Next" variant="default" onPress={goNext} className="flex-1" size="lg" />
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <Button
              title="Back"
              variant="outline"
              onPress={goBack}
              disabled={stepIndex === 0}
              className="flex-1"
              size="lg"
            />
            <Button
              title="Finish Setup"
              variant="default"
              onPress={finish}
              className="flex-1"
              size="lg"
            />
          </View>
        )}
      </View>

      {showCreateModal && (
        <View className="absolute inset-0 z-50 bg-app-canvas">
          <CreateCategoryModal onClose={() => setShowCreateModal(false)} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
