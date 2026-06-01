# Manuel utilisateur Procuratio

Ce guide explique comment utiliser Procuratio sous forme de parcours et d'etapes.
Il ne contient pas encore d'images afin de rester facilement maintenable avant l'ajout des visuels.

## Sommaire

1. [Demarrer avec Procuratio](#1-demarrer-avec-procuratio)
2. [Comprendre les roles](#2-comprendre-les-roles)
3. [Se connecter et se deconnecter](#3-se-connecter-et-se-deconnecter)
4. [Parcours client : consulter le catalogue](#4-parcours-client--consulter-le-catalogue)
5. [Parcours client : acheter un produit](#5-parcours-client--acheter-un-produit)
6. [Parcours client : utiliser ou acheter un bon cadeau](#6-parcours-client--utiliser-ou-acheter-un-bon-cadeau)
7. [Parcours client : reserver un produit](#7-parcours-client--reserver-un-produit)
8. [Parcours client : passer commande](#8-parcours-client--passer-commande)
9. [Parcours client : suivre ou annuler une commande](#9-parcours-client--suivre-ou-annuler-une-commande)
10. [Parcours client : reserver un rendez-vous](#10-parcours-client--reserver-un-rendez-vous)
11. [Parcours client : gerer ses rendez-vous](#11-parcours-client--gerer-ses-rendez-vous)
12. [Parcours client : gerer son profil](#12-parcours-client--gerer-son-profil)
13. [Parcours manager : lire le dashboard](#13-parcours-manager--lire-le-dashboard)
14. [Parcours back-office : gerer les produits](#14-parcours-back-office--gerer-les-produits)
15. [Parcours back-office : gerer les prestations](#15-parcours-back-office--gerer-les-prestations)
16. [Parcours back-office : encaisser une vente](#16-parcours-back-office--encaisser-une-vente)
17. [Parcours back-office : suspendre, reprendre ou annuler une vente](#17-parcours-back-office--suspendre-reprendre-ou-annuler-une-vente)
18. [Parcours back-office : utiliser le planning](#18-parcours-back-office--utiliser-le-planning)
19. [Parcours manager : gerer les horaires](#19-parcours-manager--gerer-les-horaires)
20. [Parcours back-office : gerer les clients](#20-parcours-back-office--gerer-les-clients)
21. [Parcours manager : gerer les employes](#21-parcours-manager--gerer-les-employes)
22. [Parcours manager : gerer les managers](#22-parcours-manager--gerer-les-managers)
23. [Parcours manager : gerer les boutiques](#23-parcours-manager--gerer-les-boutiques)
24. [Parcours manager : utiliser le CRM](#24-parcours-manager--utiliser-le-crm)
25. [Parcours back-office : utiliser le warehouse](#25-parcours-back-office--utiliser-le-warehouse)
26. [Parcours utilisateur : modifier son profil back-office](#26-parcours-utilisateur--modifier-son-profil-back-office)
27. [Regles importantes](#27-regles-importantes)
28. [Problemes frequents](#28-problemes-frequents)
29. [Glossaire](#29-glossaire)

## 1. Demarrer avec Procuratio

### Objectif

Comprendre a quoi sert Procuratio et comment circuler dans l'application.

### Principe

Procuratio centralise l'activite d'un institut ou d'un salon :

- ventes en caisse
- catalogue produits
- prestations
- rendez-vous
- clients
- fidelite
- CRM
- bons cadeaux
- commandes web
- stock
- preparation et warehouse

### Etapes

1. Ouvrir l'adresse de l'application fournie par l'administrateur.
2. Se connecter avec son compte.
3. Verifier l'espace dans lequel l'application vous redirige.
4. Utiliser le menu lateral pour changer de page.
5. Se deconnecter avec `Log out` a la fin de la session.

### Resultat attendu

L'utilisateur accede uniquement aux pages correspondant a son role.

## 2. Comprendre les roles

### Objectif

Savoir qui peut faire quoi dans Procuratio.

### Client

Le client peut :

- consulter le catalogue
- acheter des produits
- acheter ou utiliser un bon cadeau
- reserver un produit
- passer commande
- annuler une commande non expediee
- reserver un rendez-vous
- consulter ses rendez-vous
- consulter ses bons cadeaux disponibles
- modifier son mot de passe

### Employe

L'employe peut travailler sur les operations courantes :

- caisse POS
- planning operationnel
- fiches clients utiles
- warehouse
- profil personnel

### Manager

Le manager peut administrer :

- dashboard
- produits
- prestations
- clients
- employes
- managers
- boutiques
- horaires
- CRM
- fidelite
- bons cadeaux
- warehouse

### A savoir

Si une action n'est pas autorisee, Procuratio affiche un message d'erreur de permission.
Ce message signifie que le compte connecte n'a pas le droit necessaire.

## 3. Se connecter et se deconnecter

### Objectif

Ouvrir puis fermer correctement une session.

### Etapes pour se connecter

1. Ouvrir la page de connexion.
2. Saisir l'adresse email du compte.
3. Saisir le mot de passe.
4. Cliquer sur le bouton de connexion.
5. Attendre la redirection automatique.

### Resultat attendu

- un client arrive dans l'espace client
- un employe arrive dans le back-office
- un manager arrive dans le back-office avec plus de menus

### Etapes pour se deconnecter

1. Cliquer sur `Log out`.
2. Verifier que la page de connexion s'affiche.
3. Fermer l'onglet si la session est terminee.

## 4. Parcours client : consulter le catalogue

### Objectif

Trouver un produit disponible dans le catalogue client.

### Qui peut le faire

Client connecte.

### Etapes

1. Ouvrir le menu `Catalog`.
2. Saisir un mot cle dans le champ de recherche.
3. Filtrer par marque si besoin.
4. Filtrer par type si besoin.
5. Renseigner un prix minimum ou maximum si besoin.
6. Choisir le tri.
7. Choisir l'ordre de tri.
8. Consulter les cartes produits affichees.
9. Cliquer sur un produit pour ouvrir sa fiche detail.

### Resultat attendu

La liste se limite aux produits correspondant aux filtres.
La fiche detail affiche les informations du produit, son prix, son stock et sa description.

### A savoir

Un produit sans stock ou avec stock insuffisant peut etre visible mais non achetable.

## 5. Parcours client : acheter un produit

### Objectif

Ajouter un produit au panier puis preparer une commande.

### Qui peut le faire

Client connecte.

### Etapes

1. Ouvrir le catalogue.
2. Rechercher le produit souhaite.
3. Ouvrir la fiche produit.
4. Verifier le prix et le stock.
5. Choisir la quantite.
6. Ajouter le produit au panier.
7. Ouvrir le panier.
8. Verifier les lignes du panier.
9. Modifier les quantites si necessaire.
10. Supprimer une ligne si elle n'est plus souhaitee.

### Resultat attendu

Le panier contient les produits selectionnes avec les quantites souhaitees.

### A savoir

Le total du panier se met a jour apres chaque modification.
Si la quantite demandee depasse le stock, l'action peut etre refusee.

## 6. Parcours client : utiliser ou acheter un bon cadeau

### Objectif

Acheter un bon cadeau ou appliquer un bon cadeau existant.

### Qui peut le faire

Client connecte.

### Etapes pour acheter un bon cadeau

1. Ouvrir le catalogue.
2. Ouvrir le bloc ou bouton de bon cadeau.
3. Renseigner le nom du destinataire.
4. Renseigner l'email du destinataire.
5. Renseigner le montant.
6. Valider l'achat.
7. Finaliser le paiement si le flux le demande.

### Etapes pour appliquer un bon cadeau au panier

1. Ouvrir le panier.
2. Ouvrir la section ou modale `Gift voucher`.
3. Saisir le code du bon cadeau.
4. Valider.
5. Verifier que le montant est deduit du total.

### Resultat attendu

Le bon cadeau achete est cree.
Un bon cadeau applique reduit le total selon sa valeur et les regles de cumul.

### A savoir

Un bon cadeau expire ou deja utilise peut etre refuse.
Les bons cadeaux non expires lies au client ou a son email sont visibles dans le profil client.

## 7. Parcours client : reserver un produit

### Objectif

Mettre un produit de cote pour un retrait ulterieur.

### Qui peut le faire

Client connecte.

### Etapes

1. Ouvrir le catalogue ou le detail produit.
2. Verifier que le produit est disponible.
3. Utiliser l'action de reservation si elle est proposee.
4. Choisir les informations demandees.
5. Confirmer la reservation.
6. Ouvrir le panier ou la zone reservations pour consulter les reservations actives.

### Resultat attendu

La reservation apparait dans la liste des reservations du client.

### Etapes pour annuler une reservation

1. Ouvrir la liste des reservations actives.
2. Selectionner la reservation.
3. Cliquer sur `Cancel reservation`.
4. Confirmer.

### A savoir

Une reservation deja recuperee ou finalisee ne suit plus le meme processus d'annulation.

## 8. Parcours client : passer commande

### Objectif

Transformer un panier en commande.

### Qui peut le faire

Client connecte avec au moins une ligne dans son panier.

### Etapes pour un retrait boutique

1. Ouvrir le panier.
2. Verifier les produits, quantites et bons cadeaux.
3. Cliquer sur l'action de checkout.
4. Choisir le mode `Pickup`.
5. Choisir la boutique de retrait.
6. Choisir la date de retrait.
7. Choisir l'horaire de retrait.
8. Ajouter une note si necessaire.
9. Verifier le recapitulatif.
10. Valider la commande.
11. Effectuer le paiement si demande.

### Etapes pour une livraison

1. Ouvrir le panier.
2. Cliquer sur l'action de checkout.
3. Choisir le mode `Delivery`.
4. Renseigner le prenom.
5. Renseigner le nom.
6. Renseigner l'adresse.
7. Completer les informations demandees.
8. Verifier le recapitulatif.
9. Valider la commande.
10. Effectuer le paiement si demande.

### Resultat attendu

La commande est creee et visible dans la page `Orders`.

### A savoir

Le stock est pris en compte pendant le processus.
Selon la configuration, le paiement peut etre simule ou passe par Stripe.

## 9. Parcours client : suivre ou annuler une commande

### Objectif

Consulter l'etat d'une commande ou l'annuler si elle n'est pas expediee.

### Qui peut le faire

Client connecte.

### Etapes pour consulter une commande

1. Ouvrir la page `Orders`.
2. Repérer la commande dans la liste.
3. Ouvrir le detail de la commande.
4. Consulter les lignes, le total, le statut et le paiement.

### Etapes pour annuler une commande

1. Ouvrir le detail de la commande.
2. Verifier que la commande n'est pas expediee.
3. Cliquer sur l'action d'annulation si elle est disponible.
4. Confirmer.
5. Verifier que le statut change.

### Resultat attendu

Une commande non expediee peut etre annulee par le client.

### A savoir

Une commande expediee n'est plus annulable depuis l'espace client.

## 10. Parcours client : reserver un rendez-vous

### Objectif

Trouver un creneau compatible avec la boutique, l'employe et la prestation.

### Qui peut le faire

Client connecte.

### Etapes

1. Ouvrir la page `Booking`.
2. Choisir une boutique.
3. Choisir une prestation.
4. Choisir un employe ou laisser le choix ouvert si l'option existe.
5. Choisir une date.
6. Lancer la recherche de disponibilite.
7. Consulter les creneaux proposes.
8. Selectionner un creneau.
9. Verifier le resume du rendez-vous.
10. Ajouter une note si necessaire.
11. Confirmer la reservation.

### Resultat attendu

Le rendez-vous est cree et apparait dans la liste des rendez-vous a venir.

### A savoir

Les creneaux proposes respectent :

- les horaires de la boutique
- les disponibilites de l'employe
- la duree de la prestation
- les rendez-vous deja existants

## 11. Parcours client : gerer ses rendez-vous

### Objectif

Consulter, reprogrammer ou annuler un rendez-vous.

### Qui peut le faire

Client connecte.

### Etapes pour consulter

1. Ouvrir la page `Booking`.
2. Utiliser les filtres `Upcoming`, `Past` ou `Cancelled`.
3. Selectionner un rendez-vous.
4. Lire le resume.

### Etapes pour reprogrammer

1. Selectionner un rendez-vous a venir.
2. Choisir une nouvelle date ou un nouveau creneau si l'action est disponible.
3. Valider la reprogrammation.
4. Verifier le nouveau creneau dans la liste.

### Etapes pour annuler

1. Selectionner un rendez-vous a venir.
2. Cliquer sur `Cancel appointment`.
3. Confirmer.
4. Verifier que le rendez-vous apparait comme annule.

## 12. Parcours client : gerer son profil

### Objectif

Consulter ses informations, preferences, fidelite et bons cadeaux.

### Qui peut le faire

Client connecte.

### Etapes pour consulter le profil

1. Ouvrir `Profile`.
2. Lire les informations principales : nom, email, telephone et boutique.
3. Consulter les indicateurs : commandes, points, rendez-vous, avis ou autres blocs disponibles.
4. Ouvrir la liste de bons cadeaux si elle est repliee.
5. Verifier les codes, valeurs et dates d'expiration.

### Etapes pour modifier les preferences

1. Ouvrir `Profile`.
2. Choisir la boutique preferee.
3. Choisir le theme.
4. Choisir la taille de police.
5. Enregistrer si un bouton de sauvegarde est propose.

### Etapes pour modifier le mot de passe

1. Ouvrir la section de mot de passe.
2. Saisir le mot de passe actuel si demande.
3. Saisir le nouveau mot de passe.
4. Confirmer le nouveau mot de passe.
5. Enregistrer.

### A savoir

Si un mot de passe temporaire est encore utilise, il faut le remplacer rapidement.

## 13. Parcours manager : lire le dashboard

### Objectif

Analyser l'activite sur une periode.

### Qui peut le faire

Manager.

### Etapes

1. Ouvrir le back-office.
2. Ouvrir `Dashboard`.
3. Choisir la date de debut.
4. Choisir la date de fin.
5. Choisir la granularite.
6. Choisir une boutique ou toutes les boutiques.
7. Cliquer sur `Refresh stats`.
8. Lire les cartes d'indicateurs.
9. Lire les graphiques et repartitions.

### Resultat attendu

Les indicateurs affichent l'activite correspondant aux filtres.

## 14. Parcours back-office : gerer les produits

### Objectif

Creer, modifier, filtrer ou supprimer des produits.

### Qui peut le faire

Manager. Certaines actions peuvent etre visibles ou limitees pour l'employe selon les permissions.

### Etapes pour rechercher un produit

1. Ouvrir `Products`.
2. Saisir un nom ou une reference.
3. Filtrer par marque.
4. Filtrer par type.
5. Filtrer par prix minimum et maximum.
6. Filtrer par statut.
7. Choisir le tri et l'ordre.

### Etapes pour creer un produit

1. Cliquer sur `Add product`.
2. Renseigner le nom.
3. Choisir une marque existante ou creer une nouvelle marque.
4. Choisir un type existant ou creer un nouveau type.
5. Renseigner le prix.
6. Renseigner la quantite.
7. Ajouter une description si necessaire.
8. Choisir le statut.
9. Enregistrer.

### Etapes pour modifier un produit

1. Rechercher le produit.
2. Cliquer sur l'action de modification.
3. Modifier les champs utiles.
4. Enregistrer.

### Etapes pour supprimer un produit

1. Rechercher le produit.
2. Cliquer sur l'action de suppression.
3. Confirmer.
4. Si le produit est deja utilise, suivre l'instruction proposee par l'application.

### A savoir

Si un produit est lie a des ventes, commandes ou historiques, la suppression peut etre bloquee.
Une solution de remplacement peut etre demandee.

## 15. Parcours back-office : gerer les prestations

### Objectif

Creer, modifier, filtrer ou supprimer des prestations.

### Qui peut le faire

Manager. Certaines actions peuvent etre limitees selon le role.

### Etapes pour creer une prestation

1. Ouvrir `Services`.
2. Cliquer sur `Add service`.
3. Renseigner le nom.
4. Choisir un type existant ou creer un nouveau type.
5. Renseigner le prix.
6. Renseigner la duree en minutes.
7. Completer la composition.
8. Completer la description.
9. Choisir si la prestation est active.
10. Enregistrer.

### Etapes pour modifier une prestation

1. Rechercher la prestation.
2. Cliquer sur l'action de modification.
3. Mettre a jour les informations.
4. Enregistrer.

### Etapes pour supprimer une prestation

1. Rechercher la prestation.
2. Cliquer sur l'action de suppression.
3. Confirmer.
4. Si la prestation est deja utilisee, suivre la demande de remplacement ou le message affiche.

### A savoir

La duree de prestation sert au calcul des creneaux du planning.

## 16. Parcours back-office : encaisser une vente

### Objectif

Creer un ticket, ajouter des lignes et encaisser.

### Qui peut le faire

Employe ou manager.

### Etapes

1. Ouvrir `Cash` ou `POS`.
2. Cliquer sur `New`.
3. Rechercher un client ou garder `Walk-in customer`.
4. Rechercher un produit ou une prestation dans le catalogue POS.
5. Cliquer sur l'element pour l'ajouter au ticket.
6. Ajuster la quantite si necessaire.
7. Saisir une remise de ligne si necessaire.
8. Saisir une remise globale si necessaire.
9. Choisir le moyen de paiement.
10. Verifier ou saisir la reference de paiement.
11. Lire le total TTC.
12. Cliquer sur `Charge sale`.

### Resultat attendu

Le ticket passe en statut paye.
Le recu devient disponible.

### Etapes pour imprimer le recu

1. Ouvrir la vente payee.
2. Cliquer sur `Print`.
3. Verifier que le recu affiche les lignes, remises, taxes, total et statut.
4. Lancer l'impression via le navigateur si necessaire.

## 17. Parcours back-office : suspendre, reprendre ou annuler une vente

### Objectif

Gerer les tickets qui ne suivent pas un encaissement direct.

### Qui peut le faire

Employe ou manager selon les permissions.

### Etapes pour suspendre une vente

1. Creer ou ouvrir une vente en cours.
2. Ajouter les lignes necessaires.
3. Utiliser l'action de suspension si elle est disponible.
4. Verifier que le ticket apparait dans la liste des ventes en cours.

### Etapes pour reprendre une vente

1. Ouvrir la liste `In progress`.
2. Selectionner le ticket suspendu.
3. Verifier les lignes.
4. Continuer la vente ou encaisser.

### Etapes pour annuler une vente payee

1. Ouvrir la liste des recus ou ventes payees.
2. Selectionner la vente.
3. Cliquer sur l'action d'annulation si elle est disponible.
4. Confirmer.
5. Verifier que le statut indique l'annulation.

### A savoir

Une vente annulee ne peut pas etre suspendue ni reprise.
Il faut recreer un nouveau ticket.
Le recu d'une vente annulee reste consultable et imprimable.

## 18. Parcours back-office : utiliser le planning

### Objectif

Voir, creer et suivre les rendez-vous en boutique.

### Qui peut le faire

Employe ou manager.

### Etapes pour naviguer dans le planning

1. Ouvrir `Planning`.
2. Choisir la vue `Day`, `Week`, `Month` ou `Year`.
3. Choisir la boutique.
4. Choisir un employe ou tous les employes.
5. Naviguer entre les periodes avec les boutons precedent/suivant.

### Etapes pour creer un rendez-vous

1. Cliquer sur `New appointment`.
2. Choisir la boutique.
3. Choisir la prestation avant la date.
4. Choisir l'employe.
5. Choisir une date disponible.
6. Choisir un horaire disponible.
7. Indiquer la quantite si besoin.
8. Ajouter une note.
9. Valider.

### Etapes pour rechercher une disponibilite

1. Cliquer sur `Search availability`.
2. Choisir la prestation.
3. Choisir l'employe ou une option globale si disponible.
4. Choisir la periode de recherche.
5. Lancer la recherche.
6. Selectionner un creneau.
7. Utiliser ce creneau pour pre-remplir le formulaire de rendez-vous.

### Etapes pour consulter un rendez-vous

1. Cliquer sur un rendez-vous dans le calendrier.
2. Lire le resume : client, employe, boutique, heure, prestation, prix, notes et statut.
3. Fermer la fiche ou executer une action disponible.

### Etapes pour terminer un rendez-vous

1. Ouvrir le rendez-vous.
2. Cliquer sur l'action de completion.
3. Confirmer.
4. Verifier le changement de statut.

### Etapes pour annuler un rendez-vous

1. Ouvrir le rendez-vous.
2. Cliquer sur l'action d'annulation.
3. Confirmer.
4. Verifier que le rendez-vous passe en annule.

## 19. Parcours manager : gerer les horaires

### Objectif

Modifier les horaires d'ouverture de la boutique et garder les disponibilites employes coherentes.

### Qui peut le faire

Manager.

### Etapes

1. Ouvrir `Planning`.
2. Cliquer sur `Salon hours`.
3. Choisir la boutique si un filtre est disponible.
4. Pour chaque jour, indiquer si le salon est ouvert.
5. Renseigner l'heure d'ouverture.
6. Renseigner l'heure de fermeture.
7. Enregistrer.

### Resultat attendu

Les nouveaux horaires sont appliques au planning.

### A savoir

Si une plage employe depasse les nouveaux horaires de boutique, elle est ajustee pour rester dans l'amplitude autorisee.
Un employe ne modifie pas les horaires du magasin : il consulte uniquement le resume.

## 20. Parcours back-office : gerer les clients

### Objectif

Creer, retrouver, modifier ou consulter une fiche client.

### Qui peut le faire

Employe ou manager selon les permissions.

### Etapes pour rechercher un client

1. Ouvrir `Customers`.
2. Saisir un nom, email ou telephone.
3. Selectionner le client dans la liste.

### Etapes pour creer un client

1. Cliquer sur `New customer`.
2. Renseigner les informations demandees.
3. Enregistrer.
4. Verifier que la fiche client s'affiche.

### Etapes pour modifier un client

1. Selectionner le client.
2. Cliquer sur `Edit customer`.
3. Modifier les champs.
4. Enregistrer.

### Etapes pour consulter l'activite client

1. Selectionner le client.
2. Lire les informations principales.
3. Consulter les indicateurs : ventes POS, commandes web, rendez-vous, points.
4. Ouvrir les onglets ou blocs disponibles : overview, appointments, loyalty, purchases, notifications.

### Etapes pour generer un mot de passe temporaire

1. Selectionner le client.
2. Cliquer sur l'action de generation si elle est disponible.
3. Lire le message de confirmation.
4. Transmettre le mot de passe temporaire si l'email n'est pas envoye.
5. Demander au client de modifier son mot de passe au prochain acces.

## 21. Parcours manager : gerer les employes

### Objectif

Administrer les comptes employes et leur rattachement boutique.

### Qui peut le faire

Manager.

### Etapes pour creer un employe

1. Ouvrir `Employees`.
2. Cliquer sur l'action de creation.
3. Renseigner les informations personnelles.
4. Renseigner l'email.
5. Choisir la boutique de rattachement.
6. Choisir le statut.
7. Enregistrer.

### Etapes pour modifier un employe

1. Rechercher l'employe.
2. Ouvrir la modification.
3. Modifier les informations.
4. Enregistrer.

### Etapes pour regenerer un mot de passe

1. Selectionner l'employe.
2. Cliquer sur `Generate temporary password`.
3. Lire le message de confirmation.
4. Verifier si l'email est parti ou si le mot de passe doit etre transmis manuellement.
5. Demander a l'employe de changer le mot de passe dans son profil.

## 22. Parcours manager : gerer les managers

### Objectif

Administrer les comptes manager.

### Qui peut le faire

Manager.

### Etapes

1. Ouvrir `Managers`.
2. Rechercher un manager si besoin.
3. Creer ou modifier un compte.
4. Renseigner les informations.
5. Choisir le statut.
6. Enregistrer.

### Etapes pour regenerer un mot de passe

1. Selectionner le manager.
2. Cliquer sur `Generate temporary password`.
3. Transmettre le mot de passe si necessaire.
4. Demander au manager de le remplacer apres connexion.

### A savoir

Un compte manager donne acces a des fonctions sensibles.
Il doit etre attribue uniquement aux personnes qui administrent reellement l'activite.

## 23. Parcours manager : gerer les boutiques

### Objectif

Creer ou modifier les points de vente.

### Qui peut le faire

Manager.

### Etapes pour creer une boutique

1. Ouvrir `Stores`.
2. Cliquer sur l'action de creation.
3. Renseigner le nom.
4. Renseigner la ville.
5. Completer les informations disponibles.
6. Enregistrer.

### Etapes pour modifier une boutique

1. Rechercher la boutique.
2. Ouvrir la modification.
3. Modifier les informations.
4. Enregistrer.

### Resultat attendu

La boutique devient disponible dans les filtres et selections concernes.

### A savoir

Une boutique influence :

- les employes disponibles
- les rendez-vous
- les horaires
- les ventes
- les statistiques
- les retraits de commandes

## 24. Parcours manager : utiliser le CRM

### Objectif

Gerer la fidelite, les campagnes, les bons cadeaux et les rappels.

### Qui peut le faire

Manager.

### Etapes pour ajouter ou consommer des points

1. Ouvrir `CRM`.
2. Dans `Loyalty points`, rechercher un client.
3. Selectionner le client propose par l'autocompletion.
4. Choisir l'operation : ajout ou consommation.
5. Renseigner le nombre de points.
6. Renseigner le motif.
7. Enregistrer.

### Etapes pour appliquer une action de masse sur la fidelite

1. Ouvrir la liste des comptes fidelite.
2. Filtrer les clients si necessaire.
3. Selectionner des clients un par un ou utiliser la selection globale.
4. Choisir l'action de masse.
5. Renseigner les points et le motif.
6. Appliquer l'action aux clients selectionnes.

### Etapes pour creer un membership ou une carte de visites

1. Dans `Memberships and visit cards`, rechercher un client.
2. Renseigner le nom du programme.
3. Choisir le statut du programme.
4. Renseigner les dates de debut et de fin si necessaire.
5. Renseigner le nom de la carte.
6. Renseigner l'objectif de visites.
7. Renseigner les visites deja utilisees si besoin.
8. Choisir l'etat de la carte.
9. Enregistrer.

### Etapes pour creer une campagne

1. Dans `Campaigns`, renseigner le nom.
2. Choisir le canal.
3. Renseigner le minimum de points si necessaire.
4. Renseigner le message.
5. Cliquer sur `Create`.
6. Ouvrir la liste des campagnes pour verifier.

### Etapes pour creer un bon cadeau

1. Dans `Gift vouchers`, saisir le montant.
2. Selectionner un client ou saisir une adresse email.
3. Renseigner une date d'expiration si necessaire.
4. Cliquer sur `Create`.
5. Ouvrir la liste pour verifier le bon cree.

### Etapes pour gerer les rappels automatiques

1. Dans `Automatic reminders`, renseigner le nom de la regle.
2. Choisir le canal.
3. Renseigner le decalage en heures.
4. Cliquer sur `Add rule`.
5. Ouvrir `Open rules` pour consulter les regles.
6. Ouvrir `Open logs` pour consulter les tentatives d'envoi.

### A savoir

Les logs indiquent les tentatives d'envoi.
Un email peut etre prepare par l'application mais bloque par le fournisseur externe.

## 25. Parcours back-office : utiliser le warehouse

### Objectif

Suivre les commandes, preparations et reservations produit.

### Qui peut le faire

Employe ou manager.

### Etapes

1. Ouvrir `Warehouse`.
2. Consulter les commandes ou reservations a traiter.
3. Ouvrir le detail d'un element si disponible.
4. Executer l'action operationnelle proposee : preparer, valider, annuler ou marquer comme recupere selon le cas.
5. Verifier le changement de statut.

### Resultat attendu

Les commandes et reservations avancent dans leur cycle de traitement.

## 26. Parcours utilisateur : modifier son profil back-office

### Objectif

Mettre a jour ses preferences et son mot de passe.

### Qui peut le faire

Employe ou manager connecte.

### Etapes pour changer les preferences

1. Ouvrir `Profile`.
2. Choisir le theme.
3. Choisir la taille de police.
4. Enregistrer si un bouton de sauvegarde est propose.

### Etapes pour changer le mot de passe

1. Ouvrir la section de mot de passe.
2. Saisir le mot de passe actuel si demande.
3. Saisir le nouveau mot de passe.
4. Confirmer le nouveau mot de passe.
5. Enregistrer.

### A savoir

Si un mot de passe temporaire a ete fourni a la creation ou regenere par un manager, il doit etre remplace.

## 27. Regles importantes

### Stock

- le stock negatif est bloque
- chaque ajustement doit conserver une trace
- les ventes et commandes peuvent modifier les quantites disponibles

### Rendez-vous

- les creneaux respectent la boutique
- les creneaux respectent les horaires d'ouverture
- les creneaux respectent les disponibilites employes
- les employes sont filtres par boutique
- la duree de prestation influence les creneaux proposes

### Horaires

- seul le manager modifie les horaires boutique
- l'employe consulte un resume
- reduire les horaires boutique ajuste les disponibilites employes concernees

### Commandes

- une commande non expediee peut etre annulee par le client
- une commande expediee n'est plus annulable depuis l'espace client
- le paiement doit etre confirme pour finaliser le flux

### Caisse

- une vente payee peut etre annulee selon les droits
- une vente annulee ne peut pas etre suspendue ou reprise
- un nouveau ticket doit etre cree si la vente a ete annulee
- le recu reste imprimable

### Fidelite

- les points peuvent etre ajoutes ou consommes
- la carte de visites s'incremente quand un rendez-vous est termine
- une carte peut devenir inactive quand l'objectif est atteint

### Bons cadeaux

- un bon non expire peut etre visible dans le profil client
- l'email du bon doit correspondre au client si le bon n'est pas lie directement au compte
- les regles de cumul peuvent limiter l'utilisation d'un bon

## 28. Problemes frequents

### Je n'arrive pas a me connecter

1. Verifier l'email.
2. Verifier le mot de passe.
3. Verifier que le compte existe.
4. Si un mot de passe temporaire a ete genere, l'utiliser puis le changer.

### Je suis envoye vers le mauvais espace

1. Verifier le role du compte.
2. Utiliser un compte client pour l'espace client.
3. Utiliser un compte employe ou manager pour le back-office.

### Je ne vois pas une page

1. Verifier le role connecte.
2. Demander a un manager si l'acces semble incorrect.
3. Se reconnecter apres modification de droits.

### Une action est refusee

1. Lire le message affiche.
2. Verifier si l'action est reservee au manager.
3. Contacter un manager si l'action est necessaire.

### Aucun creneau n'est trouve

1. Changer de date.
2. Changer d'employe.
3. Verifier la boutique.
4. Verifier que la prestation est active.
5. Verifier les horaires d'ouverture.

### Un email n'est pas recu

1. Verifier l'adresse email.
2. Verifier les logs CRM.
3. Verifier la configuration Brevo ou mail.
4. Verifier les spams.
5. Transmettre manuellement le mot de passe temporaire si necessaire.

### Un bon cadeau n'apparait pas

1. Verifier que le bon n'est pas expire.
2. Verifier que le bon est lie au bon client.
3. Verifier que l'email du bon correspond a l'email du client.
4. Verifier que le bon n'a pas deja ete utilise.

### Une vente annulee ne peut pas etre reprise

Ce comportement est normal.
Une vente annulee est fermee.
Il faut creer un nouveau ticket.

## 29. Glossaire

**Back-office**
Espace utilise par les employes et managers pour gerer l'activite.

**Client**
Utilisateur final qui achete, reserve et consulte ses informations.

**Employe**
Utilisateur operationnel rattache a une boutique.

**Manager**
Utilisateur administrateur avec acces aux fonctions sensibles.

**POS**
Caisse de vente physique.

**Ticket**
Vente en cours, suspendue, payee ou annulee.

**Prestation**
Service realise en boutique, avec une duree et un prix.

**Rendez-vous**
Reservation d'une prestation avec une boutique, un employe et un horaire.

**Boutique**
Point de vente utilise pour les employes, horaires, ventes, retraits et statistiques.

**CRM**
Outils de relation client : fidelite, campagnes, rappels, bons cadeaux et notifications.

**Membership**
Programme ou abonnement de fidelite associe a un client.

**Carte de visites**
Progression du nombre de visites realisees par rapport a un objectif.

**Bon cadeau**
Code avec une valeur et une date d'expiration.

**Warehouse**
Espace de suivi des commandes, preparations et reservations produit.

---

Manuel redige pour la version actuelle de Procuratio. Les libelles exacts peuvent varier selon le theme, la langue affichee ou le role connecte.
