import frappe
from frappe.permissions import add_permission, update_permission_property


ROLES = [
	"مسؤول البصمة",
	"مسؤول المالية",
	"مسؤول العهدة",
	"مسؤول تقنية المعلومات",
	"مدير تجهيز الموظفين",
]

MANAGER_PERMISSIONS = ["read", "write", "create", "delete", "print", "email", "export", "share"]
STANDARD_PERMISSIONS = ["read", "write", "create"]


def after_install():
	create_roles()
	post_schema_setup()


def after_migrate():
	create_roles()
	post_schema_setup()


def post_schema_setup():
	if not frappe.db.exists("DocType", "Employee Onboarding Request"):
		return
	set_doctype_permissions()
	ensure_settings_doc()


def before_tests():
	create_roles()
	post_schema_setup()


def create_roles():
	for role in ROLES:
		if not frappe.db.exists("Role", role):
			frappe.get_doc({"doctype": "Role", "role_name": role}).insert(ignore_permissions=True)


def ensure_settings_doc():
	if not frappe.db.exists("Employee Onboarding Settings", "Employee Onboarding Settings"):
		frappe.get_doc({"doctype": "Employee Onboarding Settings"}).insert(ignore_permissions=True)


def set_doctype_permissions():
	manager_role = "مدير تجهيز الموظفين"
	for doctype in ["Employee Onboarding Request", "Employee Onboarding Task", "Employee Onboarding Settings"]:
		ensure_role_permissions(doctype, manager_role, MANAGER_PERMISSIONS)
		ensure_role_permissions(doctype, "System Manager", MANAGER_PERMISSIONS)

	ensure_role_permissions("Employee Onboarding Task", "مسؤول البصمة", STANDARD_PERMISSIONS)
	ensure_role_permissions("Employee Onboarding Task", "مسؤول المالية", STANDARD_PERMISSIONS)
	ensure_role_permissions("Employee Onboarding Task", "مسؤول العهدة", STANDARD_PERMISSIONS)
	ensure_role_permissions("Employee Onboarding Task", "مسؤول تقنية المعلومات", STANDARD_PERMISSIONS)


def ensure_role_permissions(doctype: str, role: str, permissions: list[str]):
	if not frappe.db.exists("DocPerm", {"parent": doctype, "role": role, "permlevel": 0}) and not frappe.db.exists(
		"Custom DocPerm", {"parent": doctype, "role": role, "permlevel": 0}
	):
		add_permission(doctype, role, 0)

	for permission in permissions:
		update_permission_property(doctype, role, 0, permission, 1)
