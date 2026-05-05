describe('client booking modal flow', () => {
  it('ouvre les disponibilites en modal puis affiche selected booking dans la meme modale', () => {
    cy.intercept('POST', '**/api/v1/auth/login').as('loginRequest');
    cy.intercept('GET', '**/api/v1/me').as('meRequest');
    cy.intercept('GET', '**/api/v1/public/booking/employees').as('employeesList');
    cy.intercept('GET', '**/api/v1/public/booking/slots*').as('slotsList');
    cy.intercept('GET', '**/api/v1/client/appointments*').as('appointmentsList');

    cy.visit('/login');
    cy.get('input[type="email"]').clear().type('customer@procuratio.local');
    cy.get('input[type="password"]').clear().type('Customer123!');
    cy.contains('button', 'Se connecter').click();

    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    cy.wait('@meRequest').its('response.statusCode').should('eq', 200);

    cy.visit('/client/booking');
    cy.wait('@employeesList').its('response.statusCode').should('eq', 200);
    cy.wait('@appointmentsList').its('response.statusCode').should('eq', 200);

    cy.get('#booking-service option').then(($options) => {
      if ($options.length <= 1) {
        cy.log('Aucun service actif disponible: on valide seulement le chargement de la page client.');
        return;
      }

      cy.get('#booking-service').select(1);
      cy.get('[data-testid="booking-search-submit"]').click();
      cy.wait('@slotsList').its('response.statusCode').should('eq', 200);
      cy.get('[data-testid="booking-slots-modal"]').should('be.visible');

      cy.get('body').then(($body) => {
        if ($body.find('[data-testid^="booking-slot-"]').length === 0) {
          cy.contains('No slot is available for this date.').should('be.visible');
          return;
        }

        cy.get('[data-testid^="booking-slot-"]').first().click();
        cy.get('[data-testid="booking-selected-modal"]').should('be.visible');
        cy.contains('[data-testid="booking-selected-modal"]', 'Selected booking').should('be.visible');
        cy.get('[data-testid="booking-confirm-modal"]').should('be.visible');
      });
    });
  });
});
