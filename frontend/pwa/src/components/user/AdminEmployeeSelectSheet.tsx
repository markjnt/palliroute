import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
} from "@mui/material";
import {
  Search as SearchIcon,
  Done as DoneIcon,
  Person as PersonIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { Sheet } from "react-modal-sheet";
import { useEmployees } from "../../services/queries/useEmployees";
import { useUserStore } from "../../stores/useUserStore";
import { Employee } from "../../types/models";
import { useDeferredSheetMount } from "../../hooks/useDeferredSheetMount";
import { EmployeeFilterChips, EmployeePickCard } from "./EmployeePickCard";
import { filterEmployees } from "./filterEmployees";

interface AdminEmployeeSelectSheetProps {
  open: boolean;
  onClose: () => void;
}

export const AdminEmployeeSelectSheet: React.FC<
  AdminEmployeeSelectSheetProps
> = ({ open, onClose }) => {
  const { shouldRender, onCloseEnd } = useDeferredSheetMount(open);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const { data: employees = [], isLoading, error } = useEmployees();
  const { selectedUserId, setSelectedUser, setSelectedTourArea } =
    useUserStore();

  const filteredEmployees = useMemo(
    () => filterEmployees(employees, searchTerm, activeFilter),
    [employees, searchTerm, activeFilter],
  );

  const handleSelect = (employeeId: number) => {
    setSelectedUser(employeeId);
    setSelectedTourArea(null);
    onClose();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <Sheet
      isOpen={open}
      onClose={onClose}
      onCloseEnd={onCloseEnd}
      initialSnap={0}
      snapPoints={[0.85, 0]}
    >
      <Sheet.Container>
        <Sheet.Header>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "8px 0",
              cursor: "grab",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "4px",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                borderRadius: "8px",
              }}
            />
          </div>

          <Box sx={{ px: 3, pb: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "#1d1d1f" }}
              >
                Als Mitarbeiter testen
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Wählen Sie einen Mitarbeiter, um die App in dessen Sicht zu
                prüfen.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Mitarbeiter suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Suche leeren"
                        onClick={() => setSearchTerm("")}
                        edge="end"
                        size="small"
                      >
                        <CloseIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 48,
                    borderRadius: 2,
                  },
                }}
              />
              <IconButton
                onClick={onClose}
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  flexShrink: 0,
                  width: "48px",
                  height: "48px",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
                aria-label="Fertig"
              >
                <DoneIcon />
              </IconButton>
            </Box>
            <Box sx={{ mt: 2 }}>
              <EmployeeFilterChips
                activeFilter={activeFilter}
                onChange={setActiveFilter}
              />
            </Box>
          </Box>
        </Sheet.Header>

        <Sheet.Content>
          <Sheet.Scroller draggableAt="top">
            <Box sx={{ px: 3, pt: 2, pb: 2 }}>
              {isLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <Typography color="text.secondary">
                    Lade Mitarbeiter...
                  </Typography>
                </Box>
              ) : error ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <Typography color="error">
                    Fehler beim Laden der Mitarbeiter
                  </Typography>
                </Box>
              ) : filteredEmployees.length === 0 ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  py={4}
                >
                  <PersonIcon
                    sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
                  />
                  <Typography color="text.secondary">
                    Keine Mitarbeiter gefunden
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={1.5}>
                  {filteredEmployees.map((employee: Employee) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={employee.id}>
                      <EmployeePickCard
                        employee={employee}
                        selected={selectedUserId === employee.id}
                        onClick={() => handleSelect(employee.id as number)}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Sheet.Scroller>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
};

export default AdminEmployeeSelectSheet;
