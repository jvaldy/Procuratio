describe('sprint4 ecommerce e2e', () => {
  it('parcours client catalogue -> panier -> checkout -> suivi commande', () => {
    cy.visit('/login');
    cy.intercept('POST', '**/api/v1/auth/login').as('loginRequest');
    cy.intercept('GET', '**/api/v1/me').as('meRequest');
    cy.intercept('GET', '**/api/v1/catalog/products*').as('catalogRequest');
    cy.get('input[placeholder="email"]').clear().type('customer@procuratio.local');
    cy.get('input[placeholder="password"]').clear().type('Customer123!');
    cy.contains('button', 'Se connecter').click();
    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    cy.wait('@meRequest').its('response.statusCode').should('eq', 200);

    cy.visit('/client/catalog');
    cy.contains('h2', 'Catalogue', { timeout: 20000 }).should('be.visible');
    cy.wait('@catalogRequest').its('response.statusCode').should('eq', 200);
    cy.get('tbody tr').its('length').should('be.greaterThan', 0);
    cy.contains('button', 'Ajouter au panier').first().click();

    cy.visit('/client/cart');
    cy.contains('h2', 'Panier').should('be.visible');
    cy.contains('Passer au paiement').click();

    cy.url().should('include', '/client/checkout');
    cy.contains('button', 'Creer la commande et initier le paiement').click();
    cy.contains('Commande creee').should('be.visible');
    cy.contains('Voir le statut de la commande').click();

    cy.url().should('include', '/client/orders/');
    cy.contains('h2', 'Suivi commande').should('be.visible');
  });
});
