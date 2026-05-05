import frappe
from frappe import _
from frappe.model.document import Document

from employee_onboarding_tasks.employee_onboarding_tasks.department_selection import (
	department_exists,
	parse_department_selection,
	serialize_department_selection,
)


class EmployeeOnboardingSettings(Document):
	def validate(self):
		for row in self.task_templates:
			if row.enabled and not row.task_type:
				frappe.throw(_("يجب تحديد نوع المهمة في صف قوالب التجهيز رقم {0}.").format(row.idx))
			if row.enabled and not row.assigned_to:
				frappe.throw(_("يجب تحديد المستخدم المسؤول في صف قوالب التجهيز رقم {0}.").format(row.idx))
			allowed_departments = parse_department_selection(getattr(row, "allowed_department", None))
			row.allowed_department = serialize_department_selection(allowed_departments)
			for allowed_department in allowed_departments:
				if not department_exists(allowed_department):
					frappe.throw(
						_("القسم {0} غير موجود في صف قوالب التجهيز رقم {1}.").format(
							allowed_department, row.idx
						)
					)
