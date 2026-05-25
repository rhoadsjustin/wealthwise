import React from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InsightsComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<TextInput | null>;
}

export function InsightsComposer({
  value,
  onChangeText,
  onSubmit,
  disabled = false,
  loading = false,
  placeholder = 'Ask about spending, categories, or progress',
  inputRef,
}: InsightsComposerProps) {
  const canSend = !disabled && !loading && !!value.trim();

  return (
    <View className="border-t border-app-border bg-app-canvas px-5 pt-3">
      <View className="rounded-[30px] border border-app-border bg-app-surface-1 px-3 py-2">
        <View className="flex-row items-end gap-2">
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#8190B3"
            className="max-h-32 flex-1 px-1 py-2 text-sm text-app-text-strong"
            editable={!disabled && !loading}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (canSend) onSubmit();
            }}
          />
          <Pressable
            accessibilityLabel="Send insight message"
            disabled={!canSend}
            onPress={onSubmit}
            className={`h-11 w-11 items-center justify-center rounded-full bg-accent-savings ${
              canSend ? '' : 'opacity-40'
            }`}
            style={({ pressed }) => ({
              transform: [{ scale: pressed && canSend ? 0.96 : 1 }],
              opacity: pressed && canSend ? 0.94 : undefined,
            })}>
            {loading ? (
              <ActivityIndicator size="small" color="#050816" />
            ) : (
              <Ionicons name="send" size={18} color="#050816" />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
