<?php

namespace App\Controller\Api\V1;

use App\Entity\Customer;
use App\Entity\Employee;
use App\Security\CookieTokenManager;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1', name: 'api_v1_')]
class SystemController extends AbstractController
{
    public function __construct(
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly CookieTokenManager $cookieTokenManager,
        private readonly EntityManagerInterface $em,
    ) {
    }

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
        summary: 'Se connecter',
        description: 'Route publique de connexion. Le serveur depose des cookies HttpOnly (access_token et refresh_token).',
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
    #[OA\Response(response: 200, description: 'Session ouverte et cookies emis')]
    #[OA\Response(response: 401, description: 'Identifiants invalides')]
    public function loginDocOnly(): void
    {
    }

    #[OA\Post(
        path: '/api/v1/auth/refresh',
        tags: ['Authentification'],
        summary: 'Renouveler la session',
        description: 'Utilise le cookie refresh_token HttpOnly pour emettre une nouvelle paire access/refresh.'
    )]
    #[OA\Response(response: 200, description: 'Session renouvelee')]
    #[OA\Response(response: 401, description: 'Refresh token invalide ou expire')]
    #[Route('/auth/refresh', name: 'auth_refresh', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $refreshToken = $request->cookies->get('refresh_token');
        if (!$refreshToken) {
            throw new UnauthorizedHttpException('', 'Refresh token manquant.');
        }

        $user = $this->cookieTokenManager->rotateRefreshToken($refreshToken);
        if (!$user) {
            throw new UnauthorizedHttpException('', 'Refresh token invalide.');
        }

        $accessToken = $this->jwtManager->create($user);
        $newRefreshToken = $this->cookieTokenManager->issueRefreshToken($user);

        $response = $this->json([
            'status' => 'ok',
            'message' => 'Session renouvelee.',
            'token' => $accessToken,
        ]);
        $this->cookieTokenManager->addAuthCookies($response, $accessToken, $newRefreshToken);

        return $response;
    }

    #[OA\Post(
        path: '/api/v1/auth/logout',
        tags: ['Authentification'],
        summary: 'Fermer la session',
        description: 'Revoque le refresh token serveur et supprime les cookies d authentification.'
    )]
    #[OA\Response(response: 204, description: 'Session fermee')]
    #[Route('/auth/logout', name: 'auth_logout', methods: ['POST'])]
    public function logout(Request $request): Response
    {
        $this->cookieTokenManager->revokeRefreshTokenFromRequest($request);

        $response = new Response(status: 204);
        $this->cookieTokenManager->clearAuthCookies($response);

        return $response;
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
        /** @var Customer|null $customer */
        $customer = $this->em->getRepository(Customer::class)->findOneBy(['user' => $user]);
        /** @var Employee|null $employee */
        $employee = $this->em->getRepository(Employee::class)->findOneBy(['user' => $user]);

        return $this->json([
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'primaryRole' => $user->getRoles()[0] ?? 'ROLE_USER',
            'displayName' => $customer?->getFullName() ?? $employee?->getFullName() ?? strtok($user->getEmail(), '@'),
            'phoneNumber' => $customer?->getPhoneNumber(),
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
