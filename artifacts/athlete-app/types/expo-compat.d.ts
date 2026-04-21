/**
 * React 19 compatibility shims for Expo and React Native packages.
 *
 * These packages export class components whose TypeScript declarations are not
 * fully compatible with the updated class-component types in @types/react 19.x.
 * Rather than wrapping every usage site, we re-declare the problematic modules
 * so that TypeScript sees them as functional components (which accept the same
 * props and work identically at runtime).
 *
 * NOTE: These declarations intentionally replace the packages' own types. When
 * a package is updated and becomes compatible with React 19 types, its entry
 * here can be removed.
 */

/* ──────────────────────────────────────────────────────────────────────────
   expo-image
   ────────────────────────────────────────────────────────────────────────── */

declare module "expo-image" {
  import type { FC, ReactNode } from "react";
  import type { StyleProp } from "react-native";

  type ImageSource =
    | string
    | number
    | { uri?: string; width?: number; height?: number; headers?: Record<string, string> }
    | null
    | undefined;

  type ContentFit = "cover" | "contain" | "fill" | "none" | "scale-down";
  type CachePolicy = "none" | "disk" | "memory" | "memory-disk";
  type Priority = "low" | "normal" | "high";

  export interface ImagePrefetchOptions {
    cachePolicy?: CachePolicy;
    headers?: Record<string, string>;
  }

  export interface ImageProps {
    source?: ImageSource | ImageSource[];
    placeholder?: ImageSource | ImageSource[];
    contentFit?: ContentFit;
    contentPosition?: { top?: number | string; left?: number | string } | string;
    transition?: number | { duration?: number; effect?: string; timing?: string } | null;
    blurRadius?: number;
    cachePolicy?: CachePolicy;
    priority?: Priority;
    recyclingKey?: string | null;
    onLoad?: (event: { source: { width: number; height: number; url: string; mediaType?: string } }) => void;
    onError?: (event: { error: string }) => void;
    onProgress?: (event: { loaded: number; total: number }) => void;
    onDisplay?: () => void;
    accessible?: boolean;
    accessibilityLabel?: string;
    tintColor?: string | null;
    style?: StyleProp<any>;
    alt?: string;
    placeholderContentFit?: ContentFit;
    allowDownscaling?: boolean;
    autoplay?: boolean;
    responsivePolicy?: "live" | "initial" | "static";
    children?: ReactNode;
    focusable?: boolean;
    testID?: string;
  }

  export const Image: FC<ImageProps> & {
    prefetch(urls: string | string[], cachePolicy?: CachePolicy): Promise<boolean>;
    prefetch(urls: string | string[], options?: ImagePrefetchOptions): Promise<boolean>;
    clearMemoryCache(): Promise<void>;
    clearDiskCache(): Promise<void>;
    generateThumbhash(imageRef: unknown): Promise<string | null>;
  };

  export type { ImageSource };
}

/* ──────────────────────────────────────────────────────────────────────────
   expo-blur
   ────────────────────────────────────────────────────────────────────────── */

declare module "expo-blur" {
  import type { FC, ReactNode } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  export type BlurTint =
    | "light"
    | "dark"
    | "default"
    | "extraLight"
    | "prominent"
    | "regular"
    | "systemMaterial"
    | "systemMaterialLight"
    | "systemMaterialDark"
    | "systemThickMaterial"
    | "systemThickMaterialLight"
    | "systemThickMaterialDark"
    | "systemThinMaterial"
    | "systemThinMaterialLight"
    | "systemThinMaterialDark"
    | "systemUltraThinMaterial"
    | "systemUltraThinMaterialLight"
    | "systemUltraThinMaterialDark";

  export type ExperimentalBlurMethod = "none" | "dimezisBlurView";

  export interface BlurViewProps {
    intensity?: number;
    tint?: BlurTint;
    style?: StyleProp<ViewStyle>;
    experimentalBlurMethod?: ExperimentalBlurMethod;
    children?: ReactNode;
    blurReductionFactor?: number;
  }

  export const BlurView: FC<BlurViewProps>;
}

/* ──────────────────────────────────────────────────────────────────────────
   expo-linear-gradient
   ────────────────────────────────────────────────────────────────────────── */

declare module "expo-linear-gradient" {
  import type { FC, ReactNode } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  export interface LinearGradientProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
  }

  export const LinearGradient: FC<LinearGradientProps>;
}

/* ──────────────────────────────────────────────────────────────────────────
   expo-av
   ────────────────────────────────────────────────────────────────────────── */

