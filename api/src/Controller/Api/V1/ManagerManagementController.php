<?php

namespace App\Controller\Api\V1;

use App\Entity\Employee;
use App\Entity\Store;
use App\Entity\User;
use App\Repository\StoreRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/admin/managers', name: 'api_v1_admin_managers_')]
#[IsGranted('ROLE_ADMIN')]
class ManagerManagementController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly StoreRepository $storeRepository,
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(100, max(1, (int) $request->query->get('perPage', 12)));
        $status = $request->query->get('status');
        $storeId = $request->query->get('storeId');
        $store = $storeId ? $this->storeRepository->find((int) $storeId) : null;
        $search = $request->query->get('q');

        $result = $this->userRepository->searchManagersPaginated(
            is_string($search) ? $search : null,
            is_string($status) ? $status : null,
            $store instanceof Store ? $store : null,
            $page,
            $perPage,
        );

        return $this->json([
            'data' => $result['items'],
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $perPage),
            ],
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $payload = $this->decodeJson($request);
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $fullName = trim((string) ($payload['fullName'] ?? ''));

        if ($email === '' || $password === '' || $fullName === '') {
            throw new BadRequestHttpException('Email, password and full name are required.');
        }

        $user = (new User())
            ->setEmail($email)
            ->setRoles(['ROLE_ADMIN']);
        $user->setPassword($this->passwordHasher->hashPassword($user, $password));

        $managerProfile = (new Employee())
            ->setUser($user)
            ->setFullName($fullName)
            ->setIsBookable(false);

        $this->hydrateManagerProfile($managerProfile, $payload);

        $this->em->persist($user);
        $this->em->persist($managerProfile);
        $this->em->flush();

        return $this->json($this->serializeManager($user), 201);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->userRepository->find($id);
        if (!$user instanceof User || !in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            throw new NotFoundHttpException('Manager not found.');
        }

        $payload = $this->decodeJson($request);
        if (isset($payload['email']) && trim((string) $payload['email']) !== '') {
            $user->setEmail((string) $payload['email']);
        }
        if (isset($payload['password']) && trim((string) $payload['password']) !== '') {
            $user->setPassword($this->passwordHasher->hashPassword($user, (string) $payload['password']));
        }

        $managerProfile = $this->em->getRepository(Employee::class)->findOneBy(['user' => $user]);
        if (!$managerProfile instanceof Employee) {
            $managerProfile = (new Employee())
                ->setUser($user)
                ->setFullName(trim((string) ($payload['fullName'] ?? strtok($user->getEmail(), '@'))))
                ->setIsBookable(false);
            $this->em->persist($managerProfile);
        }

        if (isset($payload['fullName'])) {
            $managerProfile->setFullName(trim((string) $payload['fullName']));
        }

        $this->hydrateManagerProfile($managerProfile, $payload);
        $this->em->flush();

        return $this->json($this->serializeManager($user));
    }

    private function decodeJson(Request $request): array
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        return $payload;
    }

    private function hydrateManagerProfile(Employee $managerProfile, array $payload): void
    {
        if (array_key_exists('storeId', $payload)) {
            $storeId = $payload['storeId'];
            $store = $storeId ? $this->storeRepository->find((int) $storeId) : null;
            if ($storeId && !$store instanceof Store) {
                throw new BadRequestHttpException('Invalid store.');
            }
            $managerProfile->setStore($store instanceof Store ? $store : null);
        }

        if (array_key_exists('jobTitle', $payload)) {
            $managerProfile->setJobTitle($payload['jobTitle'] !== '' ? (string) $payload['jobTitle'] : null);
        }
        if (array_key_exists('phoneNumber', $payload)) {
            $managerProfile->setPhoneNumber($payload['phoneNumber'] !== '' ? (string) $payload['phoneNumber'] : null);
        }
        if (array_key_exists('status', $payload)) {
            $status = (string) $payload['status'];
            $managerProfile->setStatus($status);
            $managerProfile->setArchivedAt($status === 'archived' ? new \DateTimeImmutable() : null);
        }

        $managerProfile->setIsBookable(false);
    }

    private function serializeManager(User $user): array
    {
        $managerProfile = $this->em->getRepository(Employee::class)->findOneBy(['user' => $user]);

        return [
            'id' => $user->getId(),
            'fullName' => $managerProfile?->getFullName() ?: strtok($user->getEmail(), '@'),
            'email' => $user->getEmail(),
            'jobTitle' => $managerProfile?->getJobTitle(),
            'phoneNumber' => $managerProfile?->getPhoneNumber(),
            'status' => $managerProfile?->getStatus() ?? 'active',
            'archivedAt' => $managerProfile?->getArchivedAt()?->format(DATE_ATOM),
            'store' => $managerProfile?->getStore() ? [
                'id' => $managerProfile->getStore()?->getId(),
                'name' => $managerProfile->getStore()?->getName(),
            ] : null,
            'createdAt' => $user->getCreatedAt()->format(DATE_ATOM),
            'accessLevel' => 'manager',
        ];
    }
}
