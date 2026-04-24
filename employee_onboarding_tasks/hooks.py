app_name = "employee_onboarding_tasks"
app_title = "Employee Onboarding Tasks"
app_publisher = "Your Name"
app_description = "Arabic employee onboarding tasks automation"
app_email = "support@example.com"
app_license = "mit"

required_apps = ["hrms"]

app_include_css = "/assets/employee_onboarding_tasks/css/employee_onboarding_tasks.css"

doctype_js = {
	"Employee Onboarding Task": "public/js/employee_onboarding_task.js",
}

doctype_list_js = {
	"Employee Onboarding Task": "public/js/employee_onboarding_task_list.js",
}

after_install = "employee_onboarding_tasks.install.after_install"
after_migrate = "employee_onboarding_tasks.install.after_migrate"
before_tests = "employee_onboarding_tasks.install.before_tests"

fixtures = [
	{
		"dt": "Role",
		"filters": [
			[
				"name",
				"in",
				[
					"مسؤول البصمة",
					"مسؤول المالية",
					"مسؤول العهدة",
					"مسؤول تقنية المعلومات",
					"مدير تجهيز الموظفين",
				],
			]
		],
	}
]

permission_query_conditions = {
	"Employee Onboarding Task": "employee_onboarding_tasks.permissions.task_permission_query_conditions",
}

has_permission = {
	"Employee Onboarding Task": "employee_onboarding_tasks.permissions.task_has_permission",
}

doc_events = {
	"Employee": {
		"after_insert": "employee_onboarding_tasks.employee_onboarding_tasks.events.employee.create_onboarding_request"
	}
}
