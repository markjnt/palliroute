import React from 'react';
import { InfoWindow } from '@react-google-maps/api';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MarkerData } from '../../types/mapTypes';
import { Appointment, Employee, Patient, Route } from '../../types/models';
import { useCloseOnMapClick } from '@palliroute/ui';
import {
  PatientInfoContent,
  EmployeeInfoContent,
  TourPatientInfoContent,
  TourAreaInfoContent,
  CustomMarkerInfoContent,
  PflegeheimInfoContent,
} from './infoWindows';

interface MarkerInfoWindowProps {
  markerList: MarkerData[];
  position: google.maps.LatLng;
  onClose: () => void;
  patients: Patient[];
  employees: Employee[];
  appointments: Appointment[];
  userArea?: string;
  routes: Route[];
}

export const MarkerInfoWindow: React.FC<MarkerInfoWindowProps> = ({
  markerList,
  position,
  onClose,
  patients,
  employees,
  appointments,
  userArea,
  routes,
}) => {
  useCloseOnMapClick(onClose);

  return (
    <>
      <style>{`
        .gm-style-iw,
        .gm-style-iw-c {
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08) !important;
          overflow: hidden !important;
          width: auto !important;
          max-width: none !important;
        }
        .gm-style-iw-d {
          overflow: hidden !important;
          max-height: none !important;
        }
        .gm-style-iw-chr,
        button.gm-ui-hover-effect {
          display: none !important;
        }
      `}</style>
      <InfoWindow
        position={position}
        onCloseClick={onClose}
        options={{
          pixelOffset: new google.maps.Size(0, -36),
          maxWidth: 640,
          headerDisabled: true,
          disableAutoPan: false,
        }}
      >
        <Box
          sx={{
            p: 1.75,
            minWidth: 260,
            width: 'max-content',
            maxWidth: 560,
            position: 'relative',
          }}
        >
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 2,
              width: 32,
              height: 32,
              bgcolor: 'rgba(0, 0, 0, 0.06)',
              color: '#1d1d1f',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.1)' },
            }}
            aria-label="Schließen"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {markerList.map((marker, idx) => (
            <Box
              key={idx}
              sx={{
                mb: idx < markerList.length - 1 ? 2 : 0,
                pb: idx < markerList.length - 1 ? 1.5 : 0,
                borderBottom:
                  idx < markerList.length - 1 ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
              }}
            >
              {marker.type === 'patient' ? (
                <PatientInfoContent
                  marker={marker}
                  patients={patients}
                  appointments={appointments}
                  routes={routes}
                  employees={employees}
                />
              ) : marker.type === 'tour_patient' ? (
                <TourPatientInfoContent
                  marker={marker}
                  patients={patients}
                  appointments={appointments}
                  routes={routes}
                />
              ) : marker.type === 'tour_area' ? (
                <TourAreaInfoContent marker={marker} />
              ) : marker.type === 'custom' ? (
                <CustomMarkerInfoContent marker={marker} />
              ) : marker.type === 'pflegeheim' ? (
                <PflegeheimInfoContent marker={marker} />
              ) : (
                <EmployeeInfoContent marker={marker} employees={employees} routes={routes} />
              )}
            </Box>
          ))}
        </Box>
      </InfoWindow>
    </>
  );
};