declare module "expo-av" {
  import type { FC, ReactNode, RefObject } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  export const ResizeMode: {
    CONTAIN: "contain";
    COVER: "cover";
    STRETCH: "stretch";
    NONE: "none";
  };

  export type ResizeModeType = "contain" | "cover" | "stretch" | "none";

  export interface AVPlaybackStatus {
    isLoaded: boolean;
    uri?: string;
    progressUpdateIntervalMillis?: number;
    durationMillis?: number;
    positionMillis?: number;
    seekMillisToleranceBefore?: number;
    seekMillisToleranceAfter?: number;
    shouldPlay?: boolean;
    isPlaying?: boolean;
    isBuffering?: boolean;
    rate?: number;
    shouldCorrectPitch?: boolean;
    volume?: number;
    isMuted?: boolean;
    isLooping?: boolean;
    didJustFinish?: boolean;
    error?: string;
  }

  export interface Video {
    playAsync(): Promise<AVPlaybackStatus>;
    pauseAsync(): Promise<AVPlaybackStatus>;
    stopAsync(): Promise<AVPlaybackStatus>;
    setPositionAsync(positionMillis: number): Promise<AVPlaybackStatus>;
    setIsLoopingAsync(isLooping: boolean): Promise<AVPlaybackStatus>;
    setIsMutedAsync(isMuted: boolean): Promise<AVPlaybackStatus>;
    setVolumeAsync(volume: number): Promise<AVPlaybackStatus>;
    getStatusAsync(): Promise<AVPlaybackStatus>;
    presentFullscreenPlayer(): Promise<AVPlaybackStatus>;
    dismissFullscreenPlayer(): Promise<AVPlaybackStatus>;
  }

  export interface VideoProps {
    source?: { uri?: string } | number | null;
    style?: StyleProp<ViewStyle>;
    resizeMode?: ResizeModeType;
    shouldPlay?: boolean;
    isLooping?: boolean;
    isMuted?: boolean;
    volume?: number;
    rate?: number;
    onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
    onLoad?: (status: AVPlaybackStatus) => void;
    onError?: (error: string) => void;
    onReadyForDisplay?: (event: { naturalSize: { width: number; height: number } }) => void;
    useNativeControls?: boolean;
    usePoster?: boolean;
    posterSource?: { uri?: string } | number;
    posterStyle?: StyleProp<any>;
    videoStyle?: StyleProp<ViewStyle>;
    children?: ReactNode;
    ref?: import("react").Ref<Video>;
  }

  export const Video: FC<VideoProps>;

  export interface AudioRecordingOptions {
    android?: {
      extension?: string;
      outputFormat?: number;
      audioEncoder?: number;
      sampleRate?: number;
      numberOfChannels?: number;
      bitRate?: number;
    };
    ios?: {
      extension?: string;
      outputFormat?: string;
      audioQuality?: number;
      sampleRate?: number;
      numberOfChannels?: number;
      bitRate?: number;
      linearPCMBitDepth?: number;
      linearPCMIsBigEndian?: boolean;
      linearPCMIsFloat?: boolean;
    };
    web?: {
      mimeType?: string;
      bitsPerSecond?: number;
    };
  }

  export namespace Audio {
    interface PermissionResponse {
      granted: boolean;
      status: "granted" | "denied" | "undetermined";
      canAskAgain: boolean;
      expires: "never" | number;
    }

    /**
     * Instance type for a recording object (used as a type in useState/useRef).
     */
    interface Recording {
      getURI(): string | null;
      stopAndUnloadAsync(): Promise<void>;
      getStatusAsync(): Promise<{ isDoneRecording: boolean; durationMillis: number }>;
      setOnRecordingStatusUpdate(onRecordingStatusUpdate: ((status: { durationMillis: number; isRecording: boolean }) => void) | null): void;
    }

    /**
     * Companion namespace/value for Audio.Recording — provides static methods.
     */
    namespace Recording {
      function createAsync(
        options?: AudioRecordingOptions
      ): Promise<{ recording: Recording; status: { isDoneRecording: boolean; durationMillis: number } }>;
    }

    /**
     * Instance type for a sound object (used as a type in useState/useRef).
     */
    interface Sound {
      playAsync(): Promise<AVPlaybackStatus>;
      pauseAsync(): Promise<AVPlaybackStatus>;
      stopAsync(): Promise<AVPlaybackStatus>;
      unloadAsync(): Promise<AVPlaybackStatus>;
      setPositionAsync(positionMillis: number): Promise<AVPlaybackStatus>;
      setIsLoopingAsync(isLooping: boolean): Promise<AVPlaybackStatus>;
      setIsMutedAsync(isMuted: boolean): Promise<AVPlaybackStatus>;
      setVolumeAsync(volume: number): Promise<AVPlaybackStatus>;
      getStatusAsync(): Promise<AVPlaybackStatus>;
      setOnPlaybackStatusUpdate(onPlaybackStatusUpdate: ((status: AVPlaybackStatus) => void) | null): void;
    }

