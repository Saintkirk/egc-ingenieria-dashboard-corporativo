import { ROLES, urlPara } from './roles.js';

const perfilCard = (rol, perfil) => `
  <article class="profile-card">
    <div class="profile-card-head">
      <div>
        <span class="profile-kicker">Perfil operativo</span>
        <h3>${perfil.etiqueta}</h3>
      </div>
      <span class="profile-initial" aria-hidden="true">${perfil.etiqueta.charAt(0)}</span>
    </div>
    <p>${perfil.descripcion}</p>
    <ul>${perfil.permisos.map(permiso => `<li>${permiso}</li>`).join('')}</ul>
    <a class="btn profile-card-action" href="${urlPara(perfil.inicio, rol)}">Ingresar como ${perfil.etiqueta}</a>
  </article>`;

export function initLoginFlow() {
  const container = document.querySelector('[data-login-profiles]');
  if (!container) return;
  container.innerHTML = Object.entries(ROLES).map(([rol, perfil]) => perfilCard(rol, perfil)).join('');
}
