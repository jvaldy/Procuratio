<?php

namespace App\Controller\Api\V1;

use App\Entity\Brand;
use App\Entity\Category;
use App\Entity\Product;
use App\Entity\Service;
use App\Repository\BrandRepository;
use App\Repository\CategoryRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/catalog', name: 'api_v1_catalog_')]
class CatalogController extends AbstractController
{
    private const MSG_INVALID_JSON = 'Invalid JSON payload.';
    private const MSG_NAME_REQUIRED = 'The name field is required.';
    private const MSG_BRAND_NOT_FOUND = 'Brand not found.';
    private const MSG_CATEGORY_NOT_FOUND = 'Type not found.';
    private const MSG_BRAND_ALREADY_EXISTS = 'This brand already exists.';
    private const MSG_CATEGORY_ALREADY_EXISTS = 'This type already exists.';

    public function __construct(
        private readonly BrandRepository $brandRepository,
        private readonly CategoryRepository $categoryRepository,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[OA\Get(
        path: '/api/v1/catalog/brands',
        tags: ['Catalogue'],
        summary: 'Lister les marques',
        description: 'Retourne la liste des marques disponibles pour filtrer ou rattacher un produit.'
    )]
    #[OA\Response(response: 200, description: 'Liste des marques retournee')]
    #[Route('/brands', name: 'brands_list', methods: ['GET'])]
    public function listBrands(): JsonResponse
    {
        $items = $this->brandRepository->findBy([], ['name' => 'ASC']);

        return $this->json(array_map(static fn(Brand $b) => [
            'id' => $b->getId(),
            'name' => $b->getName(),
            'isActive' => $b->isActive(),
        ], $items));
    }

    #[OA\Get(
        path: '/api/v1/catalog/categories',
        tags: ['Catalogue'],
        summary: 'Lister les categories',
        description: 'Retourne la liste des categories disponibles pour les produits et services.'
    )]
    #[OA\Response(response: 200, description: 'Liste des categories retournee')]
    #[Route('/categories', name: 'categories_list', methods: ['GET'])]
    public function listCategories(): JsonResponse
    {
        $items = $this->categoryRepository->findBy([], ['name' => 'ASC']);

        return $this->json(array_map(static fn(Category $c) => [
            'id' => $c->getId(),
            'name' => $c->getName(),
            'isActive' => $c->isActive(),
        ], $items));
    }

    #[OA\Post(
        path: '/api/v1/catalog/brands',
        tags: ['Catalogue'],
        summary: 'Creer une marque',
        description: 'Cree une nouvelle marque exploitable dans les produits.'
    )]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(required: ['name'], properties: [new OA\Property(property: 'name', type: 'string', example: 'Loreal')]))]
    #[OA\Response(response: 201, description: 'Marque creee')]
    #[OA\Response(response: 400, description: 'Payload invalide')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[Route('/brands', name: 'brands_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function createBrand(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException(self::MSG_INVALID_JSON);
        }

        $name = trim((string) ($payload['name'] ?? ''));
        if ($name === '') {
            throw new BadRequestHttpException(self::MSG_NAME_REQUIRED);
        }
        if ($this->brandRepository->findOneByName($name) instanceof Brand) {
            throw new BadRequestHttpException(self::MSG_BRAND_ALREADY_EXISTS);
        }

        $brand = (new Brand())->setName($name);
        $this->em->persist($brand);
        $this->em->flush();

        return $this->json(['id' => $brand->getId(), 'name' => $brand->getName()], 201);
    }

    #[OA\Post(
        path: '/api/v1/catalog/categories',
        tags: ['Catalogue'],
        summary: 'Creer une categorie',
        description: 'Cree une nouvelle categorie exploitable dans les produits et services.'
    )]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(required: ['name'], properties: [new OA\Property(property: 'name', type: 'string', example: 'Shampooing')]))]
    #[OA\Response(response: 201, description: 'Categorie creee')]
    #[OA\Response(response: 400, description: 'Payload invalide')]
    #[OA\Response(response: 401, description: 'Authentification requise')]
    #[Route('/categories', name: 'categories_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function createCategory(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException(self::MSG_INVALID_JSON);
        }

        $name = trim((string) ($payload['name'] ?? ''));
        if ($name === '') {
            throw new BadRequestHttpException(self::MSG_NAME_REQUIRED);
        }
        if ($this->categoryRepository->findOneByName($name) instanceof Category) {
            throw new BadRequestHttpException(self::MSG_CATEGORY_ALREADY_EXISTS);
        }

        $category = (new Category())->setName($name);
        $this->em->persist($category);
        $this->em->flush();

        return $this->json(['id' => $category->getId(), 'name' => $category->getName()], 201);
    }

    #[Route('/brands/{id}/retire', name: 'brands_retire', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function retireBrand(int $id, Request $request): JsonResponse
    {
        $brand = $this->brandRepository->find($id);
        if (!$brand instanceof Brand) {
            throw new BadRequestHttpException(self::MSG_BRAND_NOT_FOUND);
        }

        $payload = $this->decodeOptionalJson($request);
        $linkedProducts = $this->em->getRepository(Product::class)->findBy(['brand' => $brand]);
        $replacement = $this->resolveReplacementBrand($payload['replacementId'] ?? null, $brand, !empty($linkedProducts));

        foreach ($linkedProducts as $product) {
            $product->setBrand($replacement);
            $product->touch();
        }

        $this->em->remove($brand);
        $this->em->flush();

        return $this->json([
            'message' => $replacement instanceof Brand
                ? 'Brand deleted and linked products moved to the replacement brand.'
                : 'Brand deleted.',
        ]);
    }

    #[Route('/categories/{id}/retire', name: 'categories_retire', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function retireCategory(int $id, Request $request): JsonResponse
    {
        $category = $this->categoryRepository->find($id);
        if (!$category instanceof Category) {
            throw new BadRequestHttpException(self::MSG_CATEGORY_NOT_FOUND);
        }

        $payload = $this->decodeOptionalJson($request);
        $linkedProducts = $this->em->getRepository(Product::class)->findBy(['category' => $category]);
        $linkedServices = $this->em->getRepository(Service::class)->findBy(['category' => $category]);
        $replacement = $this->resolveReplacementCategory($payload['replacementId'] ?? null, $category, !empty($linkedProducts) || !empty($linkedServices));

        foreach ($linkedProducts as $product) {
            $product->setCategory($replacement);
            $product->touch();
        }

        foreach ($linkedServices as $service) {
            $service->setCategory($replacement);
        }

        $this->em->remove($category);
        $this->em->flush();

        return $this->json([
            'message' => $replacement instanceof Category
                ? 'Type deleted and linked products or services moved to the replacement type.'
                : 'Type deleted.',
        ]);
    }

    private function decodeOptionalJson(Request $request): array
    {
        if (trim($request->getContent()) === '') {
            return [];
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException(self::MSG_INVALID_JSON);
        }

        return $payload;
    }

    private function resolveReplacementBrand(mixed $replacementId, Brand $brand, bool $required): ?Brand
    {
        if ($replacementId === null || $replacementId === '') {
            if ($required) {
                throw new BadRequestHttpException('This brand is still linked to products. Choose a replacement brand first.');
            }

            return null;
        }

        $replacement = $this->brandRepository->find((int) $replacementId);
        if (!$replacement instanceof Brand || $replacement->getId() === $brand->getId()) {
            throw new BadRequestHttpException('Choose a valid replacement brand.');
        }

        return $replacement;
    }

    private function resolveReplacementCategory(mixed $replacementId, Category $category, bool $required): ?Category
    {
        if ($replacementId === null || $replacementId === '') {
            if ($required) {
                throw new BadRequestHttpException('This type is still linked to products or services. Choose a replacement type first.');
            }

            return null;
        }

        $replacement = $this->categoryRepository->find((int) $replacementId);
        if (!$replacement instanceof Category || $replacement->getId() === $category->getId()) {
            throw new BadRequestHttpException('Choose a valid replacement type.');
        }

        return $replacement;
    }
}
