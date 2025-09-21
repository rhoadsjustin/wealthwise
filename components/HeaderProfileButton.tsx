import React from 'react';
import { Platform, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  HStack,
  Image,
  Label,
  Text,
  ContextMenu as SwiftContextMenu,
  Host as SwiftHost,
  Button as SwiftUIButton,
} from '@expo/ui/swift-ui';
import {
  ContextMenu as ComposeContextMenu,
  Button as ComposeButton,
} from '@expo/ui/jetpack-compose';
import { background, fixedSize, frame, padding, shadow } from '@expo/ui/swift-ui/modifiers';

type MenuItem = {
  label: string;
  route: string;
  iosIcon?: string;
  androidIcon?: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Profile',
    route: '/profile',
    iosIcon: 'person.crop.circle',
    androidIcon: 'person',
  },
  {
    label: 'Budget',
    route: '/categories',
    iosIcon: 'chart.pie',
    androidIcon: 'pie_chart',
  },
  {
    label: 'Goals',
    route: '/gamify',
    iosIcon: 'trophy',
    androidIcon: 'emoji_events',
  },
];

const TriggerIcon = () => (
  <View
    style={{
      flex: 1,
      flexDirection: 'row',
      width: 34,
      height: 34,
      justifyContent: 'center',
      alignContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      padding: 4,
    }}>
    <Ionicons name="settings-sharp" size={26} color="#0F172A" />
  </View>
);

export default function HeaderProfileButton() {
  const router = useRouter();

  // Web fallback: use a simple touchable that opens the profile screen.
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity onPress={() => router.push('/profile')}>
        <TriggerIcon />
      </TouchableOpacity>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <SwiftHost
        matchContents={{ horizontal: true, vertical: true }}
        onLayoutContent={(event) => {
          console.log('onLayoutContent', event.nativeEvent);
        }}>
        <SwiftContextMenu activationMethod="singlePress">
          <SwiftContextMenu.Trigger>
            <TriggerIcon />
          </SwiftContextMenu.Trigger>
          <SwiftContextMenu.Items>
            {MENU_ITEMS.map((item) => (
              <SwiftUIButton
                key={item.route}
                onPress={() => router.push(item.route as any)}
                systemImage={item.iosIcon}
                variant="borderless">
                {item.label}
              </SwiftUIButton>
            ))}
          </SwiftContextMenu.Items>
        </SwiftContextMenu>
      </SwiftHost>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <ComposeContextMenu activationMethod="singlePress">
        <ComposeContextMenu.Trigger>
          <TriggerIcon />
        </ComposeContextMenu.Trigger>
        <ComposeContextMenu.Items>
          {MENU_ITEMS.map((item) => (
            <ComposeButton
              key={item.route}
              onPress={() => router.push(item.route as any)}
              systemImage={item.androidIcon}
              variant="borderless">
              {item.label}
            </ComposeButton>
          ))}
        </ComposeContextMenu.Items>
      </ComposeContextMenu>
    );
  }

  // Fallback for other platforms (e.g., Expo Go on unsupported OS)
  return (
    <TouchableOpacity onPress={() => router.push('/profile')}>
      <TriggerIcon />
    </TouchableOpacity>
  );
}
