describe('sprint0 smoke', () => {
  it('loads login screen', () => {
    cy.visit('/login');
    cy.contains('Connexion');
  });
});
