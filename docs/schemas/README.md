# Schemas techniques Procuratio

Ces schemas refletent l'etat actuel du code au 2026-06-01.

## Fichiers generes

- `01_architecture_globale` : vue d'ensemble frontend, API, base, Stripe, notifications et Docker.
- `02_circulation_interne_http` : trajet d'une requete HTTP jusqu'a la reponse JSON.
- `03_cas_utilisation` : acteurs et cas d'utilisation reels par role.
- `04_mcd_simplifie` : modele conceptuel simplifie depuis les entites Doctrine.
- `05_mld_simplifie` : schema relationnel simplifie depuis les entites et relations principales.
- `06_sequence_auth_jwt` : login, JWT, cookies HttpOnly et refresh token.
- `07_roles_permissions` : synthese des roles Symfony et acces principaux.
- `08_sequence_vente_pos` : creation, suspension, paiement, stock, fidelite et annulation POS.
- `09_sequence_reservation_planning` : recherche de disponibilites et creation de rendez-vous.
- `10_flux_paiement_stripe` : PaymentIntent, webhook signe et mise a jour de commande.
- `11_deploiement_docker_compose` : services Docker Compose prod locale.

Chaque schema existe en source Mermaid `.mmd` et en image `.png`.

## Regeneration

Depuis la racine du projet :

```bash
npx @mermaid-js/mermaid-cli -i docs/schemas/01_architecture_globale.mmd -o docs/schemas/01_architecture_globale.png
npx @mermaid-js/mermaid-cli -i docs/schemas/02_circulation_interne_http.mmd -o docs/schemas/02_circulation_interne_http.png
npx @mermaid-js/mermaid-cli -i docs/schemas/03_cas_utilisation.mmd -o docs/schemas/03_cas_utilisation.png
npx @mermaid-js/mermaid-cli -i docs/schemas/04_mcd_simplifie.mmd -o docs/schemas/04_mcd_simplifie.png
npx @mermaid-js/mermaid-cli -i docs/schemas/05_mld_simplifie.mmd -o docs/schemas/05_mld_simplifie.png
npx @mermaid-js/mermaid-cli -i docs/schemas/06_sequence_auth_jwt.mmd -o docs/schemas/06_sequence_auth_jwt.png
npx @mermaid-js/mermaid-cli -i docs/schemas/07_roles_permissions.mmd -o docs/schemas/07_roles_permissions.png
npx @mermaid-js/mermaid-cli -i docs/schemas/08_sequence_vente_pos.mmd -o docs/schemas/08_sequence_vente_pos.png
npx @mermaid-js/mermaid-cli -i docs/schemas/09_sequence_reservation_planning.mmd -o docs/schemas/09_sequence_reservation_planning.png
npx @mermaid-js/mermaid-cli -i docs/schemas/10_flux_paiement_stripe.mmd -o docs/schemas/10_flux_paiement_stripe.png
npx @mermaid-js/mermaid-cli -i docs/schemas/11_deploiement_docker_compose.mmd -o docs/schemas/11_deploiement_docker_compose.png
```

Dependance necessaire : Mermaid CLI (`@mermaid-js/mermaid-cli`).
Les rendus PNG du dossier ont ete generes en haute resolution avec `-w`, `-H` et `-s`, en utilisant `mermaid.config.json` et `mermaid-readable.css` pour garder les textes lisibles dans les documents Word/PDF.

## Audit

Le fichier `SCHEMA_AUDIT.md` documente :

- la stack detectee
- les modules, entites, endpoints et roles observes
- les fichiers sources utilises
- les ecarts entre besoin metier et implementation
- les schemas volontairement simplifiees
