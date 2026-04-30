describe('smoke auth e2e', () => {
  it('se connecte et accede au backoffice', () => {
    cy.visit('/login');
    cy.intercept('POST', '**/api/v1/auth/login').as('loginRequest');
    cy.intercept('GET', '**/api/v1/me').as('meRequest');

    cy.get('input[placeholder="email"]').clear().type('employee@procuratio.local');
    cy.get('input[placeholder="password"]').clear().type('Employee123!');
    cy.contains('button', 'Se connecter').click();

    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    cy.wait('@meRequest').its('response.statusCode').should('eq', 200);
    cy.url({ timeout: 20000 }).should('include', '/backoffice');
    cy.contains('a', 'Planning').should('be.visible');
  });
});
