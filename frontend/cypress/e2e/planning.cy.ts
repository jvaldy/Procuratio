describe('sprint3 planning e2e', () => {
  it('charge le planning employe et gere les cas disponibles', () => {
    const startAt = '2026-12-07T10:15';
    const uniqueNote = `RDV sprint3 e2e ${Date.now()}`;

    cy.visit('/login');
    cy.intercept('POST', '**/api/v1/auth/login').as('loginRequest');
    cy.intercept('GET', '**/api/v1/me').as('meRequest');
    cy.intercept('GET', '**/api/v1/planning/employees').as('employeesList');
    cy.intercept('GET', '**/api/v1/planning/appointments*').as('appointmentsList');
    cy.intercept('POST', '**/api/v1/planning/appointments').as('appointmentsCreate');
    cy.intercept('POST', '**/api/v1/planning/appointments/*/cancel').as('appointmentsCancel');

    cy.get('input[placeholder="email"]').clear().type('employee@procuratio.local');
    cy.get('input[placeholder="password"]').clear().type('Employee123!');
    cy.contains('button', 'Se connecter').click();

    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    cy.wait('@meRequest').its('response.statusCode').should('eq', 200);

    cy.visit('/backoffice/planning');
    cy.url().should('include', '/backoffice/planning');
    cy.get('[data-testid="planning-view"]', { timeout: 20000 }).should('exist');

    cy.wait('@employeesList').its('response.statusCode').should('eq', 200);
    cy.wait('@appointmentsList').its('response.statusCode').should('eq', 200);

    cy.get('[data-testid="planning-employee"] option', { timeout: 20000 }).its('length').should('be.greaterThan', 1);

    cy.get('[data-testid="availability-employee"]').select(1);
    cy.get('[data-testid="availability-day"]').select('1');
    cy.get('[data-testid="availability-start"]').clear().type('09:00');
    cy.get('[data-testid="availability-end"]').clear().type('18:00');
    cy.get('[data-testid="availability-submit"]').click();
    cy.get('[data-testid="planning-appointments-table"]').should('exist');

    cy.get('[data-testid="planning-service"] option').then(($serviceOptions) => {
      if ($serviceOptions.length <= 1) {
        cy.log('Aucun service actif disponible: on valide seulement le chargement planning + disponibilites.');
        return;
      }

      cy.get('[data-testid="planning-employee"]').select(1);
      cy.get('[data-testid="planning-start-at"]').clear().type(startAt);
      cy.get('[data-testid="planning-service"]').select(1);
      cy.get('[data-testid="planning-quantity"]').clear().type('1');
      cy.get('[data-testid="planning-notes"]').clear().type(uniqueNote);
      cy.get('[data-testid="planning-submit"]').click();

      cy.wait('@appointmentsCreate').its('response.statusCode').should('eq', 201);
      cy.contains('tr', uniqueNote, { timeout: 15000 }).should('be.visible');

      cy.get('[data-testid="planning-start-at"]').clear().type(startAt);
      cy.get('[data-testid="planning-notes"]').clear().type(`${uniqueNote} conflit`);
      cy.get('[data-testid="planning-submit"]').click();
      cy.wait('@appointmentsCreate').its('response.statusCode').should('eq', 400);

      cy.contains('tr', uniqueNote, { timeout: 10000 }).within(() => {
        cy.contains('button', 'Annuler').click();
      });
      cy.wait('@appointmentsCancel').its('response.statusCode').should('eq', 200);
      cy.contains('tr', uniqueNote).contains('td', 'cancelled').should('be.visible');
    });
  });
});
