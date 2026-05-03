<?php

namespace App\Controller\Api\V1;

use App\Entity\Brand;
use App\Entity\Category;
use App\Entity\Product;
use App\Repository\BrandRepository;
use App\Repository\CategoryRepository;
use App\Repository\ProductRepository;
use App\Service\StockManager;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/products', name: 'api_v1_products_')]
class ProductController extends AbstractController
{
    public function __construct(
        private readonly ProductRepository $productRepository,
        private readonly BrandRepository $brandRepository,
        private readonly CategoryRepository $categoryRepository,
        private readonly StockManager $stockManager,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[OA\Get(
        path: '/api/v1/products',
        tags: ['Produits'],
        summary: 'Lister les produits',
        description: 'Liste paginee des produits avec filtres multi-criteres, tri et pagination.'
    )]
    #[OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, default: 1))]
    #[OA\Parameter(name: 'perPage', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20))]
    #[OA\Parameter(name: 'sort', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['name', 'price', 'createdAt', 'stock'], default: 'createdAt'))]
    #[OA\Parameter(name: 'order', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['ASC', 'DESC'], default: 'DESC'))]
    #[OA\Parameter(name: 'name', in: 'query', required: false, schema: new OA\Schema(type: 'string'))]
    #[OA\Parameter(name: 'brand', in: 'query', required: false, schema: new OA\Schema(type: 'integer'))]
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
            'brand' => $request->query->get('brand'),
            'category' => $request->query->get('category'),
            'active' => $request->query->get('active'),
            'minPrice' => $request->query->get('minPrice'),
            'maxPrice' => $request->query->get('maxPrice'),
        ];

        $result = $this->productRepository->search($filters, $sort, $order, $page, $perPage);

