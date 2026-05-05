import * as Location from "expo-location";
import { Platform } from "react-native";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

function coordsOrNullFromPosition(
  pos: Location.LocationObject | null,
): Coordinates | null {
  if (!pos) return null;
  const { latitude, longitude } = pos.coords;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  return { latitude, longitude };
}

async function getNativeCoordinates(): Promise<Coordinates | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") return null;

  const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
  if (!servicesEnabled) return null;

  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords = coordsOrNullFromPosition(current);
    if (coords) return coords;
  } catch {
    // ignore and fallback below
  }

  // If the current fix fails (common on simulator/dev without a set location),
  // use the last known location as a fallback.
  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 60_000,
      requiredAccuracy: 1_000,
    });
    return coordsOrNullFromPosition(lastKnown);
  } catch {
    return null;
  }
}

async function getWebCoordinates(): Promise<Coordinates | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        resolve({ latitude, longitude });
      },
      () => resolve(null),
      { timeout: 4_000, maximumAge: 60_000 },
    );
  });
}

export async function getOptionalCurrentCoordinates(): Promise<Coordinates | null> {
  return Platform.OS === "web" ? getWebCoordinates() : getNativeCoordinates();
}

