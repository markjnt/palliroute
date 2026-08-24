from datetime import datetime

from flask import Blueprint, g, jsonify, request

from .. import db
from ..auth.decorators import require_auth
from ..models.employee import Employee
from ..models.route import Route, same_appointment_ids
from ..services.aplano_sync import sync_employee_planning
from ..services.holiday_service import is_aw_area_assignment_day
from ..services.pdf_generator import PDFGenerator
from ..services.route_optimizer import RouteOptimizer
from ..services.route_planner import RoutePlanner
from ..services.route_utils import AW_TOUR_AREAS, is_aw_tour_area

routes_bp = Blueprint("routes", __name__)
route_planner = RoutePlanner()
route_optimizer = RouteOptimizer()


def _can_mutate_own_route_order(route: Route):
    """Web/internal and admins: any route. PWA JWT: only the assigned employee's tour."""
    if getattr(g, "auth_mode", None) in ("internal", "disabled"):
        return True
    if bool(getattr(g, "is_admin", False)):
        return True
    caller_employee = getattr(g, "employee", None)
    caller_id = getattr(caller_employee, "id", None) if caller_employee is not None else None
    return caller_id is not None and route.employee_id == caller_id


@routes_bp.route("/", methods=["GET"])
def get_routes():
    """
    Get all routes with optional filtering
    Query parameters:
    - employee_id: Filter by employee
    - weekday: Filter by weekday (monday, tuesday, etc.)
    - date: Filter by specific date (YYYY-MM-DD)
    - area: Filter by area (AW-Flächen Nord/Mitte/Süd)
    - tour_area_day: true = Sa/So-Flächenrouten; mit weekday=monday..friday nur dieser Tag (Feiertags-AW)
    - calendar_week: Filter by calendar week (via patient appointments)
    """
    try:
        # Get query parameters
        employee_id = request.args.get("employee_id", type=int)
        weekday = request.args.get("weekday", "").lower()
        date_str = request.args.get("date")
        area = request.args.get("area")
        tour_area_day = request.args.get("tour_area_day", "").lower() == "true"
        calendar_week = request.args.get("calendar_week", type=int)

        # Build query
        query = Route.query

        if employee_id:
            query = query.filter_by(employee_id=employee_id)

        if weekday:
            query = query.filter_by(weekday=weekday)

        if area:
            query = query.filter_by(area=area)

        if tour_area_day:
            # Mit explizitem Werktag: keine zusätzliche Sa/So-Bedingung (Feiertags-Mo–Fr = area routes).
            if weekday not in ("monday", "tuesday", "wednesday", "thursday", "friday"):
                query = query.filter(Route.weekday.in_(["saturday", "sunday"]))

        if calendar_week:
            # Direct filter by calendar_week (much simpler!)
            query = query.filter_by(calendar_week=calendar_week)

        if date_str:
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d")
                weekday = date.strftime("%A").lower()
                query = query.filter_by(weekday=weekday)
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        routes = query.all()
        return jsonify({"routes": [route.to_dict() for route in routes]})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@routes_bp.route("/<int:route_id>", methods=["PUT"])
