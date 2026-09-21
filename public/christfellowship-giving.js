/**
 * Christ Fellowship — The Impact Offering.
 *
 * Pushpay Embedded Giving, restyled to the Impact Offering design and opened
 * in a modal. One file: host it, add it to the page, and give your buttons
 * one attribute.
 *
 * SETUP
 *
 *   1. Add the script to the page, once:
 *
 *        <script src="/js/christfellowship-giving.js" defer></script>
 *
 *   2. Put data-give-open on anything that should open it:
 *
 *        <button type="button" data-give-open>Give</button>
 *
 *      The modal also opens on load if the page is opened at #give, so
 *      existing links to the giving section keep working.
 *
 *   3. Remove the page's current giving-modal script, or both will open on
 *      the same click.
 *
 *   4. Load the fonts in the page's <head> — Poppins, Inter and finalsix
 *      here. The form cannot load them itself, but it does inherit them
 *      from the page.
 *
 * Nothing else is needed. The giving form is fetched on first open, so
 * visitors who never give never download it.
 *
 * The page can also drive the modal directly:
 *
 *   window.PushpayGivingModal.open()
 *   window.PushpayGivingModal.close()
 *   window.PushpayGivingModal.isOpen
 *
 * TWEAKS all live in CONFIG below: the amounts, the copy, the fund, and the
 * colours, spacing and type in CONFIG.theme.
 *
 * Needs CSS :has() — Chrome 105+, Safari 15.4+, Firefox 121+.
 */
