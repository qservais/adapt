import React, { useCallback, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
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
  const listTopPageY = useRef<number>(0);
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

  const getHoverIndex = useCallback((pageY: number): number => {
    const yInList = pageY - listTopPageY.current;
    let best = 0;
    for (let i = 0; i < itemOffsets.current.length; i++) {
      const midY = (itemOffsets.current[i] ?? 0) + (itemHeights.current[i] ?? 0) / 2;
      if (yInList >= midY) best = i;
    }
    return Math.max(0, Math.min(best, itemOffsets.current.length - 1));
  }, []);

  const createPanResponder = useCallback(
    (index: number) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabled,
        onMoveShouldSetPanResponder: (_, gs) => enabled && Math.abs(gs.dy) > 4,
        onPanResponderGrant: () => {
          currentDragIndex.current = index;
          currentHover.current = index;
          setDraggingIndex(index);
          setHoverIndex(index);
        },
        onPanResponderMove: (evt) => {
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
          setDraggingIndex(null);
          setHoverIndex(null);
          currentDragIndex.current = null;
          currentHover.current = null;
        },
        onPanResponderTerminate: () => {
          setDraggingIndex(null);
          setHoverIndex(null);
          currentDragIndex.current = null;
          currentHover.current = null;
        },
      }),
    [enabled, getHoverIndex, onReorder]
  );

  const panResponders = useRef<ReturnType<typeof PanResponder.create>[]>([]);
  if (panResponders.current.length !== items.length) {
    panResponders.current = items.map((_, i) => createPanResponder(i));
  }

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => {
        e.target.measure((_fx, _fy, _w, _h, _px, py) => {
          listTopPageY.current = py;
        });
      }}
    >
      {items.map((item, index) => {
        const isDragging = draggingIndex === index;
        const isHoverTarget = hoverIndex === index && draggingIndex !== null && draggingIndex !== index;

        return (
          <View
            key={item.key}
            style={[
              { marginBottom: itemGap },
              isDragging && styles.dragging,
              isHoverTarget && styles.hoverTarget,
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
  dragging: {
    opacity: 0.45,
    transform: [{ scale: 0.97 }],
  },
  hoverTarget: {
    borderTopWidth: 2,
    borderTopColor: COLORS.cyan,
    borderRadius: 4,
  },
});