    /**
     * Companion namespace/value for Audio.Sound — provides static methods.
     */
    namespace Sound {
      function createAsync(
        source: { uri: string } | number,
        initialStatus?: Partial<AVPlaybackStatus>,
        onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void
      ): Promise<{ sound: Sound; status: AVPlaybackStatus }>;
    }

    const RecordingOptionsPresets: {
      HIGH_QUALITY: AudioRecordingOptions;
      LOW_QUALITY: AudioRecordingOptions;
    };

    function setAudioModeAsync(mode: {
      allowsRecordingIOS?: boolean;
      interruptionModeIOS?: number;
      playsInSilentModeIOS?: boolean;
      staysActiveInBackground?: boolean;
      interruptionModeAndroid?: number;
      shouldDuckAndroid?: boolean;
      playThroughEarpieceAndroid?: boolean;
    }): Promise<void>;

    function requestPermissionsAsync(): Promise<PermissionResponse>;
    function getPermissionsAsync(): Promise<PermissionResponse>;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   expo-camera
   ────────────────────────────────────────────────────────────────────────── */

declare module "expo-camera" {
  import type { FC, ReactNode } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  export type PermissionResponse = {
    granted: boolean;
    status: "granted" | "denied" | "undetermined";
    canAskAgain: boolean;
    expires: "never" | number;
  };

  export interface BarcodePoint {
    x: number;
    y: number;
  }

  export interface BarcodeScanningResult {
    type: string;
    data: string;
    raw?: string;
    cornerPoints?: BarcodePoint[];
    bounds?: { origin: BarcodePoint; size: { width: number; height: number } };
  }

  export interface CameraViewProps {
    style?: StyleProp<ViewStyle>;
    facing?: "front" | "back";
    flash?: "on" | "off" | "auto";
    zoom?: number;
    active?: boolean;
    barcodeScannerSettings?: { barcodeTypes?: string[] };
    onBarcodeScanned?: (result: BarcodeScanningResult) => void;
    onCameraReady?: () => void;
    onMountError?: (event: { message: string }) => void;
    children?: ReactNode;
  }

  export const CameraView: FC<CameraViewProps>;
  export function useCameraPermissions(): [PermissionResponse | null, () => Promise<PermissionResponse>];
}

/* ──────────────────────────────────────────────────────────────────────────
   react-native-webview
   ────────────────────────────────────────────────────────────────────────── */

declare module "react-native-webview" {
  import type { FC, Ref, ReactNode } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  export interface WebViewProps {
    source?: { uri?: string; html?: string; baseUrl?: string } | number;
    style?: StyleProp<ViewStyle>;
    onLoad?: () => void;
    onLoadEnd?: () => void;
    onLoadStart?: () => void;
    onError?: (event: { nativeEvent: { description: string } }) => void;
    onMessage?: (event: { nativeEvent: { data: string } }) => void;
    injectedJavaScript?: string;
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
    allowsInlineMediaPlayback?: boolean;
    mediaPlaybackRequiresUserAction?: boolean;
    startInLoadingState?: boolean;
    scrollEnabled?: boolean;
    bounces?: boolean;
    overScrollMode?: "always" | "content" | "never";
    contentInset?: { top?: number; left?: number; bottom?: number; right?: number };
    renderLoading?: () => ReactNode;
    renderError?: () => ReactNode;
    children?: ReactNode;
    ref?: Ref<WebViewRef>;
    allowsFullscreenVideo?: boolean;
    userAgent?: string;
    originWhitelist?: string[];
    scalesPageToFit?: boolean;
    onNavigationStateChange?: (navState: { url: string; loading: boolean; title: string; canGoBack: boolean; canGoForward: boolean }) => void;
  }

  export interface WebViewRef {
    goBack(): void;
    goForward(): void;
    reload(): void;
    stopLoading(): void;
    injectJavaScript(script: string): void;
  }

  export const WebView: FC<WebViewProps>;
}

/* ──────────────────────────────────────────────────────────────────────────
   react-native-confetti-cannon
   ────────────────────────────────────────────────────────────────────────── */

declare module "react-native-confetti-cannon" {
  import type { FC, Ref } from "react";