def update_route(route_id):
    """
    Update an existing route by reordering appointments
    Expected JSON body: {
        "appointment_id": 1,  # ID of the appointment to move
        "direction": "up" or "down",  # Direction to move the appointment (optional if index is provided)
        "index": 2  # Target index to move appointment to (optional if direction is provided)
    }
    """
    try:
        route = Route.query.get_or_404(route_id)
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        if "appointment_id" not in data:
            return jsonify({"error": "appointment_id is required"}), 400

        appointment_id = data["appointment_id"]
        direction = data.get("direction", "").lower()
        target_index = data.get("index")

        # Validate input parameters
        if not direction and target_index is None:
            return jsonify({"error": "Either direction or index must be provided"}), 400

        if direction and target_index is not None:
            return jsonify({"error": "Cannot provide both direction and index"}), 400

        if direction and direction not in ["up", "down"]:
            return jsonify({"error": 'direction must be "up" or "down"'}), 400

        if target_index is not None and (not isinstance(target_index, int) or target_index < 0):
            return jsonify({"error": "index must be a non-negative integer"}), 400

        # Get current route order
        route_order = route.get_route_order()

        if not route_order:
            return jsonify({"error": "Route is empty"}), 400

        # Find the index of the appointment to move
        try:
            current_index = route_order.index(appointment_id)
        except ValueError:
            return jsonify({"error": "Appointment not found in route"}), 404

        # Calculate new index
        if direction:
            # Use direction-based movement
            if direction == "up" and current_index > 0:
                new_index = current_index - 1
            elif direction == "down" and current_index < len(route_order) - 1:
                new_index = current_index + 1
            else:
                return jsonify({"error": f"Cannot move appointment {direction}"}), 400
        else:
            # Use target index
            if target_index >= len(route_order):
                return jsonify(
                    {
                        "error": f"Index {target_index} is out of range. Route has {len(route_order)} appointments"
                    }
                ), 400

            new_index = target_index

        # Move appointment to new position
        if current_index != new_index:
            # Remove appointment from current position
            appointment = route_order.pop(current_index)
            # Insert appointment at new position
            route_order.insert(new_index, appointment)

        # Update route order
        route.set_route_order(route_order)

        # Neu berechnen: AW-Flächenroute (Nord/Mitte/Süd) zuerst — Start vom zugewiesenen
        # Mitarbeiter-Wohnort, sonst Zentralstart.
        if is_aw_area_assignment_day(route.calendar_week, route.weekday) and is_aw_tour_area(
            route.area
        ):
            route_planner.plan_route(
                route.weekday, area=route.area, calendar_week=route.calendar_week
            )
        elif route.employee_id is not None:
            route_planner.plan_route(
                route.weekday, route.employee_id, calendar_week=route.calendar_week
            )
        else:
            return jsonify(
                {
                    "error": "Route kann nicht neu geplant werden (kein Mitarbeiter und kein AW-Flächentag)."
                }
            ), 400

        # Note: plan_route already commits changes to database

        return jsonify({"message": "Route updated successfully", "route": route.to_dict()})

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@routes_bp.route("/<int:route_id>/custom-order", methods=["PUT"])
@require_auth
def update_custom_order(route_id):
    """Set the PWA custom stop order for a route. Body: { appointment_ids: number[] }"""
    try:
        route = Route.query.get_or_404(route_id)
        if not _can_mutate_own_route_order(route):
            return jsonify({"error": "Forbidden"}), 403
        data = request.get_json() or {}
        appointment_ids = data.get("appointment_ids")
        if not isinstance(appointment_ids, list):
            return jsonify({"error": "appointment_ids must be a list"}), 400
        try:
            appointment_ids = [int(item) for item in appointment_ids]
        except (TypeError, ValueError):
            return jsonify({"error": "appointment_ids must be integers"}), 400

        current_ids = route.get_route_order()
        if not same_appointment_ids(appointment_ids, current_ids):
            return jsonify(
                {"error": "appointment_ids must be a permutation of the current route_order"}
            ), 400

        route.set_custom_order(appointment_ids, active=True)
        db.session.flush()
        route_planner.plan_custom_route(route)
        return jsonify({"message": "Custom order updated", "route": route.to_dict()})
    except Exception as e:
        db.session.rollback()
        routes_bp.logger.exception("Failed to update custom order for route_id=%s", route_id)
        return jsonify({"error": "An internal error has occurred."}), 500


@routes_bp.route("/<int:route_id>/apply-optimized-order", methods=["POST"])
@require_auth
def apply_optimized_order(route_id):
    """Optimize route_order, then copy it into custom_order and deactivate custom order."""
    try:
        route = Route.query.get_or_404(route_id)
        if not _can_mutate_own_route_order(route):
            return jsonify({"error": "Forbidden"}), 403
        weekday = route.weekday
        calendar_week = route.calendar_week
        if is_aw_tour_area(route.area):
            route_optimizer.optimize_route(weekday, area=route.area, calendar_week=calendar_week)
        elif route.employee_id is not None:
            route_optimizer.optimize_route(
                weekday, employee_id=route.employee_id, calendar_week=calendar_week
            )
        else:
            return jsonify({"error": "Route cannot be optimized"}), 400

        route = Route.query.get_or_404(route_id)
        route.reset_custom_order()
        db.session.commit()
        return jsonify({"message": "Optimized order applied", "route": route.to_dict()})
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500


