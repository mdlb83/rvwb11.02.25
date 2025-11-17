import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { GoogleMapsPhoto } from '../../types/googleMapsData';

interface PhotoViewerModalProps {
  visible: boolean;
  photos: GoogleMapsPhoto[];
  initialIndex: number;
  placeId?: string;
  getPhotoUrl: (photoReference: string, placeId?: string) => string | null;
  onClose: () => void;
}

export default function PhotoViewerModal({
  visible,
  photos,
  initialIndex,
  placeId,
  getPhotoUrl,
  onClose,
}: PhotoViewerModalProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Track screen dimensions and update on orientation change
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  // Allow all orientations when photo viewer is visible, lock to portrait when closed
  useEffect(() => {
    let savedOrientationLock: ScreenOrientation.OrientationLock | null = null;
    
    const handleOrientation = async () => {
      try {
        if (visible) {
          console.log('📱 Photo viewer opened - unlocking orientation');
          // Save current orientation lock before unlocking
          try {
            savedOrientationLock = await ScreenOrientation.getOrientationLockAsync();
            console.log('📱 Saved orientation lock:', savedOrientationLock);
          } catch (e) {
            console.log('📱 Could not get current orientation lock:', e);
          }
          // Allow rotation when photo viewer is open
          await ScreenOrientation.unlockAsync();
          console.log('📱 Orientation unlocked - rotation should now be allowed');
        } else {
          console.log('📱 Photo viewer closed - locking to portrait');
          // Try to restore previous orientation, or default to portrait
          try {
            if (savedOrientationLock) {
              await ScreenOrientation.lockAsync(savedOrientationLock);
              console.log('📱 Restored saved orientation:', savedOrientationLock);
            } else {
              // Try portrait first, fall back to default if not supported
              await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
              console.log('📱 Locked to PORTRAIT_UP');
            }
          } catch (e) {
            console.log('📱 Portrait lock failed, trying DEFAULT:', e);
            // If portrait isn't supported, try default
            try {
              await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
              console.log('📱 Locked to DEFAULT');
            } catch (e2) {
              console.log('📱 Default lock failed, unlocking:', e2);
              // If all else fails, just unlock - device will use app default
              await ScreenOrientation.unlockAsync();
            }
          }
        }
      } catch (error) {
        console.error('📱 Error managing screen orientation:', error);
      }
    };
    
    handleOrientation();
    
    return () => {
      // Cleanup: try to restore orientation when component unmounts
      if (!visible) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {
          // Ignore errors on cleanup - device will use app default
        });
      }
    };
  }, [visible]);

  // Listen for orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      // Re-scroll to current photo after orientation change
      if (scrollViewRef.current) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            x: currentIndex * window.width,
            animated: false,
          });
        }, 100);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [currentIndex]);

  useEffect(() => {
    if (visible && scrollViewRef.current) {
      // Scroll to initial photo when modal opens
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: currentIndex * dimensions.width,
          animated: false,
        });
      }, 100);
    }
  }, [visible, currentIndex, dimensions.width]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / dimensions.width);
    setCurrentIndex(index);
  };

  const handleClose = () => {
    onClose();
  };

  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.photoCounter}>
            {currentIndex + 1} of {photos.length}
          </Text>
        </View>

        {/* Photo ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {photos.map((photo, index) => {
            if (!photo.photoReference) return null;
            const photoUrl = getPhotoUrl(photo.photoReference, placeId);

            return (
              <View key={index} style={[styles.photoContainer, { width: dimensions.width, height: dimensions.height }]}>
                {photoUrl ? (
                  <Image
                    source={{ uri: photoUrl }}
                    style={[styles.photo, { width: dimensions.width, height: dimensions.height }]}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name="image-outline" size={64} color="#999" />
                    <Text style={styles.placeholderText}>Photo unavailable</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Footer with attribution */}
        {photos[currentIndex]?.attribution && (
          <View style={styles.footer}>
            <Text style={styles.attribution} numberOfLines={2}>
              {photos[currentIndex].attribution}
            </Text>
          </View>
        )}

        {/* Dots indicator */}
        {photos.length > 1 && (
          <View style={styles.dotsContainer}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scrollView: {
    flex: 1,
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    // Dimensions will be set dynamically based on orientation
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
    marginTop: 16,
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  attribution: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
});