  export interface ConfettiCannonProps {
    count?: number;
    origin?: { x: number; y: number };
    explosionSpeed?: number;
    fallSpeed?: number;
    fadeOut?: boolean;
    autoStart?: boolean;
    autoStartDelay?: number;
    colors?: string[];
    ref?: Ref<ConfettiCannonRef>;
  }

  export interface ConfettiCannonRef {
    start(): void;
  }

  const ConfettiCannon: FC<ConfettiCannonProps>;
  export default ConfettiCannon;
}

/* ──────────────────────────────────────────────────────────────────────────
   @react-native-community/slider
   ────────────────────────────────────────────────────────────────────────── */

declare module "@react-native-community/slider" {
  import type { FC } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  export interface SliderProps {
    value?: number;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
    onValueChange?: (value: number) => void;
    onSlidingStart?: (value: number) => void;
    onSlidingComplete?: (value: number) => void;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    accessibilityLabel?: string;
    tapToSeek?: boolean;
    inverted?: boolean;
    vertical?: boolean;
  }

  const Slider: FC<SliderProps>;
  export default Slider;
}

/* ──────────────────────────────────────────────────────────────────────────
   react-native-gesture-handler  –  GestureHandlerRootView children fix
   ────────────────────────────────────────────────────────────────────────── */

declare module "react-native-gesture-handler" {
  import type { FC, ReactNode } from "react";
  import type { ViewProps, TouchableHighlightProps, TouchableNativeFeedbackProps, TouchableOpacityProps, TouchableWithoutFeedbackProps } from "react-native";

  export interface GestureHandlerRootViewProps extends ViewProps {
    children?: ReactNode;
  }
  export const GestureHandlerRootView: FC<GestureHandlerRootViewProps>;

  export const TouchableHighlight: FC<TouchableHighlightProps>;
  export const TouchableNativeFeedback: FC<TouchableNativeFeedbackProps>;
  export const TouchableOpacity: FC<TouchableOpacityProps>;
  export const TouchableWithoutFeedback: FC<TouchableWithoutFeedbackProps>;

  export const Swipeable: FC<{
    children?: ReactNode;
    friction?: number;
    leftThreshold?: number;
    rightThreshold?: number;
    overshootLeft?: boolean;
    overshootRight?: boolean;
    overshootFriction?: number;
    onSwipeableOpen?: (direction: "left" | "right") => void;
    onSwipeableClose?: (direction: "left" | "right") => void;
    renderLeftActions?: (progress: unknown, drag: unknown) => ReactNode;
    renderRightActions?: (progress: unknown, drag: unknown) => ReactNode;
    containerStyle?: object;
    childrenContainerStyle?: object;
  }>;

}


/* ──────────────────────────────────────────────────────────────────────────
   expo-router/unstable-native-tabs  –  NativeTabs children fix
   ────────────────────────────────────────────────────────────────────────── */

declare module "expo-router/unstable-native-tabs" {
  import type { FC, ReactNode } from "react";
  import type { ColorValue, ImageSourcePropType } from "react-native";

  interface NativeTabOptions {
    title?: string;
    icon?: unknown;
    selectedIcon?: unknown;
    badge?: string;
    badgeColor?: ColorValue;
    tabBarItemStyle?: object;
    hidden?: boolean;
    activeTintColor?: ColorValue;
    inactiveTintColor?: ColorValue;
    activeIndicatorColor?: ColorValue;
  }

  interface NativeTabsProps {
    children?: ReactNode;
    tabBarActiveTintColor?: ColorValue;
    tabBarInactiveTintColor?: ColorValue;
    tabBarActiveIndicatorColor?: ColorValue;
    tabBarLabelPosition?: "below-icon" | "beside-icon";
    tabBarStyle?: object;
    hapticFeedbackEnabled?: boolean;
    sidebarAdaptable?: boolean;
    labeled?: boolean;
    scrollEdgeAppearance?: string;
    barTintColor?: ColorValue;
    translucent?: boolean;
    disablePageAnimations?: boolean;
  }

  interface NativeTabTriggerProps {
    name: string;
    href?: string;
    children?: ReactNode;
    asChild?: boolean;
    reset?: "always" | "onFocus" | "never";
    options?: NativeTabOptions;
  }

  interface LabelProps {
    children?: string;
    hidden?: boolean;
  }

  interface IconProps {
    sf?: { default: string; selected?: string };
    src?: ImageSourcePropType | { default?: ImageSourcePropType; selected?: ImageSourcePropType };
    size?: number;
    tintColor?: ColorValue;
    selectedTintColor?: ColorValue;
  }

