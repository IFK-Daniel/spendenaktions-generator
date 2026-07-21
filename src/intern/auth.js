import { isAuthenticated, setAuthenticated, clearAuthenticated } from "../../core/auth/authSession.js";
import { requestLogin } from "../../core/auth/requestLogin.js";

/**
 * Verdrahtet Login-Formular, Logout-Button und die Sichtbarkeit von
 * Login-/App-Bereich. Enthält keine Materialgenerator-Logik — siehe
 * `src/intern/generator.js`. Ruft `onAuthenticated` genau einmal pro
 * Seitenaufruf auf, sobald eine gültige Anmeldung vorliegt (entweder
 * bereits beim Laden über `sessionStorage`, oder nach einem
 * erfolgreichen Login).
 *
 * @param {{ onAuthenticated: () => void }} params
 */
export function initAuth({ onAuthenticated }) {
  const storage = window.sessionStorage;

  const loginSection = document.getElementById("login-section");
  const appContent = document.getElementById("app-content");
  const logoutBtn = document.getElementById("logout-btn");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("login-username-input");
  const passwordInput = document.getElementById("login-password-input");
  const loginError = document.getElementById("login-error-message");

  function showLogin() {
    loginSection.hidden = false;
    appContent.hidden = true;
    logoutBtn.hidden = true;
  }

  function showApp() {
    loginSection.hidden = true;
    appContent.hidden = false;
    logoutBtn.hidden = false;
  }

  function showLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = false;
  }

  function clearLoginError() {
    loginError.hidden = true;
    loginError.textContent = "";
  }

  async function handleLogin() {
    clearLoginError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
      showLoginError("Bitte Benutzername und Passwort eintragen.");
      return;
    }

    const result = await requestLogin({ username, password });
    if (!result.ok) {
      showLoginError(result.error || "Anmeldung fehlgeschlagen.");
      return;
    }

    passwordInput.value = "";
    setAuthenticated(storage);
    showApp();
    onAuthenticated();
  }

  function handleLogout() {
    clearAuthenticated(storage);
    usernameInput.value = "";
    passwordInput.value = "";
    showLogin();
  }

  loginBtn.addEventListener("click", handleLogin);
  passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleLogin();
    }
  });
  logoutBtn.addEventListener("click", handleLogout);

  if (isAuthenticated(storage)) {
    showApp();
    onAuthenticated();
  } else {
    showLogin();
  }
}
