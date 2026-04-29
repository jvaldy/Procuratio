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
    #[OA\Get(path: '/api/v1/health', tags: ['System'], summary: 'Health check endpoint')]
    #[OA\Response(response: 200, description: 'API is up')]
    #[Route('/health', name: 'health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return $this->json([
            'status' => 'ok',
            'message' => 'API is running',
            'timestamp' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ]);
    }

    #[OA\Get(path: '/api/v1/me', tags: ['Auth'], summary: 'Current authenticated user')]
    #[OA\Response(response: 200, description: 'Current user profile')]
    #[OA\Response(response: 401, description: 'Unauthorized')]
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

    #[OA\Get(path: '/api/v1/admin/ping', tags: ['Admin'], summary: 'Admin-protected probe')]
    #[OA\Response(response: 200, description: 'Admin access granted')]
    #[OA\Response(response: 403, description: 'Forbidden')]
    #[Route('/admin/ping', name: 'admin_ping', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminPing(): JsonResponse
    {
        return $this->json(['message' => 'admin access granted']);
    }
}
