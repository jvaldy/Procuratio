<?php

namespace App\Controller\Api\V1;

use App\Entity\Brand;
use App\Entity\Category;
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

        $category = (new Category())->setName($name);
        $this->em->persist($category);
        $this->em->flush();

        return $this->json(['id' => $category->getId(), 'name' => $category->getName()], 201);
    }
}
