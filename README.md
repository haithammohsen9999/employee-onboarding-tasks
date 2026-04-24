# Employee Onboarding Tasks

Arabic Frappe / ERPNext v15 app to automate employee onboarding requests and task assignment across HR, finance, IT, fingerprint, custody, and other internal departments.

## GitHub Description

Use this as the repository short description on GitHub:

`Arabic Frappe/ERPNext v15 app for automated employee onboarding requests, task assignment, approvals, and department follow-up.`

## Features

- Automatic creation of one onboarding request per new employee
- Automatic creation of onboarding tasks from configurable templates
- Arabic workspace and dashboard for task follow-up
- Role-based visibility so each responsible user sees only their own tasks
- Task completion and rejection actions with audit fields
- Notification log entries for assigned users
- Configurable task message per template, copied into each generated task
- Built for Frappe / ERPNext v15

## Included DocTypes

- `Employee Onboarding Request`
- `Employee Onboarding Task`
- `Employee Onboarding Settings`
- `Employee Onboarding Task Template`

## Included Roles

- `مسؤول البصمة`
- `مسؤول المالية`
- `مسؤول العهدة`
- `مسؤول تقنية المعلومات`
- `مدير تجهيز الموظفين`

## Installation

### 1. Get the app

If the repository is hosted on GitHub:

```bash
bench get-app https://github.com/YOUR_USERNAME/employee_onboarding_tasks.git
```

Or if you want to install by repository name through bench shortcut:

```bash
bench get-app employee_onboarding_tasks https://github.com/YOUR_USERNAME/employee_onboarding_tasks.git
```

### 2. Install the app on your site

```bash
bench --site SITE_NAME install-app employee_onboarding_tasks
```

### 3. Run migrate and clear cache

```bash
bench --site SITE_NAME migrate
bench --site SITE_NAME clear-cache
```

## Configuration

After installation:

1. Open `إعدادات تجهيز الموظفين`
2. Add rows in `قوالب مهام تجهيز الموظفين`
3. For each row, define:
   - `مفعل`
   - `نوع المهمة`
   - `المستخدم المسؤول`
   - `الدور المسؤول`
   - `عدد الأيام بعد التعيين`
   - `رسالة للمسؤول`

Example task message:

`برجاء إضافة بصمة للموظف`

This message is copied automatically into the generated onboarding task and remains editable inside the task itself.

## How It Works

When a new `Employee` is created:

1. A single `Employee Onboarding Request` is created automatically
2. Employee master data is copied into the request
3. Active templates are loaded from `Employee Onboarding Settings`
4. One `Employee Onboarding Task` is created for each enabled template
5. Each assigned user receives a `Notification Log`
6. Each user sees only tasks assigned to them unless they are a manager

## Tracking and Follow-up

You can follow onboarding from:

- Workspace: `طلبات تجهيز الموظفين`
- Dashboard page: `/app/employee-onboarding-dashboard`
- List view: `Employee Onboarding Task`

## Permissions

- `System Manager` can access everything
- `مدير تجهيز الموظفين` can access and manage all requests and tasks
- Regular responsible users can access only tasks assigned to them
- Responsible users can update:
  - `status`
  - `remarks`
  - `attachment`
  - `task_message`

## Testing

Run tests with:

```bash
bench --site SITE_NAME run-tests --app employee_onboarding_tasks
```

## Suggested GitHub Topics

Use these as GitHub topics if you want:

- `frappe`
- `erpnext`
- `frappe-app`
- `erpnext-v15`
- `employee-onboarding`
- `hr-automation`
- `arabic`

## License

MIT
