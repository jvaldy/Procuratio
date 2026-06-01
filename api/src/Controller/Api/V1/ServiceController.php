<?php

namespace App\Controller\Api\V1;

use App\Entity\Category;
use App\Entity\Service;
use App\Repository\CategoryRepository;
use App\Repository\ServiceRepository;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/services', name: 'api_v1_services_')]
class ServiceController extends AbstractController
{
    private const MSG_INVALID_JSON = 'Invalid JSON payload.';
    private const MSG_SERVICE_NOT_FOUND = 'Service not found.';
    private const MSG_NAME_REQUIRED = 'The name field is required.';
    private const MSG_NAME_EMPTY = 'The name field cannot be empty.';
    private const MSG_DELETE_BLOCKED = 'This service cannot be deleted because it is linked to appointments, orders or history. Archive it instead.';

    public function __construct(
        private readonly ServiceRepository $serviceRepository,
        private readonly CategoryRepository $categoryRepository,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[OA\Get(
        path: '/api/v1/services',
        tags: ['Services'],
        summary: 'Lister les services',
        description: 'Liste paginee des services avec filtres multi-criteres, tri et pagination.'
    )]
    #[OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, default: 1))]
    #[OA\Parameter(name: 'perPage', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20))]
    #[OA\Parameter(name: 'sort', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['name', 'price', 'createdAt'], default: 'createdAt'))]
    #[OA\Parameter(name: 'order', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['ASC', 'DESC'], default: 'DESC'))]
    #[OA\Parameter(name: 'name', in: 'query', required: false, schema: new OA\Schema(type: 'string'))]
    #[OA\Parameter(name: 'category', in: 'query', required: false, schema: new OA\Schema(type: 'integer'))]
    #[OA\Parameter(name: 'active', in: 'query', required: false, schema: new OA\Schema(type: 'boolean'))]
    #[OA\Parameter(name: 'minPrice', in: 'query', required: false, schema: new OA\Schema(type: 'number', format: 'float'))]
    #[OA\Parameter(name: 'maxPrice', in: 'query', required: false, schema: new OA\Schema(type: 'number', format: 'float'))]
    #[OA\Response(response: 200, description: 'Liste paginee retournee')]
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 20)));
        $sort = (string) $request->query->get('sort', 'createdAt');
        $order = (string) $request->query->get('order', 'DESC');

        $filters = [
            'name' => $request->query->get('name'),
            'category' => $request->query->get('category'),
            'active' => $request->query->get('active'),
            'minPrice' => $request->query->get('minPrice'),
            'maxPrice' => $request->query->get('maxPrice'),
        ];

        $result = $this->serviceRepository->search($filters, $sort, $order, $page, $perPage);

        return $this->json([
            'data' => array_map(fn(Service $s) => $this->serializeService($s), $result['items']),
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $perPage),
                'sort' => $sort,
                'order' => strtoupper($order),
            ],
        ]);
    }

    #[OA\Post(
        path: '/api/v1/services',
        tags: ['Services'],
        summary: 'Creer un service',
        description: 'Cree un service avec tarification et categorie optionnelle.'
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'price'],
            properties: [
                new OA\Property(property: 'name', type: 'string', example: 'Coupe premium'),
                new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Prestations completes'),
                new OA\Property(property: 'composition', type: 'string', nullable: true, example: 'Shampoing + coupe + coiffage'),
                new OA\Property(property: 'price', type: 'number', format: 'float', example: 35.00),
                new OA\Property(property: 'durationMinutes', type: 'integer', minimum: 5, example: 45),
                new OA\Property(property: 'categoryId', type: 'integer', nullable: true, example: 1),
                new OA\Property(property: 'isActive', type: 'boolean', example: true)
            ]
        )
    )]
    #[OA\Response(response: 201, description: 'Service cree')]
    #[OA\Response(response: 400, description: 'Payload invalide')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function create(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);

        $service = new Service();
        $this->hydrateService($service, $payload, false);

        $this->em->persist($service);
        $this->em->flush();

        return $this->json($this->serializeService($service), 201);
    }

    #[OA\Put(
        path: '/api/v1/services/{id}',
        tags: ['Services'],
        summary: 'Mettre a jour un service',
        description: 'Met a jour partiellement un service existant.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(property: 'description', type: 'string', nullable: true),
                new OA\Property(property: 'composition', type: 'string', nullable: true),
                new OA\Property(property: 'price', type: 'number', format: 'float'),
                new OA\Property(property: 'durationMinutes', type: 'integer', minimum: 5),
                new OA\Property(property: 'categoryId', type: 'integer', nullable: true),
                new OA\Property(property: 'isActive', type: 'boolean')
            ]
        )
    )]
    #[OA\Response(response: 200, description: 'Service mis a jour')]
    #[OA\Response(response: 400, description: 'Payload invalide')]
    #[OA\Response(response: 404, description: 'Service introuvable')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN')]
    public function update(int $id, Request $request): JsonResponse
    {
        $service = $this->serviceRepository->find($id);
        if (!$service) {
            throw new NotFoundHttpException(self::MSG_SERVICE_NOT_FOUND);
        }

        $payload = $this->decodeJson($request);
        $this->hydrateService($service, $payload, true);

        $this->em->flush();

        return $this->json($this->serializeService($service));
    }

    #[OA\Delete(
        path: '/api/v1/services/{id}',
        tags: ['Services'],
        summary: 'Supprimer un service',
        description: 'Supprime definitivement un service par son identifiant.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 204, description: 'Service supprime')]
    #[OA\Response(response: 404, description: 'Service introuvable')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(int $id): JsonResponse
    {
        $service = $this->serviceRepository->find($id);
        if (!$service) {
            throw new NotFoundHttpException(self::MSG_SERVICE_NOT_FOUND);
        }

        try {
            $this->em->remove($service);
            $this->em->flush();
        } catch (ForeignKeyConstraintViolationException) {
            throw new BadRequestHttpException(self::MSG_DELETE_BLOCKED);
        }

        return $this->json(null, 204);
    }

    private function decodeJson(Request $request): array
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException(self::MSG_INVALID_JSON);
        }

        return $payload;
    }

    private function hydrateService(Service $service, array $payload, bool $partial): void
    {
        foreach (['name', 'price'] as $field) {
            if (!$partial && !array_key_exists($field, $payload)) {
                throw new BadRequestHttpException($field === 'name' ? self::MSG_NAME_REQUIRED : sprintf('%s is required.', $field));
            }
        }

        if (array_key_exists('name', $payload)) {
            $name = trim((string) $payload['name']);
            if ($name === '') {
                throw new BadRequestHttpException(self::MSG_NAME_EMPTY);
            }
            $service->setName($name);
        }

        if (array_key_exists('description', $payload)) {
            $service->setDescription($payload['description'] !== null ? (string) $payload['description'] : null);
        }

        if (array_key_exists('composition', $payload)) {
            $service->setComposition($payload['composition'] !== null ? (string) $payload['composition'] : null);
        }

        if (array_key_exists('price', $payload)) {
            $price = (float) $payload['price'];
            if ($price < 0) {
                throw new BadRequestHttpException('price must be >= 0.');
            }
            $service->setPrice(number_format($price, 2, '.', ''));
        }

        if (array_key_exists('durationMinutes', $payload)) {
            $durationMinutes = (int) $payload['durationMinutes'];
            if ($durationMinutes < 5) {
                throw new BadRequestHttpException('durationMinutes must be >= 5.');
            }
            $service->setDurationMinutes($durationMinutes);
        }

        if (array_key_exists('categoryId', $payload)) {
            if ($payload['categoryId'] === null || $payload['categoryId'] === '') {
                $service->setCategory(null);
            } else {
                $category = $this->categoryRepository->find((int) $payload['categoryId']);
                if (!$category instanceof Category) {
                    throw new BadRequestHttpException('Invalid categoryId.');
                }
                $service->setCategory($category);
            }
        }

        if (array_key_exists('isActive', $payload)) {
            $service->setIsActive((bool) $payload['isActive']);
        }
    }

    private function serializeService(Service $service): array
    {
        return [
            'id' => $service->getId(),
            'name' => $service->getName(),
            'description' => $service->getDescription(),
            'composition' => $service->getComposition(),
            'price' => (float) $service->getPrice(),
            'durationMinutes' => $service->getDurationMinutes(),
            'isActive' => $service->isActive(),
            'category' => $service->getCategory() ? ['id' => $service->getCategory()?->getId(), 'name' => $service->getCategory()?->getName()] : null,
            'createdAt' => $service->getCreatedAt()->format(DATE_ATOM),
        ];
    }
}
