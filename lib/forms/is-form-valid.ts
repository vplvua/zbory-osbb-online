export function isFormValid(form: HTMLFormElement) {
  return form.querySelector(':invalid') === null;
}
