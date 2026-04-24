frappe.listview_settings["Employee Onboarding Task"] = {
	get_indicator(doc) {
		const colors = {
			"معلق": "orange",
			"قيد التنفيذ": "blue",
			"مكتمل": "green",
			"مرفوض": "red",
		};
		return [__(doc.status), colors[doc.status] || "gray", `status,=,${doc.status}`];
	},
	onload(listview) {
		const roles = frappe.user_roles || [];
		const isManager =
			roles.includes("System Manager") || roles.includes("مدير تجهيز الموظفين");

		if (!isManager && !frappe.route_options) {
			frappe.route_options = {
				assigned_to: frappe.session.user,
			};
			listview.refresh();
		}
	},
};
