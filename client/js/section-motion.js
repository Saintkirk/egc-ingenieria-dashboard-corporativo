const labels = element => {
  if (element.id === 'resultado-revision') return 'Resultado de la revisión';
  if (element.matches('.kpis')) return 'Estados del sitio';
  if (element.matches('.ops-summary')) return 'Resumen operativo';
  if (element.matches('.workflow-overview')) return 'Flujo de operación';
  if (element.matches('.filtros')) return 'Filtros y acciones';
  if (element.matches('table')) return 'Sitios en seguimiento';
  if (element.matches('.work-hero')) return 'Resumen del rol';
  if (element.matches('.work-guidance')) return 'Guía de trabajo';
  if (element.matches('.work-list')) return 'Trabajo asignado';
  return element.querySelector('h2, h3, b')?.textContent?.trim() || 'Sección';
};

const sectionTargets = main => [...main.children].filter(element =>
  !element.matches('.motion-section, .section-heading, script, noscript')
);

export function initSectionMotion() {
  document.querySelectorAll('main.content').forEach(main => {
    sectionTargets(main).forEach((element, index) => {
      const wrapper = document.createElement('section');
      wrapper.className = 'motion-section';
      wrapper.dataset.motionIndex = String(index);

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'section-toggle';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.innerHTML = `<span>${labels(element)}</span><span class="section-toggle-icon" aria-hidden="true">+</span>`;

      const body = document.createElement('div');
      body.className = 'motion-section-body';
      body.append(element);
      wrapper.append(toggle, body);
      main.replaceChild(wrapper, element);

      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        wrapper.classList.toggle('is-collapsed', open);
      });
    });
  });
}
