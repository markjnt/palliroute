import type { Appointment, MarkerType, Route } from "@palliroute/models";
import { appointmentTypeColors, employeeTypeColors } from "../colors";

export const weekdayMap: Record<string, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};

export const getCurrentWeekday = (): string => {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[new Date().getDay()];
};

export const parseRouteOrder = (routeOrder: unknown): number[] => {
  if (Array.isArray(routeOrder)) {
    return routeOrder;
  }
  try {
    const parsed = JSON.parse(routeOrder as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse route_order:", error);
    return [];
  }
};

export const getOwnRouteOrder = (route: Route): number[] => {
  const customOrder = parseRouteOrder(route.custom_order);
  return customOrder.length > 0
    ? customOrder
    : parseRouteOrder(route.route_order);
};

export const getOwnRoutePolyline = (route: Route): string => {
  return route.custom_polyline || route.polyline || "";
};

export const getOwnRouteDistance = (route: Route): number => {
  if (route.custom_distance != null) return route.custom_distance;
  return route.total_distance || 0;
};

export const getOwnRouteDuration = (route: Route): number => {
  if (route.custom_duration != null) return route.custom_duration;
  return route.total_duration || 0;
};

export const isValidRoute = (route: Route): boolean => {
  const routeOrder = parseRouteOrder(route.route_order);
  return routeOrder.length > 0;
};

export const hasValidRouteOrder = (
  route: Route,
  appointments: Appointment[],
  selectedWeekday: string,
): boolean => {
  const routeOrder = parseRouteOrder(route.route_order);
  if (!routeOrder || routeOrder.length === 0) {
    return false;
  }
  return routeOrder.every((appointmentId) =>
    appointments.some(
      (appointment) =>
        appointment.id === appointmentId &&
        appointment.weekday === selectedWeekday,
    ),
  );
};

export const getColorForVisitType = (visitType?: string): string => {
  if (!visitType) return appointmentTypeColors.default;
  return appointmentTypeColors[visitType] || appointmentTypeColors.default;
};

export const getColorForEmployeeType = (employeeType?: string): string => {
  if (!employeeType) return employeeTypeColors.default;
  if (employeeType.includes("Arzt") && !employeeType.includes("Honorar")) {
    return employeeTypeColors["Arzt"];
  }
  if (employeeType.includes("Honorararzt")) {
    return employeeTypeColors["Honorararzt"];
  }
  return employeeTypeColors.default;
};

export const isAwTourArea = (area?: string | null): boolean =>
  area === "Nord" || area === "Mitte" || area === "Süd";

export const getTourAreaStartLocation = (
  area: string,
): { lat: number; lng: number } => {
  let areaNormalized = area;
  if (area.includes("Nord") || area === "Nordkreis") {
    areaNormalized = "Nord";
  } else if (area.includes("Süd") || area === "Südkreis") {
    areaNormalized = "Süd";
  } else if (area.includes("Mitte")) {
    areaNormalized = "Mitte";
  }

  const tourAreaStartLocations: Record<string, { lat: number; lng: number }> = {
    Mitte: { lat: 50.9833022, lng: 7.5412243 },
    Nord: { lat: 51.11806869506836, lng: 7.399380207061768 },
    Süd: { lat: 50.8775055, lng: 7.6168993 },
  };

  return (
    tourAreaStartLocations[areaNormalized] || tourAreaStartLocations["Mitte"]
  );
};

export const GOOGLE_MAPS_MAP_ID = "DEMO_MAP_ID";

export const GOOGLE_MAPS_LIBRARIES: (
  "places" | "geocoding" | "geometry" | "marker"
)[] = ["places", "geocoding", "geometry", "marker"];

export const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
export const MAP_DEFAULT_CENTER = { lat: 51.0267, lng: 7.5683 };
export const MAP_DEFAULT_ZOOM = 10;
export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 20;

export const ROUTE_POLYLINE = {
  weight: 5,
  hoverWeight: 8,
  dimmedOpacity: 0.18,
  hitWeight: 18,
} as const;

export const TOUR_AREA_COLORS = {
  Nord: "#1976d2",
  Mitte: "#7b1fa2",
  Süd: "#388e3c",
  default: "#ff9800",
} as const;

export const getTourAreaColor = (area?: string | null): string => {
  if (area === "Wochenend-Touren") return TOUR_AREA_COLORS.default;
  if (area === "Nord" || area === "Nordkreis") return TOUR_AREA_COLORS.Nord;
  if (area === "Mitte") return TOUR_AREA_COLORS.Mitte;
  if (area === "Süd" || area === "Südkreis") return TOUR_AREA_COLORS.Süd;
  return TOUR_AREA_COLORS.default;
};

export interface MarkerAppearance {
  type: MarkerType;
  employeeType?: string;
  visitType?: string;
  area?: string;
  routeColor?: string | null;
  isInactive?: boolean;
}

export const getMarkerFillColor = ({
  type,
  employeeType,
  visitType,
  area,
  routeColor,
  isInactive = false,
}: MarkerAppearance): string => {
  let baseColor: string;
  if (routeColor) {
    baseColor = routeColor;
  } else if (type === "employee") {
    baseColor = getColorForEmployeeType(employeeType);
  } else if (type === "tour_area") {
    baseColor = getTourAreaColor(area);
  } else if (type === "pflegeheim") {
    baseColor = "#388e3c";
  } else if (type === "custom") {
    baseColor = "#ff5722";
  } else {
    baseColor = getColorForVisitType(visitType);
  }
  return isInactive ? "#9E9E9E" : baseColor;
};

export const getMarkerLabelText = (
  routePosition?: number,
  visitType?: string,
  customLabel?: string,
): string | undefined => {
  if (customLabel) return customLabel;
  if (
    routePosition &&
    (!visitType || visitType === "HB" || visitType === "NA")
  ) {
    return routePosition.toString();
  }
  return undefined;
};

type LatLngLike = { lat: () => number; lng: () => number };

export const groupMarkersByLatLng = <T extends { position: LatLngLike }>(
  markers: T[],
): T[][] => {
  const grouped = new Map<string, T[]>();
  for (const marker of markers) {
    const key = `${marker.position.lat().toFixed(5)}|${marker.position.lng().toFixed(5)}`;
    const group = grouped.get(key);
    if (group) group.push(marker);
    else grouped.set(key, [marker]);
  }
  return Array.from(grouped.values());
};

export const offsetOverlappingLatLng = (
  lat: number,
  lng: number,
  index: number,
  total: number,
): { lat: number; lng: number } => {
  if (total === 1) return { lat, lng };
  const offset = 0.0001;
  const angle = ((2 * Math.PI) / total) * index;
  return {
    lat: lat + Math.sin(angle) * offset,
    lng: lng + Math.cos(angle) * offset,
  };
};
