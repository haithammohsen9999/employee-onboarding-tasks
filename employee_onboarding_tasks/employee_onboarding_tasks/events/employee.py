import frappe
from frappe import _
from frappe.utils import add_days, cint, today

from employee_onboarding_tasks.api import create_notification_for_task


def create_onboarding_request(doc, method=None):
	if frappe.flags.in_install:
		return

	if frappe.db.exists("Employee Onboarding Request", {"employee": doc.name}):
		return

	request_doc = frappe.get_doc(
		{
			"doctype": "Employee Onboarding Request",
			"employee": doc.name,
			"employee_name": getattr(doc, "employee_name", None) or doc.employee_name or doc.first_name,
			"company": doc.company,
			"branch": _get_optional_value(doc, "branch"),
			"department": doc.department,
			"designation": getattr(doc, "designation", None),
			"date_of_joining": doc.date_of_joining,
			"status": "مفتوح",
		}
	).insert(ignore_permissions=True)

	settings = frappe.get_single("Employee Onboarding Settings")
	for template in settings.task_templates:
		if not template.enabled:
			continue
		if not template.assigned_to and not template.assigned_role:
			frappe.throw(_("يجب تحديد المستخدم أو الدور في قالب مهمة التجهيز {0}.").format(template.idx))

		task_doc = frappe.get_doc(
			{
				"doctype": "Employee Onboarding Task",
				"onboarding_request": request_doc.name,
				"employee": doc.name,
				"employee_name": request_doc.employee_name,
				"task_type": template.task_type,
				"assigned_to": template.assigned_to,
				"assigned_role": template.assigned_role,
				"status": "معلق",
				"due_date": add_days(today(), cint(template.due_after_days or 1)),
				"task_message": template.task_message,
				"company": doc.company,
				"branch": _get_optional_value(doc, "branch"),
				"department": doc.department,
			}
		).insert(ignore_permissions=True)
		create_notification_for_task(task_doc)

	request_doc.reload()
	request_doc.update_progress()
	request_doc.save(ignore_permissions=True)


def _get_optional_value(doc, fieldname):
	if not frappe.db.exists("DocType", "Branch") or not hasattr(doc, fieldname):
		return None
	return getattr(doc, fieldname, None)
