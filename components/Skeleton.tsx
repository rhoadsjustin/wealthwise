import React from 'react';
import { View } from 'react-native';

type SkeletonProps = React.ComponentProps<typeof View> & {
  className?: string;
};

const Skeleton = React.forwardRef<View, SkeletonProps>(({ className = '', ...props }, ref) => {
  return <View ref={ref} className={`rounded-md bg-app-surface-alt ${className}`} {...props} />;
});

Skeleton.displayName = 'Skeleton';

export { Skeleton };
