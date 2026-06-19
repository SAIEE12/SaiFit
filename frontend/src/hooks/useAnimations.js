import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Reusable animation hook for skeleton breathing, sparkle loops, and spring presses.
 */
export default function useAnimations({ 
  runSkeleton = false, 
  runSparkles = false 
} = {}) {
  const skeletonAlpha = useRef(new Animated.Value(0.3)).current;
  const sparkleOpacity = useRef(new Animated.Value(0.6)).current;

  // Skeleton breathing loop
  useEffect(() => {
    let loop;
    if (runSkeleton) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAlpha, { toValue: 0.7, duration: 600, useNativeDriver: true }),
          Animated.timing(skeletonAlpha, { toValue: 0.3, duration: 600, useNativeDriver: true })
        ])
      );
      loop.start();
    } else {
      skeletonAlpha.setValue(0.3);
    }
    return () => loop && loop.stop();
  }, [runSkeleton]);

  // Sparkle pulsing loop
  useEffect(() => {
    let loop;
    if (runSparkles) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(sparkleOpacity, { toValue: 0.6, duration: 800, useNativeDriver: true })
        ])
      );
      loop.start();
    } else {
      sparkleOpacity.setValue(1.0);
    }
    return () => loop && loop.stop();
  }, [runSparkles]);

  // Helper to attach spring animation to scale states
  const animateSpring = (animatedValue, toValue) => {
    Animated.spring(animatedValue, {
      toValue,
      useNativeDriver: true,
      tension: 40,
      friction: 7
    }).start();
  };

  return {
    skeletonAlpha,
    sparkleOpacity,
    animateSpring
  };
}
