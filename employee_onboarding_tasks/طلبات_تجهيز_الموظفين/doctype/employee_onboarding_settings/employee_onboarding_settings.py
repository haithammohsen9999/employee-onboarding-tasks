import frappe
from frappe import _
from frappe.model.document import Document


class EmployeeOnboardingSettings(Document):
	def validate(self):
		for row in self.task_templates:
			if row.enabled and not row.task_type:
				frappe.throw(_("يجب تحديد نوع المهمة في صف قوالب التجهيز رقم {0}.").format(row.idx))
			if row.enabled and not row.assigned_to:
				frappe.throw(_("يجب تحديد المستخدم المسؤول في صف قوالب التجهيز رقم {0}.").format(row.idx))
