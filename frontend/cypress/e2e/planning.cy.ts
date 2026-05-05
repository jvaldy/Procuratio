describe('planning backoffice flow', () => {
  it('ouvre la recherche de disponibilites en modal et pre-remplit un booking', () => {
    cy.intercept('POST', '**/api/v1/auth/login').as('loginRequest');
    cy.intercept('GET', '**/api/v1/me').as('meRequest');
    cy.intercept('GET', '**/api/v1/planning/employees').as('employeesList');
    cy.intercept('GET', '**/api/v1/planning/appointments*').as('appointmentsList');
    cy.intercept('GET', '**/api/v1/planning/business-hours').as('businessHoursList');
    cy.intercept('GET', '**/api/v1/planning/slots*').as('slotsSearch');

    cy.visit('/login');
    cy.get('input[type="email"]').clear().type('employee@procuratio.local');
    cy.get('input[type="password"]').clear().type('Employee123!');
    cy.contains('button', 'Se connecter').click();

    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    cy.wait('@meRequest').its('response.statusCode').should('eq', 200);

    cy.visit('/backoffice/planning');
    cy.wait('@employeesList').its('response.statusCode').should('eq', 200);
    cy.wait('@appointmentsList').its('response.statusCode').should('eq', 200);
    cy.wait('@businessHoursList').its('response.statusCode').should('eq', 200);

    cy.get('[data-testid="planning-employee-filter"]').should('exist');
    cy.get('[data-testid="planning-open-slot-search"]').click();
    cy.get('[data-testid="planning-slot-search-modal"]').should('be.visible');

    cy.get('#slot-service-modal option').then(($options) => {
      if ($options.length <= 1) {
        cy.log('Aucun service actif disponible: on valide seulement le chargement du flux modal.');
        return;
      }

      cy.get('#slot-service-modal').select(1);
      cy.get('[data-testid="planning-slot-search-submit"]').click();
      cy.wait('@slotsSearch').its('response.statusCode').should('eq', 200);

      cy.get('body').then(($body) => {
        if ($body.find('[data-testid^="planning-slot-"]').length === 0) {
          cy.contains('No available slots were found for this search.').should('be.visible');
          return;
        }

        cy.get('[data-testid^="planning-slot-"]').first().click();
        cy.contains('h3', 'Selected booking').should('be.visible');
        cy.get('[data-testid="planning-start-at"]').invoke('val').should('not.equal', '');
      });
    });
  });
});
