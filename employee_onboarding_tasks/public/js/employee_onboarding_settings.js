(() => {
	if (window.__eot_settings_designer_loaded) {
		return;
	}

	window.__eot_settings_designer_loaded = true;

	const EOT_SETTINGS_DOCTYPE = "Employee Onboarding Settings";
	const EOT_TEMPLATE_DOCTYPE = "Employee Onboarding Task Template";
	const EOT_TABLE_FIELDNAME = "task_templates";

	const EOT_TEMPLATE_FIELDS = [
		"enabled",
		"task_type",
		"assigned_to",
		"assigned_role",
		"allowed_department",
		"due_after_days",
		"task_message",
	];

	const EOT_DEFAULT_TASK_TYPES = ["البصمة", "المالية", "العهدة", "تقنية المعلومات", "الكشف الطبي", "أخرى"];

	const EOT_EDITOR_DEFAULTS = {
		enabled: 1,
		task_type: "",
		assigned_to: "",
		assigned_role: "",
		due_after_days: 1,
		task_message: "",
		departments: [],
	};

	const EOT_TASK_TONES = {
		البصمة: "emerald",
		المالية: "amber",
		العهدة: "coral",
		"تقنية المعلومات": "sky",
		"الكشف الطبي": "violet",
		أخرى: "slate",
	};

	let eotRouteWatcherBound = false;
	let eotIntervalWatcherBound = false;

	frappe.ui.form.on(EOT_SETTINGS_DOCTYPE, {
		setup(frm) {
			frm.__eot_show_legacy_grid = false;
			frm.__eot_editor_row_name = null;
			frm.__eot_editor_initialized = false;
			frm.__eot_editor_doc = frm.__eot_editor_doc || {};
			Object.assign(frm.__eot_editor_doc, EOT_EDITOR_DEFAULTS);
			prefetchDepartmentOptions(frm);
		},

		refresh(frm) {
			initializeSettingsDesigner(frm);
		},
	});

	bootstrapSettingsDesigner();

	function initializeSettingsDesigner(frm) {
		if (!isTargetForm(frm)) {
			return;
		}

		frm.page.main.addClass("employee-onboarding-settings-page");

		const tableWrapper = resolveTableWrapper(frm);
		if (tableWrapper?.length) {
			tableWrapper.addClass("employee-onboarding-settings-legacy-grid");
			frm.__eot_table_wrapper = tableWrapper;
		}

		ensureDesignerShell(frm);
		ensureEditorControls(frm);
		syncDepartmentOptionsToControl(frm);

		if (!frm.__eot_editor_initialized) {
			resetEditorForm(frm);
			frm.__eot_editor_initialized = true;
		}

		updateLegacyGridVisibility(frm);
		renderSettingsDesigner(frm);
	}

	function isTargetForm(frm) {
		return Boolean(frm && frm.doctype === EOT_SETTINGS_DOCTYPE);
	}

	function ensureDesignerShell(frm) {
		if (frm.__eot_designer_wrapper) {
			return;
		}

		frm.__eot_designer_wrapper = $(`
			<section class="eot-studio-shell">
				<div class="eot-studio-hero" data-region="hero"></div>
				<div class="eot-studio-metrics" data-region="metrics"></div>
				<div class="eot-studio-workspace">
					<section class="eot-studio-panel eot-studio-panel--editor">
						<div class="eot-panel-head" data-region="editor_header"></div>
						<div class="eot-editor-form" data-region="editor_form"></div>
						<div class="eot-editor-toolbar" data-region="editor_toolbar"></div>
						<div class="eot-editor-preview" data-region="editor_preview"></div>
						<div class="eot-editor-actions" data-region="editor_actions"></div>
					</section>
					<aside class="eot-studio-panel eot-studio-panel--insights" data-region="insights"></aside>
				</div>
				<section class="eot-studio-board" data-region="board"></section>
			</section>
		`);

		getDesignerMountPoint(frm).prepend(frm.__eot_designer_wrapper);

		frm.__eot_designer_wrapper.on("click", "[data-action]", (event) => {
			const button = $(event.currentTarget);
			handleDesignerAction(frm, button.data("action"), button.data("row"));
		});

		frm.__eot_regions = {
			hero: frm.__eot_designer_wrapper.find('[data-region="hero"]'),
			metrics: frm.__eot_designer_wrapper.find('[data-region="metrics"]'),
			editor_header: frm.__eot_designer_wrapper.find('[data-region="editor_header"]'),
			editor_form: frm.__eot_designer_wrapper.find('[data-region="editor_form"]'),
			editor_toolbar: frm.__eot_designer_wrapper.find('[data-region="editor_toolbar"]'),
			editor_preview: frm.__eot_designer_wrapper.find('[data-region="editor_preview"]'),
			editor_actions: frm.__eot_designer_wrapper.find('[data-region="editor_actions"]'),
			insights: frm.__eot_designer_wrapper.find('[data-region="insights"]'),
			board: frm.__eot_designer_wrapper.find('[data-region="board"]'),
		};
	}

	function ensureEditorControls(frm) {
		if (frm.__eot_editor_controls) {
			return;
		}

		frm.__eot_regions.editor_form.html(`
			<div class="eot-editor-grid">
				<div class="eot-field-slot eot-field-slot--compact" data-field="enabled"></div>
				<div class="eot-field-slot" data-field="task_type"></div>
				<div class="eot-field-slot" data-field="assigned_to"></div>
				<div class="eot-field-slot" data-field="assigned_role"></div>
				<div class="eot-field-slot" data-field="due_after_days"></div>
				<div class="eot-field-slot eot-field-slot--wide" data-field="departments"></div>
				<div class="eot-field-slot eot-field-slot--wide" data-field="task_message"></div>
			</div>
		`);

		frm.__eot_editor_controls = {};
		const specs = [
			{
				fieldname: "enabled",
				fieldtype: "Check",
				label: __("تفعيل القالب"),
				description: __("يمكنك إيقاف القالب مؤقتًا بدون حذفه."),
			},
			{
				fieldname: "task_type",
				fieldtype: "Select",
				label: __("نوع المهمة"),
				reqd: 1,
				options: getTaskTypeOptions().join("\n"),
				description: __("مثال: البصمة أو المالية أو تقنية المعلومات."),
			},
			{
				fieldname: "assigned_to",
				fieldtype: "Link",
				label: __("المستخدم المسؤول"),
				options: "User",
				reqd: 1,
				description: __("سيتم إسناد المهمة لهذا المستخدم عند إنشاء طلب التجهيز."),
			},
			{
				fieldname: "assigned_role",
				fieldtype: "Link",
				label: __("الدور المسؤول"),
				options: "Role",
				description: __("اختياري لعرض الدور المسؤول عن هذه المهمة."),
			},
			{
				fieldname: "due_after_days",
				fieldtype: "Int",
				label: __("عدد الأيام بعد التعيين"),
				description: __("0 يعني إنشاء المهمة في نفس يوم التعيين."),
			},
			{
				fieldname: "departments",
				fieldtype: "MultiSelectPills",
				label: __("الأقسام المستهدفة"),
				description: __(
					"ابدأ بالكتابة ثم اختر قسمًا أو أكثر. عند ترك هذا الحقل فارغًا، سيُطبّق القالب على جميع الأقسام."
				),
				get_data(txt) {
					return getDepartmentSearchResults(frm, txt);
				},
			},
			{
				fieldname: "task_message",
				fieldtype: "Small Text",
				label: __("تعليمات للمسؤول"),
				description: __("رسالة اختيارية تظهر داخل المهمة لتوضيح المطلوب."),
			},
		];

		specs.forEach((spec) => {
			const slot = frm.__eot_regions.editor_form.find(`[data-field="${spec.fieldname}"]`).get(0);
			const control = frappe.ui.form.make_control({
				parent: slot,
				render_input: true,
				doc: frm.__eot_editor_doc,
				df: {
					fieldname: spec.fieldname,
					fieldtype: spec.fieldtype,
					label: spec.label,
					description: spec.description,
					options: spec.options,
					reqd: spec.reqd,
					get_data: spec.get_data,
					change() {
						if (frm.__eot_applying_editor_values) {
							return;
						}

						renderSettingsDesigner(frm);
					},
				},
			});

			control.refresh();
			frm.__eot_editor_controls[spec.fieldname] = control;
		});

		prefetchDepartmentOptions(frm).then(() => {
			syncDepartmentOptionsToControl(frm);
			renderSettingsDesigner(frm);
		});
	}

	function handleDesignerAction(frm, action, rowName) {
		switch (action) {
			case "new-template":
				resetEditorForm(frm, true);
				return;
			case "save-editor":
				saveEditorTemplate(frm);
				return;
			case "reset-editor":
				resetEditorForm(frm, true);
				return;
			case "select-all-departments":
				prefetchDepartmentOptions(frm).then((options) => {
					setEditorDepartments(
						frm,
						options.map((option) => option.value)
					);
				});
				return;
			case "clear-departments":
				setEditorDepartments(frm, []);
				return;
			case "edit":
				loadRowIntoEditor(frm, rowName);
				return;
			case "focus-departments":
				loadRowIntoEditor(frm, rowName, { focus_departments: true });
				return;
			case "duplicate":
				duplicateTemplateRow(frm, rowName);
				return;
			case "delete":
				deleteTemplateRow(frm, rowName);
				return;
			case "toggle-enabled":
				toggleTemplateEnabled(frm, rowName);
				return;
			case "toggle-grid":
				frm.__eot_show_legacy_grid = !frm.__eot_show_legacy_grid;
				updateLegacyGridVisibility(frm);
				renderSettingsDesigner(frm);
				return;
			default:
				return;
		}
	}

	function renderSettingsDesigner(frm) {
		if (!frm.__eot_regions) {
			return;
		}

		const templates = getTemplateRows(frm);
		const stats = buildTemplateStats(templates);
		const editorState = getEditorState(frm);
		const isEditing = Boolean(frm.__eot_editor_row_name);
		const legacyToggleLabel = frm.__eot_show_legacy_grid ? __("إخفاء الجدول الخام") : __("عرض الجدول الخام");

		frm.__eot_regions.hero.html(renderHero(editorState, stats, legacyToggleLabel, isEditing));
		frm.__eot_regions.metrics.html(renderMetrics(stats));
		frm.__eot_regions.editor_header.html(renderEditorHeader(editorState, isEditing));
		frm.__eot_regions.editor_toolbar.html(renderEditorToolbar(editorState));
		frm.__eot_regions.editor_preview.html(renderEditorPreview(frm, editorState));
		frm.__eot_regions.editor_actions.html(renderEditorActions(isEditing));
		frm.__eot_regions.insights.html(renderInsightsPanel(frm, editorState, stats, templates));
		frm.__eot_regions.board.html(renderTemplateBoard(frm, templates, stats));
	}

	function renderHero(editorState, stats, legacyToggleLabel, isEditing) {
		const selectedDepartments = editorState.departments.length;
		const scopeLabel = selectedDepartments
			? __("{0} أقسام محددة", [selectedDepartments])
			: __("كل الأقسام");

		return `
			<div class="eot-hero-copy">
				<div class="eot-kicker">${escapeHtml(__("مصمم قواعد تجهيز الموظفين"))}</div>
				<h3>${escapeHtml(__("اختر نوع المهمة وحدد الأقسام التي تُنشأ لها الطلبات فقط"))}</h3>
				<p>
					${escapeHtml(
						__(
							"هذه الشاشة الجديدة تجمع بين اختيار نوع المهمة، المسؤول، والأقسام المستهدفة داخل محرر واحد واضح وسريع، مع معاينة مباشرة قبل الحفظ."
						)
					)}
				</p>
				<div class="eot-hero-tags">
					${renderTag(__("قالب واحد = مهمة واحدة"))}
					${renderTag(__("اختيار متعدد للأقسام"))}
					${renderTag(__("{0} قوالب مفعلة الآن", [stats.enabled_templates]))}
				</div>
			</div>
			<div class="eot-hero-side">
				<div class="eot-hero-spotlight">
					<div class="eot-hero-spotlight__label">${escapeHtml(__("نطاق القالب الحالي"))}</div>
					<div class="eot-hero-spotlight__value">${escapeHtml(scopeLabel)}</div>
					<div class="eot-hero-spotlight__note">
						${escapeHtml(
							isEditing
								? __("أنت تعدل قالبًا موجودًا ويمكنك حفظ التعديلات مباشرة.")
								: __("ابدأ بقالب جديد وحدد له المهمة والأقسام المناسبة.")
						)}
					</div>
				</div>
				<div class="eot-hero-actions">
					<button type="button" class="btn btn-primary" data-action="new-template">
						${escapeHtml(__("قالب جديد"))}
					</button>
					<button type="button" class="btn btn-default" data-action="toggle-grid">
						${escapeHtml(legacyToggleLabel)}
					</button>
				</div>
			</div>
		`;
	}

	function renderTag(label) {
		return `<span class="eot-hero-tag">${escapeHtml(label)}</span>`;
	}

	function renderMetrics(stats) {
		return [
			renderMetricCard(__("إجمالي القوالب"), stats.total_templates, "sand"),
			renderMetricCard(__("القوالب المفعلة"), stats.enabled_templates, "emerald"),
			renderMetricCard(__("القوالب المقيدة بأقسام"), stats.restricted_templates, "sky"),
			renderMetricCard(__("إجمالي الأقسام المستخدمة"), stats.targeted_departments, "ink"),
		].join("");
	}

	function renderMetricCard(label, value, tone) {
		return `
			<article class="eot-metric-card eot-metric-card--${tone}">
				<div class="eot-metric-card__label">${escapeHtml(label)}</div>
				<div class="eot-metric-card__value">${escapeHtml(String(value))}</div>
			</article>
		`;
	}

	function renderEditorHeader(editorState, isEditing) {
		return `
			<div class="eot-panel-kicker">${escapeHtml(isEditing ? __("وضع التعديل") : __("محرر القالب"))}</div>
			<div class="eot-panel-title">${escapeHtml(
				isEditing ? __("تحديث القالب الحالي") : __("إضافة قاعدة تجهيز جديدة")
			)}</div>
			<p class="eot-panel-subtitle">
				${escapeHtml(
					editorState.task_type
						? __(
							"نوع المهمة الحالي هو {0}. يمكنك الآن تحديد المسؤول ونطاق الأقسام ثم حفظ القاعدة.",
							[editorState.task_type]
						)
						: __("اختر نوع المهمة، المستخدم المسؤول، ثم حدد الأقسام التي ستنشأ لها الطلبات.")
				)}
			</p>
		`;
	}

	function renderEditorToolbar(editorState) {
		const selectedDepartments = editorState.departments.length;
		const scopeText = selectedDepartments
			? __("{0} أقسام مختارة", [selectedDepartments])
			: __("بدون تقييد أقسام");

		return `
			<div class="eot-toolbar-strip">
				<div class="eot-toolbar-actions">
					<button type="button" class="btn btn-default btn-sm" data-action="select-all-departments">
						${escapeHtml(__("اختيار كل الأقسام"))}
					</button>
					<button type="button" class="btn btn-default btn-sm" data-action="clear-departments">
						${escapeHtml(__("تطبيق على كل الأقسام"))}
					</button>
				</div>
				<div class="eot-toolbar-note">${escapeHtml(scopeText)}</div>
			</div>
		`;
	}

	function renderEditorPreview(frm, editorState) {
		const departmentLabels = getDepartmentLabels(frm, editorState.departments);
		const tone = getTaskTone(editorState.task_type);
		const message = String(editorState.task_message || "").trim();
		const isEnabled = isEnabledFlag(editorState.enabled);

		return `
			<div class="eot-preview-card eot-tone--${tone}">
				<div class="eot-preview-card__head">
					<div>
						<div class="eot-preview-eyebrow">${escapeHtml(__("معاينة مباشرة قبل الحفظ"))}</div>
						<h4>${escapeHtml(editorState.task_type || __("اختر نوع المهمة"))}</h4>
					</div>
					<span class="eot-state-chip ${isEnabled ? "is-enabled" : "is-disabled"}">
						${escapeHtml(isEnabled ? __("نشط") : __("متوقف"))}
					</span>
				</div>
				<div class="eot-fact-grid">
					${renderFactItem(__("المستخدم المسؤول"), editorState.assigned_to || __("غير محدد"))}
					${renderFactItem(__("الدور"), editorState.assigned_role || __("اختياري"))}
					${renderFactItem(
						__("ينشأ بعد"),
						__("{0} يوم", [Number.parseInt(editorState.due_after_days, 10) || 0])
					)}
				</div>
				<div class="eot-preview-block">
					<div class="eot-preview-block__label">${escapeHtml(__("الأقسام المستهدفة"))}</div>
					<div class="eot-chip-cluster">${renderDepartmentChips(departmentLabels)}</div>
				</div>
				<div class="eot-preview-block">
					<div class="eot-preview-block__label">${escapeHtml(__("رسالة المهمة"))}</div>
					<div class="eot-preview-copy">
						${escapeHtml(message || __("لا توجد رسالة إضافية، ويمكن ترك هذا الحقل فارغًا."))}
					</div>
				</div>
			</div>
		`;
	}

	function renderFactItem(label, value) {
		return `
			<div class="eot-fact-item">
				<div class="eot-fact-item__label">${escapeHtml(label)}</div>
				<div class="eot-fact-item__value">${escapeHtml(String(value || ""))}</div>
			</div>
		`;
	}

	function renderEditorActions(isEditing) {
		return `
			<button type="button" class="btn btn-primary" data-action="save-editor">
				${escapeHtml(isEditing ? __("حفظ التعديلات") : __("إضافة القالب"))}
			</button>
			<button type="button" class="btn btn-default" data-action="reset-editor">
				${escapeHtml(isEditing ? __("إلغاء التعديل") : __("مسح الحقول"))}
			</button>
		`;
	}

	function renderInsightsPanel(frm, editorState, stats, templates) {
		const selectedDepartments = getDepartmentLabels(frm, editorState.departments);
		const relatedTemplates = templates.filter(
			(row) => row.task_type && editorState.task_type && row.task_type === editorState.task_type && row.name !== frm.__eot_editor_row_name
		);

		let noteTone = "neutral";
		let noteText = __("ابدأ بتحديد نوع المهمة ثم اختر الأقسام التي ستنشأ لها هذه المهمة.");

		if (!editorState.task_type) {
			noteTone = "warning";
			noteText = __("نوع المهمة هو نقطة البداية. حدده أولاً ليظهر القالب بشكل واضح داخل اللوحة.");
		} else if (!editorState.assigned_to) {
			noteTone = "warning";
			noteText = __("حدد المستخدم المسؤول لأن المهام المنشأة ستُسند إليه مباشرة.");
		} else if (!selectedDepartments.length) {
			noteTone = "info";
			noteText = __("لا يوجد تقييد أقسام الآن، لذلك سيُطبَّق هذا القالب على جميع الموظفين الجدد.");
		} else if (relatedTemplates.length) {
			noteTone = "info";
			noteText = __(
				"يوجد {0} قوالب أخرى بنفس نوع المهمة، فراجعها لتفادي التكرار غير المقصود داخل نفس الأقسام.",
				[relatedTemplates.length]
			);
		} else {
			noteTone = "success";
			noteText = __("المعطيات الحالية متناسقة، ويمكنك الحفظ لإنشاء قاعدة تجهيز جديدة.");
		}

		return `
			<div class="eot-panel-kicker">${escapeHtml(__("ملخص التشغيل"))}</div>
			<div class="eot-panel-title eot-panel-title--small">${escapeHtml(__("كيف ستعمل القاعدة الحالية؟"))}</div>
			<div class="eot-insight-list">
				${renderInsightRow(__("نوع المهمة"), editorState.task_type || __("غير محدد"))}
				${renderInsightRow(__("نطاق الأقسام"), selectedDepartments.length ? selectedDepartments.join("، ") : __("كل الأقسام"))}
				${renderInsightRow(__("القوالب المفعلة"), __("{0} من {1}", [stats.enabled_templates, stats.total_templates]))}
				${renderInsightRow(__("المستخدمون المسؤولون"), __("{0} مستخدم", [stats.unique_assignees]))}
			</div>
			<div class="eot-insight-callout is-${noteTone}">
				${escapeHtml(noteText)}
			</div>
			<div class="eot-insight-footer">
				<div class="eot-preview-block__label">${escapeHtml(__("الأقسام المختارة الآن"))}</div>
				<div class="eot-chip-cluster">${renderDepartmentChips(selectedDepartments, { limit: 6 })}</div>
			</div>
		`;
	}

	function renderInsightRow(label, value) {
		return `
			<div class="eot-insight-row">
				<span>${escapeHtml(label)}</span>
				<strong>${escapeHtml(String(value || ""))}</strong>
			</div>
		`;
	}

	function renderTemplateBoard(frm, templates, stats) {
		return `
			<div class="eot-board-head">
				<div>
					<div class="eot-panel-kicker">${escapeHtml(__("لوحة القوالب"))}</div>
					<div class="eot-panel-title eot-panel-title--small">${escapeHtml(__("جميع قواعد إنشاء مهام تجهيز الموظفين"))}</div>
					<p class="eot-panel-subtitle">
						${escapeHtml(
							__(
								"كل بطاقة أدناه تمثل مهمة تُنشأ تلقائيًا عند انضمام موظف جديد إذا كان داخل الأقسام المطابقة لهذا القالب."
							)
						)}
					</p>
				</div>
				<div class="eot-board-summary">
						${escapeHtml(
							stats.restricted_templates
								? __("{0} قوالب مرتبطة بأقسام محددة", [stats.restricted_templates])
								: __("لا توجد قيود أقسام محفوظة حتى الآن")
						)}
					</div>
				</div>
			${
				templates.length
					? `<div class="eot-template-board-grid">${templates
							.map((row) => renderTemplateCard(frm, row))
							.join("")}</div>`
					: renderEmptyState()
			}
		`;
	}

	function renderTemplateCard(frm, row) {
		const departmentLabels = getDepartmentLabels(frm, row.allowed_department);
		const message = String(row.task_message || "").trim();
		const isEnabled = isEnabledFlag(row.enabled);
		const tone = getTaskTone(row.task_type);

		return `
			<article class="eot-template-card eot-tone--${tone} ${isEnabled ? "" : "is-disabled"}">
				<div class="eot-template-card__stripe"></div>
				<div class="eot-template-card__head">
					<div class="eot-template-card__badge">${escapeHtml(__("قالب رقم {0}", [row.idx || 0]))}</div>
					<span class="eot-state-chip ${isEnabled ? "is-enabled" : "is-disabled"}">
						${escapeHtml(isEnabled ? __("مفعل") : __("غير مفعل"))}
					</span>
				</div>
				<h4>${escapeHtml(row.task_type || __("بدون نوع مهمة"))}</h4>
				<p class="eot-template-card__summary">
						${escapeHtml(
							departmentLabels.length
								? __("{0} أقسام مرتبطة بهذا القالب", [departmentLabels.length])
								: __("هذا القالب يعمل على جميع الأقسام")
						)}
					</p>
				<div class="eot-fact-grid">
					${renderFactItem(__("المستخدم"), row.assigned_to || __("غير محدد"))}
					${renderFactItem(__("الدور"), row.assigned_role || __("اختياري"))}
					${renderFactItem(
						__("بعد التعيين"),
						__("{0} يوم", [Number.parseInt(row.due_after_days, 10) || 0])
					)}
				</div>
				<div class="eot-preview-block">
					<div class="eot-preview-block__label">${escapeHtml(__("الأقسام"))}</div>
					<div class="eot-chip-cluster">${renderDepartmentChips(departmentLabels, { limit: 5 })}</div>
				</div>
				${
					message
						? `
					<div class="eot-template-card__message">${escapeHtml(message)}</div>
				`
						: ""
				}
				<div class="eot-template-card__actions">
					<button type="button" class="btn btn-default btn-sm" data-action="edit" data-row="${escapeHtml(
						row.name
					)}">
						${escapeHtml(__("تعديل"))}
					</button>
					<button type="button" class="btn btn-default btn-sm" data-action="focus-departments" data-row="${escapeHtml(
						row.name
					)}">
						${escapeHtml(__("الأقسام"))}
					</button>
					<button type="button" class="btn btn-default btn-sm" data-action="duplicate" data-row="${escapeHtml(
						row.name
					)}">
						${escapeHtml(__("نسخ"))}
					</button>
					<button type="button" class="btn btn-default btn-sm" data-action="toggle-enabled" data-row="${escapeHtml(
						row.name
					)}">
						${escapeHtml(isEnabled ? __("تعطيل") : __("تفعيل"))}
					</button>
					<button type="button" class="btn btn-default btn-sm eot-danger-btn" data-action="delete" data-row="${escapeHtml(
						row.name
					)}">
						${escapeHtml(__("حذف"))}
					</button>
				</div>
			</article>
		`;
	}

	function renderEmptyState() {
		return `
			<div class="eot-empty-state">
				<div class="eot-empty-state__title">${escapeHtml(__("ابدأ بأول قاعدة تجهيز"))}</div>
				<div class="eot-empty-state__text">
					${escapeHtml(
						__(
							"حدد نوع المهمة ثم اختر قسمًا أو أكثر، وسيتم إنشاء الطلبات للموظفين داخل هذه الأقسام فقط بشكل تلقائي."
						)
					)}
				</div>
				<button type="button" class="btn btn-primary" data-action="new-template">
					${escapeHtml(__("إضافة أول قالب"))}
				</button>
			</div>
		`;
	}

	function renderDepartmentChips(labels, options = {}) {
		if (!labels.length) {
			return `<span class="eot-chip eot-chip--all">${escapeHtml(__("كل الأقسام"))}</span>`;
		}

		const limit = options.limit || labels.length;
		const visible = labels.slice(0, limit);
		const hiddenCount = labels.length - visible.length;
		const chips = visible
			.map((label) => `<span class="eot-chip">${escapeHtml(label)}</span>`)
			.join("");

		return hiddenCount > 0
			? `${chips}<span class="eot-chip eot-chip--muted">+${hiddenCount}</span>`
			: chips;
	}

	function buildTemplateStats(templates) {
		const enabledTemplates = templates.filter((row) => isEnabledFlag(row.enabled)).length;
		const restrictedTemplates = templates.filter((row) => parseDepartmentSelection(row.allowed_department).length).length;
		const uniqueDepartments = new Set();
		const uniqueAssignees = new Set();

		templates.forEach((row) => {
			parseDepartmentSelection(row.allowed_department).forEach((department) => uniqueDepartments.add(department));
			if (row.assigned_to) {
				uniqueAssignees.add(row.assigned_to);
			}
		});

		return {
			total_templates: templates.length,
			enabled_templates: enabledTemplates,
			restricted_templates: restrictedTemplates,
			targeted_departments: uniqueDepartments.size,
			unique_assignees: uniqueAssignees.size,
		};
	}

	function getTemplateRows(frm) {
		return (frm.doc[EOT_TABLE_FIELDNAME] || []).map((row) => ({ ...row }));
	}

	function getTemplateRowByName(frm, rowName) {
		return (frm.doc[EOT_TABLE_FIELDNAME] || []).find((row) => row.name === rowName) || null;
	}

	function updateLegacyGridVisibility(frm) {
		const tableWrapper = frm.__eot_table_wrapper || resolveTableWrapper(frm);
		if (!tableWrapper?.length) {
			return;
		}

		frm.__eot_table_wrapper = tableWrapper;
		tableWrapper.toggle(Boolean(frm.__eot_show_legacy_grid));
	}

	function saveEditorTemplate(frm) {
		const rowName = frm.__eot_editor_row_name;
		const payload = collectEditorValues(frm);

		if (!payload.task_type) {
			frappe.msgprint(__("يجب تحديد نوع المهمة."));
			return;
		}

		if (!payload.assigned_to) {
			frappe.msgprint(__("يجب تحديد المستخدم المسؤول."));
			return;
		}

		if (payload.due_after_days < 0) {
			frappe.msgprint(__("عدد الأيام بعد التعيين لا يمكن أن يكون أقل من صفر."));
			return;
		}

		upsertTemplateRow(frm, rowName, payload);
		resetEditorForm(frm);
		frappe.show_alert({
			message: rowName ? __("تم تحديث القالب بنجاح.") : __("تمت إضافة القالب بنجاح."),
			indicator: "green",
		});
	}

	function loadRowIntoEditor(frm, rowName, options = {}) {
		const rowDoc = getTemplateRowByName(frm, rowName);
		if (!rowDoc) {
			frappe.msgprint(__("تعذر العثور على القالب المطلوب."));
			return;
		}

		frm.__eot_editor_row_name = rowDoc.name;
		applyEditorValues(frm, {
			enabled: isEnabledFlag(rowDoc.enabled),
			task_type: rowDoc.task_type || "",
			assigned_to: rowDoc.assigned_to || "",
			assigned_role: rowDoc.assigned_role || "",
			due_after_days: rowDoc.due_after_days ?? 1,
			task_message: rowDoc.task_message || "",
			departments: parseDepartmentSelection(rowDoc.allowed_department),
		});

		scrollEditorIntoView(frm);
		focusEditorField(frm, options.focus_departments ? "departments" : "task_type");
	}

	function resetEditorForm(frm, shouldFocus = false) {
		frm.__eot_editor_row_name = null;
		applyEditorValues(frm, EOT_EDITOR_DEFAULTS);
		if (shouldFocus) {
			focusEditorField(frm, "task_type");
		}
	}

	function applyEditorValues(frm, values) {
		const normalized = normalizeEditorState(values);
		const controls = frm.__eot_editor_controls || {};

		frm.__eot_applying_editor_values = true;
		Object.assign(frm.__eot_editor_doc, normalized);

		syncDepartmentOptionsToControl(frm);

		controls.enabled?.set_value(normalized.enabled, true);
		controls.task_type?.set_value(normalized.task_type, true);
		controls.assigned_to?.set_value(normalized.assigned_to, true);
		controls.assigned_role?.set_value(normalized.assigned_role, true);
		controls.due_after_days?.set_value(normalized.due_after_days, true);
		controls.task_message?.set_value(normalized.task_message, true);
		controls.departments?.set_value(normalized.departments, true);

		window.setTimeout(() => {
			frm.__eot_applying_editor_values = false;
			renderSettingsDesigner(frm);
		}, 0);
	}

	function setEditorDepartments(frm, departments) {
		const editorState = getEditorState(frm);
		applyEditorValues(frm, {
			...editorState,
			departments,
		});
	}

	function focusEditorField(frm, fieldname) {
		const control = frm.__eot_editor_controls?.[fieldname];
		if (!control) {
			return;
		}

		if (control.set_focus && control.set_focus()) {
			return;
		}

		const input = $(control.wrapper).find("input, textarea").filter(":visible").first();
		if (input.length) {
			input.trigger("focus");
		}
	}

	function scrollEditorIntoView(frm) {
		const panel = frm.__eot_designer_wrapper?.find(".eot-studio-panel--editor").get(0);
		if (panel?.scrollIntoView) {
			panel.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}

	function collectEditorValues(frm) {
		const editorState = getEditorState(frm);
		return normalizeTemplateValues({
			enabled: editorState.enabled,
			task_type: editorState.task_type,
			assigned_to: editorState.assigned_to,
			assigned_role: editorState.assigned_role,
			due_after_days: editorState.due_after_days,
			task_message: editorState.task_message,
			departments: editorState.departments,
		});
	}

	function getEditorState(frm) {
		const controls = frm.__eot_editor_controls || {};
		return normalizeEditorState({
			enabled: controls.enabled?.get_value?.() ?? frm.__eot_editor_doc.enabled,
			task_type: controls.task_type?.get_value?.() ?? frm.__eot_editor_doc.task_type,
			assigned_to: controls.assigned_to?.get_value?.() ?? frm.__eot_editor_doc.assigned_to,
			assigned_role: controls.assigned_role?.get_value?.() ?? frm.__eot_editor_doc.assigned_role,
			due_after_days: controls.due_after_days?.get_value?.() ?? frm.__eot_editor_doc.due_after_days,
			task_message: controls.task_message?.get_value?.() ?? frm.__eot_editor_doc.task_message,
			departments: controls.departments?.get_value?.() ?? frm.__eot_editor_doc.departments,
		});
	}

	function normalizeEditorState(values) {
		return {
			enabled: isEnabledFlag(values.enabled) ? 1 : 0,
			task_type: values.task_type || "",
			assigned_to: values.assigned_to || "",
			assigned_role: values.assigned_role || "",
			due_after_days: Math.max(Number.parseInt(values.due_after_days, 10) || 0, 0),
			task_message: String(values.task_message || "").trim(),
			departments: parseDepartmentSelection(values.departments),
		};
	}

	function upsertTemplateRow(frm, rowName, values) {
		let rowDoc = rowName ? getTemplateRowByName(frm, rowName) : null;

		if (!rowDoc) {
			rowDoc = frm.add_child(EOT_TABLE_FIELDNAME);
		}

		EOT_TEMPLATE_FIELDS.forEach((fieldname) => {
			if (Object.prototype.hasOwnProperty.call(values, fieldname)) {
				rowDoc[fieldname] = values[fieldname];
			}
		});

		afterTemplateMutation(frm);
	}

	function duplicateTemplateRow(frm, rowName) {
		const source = getTemplateRowByName(frm, rowName);
		if (!source) {
			return;
		}

		const clone = {};
		EOT_TEMPLATE_FIELDS.forEach((fieldname) => {
			clone[fieldname] = source[fieldname];
		});

		frm.add_child(EOT_TABLE_FIELDNAME, clone);
		afterTemplateMutation(frm);
		frappe.show_alert({ message: __("تم نسخ القالب."), indicator: "blue" });
	}

	function deleteTemplateRow(frm, rowName) {
		const rowDoc = getTemplateRowByName(frm, rowName);
		if (!rowDoc) {
			return;
		}

		frappe.confirm(__("سيتم حذف هذا القالب من الإعدادات. هل تريد المتابعة؟"), () => {
			frappe.model.clear_doc(rowDoc.doctype, rowDoc.name);
			if (frm.__eot_editor_row_name === rowName) {
				frm.__eot_editor_row_name = null;
			}
			afterTemplateMutation(frm);
			if (!frm.__eot_editor_row_name) {
				resetEditorForm(frm);
			}
		});
	}

	function toggleTemplateEnabled(frm, rowName) {
		const rowDoc = getTemplateRowByName(frm, rowName);
		if (!rowDoc) {
			return;
		}

		rowDoc.enabled = isEnabledFlag(rowDoc.enabled) ? 0 : 1;
		afterTemplateMutation(frm);
	}

	function afterTemplateMutation(frm) {
		frm.dirty();
		frm.refresh_field(EOT_TABLE_FIELDNAME);
		if (frm.__eot_editor_row_name && !getTemplateRowByName(frm, frm.__eot_editor_row_name)) {
			frm.__eot_editor_row_name = null;
		}
		renderSettingsDesigner(frm);
	}

	function normalizeTemplateValues(values) {
		return {
			enabled: values.enabled ? 1 : 0,
			task_type: values.task_type || "",
			assigned_to: values.assigned_to || "",
			assigned_role: values.assigned_role || "",
			allowed_department: serializeDepartmentSelection(values.departments || []),
			due_after_days: Math.max(Number.parseInt(values.due_after_days, 10) || 0, 0),
			task_message: String(values.task_message || "").trim(),
		};
	}

	function getTaskTypeOptions() {
		const docfield = frappe.meta.get_docfield(EOT_TEMPLATE_DOCTYPE, "task_type");
		if (docfield?.options) {
			return String(docfield.options)
				.split("\n")
				.map((item) => item.trim())
				.filter(Boolean);
		}

		return EOT_DEFAULT_TASK_TYPES;
	}

	function prefetchDepartmentOptions(frm) {
		if (!frm) {
			return Promise.resolve([]);
		}

		if (frm.__eot_department_options_promise) {
			return frm.__eot_department_options_promise;
		}

		frm.__eot_department_options_promise = frappe
			.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Department",
					fields: ["name", "department_name"],
					order_by: "department_name asc",
					limit_page_length: 1000,
				},
			})
			.then((response) => {
				const optionsByValue = new Map();
				(response.message || []).forEach((row) => {
					const visibleDepartment = row.department_name || row.name;
					const existingOption = optionsByValue.get(visibleDepartment);
					if (existingOption) {
						return;
					}

					optionsByValue.set(visibleDepartment, {
						label: visibleDepartment,
						value: visibleDepartment,
						description: row.name !== visibleDepartment ? row.name : "",
					});
				});
				const options = Array.from(optionsByValue.values());

				frm.__eot_department_options = options;
				frm.__eot_department_label_map = (response.message || []).reduce((accumulator, row) => {
					const visibleDepartment = row.department_name || row.name;
					accumulator[visibleDepartment] = visibleDepartment;
					accumulator[row.name] = visibleDepartment;
					return accumulator;
				}, {});

				return options;
			})
			.catch((error) => {
				console.error("Failed to load departments", error);
				frm.__eot_department_options_promise = null;
				frappe.msgprint(__("تعذر تحميل الأقسام. برجاء المحاولة مرة أخرى."));
				return [];
			});

		return frm.__eot_department_options_promise;
	}

	function getDepartmentSearchResults(frm, txt = "") {
		return prefetchDepartmentOptions(frm).then((options) => {
			const query = normalizeSearchText(txt);
			if (!query) {
				return options;
			}

			return options.filter((option) => {
				return [option.label, option.value].some((value) => normalizeSearchText(value).includes(query));
			});
		});
	}

	function syncDepartmentOptionsToControl(frm) {
		const control = frm.__eot_editor_controls?.departments;
		if (!control || !frm.__eot_department_options?.length) {
			return;
		}

		control.set_data(frm.__eot_department_options);
	}

	function getDepartmentLabels(frm, value) {
		const labels = parseDepartmentSelection(value).map((department) => {
			return frm.__eot_department_label_map?.[department] || department;
		});

		return [...new Set(labels)];
	}

	function parseDepartmentSelection(value) {
		if (!value) {
			return [];
		}

		const rawValues = Array.isArray(value) ? value : String(value).split(/[\n,،]+/);
		return [...new Set(rawValues.map((item) => String(item || "").trim()).filter(Boolean))];
	}

	function serializeDepartmentSelection(values) {
		return parseDepartmentSelection(values).join(", ");
	}

	function normalizeSearchText(value) {
		return String(value || "").trim().toLowerCase();
	}

	function getTaskTone(taskType) {
		return EOT_TASK_TONES[taskType] || "slate";
	}

	function isEnabledFlag(value) {
		return value === true || Number.parseInt(value, 10) === 1;
	}

	function escapeHtml(value) {
		return frappe.utils.escape_html(String(value || ""));
	}

	function bootstrapSettingsDesigner() {
		ensureRouteWatcher();
		ensureIntervalWatcher();
		setTimeout(() => attemptCurrentFormInitialization(), 50);
		setTimeout(() => attemptCurrentFormInitialization(), 400);
	}

	function ensureRouteWatcher() {
		if (eotRouteWatcherBound || !frappe.router) {
			return;
		}

		eotRouteWatcherBound = true;
		frappe.router.on("change", () => {
			setTimeout(() => attemptCurrentFormInitialization(), 200);
			setTimeout(() => attemptCurrentFormInitialization(), 900);
		});
	}

	function ensureIntervalWatcher() {
		if (eotIntervalWatcherBound) {
			return;
		}

		eotIntervalWatcherBound = true;
		window.setInterval(() => {
			attemptCurrentFormInitialization();
		}, 1500);
	}

	function attemptCurrentFormInitialization() {
		if (!window.cur_frm || window.cur_frm.doctype !== EOT_SETTINGS_DOCTYPE) {
			return;
		}

		initializeSettingsDesigner(window.cur_frm);
	}

	function resolveTableWrapper(frm) {
		const fieldWrapper = frm.fields_dict?.[EOT_TABLE_FIELDNAME]?.$wrapper;
		if (fieldWrapper?.length) {
			return fieldWrapper;
		}

		const wrapper = frm.layout?.wrapper || frm.form_wrapper;
		if (!wrapper) {
			return null;
		}

		const selector = `[data-fieldname="${EOT_TABLE_FIELDNAME}"]`;
		const found = $(wrapper).find(selector).first();
		return found.length ? found : null;
	}

	function getDesignerMountPoint(frm) {
		return $(frm.form_wrapper || frm.layout?.wrapper || frm.page.main);
	}
})();
