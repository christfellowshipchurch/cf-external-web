const STYLE_ATTRIBUTE = 'data-cf-pushpay-styles';
const HOST_IDS = [
  'pushpay-embedded-giving',
  'pushpay-embedded-giving-fallback',
];

const siteStyles = `
  :host {
    --pushpay-widget-primary-color: #0092bc;
    --font-family: 'Proxima-Nova', Arial, sans-serif;
    color: #222222;
    font-family: 'Proxima-Nova', Arial, sans-serif;
  }

  *,
  *::before,
  *::after {
    font-family: inherit;
  }

  .widget,
  .widget-old,
  .widget--no-alt-payment {
    max-height: none;
  }

  .widget-content,
  .widget-content-old {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: none;
  }

  .widget-form,
  .widget-form-old,
  .scollable-content,
  .scollable-content-old {
    max-height: none;
    overflow: visible;
  }

  .widget-form-title,
  .amount-field-prefix,
  #amountInput.amount-field-input {
    color: #00354d;
  }

  .form-control-text,
  .line-items-total,
  .legal-disclaimer {
    color: #666666;
  }

  .form-control,
  .select-dropdown,
  .amount-field-input {
    border-color: #cccccc;
    border-radius: 6px;
  }

  .form-control:focus,
  .select-dropdown:focus,
  .amount-field-input:focus {
    border-color: #0092bc;
    box-shadow: 0 0 0 2px rgba(0, 146, 188, 0.2);
    outline: none;
  }

  .recurring-container,
  .line-item {
    border-color: #cccccc;
    border-radius: 8px;
  }

  .form-footer button[type='submit'] {
    min-height: 48px;
    background: #0092bc;
    border-color: #0092bc;
    border-radius: 6px;
    color: #ffffff;
    font-size: 18px;
    font-weight: 600;
    transition: background-color 150ms ease, border-color 150ms ease;
  }

  .form-footer button[type='submit']:hover {
    background: #004f71;
    border-color: #004f71;
  }

  .form-footer button[type='submit']:focus-visible,
  button:focus-visible,
  a:focus-visible,
  select:focus-visible,
  input:focus-visible {
    outline: 2px solid #00354d;
    outline-offset: 2px;
  }

  .alertBox-error,
  .form-control-invalid {
    border-color: #b42318;
  }

  .validation-error-message {
    color: #b42318;
  }
`;

function findHost() {
  for (const id of HOST_IDS) {
    const host = document.getElementById(id);
    if (host) return host;
  }
  return null;
}

function injectStyles(root: NonNullable<HTMLElement['shadowRoot']>) {
  if (root.querySelector(`style[${STYLE_ATTRIBUTE}]`)) return;

  const style = document.createElement('style');
  style.setAttribute(STYLE_ATTRIBUTE, 'true');
  style.textContent = siteStyles;
  root.appendChild(style);
}

export function applyPushpaySiteStyles() {
  let active = true;
  let attachedHost: HTMLElement | null = null;
  let observer: InstanceType<typeof window.MutationObserver> | null = null;

  const attach = () => {
    const host = findHost();
    if (!host?.shadowRoot) return false;

    host.style.setProperty('--pushpay-widget-width', '730px');
    host.style.setProperty('--pushpay-widget-primary-color', '#0092bc');

    if (host !== attachedHost) {
      observer?.disconnect();
      attachedHost = host;
      injectStyles(host.shadowRoot);
      observer = new window.MutationObserver(() => {
        if (active && host.shadowRoot) injectStyles(host.shadowRoot);
      });
      observer.observe(host.shadowRoot, { childList: true });
    }

    return true;
  };

  attach();
  const intervalId = window.setInterval(attach, 100);
  const timeoutId = window.setTimeout(() => {
    window.clearInterval(intervalId);
  }, 20_000);

  return () => {
    active = false;
    window.clearInterval(intervalId);
    window.clearTimeout(timeoutId);
    observer?.disconnect();
    attachedHost?.shadowRoot
      ?.querySelector(`style[${STYLE_ATTRIBUTE}]`)
      ?.remove();
    attachedHost?.style.removeProperty('--pushpay-widget-width');
    attachedHost?.style.removeProperty('--pushpay-widget-primary-color');
  };
}
