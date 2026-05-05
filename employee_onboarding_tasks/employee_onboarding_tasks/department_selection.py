import json
import re

import frappe


DEPARTMENT_SEPARATOR_PATTERN = re.compile(r"[\n,،]+")


def parse_department_selection(value) -> list[str]:
	if not value:
		return []

	if isinstance(value, str):
		normalized_value = value.strip()
		if normalized_value.startswith("[") and normalized_value.endswith("]"):
			try:
				parts = json.loads(normalized_value)
			except ValueError:
				parts = DEPARTMENT_SEPARATOR_PATTERN.split(normalized_value)
		else:
			parts = DEPARTMENT_SEPARATOR_PATTERN.split(normalized_value)
	else:
		parts = value

	departments = []
	for part in parts:
		department = str(part or "").strip()
		if department and department not in departments:
			departments.append(department)

	return departments


def serialize_department_selection(value) -> str:
	return ", ".join(parse_department_selection(value))


def department_exists(value: str) -> bool:
	department = str(value or "").strip()
	if not department:
		return False

	return bool(
		frappe.db.exists("Department", department)
		or frappe.db.exists("Department", {"department_name": department})
	)


def get_department_match_values(value) -> set[str]:
	selected_departments = parse_department_selection(value)
	if not selected_departments:
		return set()

	match_values = set(selected_departments)
	departments = frappe.get_all(
		"Department",
		filters={"name": ["in", selected_departments]},
		fields=["name", "department_name"],
		limit_page_length=0,
	)
	departments.extend(
		frappe.get_all(
			"Department",
			filters={"department_name": ["in", selected_departments]},
			fields=["name", "department_name"],
			limit_page_length=0,
		)
	)

	for department in departments:
		if department.get("name"):
			match_values.add(department["name"])
		if department.get("department_name"):
			match_values.add(department["department_name"])

	return {item for item in match_values if item}
