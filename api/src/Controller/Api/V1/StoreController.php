<?php

namespace App\Controller\Api\V1;

use App\Entity\Store;
use App\Repository\StoreRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1', name: 'api_v1_stores_')]
class StoreController extends AbstractController
{
    public function __construct(
        private readonly StoreRepository $storeRepository,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('/public/stores', name: 'public_list', methods: ['GET'])]
    public function publicList(): JsonResponse
    {
        return $this->json([
            'data' => array_map(fn(Store $store) => $this->serializeStore($store), $this->storeRepository->findActive()),
        ]);
    }

    #[Route('/admin/stores', name: 'admin_list', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 12)));
        $search = $request->query->get('q');
        $result = $this->storeRepository->searchPaginated(is_string($search) ? $search : null, $page, $perPage);

        return $this->json([
            'data' => array_map(fn(Store $store) => $this->serializeStore($store), $result['items']),
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $perPage),
            ],
        ]);
    }

    #[Route('/admin/stores', name: 'admin_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function create(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $store = (new Store());
        $this->hydrateStore($store, $payload);
        $this->em->persist($store);
        $this->em->flush();

        return $this->json($this->serializeStore($store), 201);
    }

    #[Route('/admin/stores/{id}', name: 'admin_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_ADMIN')]
    public function update(int $id, Request $request): JsonResponse
    {
        $store = $this->storeRepository->find($id);
        if (!$store instanceof Store) {
            throw new NotFoundHttpException('Store not found.');
        }

        $payload = $this->decodeJson($request);
        $this->hydrateStore($store, $payload, true);
        $store->touch();
        $this->em->flush();

        return $this->json($this->serializeStore($store));
    }

    private function decodeJson(Request $request): array
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        return $payload;
    }

    private function hydrateStore(Store $store, array $payload, bool $partial = false): void
    {
        $name = array_key_exists('name', $payload) ? trim((string) $payload['name']) : null;
        $code = array_key_exists('code', $payload) ? trim((string) $payload['code']) : null;

        if (!$partial || $name !== null) {
            if ($name === '') {
                throw new BadRequestHttpException('Store name is required.');
            }
            $store->setName((string) $name);
        }

        if (!$partial || $code !== null) {
            if ($code === '') {
                throw new BadRequestHttpException('Store code is required.');
            }
            $store->setCode((string) $code);
        }

        if (array_key_exists('email', $payload)) {
            $store->setEmail($payload['email'] !== '' ? (string) $payload['email'] : null);
        }
        if (array_key_exists('phoneNumber', $payload)) {
            $store->setPhoneNumber($payload['phoneNumber'] !== '' ? (string) $payload['phoneNumber'] : null);
        }
        if (array_key_exists('addressLine1', $payload)) {
            $store->setAddressLine1($payload['addressLine1'] !== '' ? (string) $payload['addressLine1'] : null);
        }
        if (array_key_exists('addressLine2', $payload)) {
            $store->setAddressLine2($payload['addressLine2'] !== '' ? (string) $payload['addressLine2'] : null);
        }
        if (array_key_exists('postalCode', $payload)) {
            $store->setPostalCode($payload['postalCode'] !== '' ? (string) $payload['postalCode'] : null);
        }
        if (array_key_exists('city', $payload)) {
            $store->setCity($payload['city'] !== '' ? (string) $payload['city'] : null);
        }
        if (array_key_exists('country', $payload)) {
            $store->setCountry($payload['country'] !== '' ? (string) $payload['country'] : null);
        }
        if (array_key_exists('status', $payload)) {
            $store->setStatus((string) $payload['status']);
        }
        if (array_key_exists('themeColor', $payload)) {
            $store->setThemeColor((string) $payload['themeColor']);
        }
    }

    private function serializeStore(Store $store): array
    {
        return [
            'id' => $store->getId(),
            'name' => $store->getName(),
            'code' => $store->getCode(),
            'email' => $store->getEmail(),
            'phoneNumber' => $store->getPhoneNumber(),
            'addressLine1' => $store->getAddressLine1(),
            'addressLine2' => $store->getAddressLine2(),
            'postalCode' => $store->getPostalCode(),
            'city' => $store->getCity(),
            'country' => $store->getCountry(),
            'status' => $store->getStatus(),
            'themeColor' => $store->getThemeColor(),
        ];
    }
}
