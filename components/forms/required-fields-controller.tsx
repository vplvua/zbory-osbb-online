'use client';

import { useEffect } from 'react';

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const REQUIRED_CONTROL_SELECTOR = 'input[required], select[required], textarea[required]';

function isFormControl(target: EventTarget | null): target is FormControl {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

function isSupportedRequiredControl(control: FormControl) {
  return !(control instanceof HTMLInputElement && control.type === 'hidden');
}

function setLabelRequired(label: HTMLLabelElement, isRequired: boolean) {
  if (isRequired) {
    label.dataset.required = 'true';
    label.dataset.requiredAuto = 'true';
    return;
  }

  if (label.dataset.requiredAuto === 'true') {
    delete label.dataset.requiredAuto;
    if (label.dataset.requiredManual !== 'true') {
      delete label.dataset.required;
    }
  }
}

function syncLabelRequiredState(label: HTMLLabelElement) {
  const targetId = label.htmlFor;
  if (!targetId) {
    setLabelRequired(label, false);
    return;
  }

  const target = document.getElementById(targetId);
  if (!isFormControl(target)) {
    setLabelRequired(label, false);
    return;
  }

  setLabelRequired(label, target.required && isSupportedRequiredControl(target));
}

function syncAllRequiredLabels() {
  const labels = document.querySelectorAll('label[for]');
  labels.forEach((label) => {
    if (!(label instanceof HTMLLabelElement)) {
      return;
    }

    syncLabelRequiredState(label);
  });
}

function syncControlInvalidState(control: FormControl) {
  if (!isSupportedRequiredControl(control) || control.disabled) {
    control.removeAttribute('aria-invalid');
    return;
  }

  const isTouched = control.dataset.touched === 'true';
  if (!isTouched) {
    control.removeAttribute('aria-invalid');
    return;
  }

  if (control.validity.valid) {
    control.removeAttribute('aria-invalid');
    return;
  }

  control.setAttribute('aria-invalid', 'true');
}

function markControlTouched(control: FormControl) {
  control.dataset.touched = 'true';
}

function syncAllControls() {
  const controls = document.querySelectorAll(REQUIRED_CONTROL_SELECTOR);
  controls.forEach((control) => {
    if (!isFormControl(control)) {
      return;
    }

    syncControlInvalidState(control);
  });
}

export default function RequiredFieldsController() {
  useEffect(() => {
    let frameId = 0;

    const scheduleSync = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        syncAllRequiredLabels();
        syncAllControls();
      });
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isFormControl(event.target)) {
        return;
      }

      if (!event.target.required || !isSupportedRequiredControl(event.target)) {
        return;
      }

      markControlTouched(event.target);
      syncControlInvalidState(event.target);
    };

    const handleInputOrChange = (event: Event) => {
      if (!isFormControl(event.target)) {
        return;
      }

      if (!event.target.required || !isSupportedRequiredControl(event.target)) {
        return;
      }

      if (event.target.dataset.touched !== 'true') {
        return;
      }

      syncControlInvalidState(event.target);
    };

    const handleInvalid = (event: Event) => {
      if (!isFormControl(event.target)) {
        return;
      }

      if (!event.target.required || !isSupportedRequiredControl(event.target)) {
        return;
      }

      markControlTouched(event.target);
      syncControlInvalidState(event.target);
    };

    const handleReset = (event: Event) => {
      if (!(event.target instanceof HTMLFormElement)) {
        return;
      }

      event.target.querySelectorAll(REQUIRED_CONTROL_SELECTOR).forEach((control) => {
        if (!isFormControl(control)) {
          return;
        }

        delete control.dataset.touched;
        control.removeAttribute('aria-invalid');
      });
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['required', 'id', 'for'],
    });

    scheduleSync();
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('input', handleInputOrChange, true);
    document.addEventListener('change', handleInputOrChange, true);
    document.addEventListener('invalid', handleInvalid, true);
    document.addEventListener('reset', handleReset, true);

    return () => {
      observer.disconnect();
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('input', handleInputOrChange, true);
      document.removeEventListener('change', handleInputOrChange, true);
      document.removeEventListener('invalid', handleInvalid, true);
      document.removeEventListener('reset', handleReset, true);
    };
  }, []);

  return null;
}