  interface NativeTabsTriggerTabBarProps {
    children?: ReactNode;
  }

  export const NativeTabs: FC<NativeTabsProps> & {
    Trigger: FC<NativeTabTriggerProps> & {
      TabBar: FC<NativeTabsTriggerTabBarProps>;
    };
    Screen: FC<{ name: string; options?: NativeTabOptions }>;
  };

  export const Icon: FC<IconProps>;
  export const Label: FC<LabelProps>;
  export type { NativeTabsProps, NativeTabTriggerProps, NativeTabOptions };
}

/* ──────────────────────────────────────────────────────────────────────────
   react-native-svg  –  SVG element class compatibility fix
   ────────────────────────────────────────────────────────────────────────── */

declare module "react-native-svg" {
  import type { FC, ReactNode } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  interface CommonPathProps {
    fill?: string;
    fillOpacity?: number | string;
    stroke?: string;
    strokeWidth?: number | string;
    strokeOpacity?: number | string;
    strokeDasharray?: string | number[];
    strokeDashoffset?: number;
    strokeLinecap?: "butt" | "round" | "square";
    strokeLinejoin?: "miter" | "round" | "bevel";
    strokeMiterlimit?: number;
    clipPath?: string;
    clipRule?: "nonzero" | "evenodd";
    opacity?: number | string;
    transform?: string;
    id?: string;
  }

  export interface SvgProps extends CommonPathProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    preserveAspectRatio?: string;
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
  }

  export interface PolylineProps extends CommonPathProps {
    points?: string;
    children?: ReactNode;
  }

  export interface CircleProps extends CommonPathProps {
    cx?: number | string;
    cy?: number | string;
    r?: number | string;
    children?: ReactNode;
  }

  export interface TextProps extends CommonPathProps {
    x?: number | string;
    y?: number | string;
    dx?: number | string;
    dy?: number | string;
    rotate?: number | string;
    fontSize?: number | string;
    fontWeight?: number | string;
    fontFamily?: string;
    textAnchor?: "start" | "middle" | "end";
    children?: ReactNode;
  }

  export interface PathProps extends CommonPathProps {
    d?: string;
    children?: ReactNode;
  }

  export interface RectProps extends CommonPathProps {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    rx?: number | string;
    ry?: number | string;
    children?: ReactNode;
  }

  export interface LineProps extends CommonPathProps {
    x1?: number | string;
    y1?: number | string;
    x2?: number | string;
    y2?: number | string;
    children?: ReactNode;
  }

  export interface GProps extends CommonPathProps {
    children?: ReactNode;
  }

  export interface DefsProps {
    children?: ReactNode;
  }

  export interface LinearGradientProps {
    id?: string;
    x1?: number | string;
    y1?: number | string;
    x2?: number | string;
    y2?: number | string;
    gradientUnits?: string;
    gradientTransform?: string;
    children?: ReactNode;
  }

  export interface StopProps {
    offset?: number | string;
    stopColor?: string;
    stopOpacity?: number | string;
  }

  export interface MaskProps extends CommonPathProps {
    maskUnits?: string;
    maskContentUnits?: string;
    children?: ReactNode;
  }

  export interface ClipPathProps {
    id?: string;
    children?: ReactNode;
  }

  export interface EllipseProps extends CommonPathProps {
    cx?: number | string;
    cy?: number | string;
    rx?: number | string;
    ry?: number | string;
    children?: ReactNode;
  }

  export const Svg: FC<SvgProps>;
  export const Polyline: FC<PolylineProps>;
  export const Circle: FC<CircleProps>;
  export const Text: FC<TextProps>;
  export const Path: FC<PathProps>;
  export const Rect: FC<RectProps>;
  export const Line: FC<LineProps>;
  export const G: FC<GProps>;
  export const Defs: FC<DefsProps>;
  export const LinearGradient: FC<LinearGradientProps>;
  export const Stop: FC<StopProps>;
  export const Mask: FC<MaskProps>;
  export const ClipPath: FC<ClipPathProps>;
  export const Ellipse: FC<EllipseProps>;

  interface SvgXmlProps {
    xml?: string;
    uri?: string;
    width?: number | string;
    height?: number | string;
    style?: StyleProp<ViewStyle>;
    override?: Partial<CommonPathProps>;
  }
  export const SvgXml: FC<SvgXmlProps>;
  export const SvgUri: FC<SvgXmlProps>;

  export default Svg;
}
