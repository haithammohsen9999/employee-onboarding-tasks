frappe.pages["employee-onboarding-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("طلبات تجهيز الموظفين"),
		single_column: true,
	});

	page.body.html(getDashboardMarkup());
	$(wrapper).addClass("employee-onboarding-page");
	frappe.employee_onboarding_tasks = frappe.employee_onboarding_tasks || {};

	const refreshDashboard = () => {
		frappe.call({
			method: "employee_onboarding_tasks.api.get_dashboard_counts",
			callback: ({ message }) => {
				if (!message) return;
				$(wrapper).find("[data-kpi='pending']").text(message.pending || 0);
				$(wrapper).find("[data-kpi='in_progress']").text(message.in_progress || 0);
				$(wrapper).find("[data-kpi='completed']").text(message.completed || 0);
				$(wrapper).find("[data-kpi='rejected']").text(message.rejected || 0);
			},
		});

		frappe.call({
			method: "employee_onboarding_tasks.api.get_my_tasks",
			callback: ({ message }) => renderTasks(wrapper, message || []),
		});
	};
	frappe.employee_onboarding_tasks.refresh = refreshDashboard;

	page.set_primary_action(__("تحديث"), refreshDashboard);
	page.add_inner_button(__("عرض كل المهام"), () => {
		frappe.set_route("List", "Employee Onboarding Task");
	});

	refreshDashboard();
};

frappe.pages["employee-onboarding-dashboard"].refresh = function () {
	if (frappe.employee_onboarding_tasks && frappe.employee_onboarding_tasks.refresh) {
		frappe.employee_onboarding_tasks.refresh();
	}
};

function getDashboardMarkup() {
	return `
		<div class="employee-onboarding-dashboard" dir="rtl">
			<div class="onboarding-kpis row">
				<div class="col-md-3 col-sm-6">
					<div class="onboarding-card">
						<div class="label">الطلبات المعلقة</div>
						<div class="value" data-kpi="pending">0</div>
					</div>
				</div>
				<div class="col-md-3 col-sm-6">
					<div class="onboarding-card">
						<div class="label">قيد التنفيذ</div>
						<div class="value" data-kpi="in_progress">0</div>
					</div>
				</div>
				<div class="col-md-3 col-sm-6">
					<div class="onboarding-card">
						<div class="label">المكتملة</div>
						<div class="value" data-kpi="completed">0</div>
					</div>
				</div>
				<div class="col-md-3 col-sm-6">
					<div class="onboarding-card">
						<div class="label">المرفوضة</div>
						<div class="value" data-kpi="rejected">0</div>
					</div>
				</div>
			</div>
			<div class="onboarding-table-card">
				<div class="section-title">طلباتي</div>
				<div class="table-responsive">
					<table class="table table-bordered">
						<thead>
							<tr>
								<th>اسم الموظف</th>
								<th>نوع الطلب</th>
								<th>الفرع</th>
								<th>القسم</th>
								<th>تاريخ الاستحقاق</th>
								<th>الحالة</th>
								<th>إجراءات</th>
							</tr>
						</thead>
						<tbody data-tasks-body>
							<tr>
								<td colspan="7" class="text-center text-muted">لا توجد مهام حالياً</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
}

function renderTasks(wrapper, tasks) {
	const body = $(wrapper).find("[data-tasks-body]");
	body.empty();

	if (!tasks.length) {
		body.append(
			`<tr><td colspan="7" class="text-center text-muted">${__("لا توجد مهام حالياً")}</td></tr>`
		);
		return;
	}

	tasks.forEach((task) => {
		const row = $(`
			<tr>
				<td><a class="task-link">${frappe.utils.escape_html(task.employee_name || "")}</a></td>
				<td>${frappe.utils.escape_html(task.task_type || "")}</td>
				<td>${frappe.utils.escape_html(task.branch || "-")}</td>
				<td>${frappe.utils.escape_html(task.department || "-")}</td>
				<td>${frappe.datetime.str_to_user(task.due_date || "") || "-"}</td>
				<td><span class="indicator-pill ${indicatorClass(task.status)}">${frappe.utils.escape_html(task.status || "")}</span></td>
				<td class="actions-cell"></td>
			</tr>
		`);

		row.find(".task-link").on("click", () => {
			frappe.set_route("Form", "Employee Onboarding Task", task.name);
		});

		const actionsCell = row.find(".actions-cell");
		addActionButton(actionsCell, "بدء", "btn-primary", () => runTaskAction("mark_task_in_progress", task.name));
		addActionButton(actionsCell, "إكمال", "btn-success", () => {
			frappe.prompt(
				[
					{
						fieldname: "remarks",
						fieldtype: "Small Text",
						label: __("ملاحظات الإكمال"),
					},
				],
				(values) => runTaskAction("complete_task", task.name, { remarks: values.remarks }),
				__("إكمال المهمة"),
				__("تنفيذ")
			);
		});
		addActionButton(actionsCell, "رفض", "btn-danger", () => {
			frappe.prompt(
				[
					{
						fieldname: "remarks",
						fieldtype: "Small Text",
						label: __("سبب الرفض"),
						reqd: 1,
					},
				],
				(values) => runTaskAction("reject_task", task.name, { remarks: values.remarks }),
				__("رفض المهمة"),
				__("رفض")
			);
		});

		body.append(row);
	});
}

function addActionButton(container, label, cssClass, handler) {
	$(`<button class="btn btn-xs ${cssClass} action-btn">${__(label)}</button>`).on("click", handler).appendTo(container);
}

function runTaskAction(methodName, taskName, extraArgs = {}) {
	frappe.call({
		method: `employee_onboarding_tasks.api.${methodName}`,
		args: { task_name: taskName, ...extraArgs },
		freeze: true,
		freeze_message: __("جاري تنفيذ الطلب..."),
		callback: () => {
			frappe.show_alert({ message: __("تم تحديث المهمة بنجاح"), indicator: "green" });
			if (frappe.employee_onboarding_tasks && frappe.employee_onboarding_tasks.refresh) {
				frappe.employee_onboarding_tasks.refresh();
			}
		},
	});
}

function indicatorClass(status) {
	return {
		"معلق": "orange",
		"قيد التنفيذ": "blue",
		"مكتمل": "green",
		"مرفوض": "red",
	}[status] || "gray";
}