(function () {
	'use strict';

	// ---------------------------------------------------------------------
	// CONFIG
	// ---------------------------------------------------------------------
	const CONFIG = {
		// The element the giving form mounts into, checked in order. The
		// second is the one Pushpay's own snippet creates.
		hostIds: ['pushpay-embedded-giving', 'pushpay-embedded-giving-fallback'],

		widgetWidth: '730px', // --pushpay-widget-width (Pushpay's default: 408px)
		// --pushpay-widget-primary-color. null = the account's own brand colour.
		primaryColor: '#1E5B3D',

		// Small-caps line above the amount. null = none, which is what the
		// design has; the form's own label is then kept for screen readers.
		eyebrowText: null,
		// The card carries the badge and heading, so the form's own
		// "Give to Christ Fellowship" title is hidden.
		hideWidgetTitle: true,
		// Hides the EN/ES selector. The form still follows the browser's own
		// language; set false to let a donor switch it in the form.
		hideLanguageSelector: true,
		// Hides the blue banner that restates the recurring schedule. Error
		// messages are not affected.
		hideInfoBanner: true,

		// The quick-amount tiles, laid out in quickColumns columns. A count
		// that leaves one over gives it the full width of the last row.
		quickAmounts: [50, 100, 250, 400, 800, 1200],
		quickColumns: 3,
		// Selected on load; null = start empty.
		defaultAmount: 100,

		// The frequency pills. `match` is matched against the frequencies the
		// account actually offers, so anything unavailable is dropped, and
		// `short` is used instead of `label` on narrow screens.
		frequencies: [
			{ label: 'Every week', match: 'every week' },
			{ label: 'Every 2 weeks', match: '2 weeks' },
			{ label: 'Every month', match: 'every month' },
			{ label: '1st & 15th monthly', short: '1st & 15th', match: '15th' },
		],
		frequencyLabel: 'Frequency',
		// The pills sit under a switch that already says what they are, so the
		// label is hidden from view but still read out. Set false to show it.
		hideFrequencyLabel: true,
		recurringLabel: 'Make Gift Recurring',

		// Ids of whole fields to hide from view (a custom field's label, e.g.
		// 'Memo', or 'gift-date-input'). They stay in the form and still
		// submit. Never hide a required field: the form would fail validation
		// with nothing on screen to fix.
		hideFields: [],

		// The submit label, given the amount currently entered. null keeps
		// Pushpay's own translated label.
		submitLabel: amount =>
			amount > 0 ? `Give $${amount.toLocaleString('en-US')}` : 'Choose an amount',

		// The fund this page gives to, set through Pushpay's own fnd and fndv
		// parameters. A fund name or a fund key both work.
		//
		//   visibility  'Hide' leaves the fund out of the form entirely (it is
		//               still set, and still submitted with the gift), 'Lock'
		//               shows it as a read-only value, 'Show' preselects it.
		//   fallback    also holds the fund from this script, for Pushpay
		//               builds that do not read fndv yet. Harmless either way.
		fundLock: {
			fund: 'Impact Offering',
			visibility: 'Hide',
			fallback: true,
		},

		// The copy above the form inside the card.
		badgeText: 'The Impact Offering',
		// One line per entry.
		headingLines: ['Be part of', 'the impact.'],
		// Between the give button and the Pushpay mark. null removes it.
		noteText: 'For the One. For the Many. For the Future.',

		modal: {
			// Anything matching this opens the modal.
			openSelector: '[data-give-open], [data-pp-give-open]',
			closeSelector: '[data-give-close], [data-pp-give-close]',
			// Open on load when the page is opened at this hash. null = never.
			openOnHash: '#give',
			// Added to <body> while the modal is open.
			bodyClass: 'impact2026-modal-open',
			// widgetWidth plus the card's padding on both sides.
			maxWidth: '810px',
			// Fetch the giving form on first open rather than on page load.
			lazy: true,
			handle: 'christfellowship',
			scriptSrc: 'https://embedded.pushpay.com',
			loadingText: 'Loading secure giving form...',
			// How long to wait for the restyle before showing the form anyway.
			// An unstyled working form beats a donor stuck behind a spinner.
			readyTimeout: 8000,
		},

		// Colours, spacing and type. The comments name the Impact Offering
		// 2026 brand token each value came from.
		theme: {
			blue: '#1E5B3D', // green-pea — selected tile, active pill, switch
			amount: '#14485C', // eden — the large amount
			darkBlue: '#FFB81C', // gold — the give button
			darkBlueHover: '#E8A608', // gold, hover
			lightBlue: '#14485C', // eden — the label on the gold button
			ink: '#0A0A0A', // tile amounts
			grey80: 'rgba(20, 72, 92, 0.55)', // eden 55% — eyebrow, OR
			label: 'rgba(20, 72, 92, 0.55)', // uppercase field labels
			surface: '#FFFFFF', // tile and field fill
			card: '#FBEEDC', // pearl-lusta — the card
			border: 'rgba(20, 72, 92, 0.15)', // tile and field border
			borderHover: 'rgba(20, 72, 92, 0.35)',
			focus: '#14485C', // eden — focus ring
			applePay: '#111111', // Apple's own black
			// Apple Pay borrows Google Pay's hover and pressed values, so the
			// two buttons behave the same way side by side.
			applePayHover: '#3C4043',
			applePayActive: '#5F6368',

			// The fonts have to be loaded by the page; see SETUP above.
			font: 'Poppins, Inter, sans-serif', // tiles, button, values
			displayFont: 'finalsix, Poppins, sans-serif', // the large amount
			labelFont: 'Inter, sans-serif', // uppercase field labels

			cardRadius: '35px', // the card, from .impact2026_modal_card
			cardPadding: '28px',
			cardGap: '12px', // between the form's sections
			submitGap: '20px', // above the give button
			cardShadow: 'none', // the modal card carries the shadow

			amountSize: '56px',
			amountSizeMobile: '52px', // 56 clips "$1,200.00" on a phone
			// Mobile again, for five figures and up: "$99999.00" already
			// overflows a phone at the size above, and this holds a
			// six-figure amount on one line with room to spare.
			amountSizeLong: '40px',
			amountRowHeight: '90px',
			amountRowGap: '24px',
			// The tiles take this much of the row and the amount takes the
			// rest, so widening the tiles narrows the amount.
			quickColumnWidth: '360px',

			quickGap: '12px',
			quickPadding: '10px',
			quickSize: '18px',
			tileBorder: '2px',

			fieldRadius: '16px',
			fieldPadding: '16px',
			fieldGap: '12px',

			panelRadius: '16px',
			panelPadding: '16px',
			panelGap: '12px',
			recurringGap: '12px',

			quickRadius: '12px',
			pillRadius: '16px',
			freqHeight: '42px',
			freqGap: '12px',

			// The whole action row, Apple Pay and Google Pay included. Google
			// draws its own button at 45px inside an iframe and cannot be made
			// taller, so the row matches it rather than the other way round.
			buttonHeight: '45px',
			continueRadius: '9999px',
			applePayRadius: '9999px',
			actionsGap: '12px',

			labelTracking: '0.04em',
			ctaTracking: '0.025em',
			badgeTracking: '0.05em',

			// The modal itself.
			overlay: 'rgba(20, 72, 92, 0.7)', // eden 70%
			overlayBlur: '6px',
			modalShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
			badgeBg: '#E3402F', // cinnabar — the badge, and the thank-you heart
			errorRed: '#A82F23', // brand-red — invalid fields and errors
			heading: '#14485C', // eden
			headingSize: '36px',
			headingLine: '40px',
			// The width of the copy on the thank-you screen: two thirds of the
			// card, never narrower than Pushpay's own 380px.
			successMeasure: 'max(66.67%, 380px)',
		},
	};

	// Test-time overrides, for pointing this at a different account or host.
	// Nothing on the live page sets it.
	const OVERRIDES = (typeof window !== 'undefined' && window.pushpayGivingOverrides) || {};
	if (OVERRIDES.noModal) CONFIG.modal = null;
	if (OVERRIDES.scriptSrc && CONFIG.modal) CONFIG.modal.scriptSrc = OVERRIDES.scriptSrc;
	if (OVERRIDES.handle && CONFIG.modal) CONFIG.modal.handle = OVERRIDES.handle;
	if (OVERRIDES.fund) CONFIG.fundLock.fund = OVERRIDES.fund;
	if (OVERRIDES.fundVisibility) CONFIG.fundLock.visibility = OVERRIDES.fundVisibility;
	if (OVERRIDES.fundLockFallback !== undefined) CONFIG.fundLock.fallback = Boolean(OVERRIDES.fundLockFallback);

	const STYLE_FLAG = 'data-pp-restyle';
	const HOST_FLAG = 'data-pp-host';
	const READY_FLAG = 'data-pp-ready';
	const T = CONFIG.theme;
	// Past this, a typed amount is no longer one of the suggestions.
	const MAX_QUICK_AMOUNT = CONFIG.quickAmounts.length ? Math.max.apply(null, CONFIG.quickAmounts) : Infinity;

	// ---------------------------------------------------------------------
	// Utilities
	// ---------------------------------------------------------------------

	const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

	function el(tag, className, text) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (text != null) node.textContent = text;
		return node;
	}

	/** Sets a value the way a donor would, so the form's own change handling sees it. */
	function setNativeValue(node, value) {
		const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), 'value');
		if (desc && desc.set) {
			desc.set.call(node, value);
		} else {
			node.value = value;
		}
		node.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
		node.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
	}

	function waitFor(selector, root, timeout = 15000) {
		return new Promise((resolve, reject) => {
			const existing = root.querySelector(selector);
			if (existing) return resolve(existing);

			const started = Date.now();
			const timer = setInterval(() => {
				const found = root.querySelector(selector);
				if (found) {
					clearInterval(timer);
					resolve(found);
				} else if (Date.now() - started > timeout) {
					clearInterval(timer);
					reject(new Error(`timed out waiting for "${selector}"`));
				}
			}, 50);
		});
	}

	// ---------------------------------------------------------------------
	// Styles
	// ---------------------------------------------------------------------

	function injectStyles(shadowRoot) {
		if (shadowRoot.querySelector(`style[${STYLE_FLAG}]`)) return;

		const style = document.createElement('style');
		style.setAttribute(STYLE_FLAG, 'true');
		style.textContent = `
			/* Appended last, so these win over Pushpay's own tokens. */
			:host {
				--pp-blue: ${T.blue};
				--pp-amount: ${T.amount};
				--pp-dark-blue: ${T.darkBlue};
				--pp-dark-blue-hover: ${T.darkBlueHover};
				--pp-light-blue: ${T.lightBlue};
				--pp-ink: ${T.ink};
				--pp-grey-80: ${T.grey80};
				--pp-label: ${T.label};
				--pp-surface: ${T.surface};
				--pp-card: ${T.card};
				--pp-border: ${T.border};
				--pp-border-hover: ${T.borderHover};
				--pp-focus: ${T.focus};
				--pp-radius: ${T.fieldRadius};
				--font-family: ${T.font};
				--pp-display-font: ${T.displayFont};
				--pp-label-font: ${T.labelFont};
			}

			/* ---------- card shell: taller, rounder, no inner scrollbar ---------- */
			.widget,
			.widget-old,
			.widget--no-alt-payment {
				max-height: none;
				align-items: flex-start;
			}
			/* The modal card is the card, so the form inside it is flat and
			   unpadded — otherwise the two nest one card inside another. */
			.widget-content,
			.widget-content-old {
				background: transparent;
				border-radius: 0;
				overflow: visible;
				box-shadow: ${T.cardShadow};
			}
			.widget-form,
			.widget-form-old {
				overflow: visible;
				padding-top: 0;
			}
			.scollable-content,
			.scollable-content-old {
				max-height: none;
				overflow: visible;
				padding: ${T.panelGap} 0 0;
			}
			.form-footer {
				padding: ${T.submitGap} 0 0;
			}
			.scollable-content > div > .recurring-container,
			.scollable-content-old > div > .recurring-container {
				margin-bottom: 0;
			}
			.form-footer.box-shadow {
				box-shadow: none;
			}

			/* The title and the language selector share a row, so with both
			   hidden the row goes too. */
			${CONFIG.hideWidgetTitle ? '.widget-form-title { display: none; }' : ''}
			${CONFIG.hideLanguageSelector ? '.language-selector { display: none; }' : ''}
			${
				CONFIG.hideWidgetTitle && CONFIG.hideLanguageSelector
					? '.widget-form-header { display: none; }'
					: `.widget-form-header {
				justify-content: flex-end;
				padding-bottom: ${T.panelGap};
			}`
			}

			/* Scoped to .alertBox-info, so error alerts are never caught by it. */
			${CONFIG.hideInfoBanner ? '.alertBox-info { display: none; }' : ''}

			/* ---------- amount block ---------- */
			label[data-pp-at-target="amountInput-label"] {
				display: grid;
				grid-template-columns: minmax(0, 1fr) ${T.quickColumnWidth};
				grid-template-areas:
					"eyebrow quick"
					"amount  quick"
					"message quick";
				column-gap: ${T.amountRowGap};
				align-items: start;
				align-content: center;
				min-height: ${T.amountRowHeight};
				margin-bottom: ${T.cardGap};
			}
			/* The tiles are suggestions, so they step aside once a bigger
			   amount is typed, and the amount takes the whole row. Both
			   states keep the row's min-height, so the card does not jump. */
			label[data-pp-at-target="amountInput-label"][data-pp-quick="off"] {
				grid-template-columns: minmax(0, 1fr);
				grid-template-areas:
					"eyebrow"
					"amount"
					"message";
			}
			label[data-pp-at-target="amountInput-label"][data-pp-quick="off"] .pp-quick-grid {
				display: none;
			}
			label[data-pp-at-target="amountInput-label"] > .form-control-text {
				${
					CONFIG.eyebrowText == null
						? `position: absolute;
				width: 1px;
				height: 1px;
				overflow: hidden;
				clip-path: inset(50%);
				white-space: nowrap;`
						: 'display: none;'
				}
			}
			.pp-eyebrow {
				grid-area: eyebrow;
				font-family: var(--pp-label-font);
				font-size: 14px;
				font-weight: 600;
				letter-spacing: ${T.labelTracking};
				text-transform: uppercase;
				color: var(--pp-grey-80);
				line-height: 1;
				margin-bottom: 10px;
			}
			label[data-pp-at-target="amountInput-label"] > .amount-field {
				grid-area: amount;
				flex-direction: row;
				align-items: baseline;
				gap: 2px;
				min-width: 0;
			}
			label[data-pp-at-target="amountInput-label"] > #amountInput-message {
				grid-area: message;
			}

			label[data-pp-at-target="amountInput-label"] .amount-field-prefix {
				position: static;
				height: auto;
				line-height: 1;
				padding: 0;
				font-family: var(--pp-display-font);
				font-size: ${T.amountSize};
				/* finalsix ships one weight, 800. */
				font-weight: 800;
				letter-spacing: 0;
				color: var(--pp-amount);
			}
			label[data-pp-at-target="amountInput-label"] .amount-field-suffix {
				display: none;
			}
			#amountInput.amount-field-input {
				border: 0;
				background: transparent;
				height: auto;
				min-width: 0;
				padding: 0;
				text-indent: 0;
				font-family: var(--pp-display-font);
				font-size: ${T.amountSize};
				font-weight: 800;
				line-height: 1;
				letter-spacing: 0;
				color: var(--pp-amount);
			}
			#amountInput.amount-field-input:focus {
				outline: none;
			}
			#amountInput.amount-field-input::placeholder {
				color: rgba(20, 72, 92, 0.4);
				opacity: 1;
			}
			.amount-field:has(.form-control-invalid) .amount-field-prefix,
			#amountInput.form-control-invalid {
				color: ${T.errorRed};
			}

			/* ---------- quick amounts ---------- */
			.pp-quick-grid {
				grid-area: quick;
				display: grid;
				grid-template-columns: repeat(${CONFIG.quickColumns}, minmax(0, 1fr));
				gap: ${T.quickGap};
			}
			.pp-quick-btn {
				appearance: none;
				padding: ${T.quickPadding};
				font-family: var(--font-family);
				font-size: ${T.quickSize};
				font-weight: 900;
				line-height: 1.33;
				text-align: left;
				color: var(--pp-ink);
				background: var(--pp-surface);
				border: ${T.tileBorder} solid var(--pp-border);
				border-radius: ${T.quickRadius};
				cursor: pointer;
				transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
					border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
					box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
			}
			${
				CONFIG.quickAmounts.length % CONFIG.quickColumns === 1
					? `.pp-quick-btn:last-child {
				grid-column: 1 / -1;
			}`
					: ''
			}
			.pp-quick-btn:hover {
				border-color: var(--pp-border-hover);
			}
			.pp-quick-btn.pp-active {
				background: var(--pp-blue);
				border-color: var(--pp-blue);
				color: #fff;
				box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
			}
			.pp-quick-btn.pp-active:hover {
				border-color: var(--pp-blue);
			}
			.pp-quick-btn:focus-visible {
				outline: 2px solid var(--pp-focus);
				outline-offset: 2px;
			}

			/* ---------- select and text fields become bordered cards ---------- */
			label.form-control-label:not(.line-item-label):has(> .select-container),
			label.form-control-label:not(.line-item-label):has(> .form-control) {
				background: var(--pp-surface);
				border: ${T.tileBorder} solid var(--pp-border);
				border-radius: ${T.fieldRadius};
				padding: ${T.fieldPadding};
				margin-bottom: ${T.fieldGap};
				gap: 5px;
			}
			label.form-control-label:not(.line-item-label):has(> .select-container):focus-within,
			label.form-control-label:not(.line-item-label):has(> .form-control):focus-within {
				border-color: var(--pp-border-hover);
			}
			label.form-control-label:has(> .select-container) {
				cursor: pointer;
			}
			label.form-control-label:has(> .select-container) > .form-control-text {
				cursor: pointer;
			}
			label.form-control-label:has(> .select-container) > .form-control-text,
			label.form-control-label:has(> .form-control) > .form-control-text {
				font-family: var(--pp-label-font);
				font-size: 12px;
				font-weight: 600;
				letter-spacing: ${T.labelTracking};
				text-transform: uppercase;
				color: var(--pp-label);
				line-height: 1;
			}
			.form-control-required {
				display: none;
			}
			label.form-control-label:not(.line-item-label):has(> .select-container) > .select-container {
				display: block;
				width: 100%;
			}
			label.form-control-label:not(.line-item-label):has(> .select-container) .select-dropdown,
			label.form-control-label:not(.line-item-label):has(> .form-control) > .form-control {
				border: 0;
				border-radius: 0;
				background: transparent;
				height: auto;
				padding: 0 34px 0 0;
				font-size: 16px;
				font-weight: 500;
				line-height: 1.3;
				color: var(--pp-ink);
			}

			/* ---------- select cards are their own hit area ---------- */
			label.form-control-label:not(.line-item-label):has(> .select-container) {
				position: relative;
				padding: 0;
				gap: 0;
			}
			label.form-control-label:not(.line-item-label):has(> .select-container) > .form-control-text {
				position: absolute;
				top: ${T.fieldPadding};
				left: ${T.fieldPadding};
				right: 34px;
				pointer-events: none;
				z-index: 1;
			}
			label.form-control-label:not(.line-item-label):has(> .select-container) > .select-container {
				display: block;
				width: 100%;
			}
			label.form-control-label:not(.line-item-label):has(> .select-container) .select-dropdown {
				height: 71px;
				padding: 28px 34px 12px ${T.fieldPadding};
				cursor: pointer;
				border-radius: ${T.fieldRadius};
				outline-offset: -2px;
			}
			label.form-control-label:not(.line-item-label):has(> .select-container) .select-icon {
				margin: 0 ${T.fieldPadding} 0 0;
			}
			label.form-control-label:not(.line-item-label):has(> .form-control) > .form-control:focus {
				outline: none;
			}
			/* The message is a flow child of the label, so it carries its own
			   inset. :not(:empty) matters: the span is always rendered, and
			   padding on an empty one made every card 12px taller. */
			label.form-control-label:not(.line-item-label):has(> .select-container)
				> .validation-error-message:not(:empty) {
				padding: 0 ${T.fieldPadding} ${T.panelGap};
			}

			/* ---------- date field icon ----------
			   The input carries its own calendar icon at the chevron's inset and
			   the native indicator is stretched over it, transparent — so the
			   two line up and the picker still opens on a click. */
			label.form-control-label:not(.line-item-label):has(> input[type="date"]) > .form-control {
				background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cpath d='M8 2v4M16 2v4M3 10h18'/%3E%3C/svg%3E");
				background-repeat: no-repeat;
				background-position: right 0 center;
			}
			input[type="date"].form-control::-webkit-calendar-picker-indicator {
				position: absolute;
				top: 0;
				right: 0;
				width: 34px;
				height: 100%;
				margin: 0;
				padding: 0;
				opacity: 0;
				cursor: pointer;
			}
			label.form-control-label:not(.line-item-label):has(> .select-container) .select-icon {
				--chevron-down-color: var(--pp-label);
			}

			/* ---------- fund ----------
			   Emitted only while CONFIG.fundLock.fallback is on, and shaped by
			   CONFIG.fundLock.visibility: Hide leaves the field out, Lock shows
			   it as a read-only value. Either way the add-another-fund row goes
			   with it. */
			${
				CONFIG.fundLock && CONFIG.fundLock.fallback
					? `${
							CONFIG.fundLock.visibility === 'Hide'
								? `label[for="fundKeyOrName"] {
				display: none;
			}`
								: `label[for="fundKeyOrName"],
			label[for="fundKeyOrName"] > .form-control-text {
				cursor: default;
			}
			label[for="fundKeyOrName"] .select-dropdown {
				pointer-events: none;
				cursor: default;
				padding-right: ${T.fieldPadding};
			}
			label[for="fundKeyOrName"] .select-icon-wrapper {
				display: none;
			}`
					}
			.line-items-footer,
			.line-items-footer-space-between {
				display: none;
			}`
					: ''
			}

			/* ---------- multi-fund line items ---------- */
			.line-item {
				background: var(--pp-surface);
				border: ${T.tileBorder} solid var(--pp-border);
				border-radius: ${T.fieldRadius};
				padding: ${T.fieldPadding};
				margin-bottom: ${T.panelGap};
			}
			.line-item .line-item-label > .form-control-text {
				font-size: 11px;
				margin-bottom: 2px;
			}
			.line-item .select-dropdown,
			.line-item .amount-field-input {
				border: 1px solid var(--pp-border);
				border-radius: 10px;
				background: #fff;
				font-size: 16px;
				font-weight: 500;
				color: var(--pp-ink);
			}
			.line-item .select-dropdown:focus,
			.line-item .amount-field-input:focus {
				border-color: var(--pp-border-hover);
				outline: none;
			}
			.line-item .amount-field-prefix {
				font-size: 16px;
				font-weight: 500;
				color: var(--pp-label);
			}
			.line-item .line-item-remove-btn {
				color: var(--pp-label);
			}
			.line-items-total {
				font-size: 14px;
				color: var(--pp-label);
			}
			.line-items-total .line-items-total-amount {
				color: var(--pp-ink);
			}

			/* ---------- recurring card ----------
			   flex order puts it below the fund and campus selects without
			   moving any of Pushpay's own elements. */
			.scollable-content > div:has(> .recurring-container),
			.scollable-content-old > div:has(> .recurring-container) {
				display: flex;
				flex-direction: column;
			}
			.recurring-container {
				display: flex;
				flex-direction: column;
				order: 10;
				background: var(--pp-surface);
				border: ${T.tileBorder} solid var(--pp-border);
				border-radius: ${T.panelRadius};
				padding: ${T.panelPadding};
				gap: ${T.panelGap};
				margin-bottom: 6px;
			}
			.recurring-toggle {
				position: absolute;
				width: 1px;
				height: 1px;
				margin: 0;
				padding: 0;
				overflow: hidden;
				clip-path: inset(50%);
				border: 0;
				opacity: 0;
			}
			.pp-recurring-head {
				order: -1;
				display: flex;
				align-items: center;
				gap: 10px;
				cursor: pointer;
			}
			.pp-recurring-title {
				user-select: none;
			}
			.recurring-container[data-pp-recurring="off"] {
				gap: 0;
			}
			.recurring-container[data-pp-recurring="on"] .pp-recurring-head {
				padding-bottom: ${T.panelGap};
				border-bottom: 1px solid var(--pp-border);
			}
			.pp-recurring-head svg {
				flex: 0 0 auto;
				color: var(--pp-blue);
			}
			.pp-recurring-title {
				flex: 1;
				font-size: 16px;
				font-weight: 600;
				line-height: 1.3;
				color: var(--pp-ink);
			}
			.pp-toggle {
				position: relative;
				flex: 0 0 auto;
				width: 44px;
				height: 24px;
				padding: 0;
				border: 0;
				border-radius: 999px;
				background: var(--pp-border);
				cursor: pointer;
				transition: background-color 0.18s ease;
			}
			.pp-toggle::after {
				content: '';
				position: absolute;
				top: 2px;
				left: 2px;
				width: 20px;
				height: 20px;
				border-radius: 999px;
				background: #fff;
				box-shadow: 0 2px 4px 0 rgba(20, 72, 92, 0.2);
				transition: transform 0.18s ease;
				transform: translateX(var(--pp-knob, 0px));
			}
			.recurring-container[data-pp-recurring="on"] .pp-toggle {
				background: var(--pp-blue);
			}
			.pp-toggle:focus-visible {
				outline: 2px solid var(--pp-focus);
				outline-offset: 2px;
			}

			.recurring-fields {
				display: flex;
				flex-direction: column;
				gap: ${T.recurringGap};
				padding-top: 2px;
			}
			.pp-freq-label {
				order: -2;
			}
			.pp-freq-grid {
				order: -1;
			}
			.recurring-fields-hidden {
				padding-top: 0;
			}
			label[for="recurring-field-frequency"] {
				display: none;
			}
			${(CONFIG.hideFields || []).map(id => `label[for="${id}"] { display: none; }`).join('\n\t\t\t')}
			.pp-freq-label {
				display: block;
				margin: 0 0 ${T.panelGap};
				font-family: var(--pp-label-font);
				font-size: 12px;
				font-weight: 600;
				letter-spacing: ${T.labelTracking};
				text-transform: uppercase;
				line-height: 1;
				color: var(--pp-label);
			}
			${
				CONFIG.hideFrequencyLabel
					? `
			.pp-freq-label {
				position: absolute;
				width: 1px;
				height: 1px;
				margin: 0;
				overflow: hidden;
				clip-path: inset(50%);
				white-space: nowrap;
			}`
					: ''
			}
			.pp-freq-grid {
				display: flex;
				gap: ${T.freqGap};
			}
			.recurring-fields label.form-control-label:not(.line-item-label),
			.recurring-fields .pp-freq-label,
			.recurring-fields .pp-freq-grid {
				margin-bottom: 0;
			}
			.pp-freq-btn {
				flex: 1 1 0;
				min-width: 0;
				height: ${T.freqHeight};
				padding: 12px 8px;
				font-family: var(--font-family);
				font-size: 14px;
				font-weight: 600;
				line-height: 1;
				text-align: center;
				color: var(--pp-ink);
				background: var(--pp-surface);
				border: ${T.tileBorder} solid var(--pp-border);
				border-radius: ${T.pillRadius};
				cursor: pointer;
				white-space: nowrap;
				transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
			}
			.pp-freq-btn:hover {
				border-color: var(--pp-border-hover);
			}
			.pp-freq-btn.pp-active {
				background: var(--pp-blue);
				border-color: var(--pp-blue);
				color: #fff;
			}
			.pp-freq-btn:focus-visible {
				outline: 2px solid var(--pp-focus);
				outline-offset: 2px;
			}
			/* Long label by default; the short one takes over on mobile. */
			.pp-freq-short {
				display: none;
			}

			/* ---------- multi-fund "+ Add another fund" ---------- */
			.line-items-footer,
			.line-items-footer-space-between {
				justify-content: flex-start;
				align-items: center;
				gap: 4px;
				padding-bottom: 0;
				margin-bottom: ${T.fieldGap};
			}
			.line-item-add-btn,
			.line-item-add-btn.line-item-add-btn-small {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				width: auto;
				max-width: none;
				height: auto;
				min-height: 0;
				padding: 8px 12px;
				margin: 0 auto 0 0;
				background: none;
				border: 0;
				border-radius: 8px;
				color: var(--pp-blue);
				font-family: var(--font-family);
				font-size: 14px;
				font-weight: 600;
				line-height: 1;
				text-decoration: underline;
				text-decoration-skip-ink: all;
				cursor: pointer;
			}
			.line-item-add-btn:hover {
				background: color-mix(in srgb, var(--pp-blue) 10%, transparent);
				border: 0;
				color: var(--pp-blue);
			}
			.line-item-add-btn-text {
				text-align: left;
			}

			.alternative-payment-separator-wrapper {
				display: none;
			}

			/* ---------- action row: Apple Pay | OR | Continue ---------- */
			.form-footer {
				display: grid;
				align-items: center;
				column-gap: ${T.actionsGap};
				grid-template-columns: 1fr;
				grid-template-areas:
					"submit"
					"note"
					"powered"
					"terms";
			}
			.form-footer:has(> .alertBox) {
				grid-template-areas:
					"error"
					"submit"
					"note"
					"powered"
					"terms";
			}
			.form-footer:has(.alternative-payment-buttons-wrapper) {
				grid-template-columns: 1fr auto 1fr;
				grid-template-areas:
					"alt or submit"
					"note note note"
					"powered powered powered"
					"terms terms terms";
			}
			.form-footer:has(.alternative-payment-buttons-wrapper):has(> .alertBox) {
				grid-template-areas:
					"error error error"
					"alt or submit"
					"note note note"
					"powered powered powered"
					"terms terms terms";
			}
			/* The payment error, given a row of its own above the buttons. */
			.form-footer > .alertBox {
				grid-area: error;
				padding: 0 0 ${T.panelGap};
			}
			.form-footer > .alertBox .alertBox-content {
				border-color: ${T.errorRed};
				border-radius: ${T.quickRadius};
			}
			.form-footer > .alternative-payment-buttons-wrapper {
				grid-area: alt;
				margin-top: 0;
			}
			.form-footer > .pp-or {
				grid-area: or;
				font-size: 10px;
				font-weight: 500;
				line-height: 1;
				letter-spacing: 1px;
				text-align: center;
				color: var(--pp-grey-80);
			}
			.form-footer:not(:has(.alternative-payment-buttons-wrapper)) > .pp-or {
				display: none;
			}
			/* Card and ACH render a <button>; crypto and stock render a link.
			   Both are the card's primary action, so both take its cell. */
			.form-footer > button[type="submit"],
			.form-footer > a.link-button {
				grid-area: submit;
			}
			.form-footer > a.container {
				grid-area: powered;
			}
			.form-footer > .termsAndPolicy {
				grid-area: terms;
				font-size: 12px;
				font-weight: 400;
				line-height: 16px;
				text-align: center;
			}
			.form-footer > .termsAndPolicy b {
				font-weight: 600;
			}
			/* Anything else the footer renders spans the full width. */
			.form-footer > *:not(.alternative-payment-buttons-wrapper):not(.pp-or):not([type="submit"]):not(a.link-button):not(a.container):not(.termsAndPolicy):not(.pp-note):not(.alertBox) {
				grid-column: 1 / -1;
			}

			.form-footer .button {
				min-height: ${T.buttonHeight};
				font-size: 18px;
				font-weight: 900;
				line-height: 1.2;
			}
			.form-footer > button[type="submit"].button--primary,
			.form-footer > a.link-button.button--primary,
			.form-footer > a.link-button.button--primary:visited {
				background: var(--pp-dark-blue);
				border-radius: ${T.continueRadius};
				color: var(--pp-light-blue);
				text-transform: uppercase;
				letter-spacing: ${T.ctaTracking};
			}
			.form-footer > button[type="submit"].button--primary:hover,
			.form-footer > a.link-button.button--primary:hover {
				background: var(--pp-dark-blue-hover);
				color: var(--pp-light-blue);
			}

			/* ---------- tagline (CONFIG.noteText) ---------- */
			.pp-note {
				grid-area: note;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 6px;
				margin-top: ${T.panelGap};
				color: #91949C;
			}
			.pp-note-text {
				font-family: var(--font-family);
				font-size: 12px;
				font-weight: 600;
				line-height: 16px;
				text-align: center;
				color: #6F727B;
			}
			.form-footer > a.container {
				font-size: 12px;
			}
			.alternative-payment-buttons-horizontal {
				height: ${T.buttonHeight};
			}
			.google-pay-button-container {
				min-height: ${T.buttonHeight};
			}
			.google-pay-iframe {
				height: ${T.buttonHeight};
			}
			.apple-pay-button,
			.apple-pay-button:not(.button--disabled) {
				background: ${T.applePay};
				border-radius: ${T.applePayRadius};
			}
			/* Google dims its own button from inside its iframe, where nothing
			   here can reach it; these are Google's own values, so Apple Pay
			   matches it. */
			.apple-pay-button:not(.button--disabled):hover {
				background: ${T.applePayHover};
			}
			.apple-pay-button:not(.button--disabled):active {
				background: ${T.applePayActive};
			}

			/* ---------- stock and crypto (Engiven) ----------
			   Only rendered when the account has a crypto or stock link. */
			.engiven {
				max-width: none;
				padding-bottom: 0;
			}
			.engiven-logo {
				margin-inline: 0;
			}

			/* ---------- thank-you screen ---------- */
			.widget-content > .success,
			.widget-content-old > .success {
				min-height: 0 !important;
				padding: 0;
			}

			/* The icon draws itself from these two properties. Scoped to the
			   icon: the same variable colours the heading text as well. */
			.success-icon {
				--primary-color: ${T.badgeBg};
				--primary-color-hover: ${T.errorRed};
			}

			.success .button--primary,
			.success .button--primary:visited {
				background: var(--pp-dark-blue);
				border-color: var(--pp-dark-blue);
				color: var(--pp-light-blue);
			}
			.success .button--primary:hover {
				background: var(--pp-dark-blue-hover);
				border-color: var(--pp-dark-blue-hover);
				color: var(--pp-light-blue);
			}

			/* Two auto margins, not one: a single auto takes all the free space
			   and jams the content against the top. */
			/* Pushpay caps this copy at 380px, which is half of a card this
			   wide. See theme.successMeasure. */
			.success-title,
			.success-description,
			.success-confirm,
			.success-table,
			.success-redirect-section-heading,
			.success-redirect-section-description,
			.success-redirect-section-disclaimer,
			.success-redirect-section-button {
				max-width: ${T.successMeasure};
			}

			.success-content > :first-child {
				margin-top: auto;
			}
			.success-footer {
				margin-top: auto;
				padding-top: ${T.panelGap};
			}

			/* ---------- responsive: matches Pushpay's own 600px breakpoint ---------- */
			@media only screen and (max-width: 600px) {
				.form-footer {
					padding: ${T.submitGap} 0 0;
				}

				label[data-pp-at-target="amountInput-label"] {
					grid-template-columns: minmax(0, 1fr);
					grid-template-areas:
						"eyebrow"
						"amount"
						"quick"
						"message";
					justify-items: center;
					row-gap: 14px;
					min-height: 0;
					margin-bottom: 25px;
				}
				.pp-eyebrow {
					margin-bottom: 0;
					text-align: center;
				}
				label[data-pp-at-target="amountInput-label"] > .amount-field {
					width: fit-content;
					max-width: 100%;
					margin-inline: auto;
				}
				label[data-pp-at-target="amountInput-label"] .amount-field-prefix,
				#amountInput.amount-field-input {
					font-size: ${T.amountSizeMobile};
				}
				/* Five figures and up, keyed off the digits before the decimal
				   point. field-sizing cannot help here: the field is already
				   at its max-width, so the size has to come down instead. */
				label[data-pp-at-target="amountInput-label"][data-pp-amount="long"] .amount-field-prefix,
				label[data-pp-at-target="amountInput-label"][data-pp-amount="long"] #amountInput.amount-field-input {
					font-size: ${T.amountSizeLong};
				}
				#amountInput.amount-field-input {
					width: 7ch;
				}
				/* The fallback width has to grow with the value; where
				   field-sizing is supported the block below takes over. */
				label[data-pp-at-target="amountInput-label"][data-pp-amount="long"] #amountInput.amount-field-input {
					width: 11ch;
				}

				.pp-quick-grid {
					width: 100%;
					gap: 8px;
				}
				.pp-quick-btn {
					padding: 8px;
					font-size: 16px;
				}

				.pp-freq-grid {
					flex-wrap: wrap;
					gap: ${T.quickGap};
				}
				.pp-freq-btn {
					flex: 1 1 45%;
				}
				.pp-freq-long {
					display: none;
				}
				.pp-freq-short {
					display: inline;
				}
				.form-footer:has(.alternative-payment-buttons-wrapper) {
					grid-template-columns: 1fr;
					grid-template-areas:
						"alt"
						"or"
						"submit"
						"note"
						"powered"
						"terms";
					row-gap: 12px;
				}
				.form-footer:has(.alternative-payment-buttons-wrapper):has(> .alertBox) {
					grid-template-areas:
						"error"
						"alt"
						"or"
						"submit"
						"note"
						"powered"
						"terms";
				}
				.alternative-payment-buttons-horizontal {
					height: auto;
				}
			}

			@media only screen and (max-width: 360px) {
				.pp-quick-btn {
					font-size: 14px;
				}
				/* An SE-sized phone leaves 256px of card, which is 30px less
				   than "$9999.00" needs at the size above. One step of 0.82
				   covers both tiers: 43px holds a four-figure amount and 33px
				   a six-figure one, each with enough slack that a wider
				   display face than the fallback still fits. */
				label[data-pp-at-target="amountInput-label"] .amount-field-prefix,
				#amountInput.amount-field-input {
					font-size: calc(${T.amountSizeMobile} * 0.82);
				}
				label[data-pp-at-target="amountInput-label"][data-pp-amount="long"] .amount-field-prefix,
				label[data-pp-at-target="amountInput-label"][data-pp-amount="long"] #amountInput.amount-field-input {
					font-size: calc(${T.amountSizeLong} * 0.82);
				}
			}

			@supports (field-sizing: content) {
				@media only screen and (max-width: 600px) {
					#amountInput.amount-field-input,
					label[data-pp-at-target="amountInput-label"][data-pp-amount="long"] #amountInput.amount-field-input {
						width: auto;
						field-sizing: content;
					}
				}
			}
		`;
		shadowRoot.appendChild(style);
	}

	// ---------------------------------------------------------------------
	// Injected elements (appended only — never re-parented)
	// ---------------------------------------------------------------------

	const RECURRING_ICON = `
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<polyline points="23 4 23 10 17 10"></polyline>
			<polyline points="1 20 1 14 7 14"></polyline>
			<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
		</svg>`;

	const amountLabelOf = root => root.querySelector('label[data-pp-at-target="amountInput-label"]');

	function ensureEyebrow(root) {
		const label = amountLabelOf(root);
		if (!label || CONFIG.eyebrowText == null || label.querySelector('.pp-eyebrow')) return;
		label.appendChild(el('span', 'pp-eyebrow', CONFIG.eyebrowText));
	}

	// "$1,200", not "$1200".
	const money = n => `$${Number(n).toLocaleString('en-US')}`;

	function ensureQuickAmounts(root) {
		const label = amountLabelOf(root);
		if (!label || label.querySelector('.pp-quick-grid')) return;

		const grid = el('div', 'pp-quick-grid');
		CONFIG.quickAmounts.forEach(amount => {
			const btn = el('button', 'pp-quick-btn', money(amount));
			btn.type = 'button';
			btn.dataset.ppAmount = String(amount);
			grid.appendChild(btn);
		});
		label.appendChild(grid);
	}

	/** Keeps the amount input's own accessible name — the quick-amount tiles are appended inside its label. */
	function ensureAmountLabel(root) {
		const input = root.getElementById('amountInput');
		const text = root.querySelector('label[data-pp-at-target="amountInput-label"] > .form-control-text');
		if (!input || !text) return;

		const name = text.textContent.trim().replace(/\*+$/, '').trim();
		if (name && input.getAttribute('aria-label') !== name) input.setAttribute('aria-label', name);
	}

	function ensureRecurringHead(root) {
		const card = root.querySelector('.recurring-container');
		if (!card || card.querySelector('.pp-recurring-head')) return;

		const head = el('div', 'pp-recurring-head');
		head.insertAdjacentHTML('afterbegin', RECURRING_ICON);
		head.appendChild(el('span', 'pp-recurring-title', CONFIG.recurringLabel));

		const toggle = el('button', 'pp-toggle');
		toggle.type = 'button';
		toggle.setAttribute('role', 'switch');
		toggle.setAttribute('aria-label', CONFIG.recurringLabel);
		toggle.setAttribute('aria-checked', 'false');
		head.appendChild(toggle);

		card.appendChild(head);
	}

	/** Builds the frequency pills from the frequencies the account offers. */
	function ensureFrequencyPills(root) {
		const fields = root.querySelector('.recurring-fields');
		const select = root.getElementById('recurring-field-frequency');
		if (!fields || !select || fields.querySelector('.pp-freq-grid')) return;

		const grid = el('div', 'pp-freq-grid');
		CONFIG.frequencies.forEach(freq => {
			const option = Array.from(select.options).find(o => norm(o.textContent).includes(norm(freq.match)));
			if (!option) return; // the merchant does not offer it — don't fake it

			const btn = el('button', 'pp-freq-btn');
			btn.type = 'button';
			btn.dataset.ppFreq = option.value;
			if (freq.short) {
				btn.appendChild(el('span', 'pp-freq-long', freq.label));
				btn.appendChild(el('span', 'pp-freq-short', freq.short));
			} else {
				btn.textContent = freq.label;
			}
			grid.appendChild(btn);
		});
		if (!grid.children.length) return;

		fields.appendChild(el('span', 'pp-freq-label', CONFIG.frequencyLabel));
		fields.appendChild(grid);
	}

	function ensureOrSeparator(root) {
		const footer = root.querySelector('.form-footer');
		if (!footer || footer.querySelector('.pp-or')) return;
		footer.appendChild(el('span', 'pp-or', 'OR'));
	}

	function ensureNote(root) {
		const footer = root.querySelector('.form-footer');
		if (!footer || CONFIG.noteText == null || footer.querySelector('.pp-note')) return;

		const note = el('div', 'pp-note');
		note.appendChild(el('span', 'pp-note-text', CONFIG.noteText));
		footer.appendChild(note);
	}

	/** The give button carries the amount, so its label is rewritten on every pass. */
	function relabelSubmit(root) {
		if (CONFIG.submitLabel == null) return;
		const span = root.querySelector('.form-footer button[type="submit"] > span');
		if (!span) return;

		const input = root.getElementById('amountInput');
		const parsed = Number((input && input.value) || 0);
		const amount = Number.isFinite(parsed) ? parsed : 0;
		const label = typeof CONFIG.submitLabel === 'function' ? CONFIG.submitLabel(amount) : CONFIG.submitLabel;

		if (span.textContent !== label) span.textContent = label;
	}

	/** Holds the fund on CONFIG.fundLock.fund — see fundLock.fallback. */
	function syncFundLock(root) {
		const lock = CONFIG.fundLock;
		if (!lock || !lock.fallback || !lock.fund) return;

		const select = root.getElementById('fundKeyOrName');
		if (!select || !select.options.length) return;

		const wanted = norm(lock.fund);
		const option = Array.from(select.options).find(o => norm(o.textContent) === wanted || norm(o.value) === wanted);

		if (!option) {
			// Wrong account, renamed fund, or a fund that is not visible:
			// say so once and leave the donor a working field.
			if (!root.__ppFundWarned) {
				root.__ppFundWarned = true;
				console.warn(`[pp-cf] no fund matching "${lock.fund}" — leaving the fund field alone.`);
			}
			return;
		}

		if (select.value !== option.value) setNativeValue(select, option.value);
	}

	// ---------------------------------------------------------------------
	// State sync — injected controls mirror the real form controls
	// ---------------------------------------------------------------------

	/**
	 * Marks which tile is selected, and writes the two states the amount
	 * block is styled from: whether the tiles are still worth showing, and
	 * whether the amount is long enough to need the smaller mobile size.
	 */
	function syncQuickAmounts(root) {
		const input = root.getElementById('amountInput');
		if (!input) return;

		const current = Number(input.value);
		root.querySelectorAll('.pp-quick-btn').forEach(btn => {
			btn.classList.toggle('pp-active', Number(btn.dataset.ppAmount) === current);
		});

		const label = amountLabelOf(root);
		if (!label) return;

		// The tiles are suggestions: past the largest one they are no longer
		// suggesting anything, and the amount can have the whole row.
		const quick = Number.isFinite(current) && current > MAX_QUICK_AMOUNT ? 'off' : 'on';
		if (label.dataset.ppQuick !== quick) label.dataset.ppQuick = quick;

		// Digits before the decimal point, so "999999.00" counts as six.
		// Five is where the mobile hero runs out of card.
		const digits = String(input.value || '').split('.')[0].replace(/\D/g, '').length;
		const long = digits >= 5 ? 'long' : 'short';
		if (label.dataset.ppAmount !== long) label.dataset.ppAmount = long;
	}

	function syncRecurringToggle(root) {
		const toggle = root.querySelector('.pp-toggle');
		const card = root.querySelector('.recurring-container');
		const recurringRadio = root.getElementById('recurring-toggle-multiple');
		if (!toggle || !card || !recurringRadio) return;

		const on = Boolean(recurringRadio.checked);

		// Drives the divider and the panel gap.
		const next = on ? 'on' : 'off';
		if (card.dataset.ppRecurring !== next) card.dataset.ppRecurring = next;
		if (toggle.getAttribute('aria-checked') !== String(on)) {
			toggle.setAttribute('aria-checked', String(on));
		}

		toggle.style.setProperty('--pp-knob', on ? '20px' : '0px');
		toggle.style.setProperty('background-color', on ? 'var(--pp-blue)' : 'var(--pp-border)', 'important');
	}

	function syncFrequency(root) {
		const select = root.getElementById('recurring-field-frequency');
		if (!select) return;
		root.querySelectorAll('.pp-freq-btn').forEach(btn => {
			btn.classList.toggle('pp-active', btn.dataset.ppFreq === select.value);
		});
	}

	function syncAll(root) {
		syncQuickAmounts(root);
		syncRecurringToggle(root);
		syncFrequency(root);
		syncFundLock(root);
		relabelSubmit(root);
	}

	// ---------------------------------------------------------------------
	// Behaviour
	// ---------------------------------------------------------------------

	function wireEvents(root) {
		if (root.__ppRestyleWired) return;
		root.__ppRestyleWired = true;

		root.addEventListener('click', event => {
			const target = event.target instanceof Element ? event.target : null;
			if (!target) return;

			const quick = target.closest('.pp-quick-btn');
			if (quick) {
				const input = root.getElementById('amountInput');
				if (input) {
					setNativeValue(input, Number(quick.dataset.ppAmount).toFixed(2));
					syncQuickAmounts(root);
				}
				return;
			}

			// The whole header row toggles, not just the switch.
			if (target.closest('.pp-toggle') || target.closest('.pp-recurring-head')) {
				const isRecurring = Boolean(root.getElementById('recurring-toggle-multiple')?.checked);
				const radio = root.getElementById(isRecurring ? 'recurring-toggle-once' : 'recurring-toggle-multiple');
				if (radio) radio.click();
				syncRecurringToggle(root);
				return;
			}

			const freq = target.closest('.pp-freq-btn');
			if (freq) {
				const select = root.getElementById('recurring-field-frequency');
				if (select) {
					setNativeValue(select, freq.dataset.ppFreq);
					syncFrequency(root);
				}
			}

			// Select cards need no handler: the <select> fills its card in CSS,
			// so a click anywhere inside the border opens it natively.
		});

		// Typing a custom amount, or any change the form makes itself,
		// re-syncs the added controls. Capture, because these fire on inner
		// elements.
		root.addEventListener('input', () => {
			syncQuickAmounts(root);
			relabelSubmit(root);
		}, true);
		root.addEventListener('change', () => syncAll(root), true);
	}

	function applyHostVariables(host) {
		if (CONFIG.widgetWidth) host.style.setProperty('--pushpay-widget-width', CONFIG.widgetWidth);
		if (CONFIG.primaryColor) host.style.setProperty('--pushpay-widget-primary-color', CONFIG.primaryColor);
	}

	function apply(root) {
		if (!root.getElementById('amountInput')) return; // success screen / error state

		injectStyles(root);
		ensureEyebrow(root);
		ensureQuickAmounts(root);
		ensureAmountLabel(root);
		ensureRecurringHead(root);
		ensureFrequencyPills(root);
		ensureOrSeparator(root);
		ensureNote(root);
		wireEvents(root);
		syncAll(root);

		if (CONFIG.defaultAmount != null && !root.__ppDefaultApplied) {
			const input = root.getElementById('amountInput');
			if (input && !input.value) {
				setNativeValue(input, Number(CONFIG.defaultAmount).toFixed(2));
				syncQuickAmounts(root);
			}
			root.__ppDefaultApplied = true;
		}
	}

	// ---------------------------------------------------------------------
	// Start, and stay applied
	// ---------------------------------------------------------------------

	function attach(host) {
		const root = host.shadowRoot;
		if (!root) return;

		applyHostVariables(host);

		// The modal keeps the form hidden until the restyle has landed, so
		// Pushpay's own styling never gets a frame.
		const markReady = () => {
			if (!host.hasAttribute(READY_FLAG)) host.setAttribute(READY_FLAG, '');
		};

		waitFor('#amountInput', root)
			.then(() => {
				apply(root);
				markReady();

				// The form re-renders constantly and drops injected nodes, so this
				// re-applies on a debounced pass.
				let queued = false;
				new MutationObserver(() => {
					if (queued) return;
					queued = true;
					requestAnimationFrame(() => {
						queued = false;
						try {
							apply(root);
						} catch (err) {
							console.warn('[pp-restyle] re-apply failed:', err);
						}
					});
				}).observe(root, {
					childList: true,
					subtree: true,
					characterData: true,
					attributeFilter: ['class'],
				});
			})
			.catch(err => {
				console.error('[pp-restyle]', err.message);
				// Show the form regardless: unstyled and working beats hidden.
				markReady();
			});

		setTimeout(markReady, (CONFIG.modal && CONFIG.modal.readyTimeout) || 8000);
	}

	const findHost = () => {
		for (const id of CONFIG.hostIds) {
			const node = document.getElementById(id);
			if (node) return node;
		}
		return null;
	};

	function start() {
		// Attach to whatever host currently carries one of the ids. This has
		// to poll: a shadow root appearing is not a mutation an observer can
		// see, and PushpayWidget.update() replaces the host outright.
		let attached = null;
		const check = () => {
			const current = findHost();
			if (current && current.shadowRoot && current !== attached) {
				attached = current;
				attach(current);
			}
			return Boolean(attached);
		};

		if (check()) return;

		const started = Date.now();
		const poll = setInterval(() => {
			if (check()) {
				clearInterval(poll);
				// Keep watching for host replacement, but cheaply.
				setInterval(check, 1000);
			} else if (Date.now() - started > 20000) {
				clearInterval(poll);
				console.error('[pp-restyle] widget shadow root never appeared.');
			}
		}, 100);
	}

	// ---------------------------------------------------------------------
	// MODAL
	//
	// The overlay, the card, the badge and heading, and the lazy load of
	// the giving form. All of it is the page's own DOM, so these styles
	// go into document.head.
	// ---------------------------------------------------------------------

	const M = CONFIG.modal;
	const MODAL_STYLE_FLAG = 'data-pp-modal-style';

	function injectModalStyles() {
		if (document.querySelector(`style[${MODAL_STYLE_FLAG}]`)) return;

		const style = document.createElement('style');
		style.setAttribute(MODAL_STYLE_FLAG, 'true');
		style.textContent = `
			/* The modal's elements are the page's own DOM, so they inherit its
			   box model. Scoped here so nothing on the page is touched. */
			.pp-modal,
			.pp-modal *,
			.pp-modal *::before,
			.pp-modal *::after {
				box-sizing: border-box;
			}

			.pp-modal {
				position: fixed;
				inset: 0;
				z-index: 9999;
				display: none;
				align-items: center;
				justify-content: center;
				padding: 16px;
				overflow: auto;
				background: ${T.overlay};
				-webkit-backdrop-filter: blur(${T.overlayBlur});
				backdrop-filter: blur(${T.overlayBlur});
				opacity: 0;
				transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
			}
			.pp-modal.is-open {
				display: flex;
			}
			.pp-modal.is-visible {
				opacity: 1;
			}

			/* The card. */
			.pp-modal-card {
				position: relative;
				display: flex;
				flex-direction: column;
				gap: ${T.panelGap};
				width: 100%;
				max-width: ${M.maxWidth};
				max-height: 90vh;
				overflow: auto;
				padding: ${T.cardPadding};
				background: ${T.card};
				border-radius: ${T.cardRadius};
				box-shadow: ${T.modalShadow};
				transform: translateY(12px) scale(0.98);
				transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				font-family: ${T.font};
			}
			.pp-modal.is-visible .pp-modal-card {
				transform: none;
			}

			.pp-modal-close {
				position: absolute;
				top: 20px;
				right: 20px;
				display: flex;
				align-items: center;
				justify-content: center;
				width: 36px;
				height: 36px;
				padding: 0;
				border: 0;
				border-radius: 9999px;
				background: transparent;
				color: ${T.heading};
				cursor: pointer;
			}
			.pp-modal-close:hover {
				background: rgba(20, 72, 92, 0.08);
			}
			.pp-modal-close:focus-visible {
				outline: 2px solid ${T.focus};
				outline-offset: 2px;
			}

			/* The badge. */
			.pp-modal-badge {
				align-self: flex-start;
				display: flex;
				align-items: center;
				padding: 6px 16px;
				border-radius: 9999px;
				background: ${T.badgeBg};
				color: #fff;
				font-family: ${T.font};
				font-size: 11px;
				font-weight: 900;
				line-height: 1.5;
				letter-spacing: ${T.badgeTracking};
				text-transform: uppercase;
			}

			/* The heading, one line per CONFIG.headingLines entry. */
			.pp-modal-heading {
				margin: 0;
				color: ${T.heading};
				font-family: ${T.displayFont};
				font-size: ${T.headingSize};
				font-weight: 800;
				line-height: ${T.headingLine};
				text-transform: uppercase;
			}
			.pp-modal-heading span {
				display: block;
			}

			/* The form is kept out of sight until the restyle has been applied.
			   height:0 rather than display:none, because it still has to lay out
			   in order to measure itself. attach() sets the flag, with
			   CONFIG.modal.readyTimeout as a failsafe. */
			.pp-modal-card [${HOST_FLAG}]:not([${READY_FLAG}]) {
				height: 0;
				overflow: hidden;
				visibility: hidden;
			}
			.pp-modal-card [${HOST_FLAG}][${READY_FLAG}] {
				animation: pp-fade-in 0.15s ease both;
			}
			@keyframes pp-fade-in {
				from { opacity: 0; }
				to { opacity: 1; }
			}

			/* Stands in for the form until then. */
			.pp-modal-loading {
				padding: 40px 0;
				color: ${T.label};
				font-family: ${T.font};
				font-size: 14px;
				text-align: center;
			}

			body.${M.bodyClass} {
				overflow: hidden;
			}

			@media only screen and (max-width: 600px) {
				.pp-modal {
					padding: 8px;
				}
				.pp-modal-card {
					max-height: 88vh;
					padding: 28px 24px;
					border-radius: 28px;
				}
				.pp-modal-heading {
					font-size: 30px;
					line-height: 34px;
				}
			}

			@media (prefers-reduced-motion: reduce) {
				.pp-modal,
				.pp-modal-card {
					transition: none;
				}
				.pp-modal-card [${HOST_FLAG}][${READY_FLAG}] {
					animation: none;
				}
			}
		`;
		document.head.appendChild(style);
	}

	const CLOSE_ICON = `
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
			 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
			<path d="M18 6 6 18M6 6l12 12"></path>
		</svg>`;

	const HEADING_ID = 'pp-modal-heading';

	/**
	 * Builds the overlay. A host element the page already provides is
	 * adopted rather than duplicated; one that already has the form
	 * mounted in it is left where it is.
	 */
	function buildModal() {
		const overlay = el('div', 'pp-modal');
		overlay.setAttribute('data-pp-modal', '');
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.setAttribute('aria-hidden', 'true');
		overlay.setAttribute('aria-labelledby', HEADING_ID);

		const card = el('div', 'pp-modal-card');

		const close = el('button', 'pp-modal-close');
		close.type = 'button';
		close.setAttribute('data-pp-give-close', '');
		close.setAttribute('aria-label', 'Close');
		close.insertAdjacentHTML('afterbegin', CLOSE_ICON);
		card.appendChild(close);

		if (CONFIG.badgeText) card.appendChild(el('span', 'pp-modal-badge', CONFIG.badgeText));

		if (CONFIG.headingLines && CONFIG.headingLines.length) {
			const heading = el('h2', 'pp-modal-heading');
			heading.id = HEADING_ID;
			CONFIG.headingLines.forEach(line => heading.appendChild(el('span', null, line)));
			card.appendChild(heading);
		}

		const existing = findHost();
		if (existing && existing.shadowRoot) {
			console.warn('[pp-cf] the widget is already mounted outside the modal — leaving it there.');
		} else if (existing) {
			existing.setAttribute(HOST_FLAG, '');
			card.appendChild(existing);
		} else {
			const host = el('div');
			host.id = CONFIG.hostIds[0];
			host.setAttribute(HOST_FLAG, '');
			card.appendChild(host);
		}

		card.appendChild(el('div', 'pp-modal-loading', M.loadingText));

		overlay.appendChild(card);
		document.body.appendChild(overlay);
		return overlay;
	}

	function loadWidget() {
		const existing = window.pushpayEmbeddedConfig || {};
		window.pushpayEmbeddedConfig = Object.assign({}, existing, {
			handle: existing.handle || M.handle,
			// Pushpay's own fund parameters. Builds that do not read them yet
			// ignore them, which is what CONFIG.fundLock.fallback covers.
			fnd: existing.fnd || CONFIG.fundLock.fund,
			fndv: existing.fndv || CONFIG.fundLock.visibility,
		});

		if (window.PushpayWidget && typeof window.PushpayWidget.update === 'function') {
			// Already on the page: re-init into the host inside the modal.
			window.PushpayWidget.update(window.pushpayEmbeddedConfig.handle);
			return;
		}

		const script = document.createElement('script');
		script.type = 'text/javascript';
		script.async = true;
		script.src = M.scriptSrc;
		script.onerror = () => console.error('[pp-cf] could not load', M.scriptSrc);
		document.head.appendChild(script);
	}

	function initModal() {
		if (window.__ppGivingModal) return;

		injectModalStyles();
		const overlay = buildModal();
		const card = overlay.querySelector('.pp-modal-card');
		const loading = overlay.querySelector('.pp-modal-loading');

		let loaded = false;
		let lastFocus = null;
		let closeTimer = null;

		// Everything outside the overlay is made inert while it is open.
		// inert reaches into the form's shadow DOM, which a hand-rolled focus
		// trap could not.
		const siblings = () => Array.from(document.body.children).filter(node => node !== overlay);

		// Swaps the loading line for the form once the restyle has landed,
		// which is the same moment the host becomes visible.
		function revealWidget() {
			if (!loading || !loading.isConnected) return;
			const host = findHost();
			if (host && host.hasAttribute(READY_FLAG)) {
				loading.remove();
				return;
			}
			setTimeout(revealWidget, 50);
		}

		function open(event) {
			if (event && event.preventDefault) event.preventDefault();
			if (overlay.classList.contains('is-open')) return;

			lastFocus = document.activeElement;
			if (closeTimer) {
				clearTimeout(closeTimer);
				closeTimer = null;
			}

			overlay.classList.add('is-open');
			overlay.setAttribute('aria-hidden', 'false');
			document.body.classList.add(M.bodyClass);
			siblings().forEach(node => {
				node.inert = true;
			});

			const reveal = () => overlay.classList.add('is-visible');
			if (window.requestAnimationFrame) requestAnimationFrame(reveal);
			setTimeout(reveal, 50);

			if (!loaded) {
				loaded = true;
				loadWidget();
				start();
				revealWidget();
			}

			const closeBtn = overlay.querySelector('.pp-modal-close');
			(closeBtn || card).focus({ preventScroll: true });
		}

		function close(event) {
			if (event && event.preventDefault) event.preventDefault();
			if (!overlay.classList.contains('is-open')) return;

			overlay.classList.remove('is-visible');
			overlay.setAttribute('aria-hidden', 'true');
			document.body.classList.remove(M.bodyClass);
			siblings().forEach(node => {
				node.inert = false;
			});

			// display:none only after the fade, or there is nothing to fade.
			closeTimer = setTimeout(() => {
				overlay.classList.remove('is-open');
				closeTimer = null;
			}, 250);

			if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
		}

		// Delegated, so buttons rendered after this runs still work.
		document.addEventListener('click', event => {
			const target = event.target instanceof Element ? event.target : null;
			if (!target) return;
			if (target.closest(M.closeSelector)) return close(event);
			if (target.closest(M.openSelector)) return open(event);
		});

		// Only the backdrop itself, not a child that happens to bubble.
		overlay.addEventListener('click', event => {
			if (event.target === overlay) close(event);
		});

		document.addEventListener('keydown', event => {
			if ((event.key === 'Escape' || event.key === 'Esc') && overlay.classList.contains('is-open')) close(event);
		});

		window.PushpayGivingModal = {
			open,
			close,
			get isOpen() {
				return overlay.classList.contains('is-open');
			},
		};
		window.__ppGivingModal = true;

		if (M.openOnHash && window.location.hash === M.openOnHash) open();

		if (!M.lazy) {
			loadWidget();
			start();
		}
	}

	if (M) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', initModal);
		} else {
			initModal();
		}
	} else {
		start();
	}
})();
