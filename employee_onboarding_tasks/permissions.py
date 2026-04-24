import frappe


MANAGER_ROLES = {"System Manager", "مدير تجهيز الموظفين"}


def has_manager_access(user: str | None = None) -> bool:
	user = user or frappe.session.user
	return bool(MANAGER_ROLES.intersection(set(frappe.get_roles(user))))


def task_permission_query_conditions(user=None):
	user = user or frappe.session.user
	if has_manager_access(user):
		return ""

	return f"`tabEmployee Onboarding Task`.`assigned_to` = {frappe.db.escape(user)}"


def task_has_permission(doc, ptype="read", user=None):
	user = user or frappe.session.user
	if has_manager_access(user):
		return True

	if not doc:
		return False

	return doc.assigned_to == user