        return $this->json([
            'data' => array_map(fn(Product $p) => $this->serializeProduct($p), $result['items']),
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
        path: '/api/v1/products',
        tags: ['Produits'],
        summary: 'Creer un produit',
        description: 'Cree un produit en liant une marque et une categorie existantes.'
    )]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'sku', 'price', 'brandId', 'categoryId'],
            properties: [
                new OA\Property(property: 'name', type: 'string', example: 'Shampooing Pro'),
                new OA\Property(property: 'sku', type: 'string', example: 'PROD-1001'),
                new OA\Property(property: 'price', type: 'number', format: 'float', example: 12.90),
                new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Usage quotidien, cheveux normaux'),
                new OA\Property(property: 'imageUrl', type: 'string', nullable: true, example: 'https://cdn.exemple.com/produits/shampooing-pro.jpg'),
                new OA\Property(property: 'brandId', type: 'integer', example: 1),
                new OA\Property(property: 'categoryId', type: 'integer', example: 1),
                new OA\Property(property: 'stock', type: 'integer', example: 25),
                new OA\Property(property: 'isActive', type: 'boolean', example: true)
            ]
        )
    )]
    #[OA\Response(response: 201, description: 'Produit cree')]
    #[OA\Response(response: 400, description: 'Payload invalide')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function create(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);

        $product = new Product();
        $this->hydrateProduct($product, $payload, false);

        $this->em->persist($product);
        $this->em->flush();

        return $this->json($this->serializeProduct($product), 201);
    }

    #[OA\Put(
        path: '/api/v1/products/{id}',
        tags: ['Produits'],
        summary: 'Mettre a jour un produit',
        description: 'Met a jour partiellement un produit existant.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(property: 'sku', type: 'string'),
                new OA\Property(property: 'price', type: 'number', format: 'float'),
                new OA\Property(property: 'description', type: 'string', nullable: true),
                new OA\Property(property: 'imageUrl', type: 'string', nullable: true),
                new OA\Property(property: 'brandId', type: 'integer'),
                new OA\Property(property: 'categoryId', type: 'integer'),
                new OA\Property(property: 'stock', type: 'integer'),
                new OA\Property(property: 'isActive', type: 'boolean')
            ]
        )
    )]
    #[OA\Response(response: 200, description: 'Produit mis a jour')]
    #[OA\Response(response: 400, description: 'Payload invalide')]
    #[OA\Response(response: 404, description: 'Produit introuvable')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN')]
    public function update(int $id, Request $request): JsonResponse
    {
        $product = $this->productRepository->find($id);
        if (!$product) {
            throw new NotFoundHttpException('Product not found.');
        }

        $payload = $this->decodeJson($request);
        $this->hydrateProduct($product, $payload, true);

        $product->touch();
        $this->em->flush();

        return $this->json($this->serializeProduct($product));
    }

    #[OA\Delete(
        path: '/api/v1/products/{id}',
        tags: ['Produits'],
        summary: 'Supprimer un produit',
        description: 'Supprime definitivement un produit par son identifiant.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 204, description: 'Produit supprime')]
    #[OA\Response(response: 404, description: 'Produit introuvable')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(int $id): JsonResponse
    {
        $product = $this->productRepository->find($id);
        if (!$product) {
            throw new NotFoundHttpException('Product not found.');
        }

        $this->em->remove($product);
        $this->em->flush();

        return $this->json(null, 204);
    }

    #[OA\Post(
        path: '/api/v1/products/{id}/stock-adjustments',
        tags: ['Stock'],
        summary: 'Ajuster le stock d un produit',
        description: 'Enregistre un mouvement de stock (entree, sortie ou ajustement) avec tracabilite.'
    )]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['type', 'quantity', 'reason'],
            properties: [
                new OA\Property(property: 'type', type: 'string', enum: ['in', 'out', 'adjust'], example: 'adjust'),
                new OA\Property(property: 'quantity', type: 'integer', minimum: 0, example: 5),
                new OA\Property(property: 'reason', type: 'string', example: 'Inventaire'),
                new OA\Property(property: 'comment', type: 'string', nullable: true, example: 'Correction apres comptage')
            ]
        )
    )]
    #[OA\Response(response: 200, description: 'Stock ajuste')]
    #[OA\Response(response: 400, description: 'Regle de stock non respectee')]
    #[OA\Response(response: 404, description: 'Produit introuvable')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[Route('/{id}/stock-adjustments', name: 'stock_adjust', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adjustStock(int $id, Request $request): JsonResponse
    {
        $product = $this->productRepository->find($id);
        if (!$product) {
            throw new NotFoundHttpException('Product not found.');
        }

        $payload = $this->decodeJson($request);
        $type = (string) ($payload['type'] ?? '');
        $quantity = (int) ($payload['quantity'] ?? 0);
        $reason = trim((string) ($payload['reason'] ?? ''));
        $comment = isset($payload['comment']) ? (string) $payload['comment'] : null;

        if (!in_array($type, ['in', 'out', 'adjust'], true)) {
            throw new BadRequestHttpException('Invalid movement type.');
        }
        if ($quantity < 0) {
            throw new BadRequestHttpException('Quantity must be >= 0.');
        }
        if ($reason === '') {
            throw new BadRequestHttpException('Reason is required.');
        }

        $this->stockManager->applyMovement($product, $type, $quantity, $reason, $comment, true);
        $this->em->flush();

        return $this->json($this->serializeProduct($product));
    }

    private function decodeJson(Request $request): array
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        return $payload;
    }

    private function hydrateProduct(Product $product, array $payload, bool $partial): void
    {
        foreach (['name', 'sku', 'price', 'brandId', 'categoryId'] as $field) {
            if (!$partial && !array_key_exists($field, $payload)) {
                throw new BadRequestHttpException(sprintf('%s is required.', $field));
            }
        }

        if (array_key_exists('name', $payload)) {
            $name = trim((string) $payload['name']);
            if ($name === '') {
                throw new BadRequestHttpException('name cannot be empty.');
            }
            $product->setName($name);
        }

        if (array_key_exists('sku', $payload)) {
            $sku = trim((string) $payload['sku']);
            if ($sku === '') {
                throw new BadRequestHttpException('sku cannot be empty.');
            }
            $product->setSku($sku);
        }

        if (array_key_exists('price', $payload)) {
            $price = (float) $payload['price'];
            if ($price < 0) {
                throw new BadRequestHttpException('price must be >= 0.');
            }
            $product->setPrice(number_format($price, 2, '.', ''));
        }

        if (array_key_exists('description', $payload)) {
            $product->setDescription($payload['description'] !== null ? trim((string) $payload['description']) : null);
        }

        if (array_key_exists('imageUrl', $payload)) {
            $imageUrl = $payload['imageUrl'] !== null ? trim((string) $payload['imageUrl']) : null;
            $product->setImageUrl($imageUrl !== '' ? $imageUrl : null);
        }

        if (array_key_exists('brandId', $payload)) {
            $brand = $this->brandRepository->find((int) $payload['brandId']);
            if (!$brand instanceof Brand) {
                throw new BadRequestHttpException('Invalid brandId.');
            }
            $product->setBrand($brand);
        }

        if (array_key_exists('categoryId', $payload)) {
            $category = $this->categoryRepository->find((int) $payload['categoryId']);
            if (!$category instanceof Category) {
                throw new BadRequestHttpException('Invalid categoryId.');
            }
            $product->setCategory($category);
        }

        if (array_key_exists('stock', $payload)) {
            $stock = (int) $payload['stock'];
            if ($stock < 0) {
                throw new BadRequestHttpException('stock must be >= 0.');
            }
            $product->setStock($stock);
        }

        if (array_key_exists('isActive', $payload)) {
            $product->setIsActive((bool) $payload['isActive']);
        }
    }

    private function serializeProduct(Product $product): array
    {
        return [
            'id' => $product->getId(),
            'name' => $product->getName(),
            'sku' => $product->getSku(),
            'price' => (float) $product->getPrice(),
            'description' => $product->getDescription(),
            'imageUrl' => $product->getImageUrl(),
            'stock' => $product->getStock(),
            'isActive' => $product->isActive(),
            'brand' => ['id' => $product->getBrand()->getId(), 'name' => $product->getBrand()->getName()],
            'category' => ['id' => $product->getCategory()->getId(), 'name' => $product->getCategory()->getName()],
            'createdAt' => $product->getCreatedAt()->format(DATE_ATOM),
        ];
    }
}
