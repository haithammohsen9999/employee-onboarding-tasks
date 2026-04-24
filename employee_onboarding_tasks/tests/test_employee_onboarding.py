import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, getdate, today

from employee_onboarding_tasks.api import complete_task, get_my_tasks
from employee_onboarding_tasks.install import before_tests
import erpnext
from erpnext.setup.doctype.designation.test_designation import create_designation
from erpnext.setup.doctype.employee.test_employee import make_employee
from hrms.tests.test_utils import before_tests as hrms_before_tests


class TestEmployeeOnboarding(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		hrms_before_tests()
		before_tests()
		cls.company = erpnext.get_default_company() or frappe.get_all("Company", pluck="name")[0]
		cls.department = cls.ensure_department("Onboarding Department", cls.company)
		cls.manager_user = cls.ensure_user("onboarding_manager@example.com", ["مدير تجهيز الموظفين"])
		cls.fingerprint_user = cls.ensure_user("fingerprint_owner@example.com", ["مسؤول البصمة"])
		cls.finance_user = cls.ensure_user("finance_owner@example.com", ["مسؤول المالية"])
		cls.configure_templates()
		frappe.db.commit()

	@classmethod
	def ensure_user(cls, email, roles):
		if frappe.db.exists("User", email):
			user = frappe.get_doc("User", email)
		else:
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": email,
					"first_name": email.split("@")[0],
					"new_password": "password",
					"send_welcome_email": 0,
				}
			).insert(ignore_permissions=True)

		existing_roles = {row.role for row in user.roles}
		changed = False
		for role in roles:
			if role not in existing_roles:
				user.append("roles", {"role": role})
				changed = True
		if changed:
			user.save(ignore_permissions=True)

		return user.name

	@classmethod
	def configure_templates(cls):
		settings = frappe.get_single("Employee Onboarding Settings")
		settings.task_templates = []
		settings.append(
			"task_templates",
			{
				"enabled": 1,
				"task_type": "البصمة",
				"assigned_to": cls.fingerprint_user,
				"assigned_role": "مسؤول البصمة",
				"due_after_days": 1,
			},
		)
		settings.append(
			"task_templates",
			{
				"enabled": 1,
				"task_type": "المالية",
				"assigned_to": cls.finance_user,
				"assigned_role": "مسؤول المالية",
				"due_after_days": 2,
			},
		)
		settings.save(ignore_permissions=True)

	@classmethod
	def ensure_department(cls, department_name, company):
		existing = frappe.db.get_value("Department", {"department_name": department_name, "company": company}, "name")
		if existing:
			return existing

		return frappe.get_doc(
			{
				"doctype": "Department",
				"department_name": department_name,
				"company": company,
			}
		).insert(ignore_permissions=True).name

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def make_test_employee(self, email):
		designation = create_designation().name
		self.department = self.ensure_department("Onboarding Department", self.company)
		return make_employee(
			email,
			company=self.company,
			department=self.department,
			date_of_joining=today(),
			designation=designation,
		)

	def test_employee_creation_generates_request_and_tasks(self):
		employee_name = self.make_test_employee("employee_onboarding_1@example.com")

		request_name = frappe.db.get_value("Employee Onboarding Request", {"employee": employee_name}, "name")
		self.assertTrue(request_name)

		request_doc = frappe.get_doc("Employee Onboarding Request", request_name)
		self.assertEqual(request_doc.employee, employee_name)
		self.assertEqual(request_doc.status, "مفتوح")

		tasks = frappe.get_all(
			"Employee Onboarding Task",
			filters={"onboarding_request": request_name},
			fields=["task_type", "assigned_to", "due_date"],
		)
		self.assertEqual(len(tasks), 2)
		task_map = {task.task_type: task for task in tasks}
		self.assertEqual(task_map["البصمة"].due_date, getdate(add_days(today(), 1)))
		self.assertEqual(task_map["المالية"].due_date, getdate(add_days(today(), 2)))

	def test_user_sees_only_assigned_tasks(self):
		self.make_test_employee("employee_onboarding_2@example.com")

		frappe.set_user(self.fingerprint_user)
		my_tasks = get_my_tasks()
		self.assertTrue(my_tasks)
		self.assertTrue(all(task["assigned_to"] == self.fingerprint_user for task in my_tasks))

	def test_complete_task_sets_completed_fields(self):
		self.make_test_employee("employee_onboarding_3@example.com")
		task_name = frappe.db.get_value(
			"Employee Onboarding Task", {"assigned_to": self.finance_user, "task_type": "المالية"}, "name"
		)

		frappe.set_user(self.finance_user)
		complete_task(task_name, remarks="تم تسليم العهدة المالية")

		task = frappe.get_doc("Employee Onboarding Task", task_name)
		self.assertEqual(task.status, "مكتمل")
		self.assertEqual(task.completed_by, self.finance_user)
		self.assertIsNotNone(task.completed_on)

	def test_prevent_duplicate_request(self):
		employee_name = self.make_test_employee("employee_onboarding_4@example.com")
		from employee_onboarding_tasks.employee_onboarding_tasks.events.employee import create_onboarding_request

		employee = frappe.get_doc("Employee", employee_name)
		create_onboarding_request(employee, None)

		self.assertEqual(frappe.db.count("Employee Onboarding Request", {"employee": employee_name}), 1)
