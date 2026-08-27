import { describe, expect, it } from "vitest";
import {
  getMarkerFillColor,
  getMarkerLabelText,
  getOwnRouteDistance,
  getOwnRouteDuration,
  getOwnRouteOrder,
  getOwnRoutePolyline,
  getTourAreaColor,
  offsetOverlappingLatLng,
} from "./index";
import type { Route } from "@palliroute/models";

describe("getTourAreaColor", () => {
  it("maps Nord/Mitte/Süd to the tour colors", () => {
    expect(getTourAreaColor("Nord")).toBe("#1976d2");
    expect(getTourAreaColor("Mitte")).toBe("#7b1fa2");
    expect(getTourAreaColor("Süd")).toBe("#388e3c");
  });

  it("falls back to orange", () => {
    expect(getTourAreaColor(undefined)).toBe("#ff9800");
  });
});

describe("getMarkerFillColor", () => {
  it("uses routeColor when provided", () => {
    expect(
      getMarkerFillColor({
        type: "patient",
        visitType: "HB",
        routeColor: "#FF1493",
      }),
    ).toBe("#FF1493");
  });

  it("greys out inactive markers", () => {
    expect(
      getMarkerFillColor({
        type: "patient",
        visitType: "HB",
        isInactive: true,
      }),
    ).toBe("#9E9E9E");
  });
});

describe("getMarkerLabelText", () => {
  it("prefers a custom label", () => {
    expect(getMarkerLabelText(2, "HB", "A")).toBe("A");
  });

  it("shows route position for routed visits", () => {
    expect(getMarkerLabelText(3, "HB")).toBe("3");
  });
});

describe("offsetOverlappingLatLng", () => {
  it("keeps a single marker in place", () => {
    expect(offsetOverlappingLatLng(51, 7, 0, 1)).toEqual({ lat: 51, lng: 7 });
  });
});

describe("own route helpers", () => {
  const route = {
    custom_order: [3, 1, 2],
    route_order: [1, 2, 3],
    custom_polyline: "custom-line",
    polyline: "web-line",
    custom_distance: 8.4,
    total_distance: 10,
    custom_duration: 55,
    total_duration: 70,
  } as Route;

  it("prefers custom_order, polyline, distance and duration", () => {
    expect(getOwnRouteOrder(route)).toEqual([3, 1, 2]);
    expect(getOwnRoutePolyline(route)).toBe("custom-line");
    expect(getOwnRouteDistance(route)).toBe(8.4);
    expect(getOwnRouteDuration(route)).toBe(55);
  });

  it("falls back to web fields when custom is empty", () => {
    const inactive = {
      ...route,
      custom_order: [],
      custom_polyline: null,
      custom_distance: null,
      custom_duration: null,
    } as Route;
    expect(getOwnRouteOrder(inactive)).toEqual([1, 2, 3]);
    expect(getOwnRoutePolyline(inactive)).toBe("web-line");
    expect(getOwnRouteDistance(inactive)).toBe(10);
    expect(getOwnRouteDuration(inactive)).toBe(70);
  });
});
