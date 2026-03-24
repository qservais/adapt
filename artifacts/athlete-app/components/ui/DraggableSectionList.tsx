import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { COLORS } from "@/constants/theme";

interface DraggableItem<T> {
  key: string;
  data: T;
}

interface Props<T> {
  items: DraggableItem<T>[];
  onReorder: (newItems: DraggableItem<T>[]) => void;
  renderItem: (item: DraggableItem<T>, index: number) => React.ReactNode;
  enabled: boolean;
  itemGap?: number;
}

export function DraggableSectionList<T>({
  items,
  onReorder,
  renderItem,
  enabled,
  itemGap = 16,
}: Props<T>) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const itemHeights = useRef<number[]>([]);
  const itemOffsets = useRef<number[]>([]);
  const dragY = useRef(new Animated.Value(0)).current;
  const dragOffset = useRef(0);
  const startDragY = useRef(0);
  const currentDragIndex = useRef<number | null>(null);
  const currentHover = useRef<number | null>(null);
  const localItems = useRef<DraggableItem<T>[]>(items);

  localItems.current = items;

  const computeOffsets = useCallback(() => {
    const offsets: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < itemHeights.current.length; i++) {
      offsets.push(cumulative);
      cumulative += (itemHeights.current[i] ?? 0) + itemGap;
    }
    itemOffsets.current = offsets;
  }, [itemGap]);

  const getHoverIndex = useCallback((absoluteY: number): number => {
    const yInList = absoluteY - startDragY.current + dragOffset.current;
    for (let i = itemOffsets.current.length - 1; i >= 0; i--) {
      if (yInList >= itemOffsets.current[i]) return i;
    }
    return 0;
  }, []);

  const createPanResponder = useCallback(
    (index: number) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabled,
        onMoveShouldSetPanResponder: (_, gs) => enabled && Math.abs(gs.dy) > 4,
        onPanResponderGrant: (evt) => {
          currentDragIndex.current = index;
          dragOffset.current = itemOffsets.current[index] ?? 0;
          startDragY.current = evt.nativeEvent.pageY - (itemOffsets.current[index] ?? 0);
          dragY.setValue(itemOffsets.current[index] ?? 0);
          setDraggingIndex(index);
          setHoverIndex(index);
          currentHover.current = index;
        },
        onPanResponderMove: (evt) => {
          const newY = evt.nativeEvent.pageY - startDragY.current;
          dragY.setValue(newY);
          const hi = getHoverIndex(evt.nativeEvent.pageY);
          if (hi !== currentHover.current) {
            currentHover.current = hi;
            setHoverIndex(hi);
          }
        },
        onPanResponderRelease: () => {
          const from = currentDragIndex.current;
          const to = currentHover.current;
          if (from !== null && to !== null && from !== to) {
            const arr = [...localItems.current];
            const [moved] = arr.splice(from, 1);
            arr.splice(to, 0, moved);
            onReorder(arr);
          }
          dragY.setValue(0);
          setDraggingIndex(null);
          setHoverIndex(null);
          currentDragIndex.current = null;
          currentHover.current = null;
        },
        onPanResponderTerminate: () => {
          dragY.setValue(0);
          setDraggingIndex(null);
          setHoverIndex(null);
          currentDragIndex.current = null;
          currentHover.current = null;
        },
      }),
    [enabled, dragY, getHoverIndex, onReorder]
  );

  const panResponders = useRef<ReturnType<typeof PanResponder.create>[]>([]);

  if (panResponders.current.length !== items.length) {
    panResponders.current = items.map((_, i) => createPanResponder(i));
  }

  return (
    <View>
      {items.map((item, index) => {
        const isDragging = draggingIndex === index;
        const isHover = hoverIndex === index && draggingIndex !== null && draggingIndex !== index;

        return (
          <View
            key={item.key}
            style={[
              styles.itemWrapper,
              { marginBottom: itemGap },
              isDragging && styles.dragging,
              isHover && styles.hoverTarget,
            ]}
            onLayout={(e: LayoutChangeEvent) => {
              itemHeights.current[index] = e.nativeEvent.layout.height;
              computeOffsets();
            }}
            {...(enabled ? panResponders.current[index]?.panHandlers : {})}
          >
            {renderItem(item, index)}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  itemWrapper: {},
  dragging: {
    opacity: 0.5,
    transform: [{ scale: 0.98 }],
  },
  hoverTarget: {
    borderTopWidth: 2,
    borderTopColor: COLORS.cyan,
    borderRadius: 4,
  },
});
