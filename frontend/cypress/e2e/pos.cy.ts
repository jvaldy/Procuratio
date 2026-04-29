describe('sprint2 pos e2e', () => {
  it('cree, suspend, reprend et encaisse un ticket', () => {
    cy.visit('/login');

    cy.get('input[placeholder="email"]').clear().type('employee@procuratio.local');
    cy.get('input[placeholder="password"]').clear().type('Employee123!');
    cy.contains('button', 'Se connecter').click();

    cy.url().should('include', '/backoffice');
    cy.contains('a', 'Caisse POS').click();
    cy.url().should('include', '/backoffice/pos');

    cy.get('[data-testid^="pos-add-product-"]').first().click();
    cy.get('[data-testid^="pos-add-service-"]').first().click();
    cy.get('[data-testid="pos-cart-count"]').should('contain', 'Panier (2)');

    cy.get('[data-testid="pos-create-ticket"]').click();
    cy.get('[data-testid="pos-active-ticket"]').should('contain', 'statut: open');

    cy.get('[data-testid="pos-suspend"]').click();
    cy.get('[data-testid="pos-active-ticket"]').should('contain', 'statut: suspended');

    cy.get('[data-testid="pos-resume"]').click();
    cy.get('[data-testid="pos-active-ticket"]').should('contain', 'statut: open');

    cy.get('[data-testid="pos-payment-method"]').select('Espèces');
    cy.get('[data-testid="pos-pay"]').click();

    cy.get('[data-testid="pos-active-ticket"]').should('contain', 'paiement: paid');
    cy.get('[data-testid="pos-refresh-history"]').click();
    cy.get('[data-testid="pos-history"] li').its('length').should('be.greaterThan', 0);
  });
});

