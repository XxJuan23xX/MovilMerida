describe('Pruebas E2E - MovilMérida (Escritorio)', () => {
  it('Debe cargar la app en escritorio y navegar por las secciones del Sidebar', () => {
    // 1. Asegurar tamaño de pantalla de PC / Escritorio (pantalla completa o ancha)
    cy.viewport(1280, 800);

    // 2. Visitar la aplicación local en desarrollo
    cy.visit('https://movil-merida.vercel.app/');

    // 3. Verificar que el cuerpo de la aplicación y la interfaz carguen correctamente
    cy.get('body').should('be.visible');

    // 4. Interactuar con las opciones del menú de escritorio (Sidebar)
    // Nota: Hacemos clic en el botón de analítica del menú lateral de PC
    cy.contains('Analítica').click({ force: true });

    // 5. Validar que el dashboard analítico renderice las gráficas correctamente (SVG de Recharts)
    cy.get('svg').should('be.visible');
  });
});