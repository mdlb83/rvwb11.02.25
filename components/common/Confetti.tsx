import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: number;
  rotation: number;
  delay: number;
  fallDuration: number;
}

interface ConfettiProps {
  visible: boolean;
  onComplete?: () => void;
  color?: string;
  count?: number;
}

export default function Confetti({ visible, onComplete, color = '#FFD700', count = 300 }: ConfettiProps) {
  // Memoize pieces array so it doesn't regenerate on every render
  // Include fallDuration in the piece data so it's stable
  // Stagger delays over 5 seconds so confetti keeps falling throughout
  const pieces: ConfettiPiece[] = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      rotation: Math.random() * 360,
      // Stagger delays over 5 seconds so pieces keep falling throughout the animation
      delay: (i / count) * 5000 + Math.random() * 300,
      // Each piece takes 3-4 seconds to fall (shorter fall = more pieces visible at once)
      fallDuration: 3000 + Math.random() * 1000,
    }));
  }, [count]);

  useEffect(() => {
    if (visible && onComplete) {
      // Total duration: max delay (~5s) + max fall (4s) = ~9s, but we want ~7s
      const timer = setTimeout(() => {
        onComplete();
      }, 8000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          x={piece.x}
          rotation={piece.rotation}
          delay={piece.delay}
          fallDuration={piece.fallDuration}
          color={color}
        />
      ))}
    </View>
  );
}

function ConfettiPiece({ x, rotation, delay, fallDuration, color }: ConfettiPiece & { color: string }) {
  const translateY = useSharedValue(-50);
  const rotate = useSharedValue(rotation);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Start falling animation - piece falls from top to bottom over fallDuration
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 100, {
        duration: fallDuration,
        easing: Easing.out(Easing.quad),
      })
    );
    
    // Continuous rotation during the entire fall
    const rotations = Math.floor(fallDuration / 1000); // Number of full rotations
    const rotationSequence = Array.from({ length: rotations }, (_, i) => 
      withTiming(rotation + (i + 1) * 360, { 
        duration: fallDuration / rotations, 
        easing: Easing.linear 
      })
    );
    
    rotate.value = withDelay(
      delay,
      withSequence(...rotationSequence)
    );
    
    // Keep opacity at 1 for almost the entire fall
    // Only fade in the last 300ms so pieces stay visible longer
    opacity.value = withDelay(
      delay + fallDuration - 300,
      withTiming(0, { duration: 300 })
    );
  }, [delay, rotation, fallDuration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const size = 8 + Math.random() * 6;

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: x,
          width: size,
          height: size,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
});

