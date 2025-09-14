import React from 'react';
import { Animated } from 'react-native';

type SkeletonProps = React.ComponentProps<typeof Animated.View> & {
  className?: string;
};

const Skeleton = React.forwardRef<Animated.View, SkeletonProps>(
  ({ className = '', ...props }, ref) => {
    return <Animated.View ref={ref} className={`rounded-md bg-gray-200 ${className}`} {...props} />;
  }
);

Skeleton.displayName = 'Skeleton';

export { Skeleton };
