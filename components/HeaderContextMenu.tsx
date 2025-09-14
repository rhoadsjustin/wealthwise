import { ContextMenu, Host } from '@expo/ui/swift-ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const HeaderContextMenu = () => {
  const router = useRouter();
  return (
    <Host style={{ width: 150, height: 50, zIndex: 9999 }}>
      <ContextMenu>
        <ContextMenu.Trigger>
          <Ionicons name="person-circle-outline" size={24} color="black" />
        </ContextMenu.Trigger>
        <ContextMenu.Items>
          <Ionicons
            name="wallet-outline"
            size={24}
            color="black"
            onPress={() => router.push('/categories')}
          />
          <Ionicons
            name="trophy-outline"
            size={24}
            color="black"
            onPress={() => router.push('/gamify')}
          />
        </ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
};

export default HeaderContextMenu;
