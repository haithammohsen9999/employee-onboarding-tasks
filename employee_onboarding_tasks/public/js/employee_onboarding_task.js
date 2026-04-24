frappe.ui.form.on("Employee Onboarding Task", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("فتح طلب التجهيز"), () => {
				frappe.set_route("Form", "Employee Onboarding Request", frm.doc.onboarding_request);
			});
		}
	},
});
