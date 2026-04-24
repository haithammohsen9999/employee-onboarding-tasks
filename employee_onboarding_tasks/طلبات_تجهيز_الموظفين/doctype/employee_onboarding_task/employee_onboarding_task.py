import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import cint

from employee_onboarding_tasks.api import set_task_completion_metadata
from employee_onboarding_tasks.permissions import has_manager_access


ALLOWED_SELF_EDIT_FIELDS = {"status", "remarks", "attachment", "task_message"}


class EmployeeOnboardingTask(Document):
	def autoname(self):
		self.name = make_autoname("EOT-.#####")

	def validate(self):
		self.employee_name = self.employee_name or frappe.db.get_value("Employee", self.employee, "employee_name")
		self._validate_user_edit_scope()
		self._validate_completion_rules()
		self._update_completion_metadata()

	def on_update(self):
		self._update_request_progress()

	def _validate_user_edit_scope(self):
		if self.is_new() or has_manager_access():
			return

		if self.assigned_to != frappe.session.user:
			frappe.throw(_("لا يمكنك تعديل مهمة غير مسندة لك."), frappe.PermissionError)

		if not self.get_doc_before_save():
			return

		previous = self.get_doc_before_save()
		for fieldname in self.meta.get_valid_columns():
			if fieldname in {"modified", "modified_by", "creation", "owner"}:
				continue
			if self.get(fieldname) != previous.get(fieldname) and fieldname not in ALLOWED_SELF_EDIT_FIELDS:
				frappe.throw(_("يمكنك تعديل الحالة والملاحظات والمرفق فقط."), frappe.PermissionError)

	def _validate_completion_rules(self):
		if self.status == "مكتمل" and self.task_type != "البصمة" and not self.remarks:
			frappe.throw(_("لا يمكن إكمال المهمة بدون ملاحظات إلا في مهمة البصمة."), frappe.ValidationError)

	def _update_completion_metadata(self):
		previous = self.get_doc_before_save()
		previous_status = previous.status if previous else None

		if self.status == "مكتمل":
			if previous_status != "مكتمل" or not self.completed_by or not self.completed_on:
				self.flags.from_status_handler = True
				set_task_completion_metadata(self)
		elif previous_status == "مكتمل":
			if not has_manager_access():
				frappe.throw(_("فقط مدير تجهيز الموظفين يمكنه إعادة فتح مهمة مكتملة."), frappe.PermissionError)
			self.completed_by = None
			self.completed_on = None
		elif not self.is_new():
			if previous and (self.completed_by != previous.completed_by or self.completed_on != previous.completed_on):
				frappe.throw(_("لا يمكن تعديل بيانات الإكمال يدويًا."), frappe.PermissionError)

	def _update_request_progress(self):
		if not self.onboarding_request:
			return
		request_doc = frappe.get_doc("Employee Onboarding Request", self.onboarding_request)
		request_doc.update_progress()
		request_doc.db_set("progress", cint(request_doc.progress), update_modified=False)
		request_doc.db_set("status", request_doc.status, update_modified=False)
