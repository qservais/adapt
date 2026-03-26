import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";

interface Props {
  visible: boolean;
  onScanned: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ visible, onScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      permissionRequestedRef.current = false;
      return;
    }
    scannedRef.current = false;
    if (permission === null) return;
    if (!permission.granted && permission.canAskAgain && !permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleBarcodeScanned = useCallback(({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    onScanned(data);
  }, [onScanned]);

  const handleClose = () => {
    scannedRef.current = false;
    onClose();
  };

  const handleOpenSettings = () => {
    void Linking.openSettings();
  };

  const renderContent = () => {
    if (permission === null) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} size="large" />
          <Text style={[styles.permDesc, { fontFamily: FONTS.body }]}>
            Initialisation de la caméra…
          </Text>
        </View>
      );
    }

    if (!permission.granted) {
      if (!permission.canAskAgain) {
        return (
          <View style={styles.center}>
            <Feather name="camera-off" size={48} color={COLORS.textMuted} />
            <Text style={[styles.permTitle, { fontFamily: FONTS.bodyBold }]}>
              Accès caméra refusé
            </Text>
            <Text style={[styles.permDesc, { fontFamily: FONTS.body }]}>
              L'accès à la caméra a été refusé définitivement. Autorisez-le dans les réglages de l'application.
            </Text>
            <TouchableOpacity onPress={handleOpenSettings} style={styles.permBtn}>
              <Text style={[styles.permBtnText, { fontFamily: FONTS.mono }]}>
                OUVRIR LES RÉGLAGES
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.cancelLinkBtn}>
              <Text style={[styles.cancelLinkText, { fontFamily: FONTS.body }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} size="large" />
          <Text style={[styles.permDesc, { fontFamily: FONTS.body }]}>
            Demande d'accès à la caméra…
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.cancelLinkBtn}>
            <Text style={[styles.cancelLinkText, { fontFamily: FONTS.body }]}>Annuler</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"],
          }}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.topDim} />
          <View style={styles.middleRow}>
            <View style={styles.sideDim} />
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.scanLine} />
            </View>
            <View style={styles.sideDim} />
          </View>
          <View style={styles.bottomDim} />
        </View>
        <View style={styles.hintBox} pointerEvents="none">
          <Text style={[styles.hintText, { fontFamily: FONTS.body }]}>
            Pointez la caméra vers le code-barres du produit
          </Text>
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
          <Feather name="x" size={20} color={COLORS.white} />
          <Text style={[styles.cancelBtnText, { fontFamily: FONTS.mono }]}>ANNULER</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {renderContent()}
      </View>
    </Modal>
  );
}

const DIM = "rgba(0,0,0,0.65)";
const CORNER_SIZE = 24;
const CORNER_BORDER = 3;
const VIEWFINDER_SIZE = 250;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32, backgroundColor: COLORS.bg },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  topDim: { flex: 1, backgroundColor: DIM },
  middleRow: { flexDirection: "row", height: VIEWFINDER_SIZE },
  sideDim: { flex: 1, backgroundColor: DIM },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    borderRadius: 4,
    overflow: "hidden",
  },
  bottomDim: { flex: 1.8, backgroundColor: DIM },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.cyan,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.cyan,
    opacity: 0.8,
  },
  hintBox: {
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: { fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center" },
  cancelBtn: {
    position: "absolute",
    bottom: 48,
    left: "50%",
    transform: [{ translateX: -60 }],
    width: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelBtnText: { fontSize: 13, color: COLORS.white },
  permTitle: { fontSize: 20, color: COLORS.white, textAlign: "center" },
  permDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 21 },
  permBtn: {
    backgroundColor: COLORS.cyan,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  permBtnText: { fontSize: 13, color: COLORS.bg },
  cancelLinkBtn: { padding: 12 },
  cancelLinkText: { fontSize: 14, color: COLORS.textMuted },
});
