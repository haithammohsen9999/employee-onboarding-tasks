import frappe
from frappe import _
from frappe.utils import now_datetime


MANAGER_ROLES = {"System Manager", "مدير تجهيز الموظفين"}


def _has_manager_access(user: str | None = None) -> bool:
	user = user or frappe.session.user
	return bool(MANAGER_ROLES.intersection(set(frappe.get_roles(user))))


def _get_task_doc(task_name: str):
	task = frappe.get_doc("Employee Onboarding Task", task_name)
	if not _has_manager_access() and task.assigned_to != frappe.session.user:
		frappe.throw(_("ليس لديك صلاحية للوصول إلى هذه المهمة."), frappe.PermissionError)
	return task


@frappe.whitelist()
def get_my_tasks(status=None):
	filters = {}
	if status:
		filters["status"] = status

	if not _has_manager_access():
		filters["assigned_to"] = frappe.session.user

	return frappe.get_all(
		"Employee Onboarding Task",
		filters=filters,
		fields=[
			"name",
			"employee",
			"employee_name",
			"task_type",
			"assigned_to",
			"status",
			"due_date",
			"branch",
			"department",
			"remarks",
			"onboarding_request",
		],
		order_by="status asc, due_date asc, modified desc",
	)


@frappe.whitelist()
def get_dashboard_counts():
	filters = {}
	if not _has_manager_access():
		filters["assigned_to"] = frappe.session.user

	counts = {}
	for task_status in ["معلق", "قيد التنفيذ", "مكتمل", "مرفوض"]:
		status_filters = dict(filters)
		status_filters["status"] = task_status
		counts[task_status] = frappe.db.count("Employee Onboarding Task", status_filters)

	return {
		"pending": counts["معلق"],
		"in_progress": counts["قيد التنفيذ"],
		"completed": counts["مكتمل"],
		"rejected": counts["مرفوض"],
	}


@frappe.whitelist()
def mark_task_in_progress(task_name):
	task = _get_task_doc(task_name)
	if task.status == "مكتمل":
		frappe.throw(_("لا يمكن بدء مهمة مكتملة."), frappe.ValidationError)

	task.status = "قيد التنفيذ"
	task.save()
	return {"name": task.name, "status": task.status}


@frappe.whitelist()
def complete_task(task_name, remarks=None):
	task = _get_task_doc(task_name)
	if remarks is not None:
		task.remarks = remarks
	task.status = "مكتمل"
	task.save()
	return {
		"name": task.name,
		"status": task.status,
		"completed_by": task.completed_by,
		"completed_on": task.completed_on,
	}


@frappe.whitelist()
def reject_task(task_name, remarks):
	if not remarks:
		frappe.throw(_("يجب إدخال ملاحظات عند رفض المهمة."), frappe.ValidationError)

	task = _get_task_doc(task_name)
	task.status = "مرفوض"
	task.remarks = remarks
	task.completed_by = None
	task.completed_on = None
	task.save()
	return {"name": task.name, "status": task.status}


def create_notification_for_task(task_doc):
	if not task_doc.assigned_to:
		return

	notification = frappe.new_doc("Notification Log")
	notification.for_user = task_doc.assigned_to
	notification.type = "Alert"
	notification.subject = _("طلب جديد لتجهيز الموظف: {0}").format(task_doc.employee_name)
	notification.document_type = task_doc.doctype
	notification.document_name = task_doc.name
	notification.from_user = "Administrator"
	notification.email_content = _("تم إسناد مهمة جديدة لك ضمن طلب تجهيز الموظف.")
	notification.insert(ignore_permissions=True)


def set_task_completion_metadata(task_doc):
	task_doc.completed_by = frappe.session.user
	task_doc.completed_on = now_datetime()
