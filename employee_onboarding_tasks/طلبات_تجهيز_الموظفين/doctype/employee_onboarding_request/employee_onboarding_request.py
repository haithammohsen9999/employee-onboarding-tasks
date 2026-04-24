import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname


class EmployeeOnboardingRequest(Document):
	def autoname(self):
		self.name = make_autoname("EOR-.#####")

	def validate(self):
		self.update_progress()

	def update_progress(self):
		tasks = frappe.get_all(
			"Employee Onboarding Task",
			filters={"onboarding_request": self.name},
			fields=["status"],
		)
		if not tasks:
			self.progress = 0
			if self.status != "ملغي":
				self.status = "مفتوح"
			return

		total = len(tasks)
		completed = sum(1 for task in tasks if task.status == "مكتمل")
		in_progress = any(task.status == "قيد التنفيذ" for task in tasks)
		rejected = sum(1 for task in tasks if task.status == "مرفوض")

		self.progress = int((completed / total) * 100)
		if completed == total:
			self.status = "مكتمل"
		elif rejected == total:
			self.status = "ملغي"
		elif in_progress or completed:
			self.status = "قيد التنفيذ"
		else:
			self.status = "مفتوح"
