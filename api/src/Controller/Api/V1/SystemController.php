<?php

namespace App\Controller\Api\V1;

use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1', name: 'api_v1_')]
class SystemController extends AbstractController
{
    #[OA\Get(
        path: '/api/v1/health',
        tags: ['Systeme'],
        summary: 'Verifier la disponibilite de l API',
        description: 'Endpoint public de supervision pour confirmer que l API est demarree.'
    )]
    #[OA\Response(response: 200, description: 'API disponible')]
    #[Route('/health', name: 'health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return $this->json([
            'status' => 'ok',
            'message' => 'API is running',
            'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ]);
    }

    #[OA\Post(
        path: '/api/v1/auth/login',
        tags: ['Authentification'],
        summary: 'Se connecter pour obtenir un jeton JWT',
        description: 'Route publique de connexion. Retourne un token JWT a utiliser dans le bouton Authorize de Swagger.',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email', example: 'employee@procuratio.local'),
                    new OA\Property(property: 'password', type: 'string', example: 'Employee123!')
                ]
            )
        )
    )]
    #[OA\Response(response: 200, description: 'Jeton JWT genere')]
    #[OA\Response(response: 401, description: 'Identifiants invalides')]
    public function loginDocOnly(): void
    {
    }

    #[OA\Get(
        path: '/api/v1/me',
        tags: ['Authentification'],
        summary: 'Lire le profil utilisateur courant',
        description: 'Retourne les informations de l utilisateur authentifie via JWT.'
    )]
    #[OA\Response(response: 200, description: 'Profil courant')]
    #[OA\Response(response: 401, description: 'Non authentifie')]
    #[Route('/me', name: 'me', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function me(): JsonResponse
    {
        /** @var \App\Entity\User $user */
        $user = $this->getUser();

        return $this->json([
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
        ]);
    }

    #[OA\Get(
        path: '/api/v1/admin/ping',
        tags: ['Administration'],
        summary: 'Verifier un acces reserve administrateur',
        description: 'Endpoint de controle d autorisation admin.'
    )]
    #[OA\Response(response: 200, description: 'Acces administrateur confirme')]
    #[OA\Response(response: 403, description: 'Acces interdit')]
    #[Route('/admin/ping', name: 'admin_ping', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminPing(): JsonResponse
    {
        return $this->json(['message' => 'admin access granted']);
    }
}