@routes_bp.route("/<int:route_id>", methods=["GET"])
def get_route(route_id):
    """Get details of a specific route"""
    try:
        route = Route.query.get_or_404(route_id)
        return jsonify({"route": route.to_dict()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@routes_bp.route("/<int:route_id>/assign-employee", methods=["PUT"])
@require_auth
def assign_employee_to_aw_tour(route_id):
    """
    Assign or unassign an employee to an AW tour for this day and area.
    Expected JSON body: { "employee_id": 1 } or { "employee_id": null }

    Web (internal key) may assign any employee. PWA JWT may only self-claim:
    employee_id must be g.employee.id. Admins may assign any employee.
    Unassign (null) is allowed for the current assignee or as admin.
    """
    try:
        route = Route.query.get_or_404(route_id)

        if not is_aw_tour_area(route.area):
            return jsonify({"error": "Mitarbeiter können nur AW-Touren zugewiesen werden."}), 400

        if not is_aw_area_assignment_day(route.calendar_week, route.weekday):
            return jsonify(
                {"error": "Zuweisung nur für AW-Touren (Wochenende oder Feiertag)."}
            ), 400

        data = request.get_json()
        if not data or "employee_id" not in data:
            return jsonify({"error": "employee_id is required (number or null)"}), 400

        employee_id = data.get("employee_id")
        is_internal = getattr(g, "auth_mode", None) in ("internal", "disabled")
        is_admin = bool(getattr(g, "is_admin", False))
        caller_employee = getattr(g, "employee", None)
        caller_id = getattr(caller_employee, "id", None) if caller_employee is not None else None

        if not is_internal:
            if employee_id is None:
                if not is_admin and (caller_id is None or route.employee_id != caller_id):
                    return jsonify({"error": "Forbidden"}), 403
            else:
                try:
                    requested_id = int(employee_id)
                except (TypeError, ValueError):
                    return jsonify({"error": "employee_id must be a number or null"}), 400
                if not is_admin and (caller_id is None or requested_id != caller_id):
                    return jsonify({"error": "Forbidden"}), 403

        if employee_id is None:
            route.employee_id = None
        else:
            employee = Employee.query.get(employee_id)
            if not employee:
                return jsonify({"error": "Employee not found"}), 404
            route.employee_id = employee.id

        route.updated_at = datetime.utcnow()
        db.session.commit()

        planning_failed = False
        planning_error = None
        try:
            route_planner.plan_route(
                route.weekday, area=route.area, calendar_week=route.calendar_week
            )
        except Exception as plan_error:
            planning_failed = True
            planning_error = str(plan_error)
            print(
                f"AW tour assignment saved but route planning failed for route {route.id}: {plan_error}"
            )

        route = Route.query.get(route_id)
        if route and not planning_failed:
            route.reset_custom_order()
            db.session.commit()

        route = Route.query.get(route_id)
        payload = {
            "message": "AW-Tour zugewiesen",
            "route": route.to_dict(),
        }
        if planning_failed:
            payload["planning_failed"] = True
            payload["planning_error"] = planning_error
        return jsonify(payload)
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@routes_bp.route("/optimize", methods=["POST"])
def optimize_routes():
    """
    Optimize routes for a specific weekday and employee or area.
    Expected JSON body: {
        "weekday": "monday",  # Wochentag (kleingeschrieben)
        "employee_id": 1,     # Mitarbeiter-ID (for weekday routes)
        "area": "Nordkreis",  # Area (for weekend routes)
        "calendar_week": 38   # Kalenderwoche (optional, wird automatisch ermittelt falls nicht angegeben)
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        weekday = data.get("weekday", "").lower()
        employee_id = data.get("employee_id")
        area = data.get("area")
        calendar_week = data.get("calendar_week")  # Optional calendar_week from frontend

        if not weekday:
            return jsonify({"error": "weekday is required"}), 400

        if employee_id:
            if calendar_week:
                # Optimize specific route for this calendar week
                route_optimizer.optimize_route(weekday, employee_id, calendar_week=calendar_week)
                return jsonify(
                    {
                        "message": f"Route optimized successfully for employee {employee_id} on {weekday} (KW {calendar_week})"
                    }
                )
            else:
                # Optimize all routes for this employee/weekday (all calendar weeks)
                routes = Route.query.filter(
                    Route.employee_id == employee_id,
                    Route.weekday == weekday,
                    ~Route.area.in_(AW_TOUR_AREAS),
                ).all()
                optimized_count = 0
                for route in routes:
                    try:
                        route_optimizer.optimize_route(
                            weekday, employee_id, calendar_week=route.calendar_week
                        )
                        optimized_count += 1
                    except Exception as e:
                        print(
                            f"Failed to optimize route for employee {employee_id} on {weekday} (KW {route.calendar_week}): {e}"
                        )
                return jsonify(
                    {
                        "message": f"{optimized_count} routes optimized successfully for employee {employee_id} on {weekday}"
                    }
                )
        elif area:
            if calendar_week:
                # Optimize specific route for this calendar week
                route_optimizer.optimize_route(weekday, area=area, calendar_week=calendar_week)
                return jsonify(
                    {
                        "message": f"AW tour-area route optimized successfully for {area} on {weekday} (KW {calendar_week})"
                    }
                )
            else:
                # Optimize all routes for this area/weekday (all calendar weeks)
                routes = Route.query.filter_by(weekday=weekday, area=area).all()
                optimized_count = 0
                for route in routes:
                    try:
                        route_optimizer.optimize_route(
                            weekday, area=area, calendar_week=route.calendar_week
                        )
                        optimized_count += 1
                    except Exception as e:
                        print(
                            f"Failed to optimize AW tour-area route for {area} on {weekday} (KW {route.calendar_week}): {e}"
                        )
                return jsonify(
                    {
                        "message": f"{optimized_count} AW tour-area routes optimized for {area} on {weekday}"
                    }
                )
        else:
            return jsonify({"error": "Either employee_id or area is required"}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@routes_bp.route("/download-pdf", methods=["GET"])
def download_route_pdf():
    """
    Download complete route PDF for a calendar week, sorted by Nord/Süd
    Only includes weekday routes (Monday-Friday), sorted by employee area (Nord/Süd)
    Query parameters:
    - calendar_week: Calendar week number (required)
    """
    try:
        # Get query parameters
        calendar_week = request.args.get("calendar_week", type=int)
        selected_weekday = (request.args.get("selected_weekday") or "monday").lower()
        valid_weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"]
        if selected_weekday not in valid_weekdays:
            selected_weekday = "monday"

        # Validate required parameter
        if not calendar_week:
            return jsonify({"error": "calendar_week is required"}), 400

        # Ensure employee planning is synced for this calendar week,
        # but don't abort download if sync is unavailable (e.g. missing API key/offline)
        sync_warning = None
        try:
            sync_success = sync_employee_planning(calendar_week)
            if not sync_success:
                sync_warning = (
                    f"Failed to synchronize planning data for calendar week {calendar_week}"
                )
        except Exception as sync_error:
            sync_warning = f"Failed to synchronize planning data for calendar week {calendar_week}: {sync_error}"

        if sync_warning:
            print(f"[download_route_pdf] Warning: {sync_warning}")

        # Get all employees with their weekday routes for this calendar week
        weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"]

        # Get all employees, ordered by function and area (Nordkreis first, then Südkreis)
        employees = (
            Employee.query.filter(Employee.area.in_(["Nordkreis", "Südkreis"]))
            .order_by(
                db.case(
                    (Employee.function == "Pflegekraft", 1),
                    (Employee.function == "PDL", 2),
                    (Employee.function == "Arzt", 3),
                    (Employee.function == "Honorararzt", 4),
                    (Employee.function == "Physiotherapie", 5),
                    else_=99,
                ),
                db.case(
                    (Employee.area == "Nordkreis", 1), (Employee.area == "Südkreis", 2), else_=99
                ),
            )
            .all()
        )

        # Build employee routes data structure
        employee_routes_data = []

        for employee in employees:
            # Get all weekday routes for this employee in this calendar week
            routes = (
                Route.query.filter(
                    Route.employee_id == employee.id,
                    Route.weekday.in_(weekdays),
                    Route.calendar_week == calendar_week,
                    ~Route.area.in_(AW_TOUR_AREAS),
                )
                .order_by(
                    # Custom order for weekdays
                    db.case(
                        (Route.weekday == "monday", 1),
                        (Route.weekday == "tuesday", 2),
                        (Route.weekday == "wednesday", 3),
                        (Route.weekday == "thursday", 4),
                        (Route.weekday == "friday", 5),
                        else_=6,
                    )
                )
                .all()
            )

            # Get all appointments for this employee in this calendar week
            from app.models.appointment import Appointment

            appointments = Appointment.query.filter(
                Appointment.employee_id == employee.id, Appointment.calendar_week == calendar_week
            ).all()

            # Only add employees who have routes OR appointments
            if routes or appointments:
                employee_routes_data.append(
                    {"employee": employee, "routes": routes, "appointments": appointments}
                )

        # Check if any routes or appointments exist
        if not employee_routes_data:
            return jsonify(
                {"error": f"No routes or appointments found for calendar week {calendar_week}"}
            ), 404

        # Split employees into regular and doctors groups
        regular_data = []
        doctors_data = []
        for emp_block in employee_routes_data:
            func = (emp_block["employee"].function or "").strip()
            if func in ["Arzt", "Honorararzt"]:
                doctors_data.append(emp_block)
            else:
                regular_data.append(emp_block)

        # Build weekend data (Saturday/Sunday routes only)
        weekend_days = ["saturday", "sunday"]
        weekend_employee_data = []
        # Fetch all weekend routes regardless of employee (area-based)
        weekend_routes = (
            Route.query.filter(
                Route.weekday.in_(weekend_days), Route.calendar_week == calendar_week
            )
            .order_by(
                db.case((Route.weekday == "saturday", 1), (Route.weekday == "sunday", 2), else_=3)
            )
            .all()
        )
        # Group by area
        area_to_routes = {}
        for r in weekend_routes:
            key = r.area or "Unbekannt"
            area_to_routes.setdefault(key, []).append(r)
        for area, routes_in_area in area_to_routes.items():
            # Get employee name if employee_id is set (AW-Tour-Zuweisung)
            employee_name = None
            # Check if any route in this area has an employee_id
            for route in routes_in_area:
                if route.employee_id:
                    employee = Employee.query.get(route.employee_id)
                    if employee:
                        employee_name = f"{employee.first_name} {employee.last_name}"
                    break  # All routes in same area should have same employee_id

            # Build area label with employee name if available
            area_label = f"AW {area}"
            if employee_name:
                area_label = f"AW {area}: {employee_name}"

            weekend_employee_data.append(
                {
                    "group_id": f"area-{area}",
                    "area": area,
                    "area_label": area_label,
                    "routes": routes_in_area,
                    "appointments": [],
                }
            )

        # Generate all available PDFs and zip them
        import zipfile
        from io import BytesIO

        from flask import Response

        files_to_return = []

        if regular_data:
            pdf_buffer_regular = PDFGenerator.generate_calendar_week_pdf(
                employee_routes_data=regular_data,
                calendar_week=calendar_week,
                selected_weekday=selected_weekday,
            )
            files_to_return.append(
                (
                    f"PalliRoute_Routenplanung_Pflege_KW{calendar_week}.pdf",
                    pdf_buffer_regular.getvalue(),
                )
            )

        if doctors_data:
            pdf_buffer_doctors = PDFGenerator.generate_calendar_week_pdf(
                employee_routes_data=doctors_data,
                calendar_week=calendar_week,
                selected_weekday=selected_weekday,
            )
            files_to_return.append(
                (
                    f"PalliRoute_Routenplanung_Aerzte_KW{calendar_week}.pdf",
                    pdf_buffer_doctors.getvalue(),
                )
            )

        if weekend_employee_data:
            pdf_buffer_weekend = PDFGenerator.generate_weekend_pdf(
                employee_routes_data=weekend_employee_data, calendar_week=calendar_week
            )
            files_to_return.append(
                (
                    f"PalliRoute_Routenplanung_Wochenende_KW{calendar_week}.pdf",
                    pdf_buffer_weekend.getvalue(),
                )
            )

        if not files_to_return:
            return jsonify(
                {"error": f"No routes or appointments found for calendar week {calendar_week}"}
            ), 404

        if len(files_to_return) == 1:
            filename, pdf_bytes = files_to_return[0]
            headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
            if sync_warning:
                headers["X-Sync-Warning"] = sync_warning
            return Response(pdf_bytes, mimetype="application/pdf", headers=headers)

        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
            for fname, fbytes in files_to_return:
                zipf.writestr(fname, fbytes)
        zip_buffer.seek(0)
        zip_filename = f"PalliRoute_Routenplanung_KW{calendar_week}.zip"
        zip_headers = {"Content-Disposition": f'attachment; filename="{zip_filename}"'}
        if sync_warning:
            zip_headers["X-Sync-Warning"] = sync_warning
        return Response(zip_buffer.getvalue(), mimetype="application/zip", headers=zip_headers)
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
