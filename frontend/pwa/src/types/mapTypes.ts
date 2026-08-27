export type {
  MarkerData,
  MarkerGroup,
  RoutePathData,
  MarkerType,
} from "@palliroute/models/map";

export interface MapContainerProps {
  apiKey: string;
  onMapClick?: () => void;
}
