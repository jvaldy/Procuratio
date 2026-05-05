<?php

namespace App\Tests\Controller;

use App\Entity\Brand;
use App\Entity\Category;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ProductPayloadTest extends WebTestCase
{
    public function testCreateProductValidation(): void
    {
        $client = static::createClient();
        $token = $this->loginAsAdmin($client);

        $client->request(
            'POST',
            '/api/v1/products',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: json_encode([
                'name' => '',
                'sku' => '',
                'price' => -1,
                'brandId' => 99999,
                'categoryId' => 99999,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(400);
    }

    public function testCreateProductWithImageDescriptionAndQuantity(): void
    {
        $client = static::createClient();
        $token = $this->loginAsAdmin($client);
        [$brandId, $categoryId] = $this->resolveCatalogIds();

        $payload = [
            'name' => 'Produit test image',
            'sku' => 'TEST-IMG-' . random_int(1000, 9999),
            'description' => 'Description de test',
            'imageUrl' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
            'price' => 15.9,
            'stock' => 7,
            'brandId' => $brandId,
            'categoryId' => $categoryId,
            'isActive' => true,
        ];

        $client->request(
            'POST',
            '/api/v1/products',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: json_encode($payload, JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(201);
        $data = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertSame($payload['description'], $data['description']);
        self::assertStringStartsWith('data:image/png;base64,', (string) $data['imageUrl']);
        self::assertSame($payload['stock'], $data['stock']);
    }

    public function testListProductsSupportsBrandCategoryAndPriceFilters(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/products?brand=1&category=1&minPrice=0&maxPrice=9999&sort=price&order=ASC');

        self::assertResponseIsSuccessful();
        $data = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('data', $data);
        self::assertArrayHasKey('meta', $data);
    }

    public function testStockAdjustmentRequiresAdminRoleNow(): void
    {
        $client = static::createClient();
        $employeeToken = $this->loginAsEmployee($client);

        $client->request(
            'POST',
            '/api/v1/products/1/stock-adjustments',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $employeeToken),
            ],
            content: json_encode([
                'type' => 'adjust',
                'quantity' => 1,
                'reason' => 'test',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(403);
    }

    private function loginAsAdmin($client): string
    {
        $client->jsonRequest('POST', '/api/v1/auth/login', [
            'email' => 'admin@procuratio.local',
            'password' => 'Admin123!',
        ]);
        self::assertResponseIsSuccessful();
        $data = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return (string) $data['token'];
    }

    private function loginAsEmployee($client): string
    {
        $client->jsonRequest('POST', '/api/v1/auth/login', [
            'email' => 'employee@procuratio.local',
            'password' => 'Employee123!',
        ]);
        self::assertResponseIsSuccessful();
        $data = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return (string) $data['token'];
    }

    private function resolveCatalogIds(): array
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $brand = $em->getRepository(Brand::class)->findOneBy([]);
        $category = $em->getRepository(Category::class)->findOneBy([]);
        self::assertNotNull($brand);
        self::assertNotNull($category);

        return [$brand->getId(), $category->getId()];
    }
}
