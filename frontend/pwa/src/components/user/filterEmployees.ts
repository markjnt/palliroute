import { Employee } from "../../types/models";

export const filterEmployees = (
  employees: Employee[],
  searchTerm: string,
  activeFilter: string,
): Employee[] => {
  let filtered = employees;

  if (activeFilter !== "all") {
    switch (activeFilter) {
      case "pflege-nord":
        filtered = filtered.filter(
          (emp) => emp.function === "Pflegekraft" && emp.area === "Nordkreis",
        );
        break;
      case "pflege-sued":
        filtered = filtered.filter(
          (emp) => emp.function === "Pflegekraft" && emp.area === "Südkreis",
        );
        break;
      case "arzt":
        filtered = filtered.filter((emp) => emp.function === "Arzt");
        break;
      case "honorararzt":
        filtered = filtered.filter((emp) => emp.function === "Honorararzt");
        break;
    }
  }

  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (employee) =>
        `${employee.first_name} ${employee.last_name}`
          .toLowerCase()
          .includes(q) ||
        employee.function?.toLowerCase().includes(q) ||
        employee.city?.toLowerCase().includes(q),
    );
  }

  const getGroupOrder = (employee: Employee) => {
    const area = employee.area?.toLowerCase() || "";
    if (employee.function === "Pflegekraft") {
      if (area.includes("nord")) return 1;
      if (area.includes("süd")) return 2;
      return 3;
    }
    if (employee.function === "PDL") return 4;
    if (employee.function === "Arzt") return 5;
    if (employee.function === "Honorararzt") return 6;
    return 999;
  };

  return [...filtered].sort((a, b) => {
    const orderDiff = getGroupOrder(a) - getGroupOrder(b);
    if (orderDiff !== 0) return orderDiff;
    return `${a.last_name} ${a.first_name}`
      .toLowerCase()
      .localeCompare(`${b.last_name} ${b.first_name}`.toLowerCase());
  });
};
