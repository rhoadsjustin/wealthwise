import React, { useMemo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import type { InsightsMessage } from '@/context/DataContext';

interface InsightsMessageBubbleProps {
  message: InsightsMessage;
  index: number;
}

export function InsightsMessageBubble({ message, index }: InsightsMessageBubbleProps) {
  const isUser = message.role === 'user';
  const blocks = useMemo(() => parseMessageBlocks(message.content), [message.content]);

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 30, 120)).duration(170)}
      className={`mb-3 max-w-[90%] overflow-hidden rounded-[30px] ${
        isUser
          ? 'self-end bg-app-surface-3 px-5 py-3.5'
          : 'self-start border border-app-border bg-app-surface-1 px-5 py-4'
      }`}>
      <View className="gap-2">
        {!isUser && message.source === 'apple' ? (
          <AppText variant="label-xs" className="text-app-text-faint">
            Budget signal
          </AppText>
        ) : null}
        {isUser ? (
          <AppText variant="body-md" selectable className="text-app-text-strong">
            {message.content}
          </AppText>
        ) : (
          <View className="gap-2">
            {blocks.map((block, blockIndex) =>
              block.type === 'paragraph' ? (
                <AppText
                  key={`paragraph-${blockIndex}`}
                  variant={blockIndex === 0 ? 'body-md' : 'body'}
                  selectable
                  className={blockIndex === 0 ? 'text-app-text-strong' : 'text-app-text-soft'}>
                  {block.text}
                </AppText>
              ) : (
                <View key={`list-${blockIndex}`} className="gap-2.5 pt-0.5">
                  {block.items.map((item, itemIndex) => (
                    <View
                      key={`item-${blockIndex}-${itemIndex}`}
                      className="flex-row items-start gap-2.5 pr-1">
                      <View className="pt-2">
                        <View className="h-1 w-1 rounded-full bg-app-text-muted" />
                      </View>
                      <AppText variant="body" selectable className="flex-1 text-app-text-soft">
                        {item}
                      </AppText>
                    </View>
                  ))}
                </View>
              )
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

type MessageBlock = { type: 'paragraph'; text: string } | { type: 'list'; items: string[] };

function parseMessageBlocks(content: string): MessageBlock[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, index, array) => line.length > 0 || array[index - 1]?.length > 0);

  const blocks: MessageBlock[] = [];
  let paragraphParts: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphParts.length) return;
    blocks.push({
      type: 'paragraph',
      text: paragraphParts.join(' '),
    });
    paragraphParts = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({
      type: 'list',
      items: listItems,
    });
    listItems = [];
  };

  lines.forEach((line) => {
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const bulletMatch = /^([-*•]|\d+\.)\s+(.*)$/.exec(line);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(bulletMatch[2] ?? line);
      return;
    }

    if (listItems.length) {
      listItems[listItems.length - 1] = `${listItems[listItems.length - 1]} ${line}`.trim();
      return;
    }

    paragraphParts.push(line);
  });

  flushParagraph();
  flushList();

  return blocks.length ? blocks : [{ type: 'paragraph', text: content.trim() }];
}
