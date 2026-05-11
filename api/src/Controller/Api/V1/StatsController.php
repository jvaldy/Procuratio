<?php

namespace App\Controller\Api\V1;

use App\Entity\Store;
use App\Repository\StoreRepository;
use App\Service\StatsService;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/stats', name: 'api_v1_stats_')]
#[IsGranted('ROLE_ADMIN')]
class StatsController extends AbstractController
{
    public function __construct(
        private readonly StatsService $statsService,
        private readonly StoreRepository $storeRepository,
    )
    {
    }

    #[OA\Get(
        path: '/api/v1/stats/overview',
        tags: ['Statistiques'],
        summary: 'Lire les indicateurs globaux du tableau de bord',
        parameters: [
            new OA\Parameter(name: 'from', in: 'query', required: false, description: 'Date debut (YYYY-MM-DD)', schema: new OA\Schema(type: 'string', example: '2026-05-01')),
            new OA\Parameter(name: 'to', in: 'query', required: false, description: 'Date fin (YYYY-MM-DD)', schema: new OA\Schema(type: 'string', example: '2026-05-31')),
        ],
    )]
    #[Route('/overview', name: 'overview', methods: ['GET'])]
    public function overview(Request $request): JsonResponse
    {
        $store = $this->resolveStore($request->query->get('storeId'));
        $period = $this->statsService->resolvePeriod(
            $request->query->get('from'),
            $request->query->get('to'),
            null,
        );

        return $this->json([
            'period' => [
                'from' => $period['from']->format(DATE_ATOM),
                'to' => $period['to']->format(DATE_ATOM),
                'store' => $store ? ['id' => $store->getId(), 'name' => $store->getName()] : null,
            ],
            'kpis' => $this->statsService->overview($period['from'], $period['to'], $store),
        ]);
    }

    #[OA\Get(
        path: '/api/v1/stats/timeseries',
        tags: ['Statistiques'],
        summary: 'Lire la serie temporelle chiffre d affaires / volumes',
        parameters: [
            new OA\Parameter(name: 'from', in: 'query', required: false, description: 'Date debut (YYYY-MM-DD)', schema: new OA\Schema(type: 'string', example: '2026-05-01')),
            new OA\Parameter(name: 'to', in: 'query', required: false, description: 'Date fin (YYYY-MM-DD)', schema: new OA\Schema(type: 'string', example: '2026-05-31')),
            new OA\Parameter(name: 'granularity', in: 'query', required: false, description: 'Niveau d aggregation', schema: new OA\Schema(type: 'string', enum: ['day', 'week', 'month'], example: 'day')),
        ],
    )]
    #[Route('/timeseries', name: 'timeseries', methods: ['GET'])]
    public function timeSeries(Request $request): JsonResponse
    {
        $store = $this->resolveStore($request->query->get('storeId'));
        $period = $this->statsService->resolvePeriod(
            $request->query->get('from'),
            $request->query->get('to'),
            $request->query->get('granularity'),
        );

        return $this->json([
            'period' => [
                'from' => $period['from']->format(DATE_ATOM),
                'to' => $period['to']->format(DATE_ATOM),
                'granularity' => $period['granularity'],
                'store' => $store ? ['id' => $store->getId(), 'name' => $store->getName()] : null,
            ],
            'data' => $this->statsService->timeSeries($period['from'], $period['to'], $period['granularity'], $store),
        ]);
    }

    private function resolveStore(?string $rawStoreId): ?Store
    {
        if ($rawStoreId === null || trim($rawStoreId) === '') {
            return null;
        }

        return $this->storeRepository->find((int) $rawStoreId);
    }
}
