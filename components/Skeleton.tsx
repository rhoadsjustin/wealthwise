import { View } from 'react-native';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <View className={'bg-muted animate-pulse rounded-md'} {...props} />;
}

export { Skeleton };
