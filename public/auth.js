'use strict';
const form = document.querySelector('#access');
const title = document.querySelector('#access-title');
const toggle = document.querySelector('#access-mode');
const submit = document.querySelector('#access-submit');
const feedback = document.querySelector('#access-error');
const registering = () => location.hash === '#register';

function changeMode() {
  const register = registering();
  for (const name of ['name', 'confirmation']) {
    const input = form.elements[name];
    input.closest('label').hidden = !register;
    input.disabled = !register;
    input.required = register;
  }
  form.elements.password.value = '';
  form.elements.confirmation.value = '';
  form.elements.password.minLength = register ? 8 : 1;
  form.elements.password.autocomplete = register ? 'new-password' : 'current-password';
  form.elements.password.placeholder = register ? 'Минимум 8 символов' : '';
  title.textContent = register ? 'Регистрация' : 'Вход в кабинет';
  document.title = title.textContent + ' · ИТ Платформа';
  submit.textContent = register ? 'Зарегистрироваться' : 'Войти';
  toggle.textContent = register ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт';
  toggle.href = register ? '#login' : '#register';
  feedback.textContent = '';
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const register = registering();
  const data = Object.fromEntries(new FormData(form));
  if (register && data.password !== data.confirmation) {
    feedback.textContent = 'Пароли не совпадают.';
    form.elements.confirmation.focus();
    return;
  }
  delete data.confirmation;
  submit.disabled = true;
  feedback.textContent = '';
  try {
    const response = await fetch(register ? '/api/register' : '/api/login', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    location.replace('/');
  } catch (err) {
    feedback.textContent = err instanceof TypeError ? 'Нет связи с сервером. Попробуйте ещё раз.' : err.message;
  } finally {
    submit.disabled = false;
  }
});
window.addEventListener('hashchange', changeMode);
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
changeMode();
