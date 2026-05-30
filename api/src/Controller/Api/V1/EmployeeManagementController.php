<?php

namespace App\Controller\Api\V1;

use App\Entity\Employee;
use App\Entity\Store;
use App\Entity\User;
use App\Repository\EmployeeRepository;
use App\Repository\StoreRepository;
use App\Service\NotificationGatewayService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/v1/admin/employees', name: 'api_v1_admin_employees_')]
#[IsGranted('ROLE_ADMIN')]
class EmployeeManagementController extends AbstractController
{
    public function __construct(
        private readonly EmployeeRepository $employeeRepository,
        private readonly StoreRepository $storeRepository,
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly NotificationGatewayService $notificationGateway,
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
        $result = $this->employeeRepository->searchPaginated(
            is_string($search) ? $search : null,
            is_string($status) ? $status : null,
            $store instanceof Store ? $store : null,
            $page,
            $perPage
        );

        return $this->json([
            'data' => array_map(fn(Employee $employee) => $this->serializeEmployee($employee), $result['items']),
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
            ->setRoles(['ROLE_EMPLOYEE']);
        $user->setPassword($this->passwordHasher->hashPassword($user, $password));

        $employee = (new Employee())
            ->setUser($user)
            ->setFullName($fullName);

        $this->hydrateEmployee($employee, $payload, true);

        $this->em->persist($user);
        $this->em->persist($employee);
        $this->em->flush();

        return $this->json($this->serializeEmployee($employee), 201);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $employee = $this->employeeRepository->find($id);
        if (!$employee instanceof Employee) {
            throw new NotFoundHttpException('Employee not found.');
        }

        $payload = $this->decodeJson($request);
        if (isset($payload['email']) && trim((string) $payload['email']) !== '') {
            $employee->getUser()->setEmail((string) $payload['email']);
        }
        if (isset($payload['password']) && trim((string) $payload['password']) !== '') {
            $employee->getUser()->setPassword($this->passwordHasher->hashPassword($employee->getUser(), (string) $payload['password']));
        }
        if (isset($payload['fullName'])) {
            $employee->setFullName(trim((string) $payload['fullName']));
        }

        $this->hydrateEmployee($employee, $payload, false);
        $this->em->flush();

        return $this->json($this->serializeEmployee($employee));
    }

    #[Route('/{id}/reset-password', name: 'reset_password', methods: ['POST'])]
    public function resetPassword(int $id): JsonResponse
    {
        $employee = $this->employeeRepository->find($id);
        if (!$employee instanceof Employee) {
            throw new NotFoundHttpException('Employee not found.');
        }

        $temporaryPassword = $this->generateTemporaryPassword();
        $user = $employee->getUser();
        $user->setPassword($this->passwordHasher->hashPassword($user, $temporaryPassword));
        $this->em->flush();

        return $this->json([
            'message' => $this->buildTemporaryPasswordMessage(
                $user,
                $employee->getFullName(),
                $temporaryPassword,
            ),
            'temporaryPassword' => $temporaryPassword,
        ]);
    }

    private function decodeJson(Request $request): array
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Invalid JSON payload.');
        }

        return $payload;
    }

    private function hydrateEmployee(Employee $employee, array $payload, bool $isCreate): void
    {
        if ($isCreate && !isset($payload['storeId'])) {
            throw new BadRequestHttpException('A store is required for each employee.');
        }

        if (array_key_exists('storeId', $payload)) {
            $storeId = $payload['storeId'];
            $store = $storeId ? $this->storeRepository->find((int) $storeId) : null;
            if ($storeId && !$store instanceof Store) {
                throw new BadRequestHttpException('Invalid store.');
            }
            $employee->setStore($store instanceof Store ? $store : null);
        }

        if (array_key_exists('jobTitle', $payload)) {
            $employee->setJobTitle($payload['jobTitle'] !== '' ? (string) $payload['jobTitle'] : null);
        }
        if (array_key_exists('phoneNumber', $payload)) {
            $employee->setPhoneNumber($payload['phoneNumber'] !== '' ? (string) $payload['phoneNumber'] : null);
        }
        if (array_key_exists('isBookable', $payload)) {
            $employee->setIsBookable((bool) $payload['isBookable']);
        }
        if (array_key_exists('status', $payload)) {
            $status = (string) $payload['status'];
            $employee->setStatus($status);
            $employee->setArchivedAt($status === 'archived' ? new \DateTimeImmutable() : null);
        }
    }

    private function serializeEmployee(Employee $employee): array
    {
        return [
            'id' => $employee->getId(),
            'fullName' => $employee->getFullName(),
            'email' => $employee->getUser()->getEmail(),
            'jobTitle' => $employee->getJobTitle(),
            'phoneNumber' => $employee->getPhoneNumber(),
            'status' => $employee->getStatus(),
            'isBookable' => $employee->isBookable(),
            'archivedAt' => $employee->getArchivedAt()?->format(DATE_ATOM),
            'store' => $employee->getStore() ? [
                'id' => $employee->getStore()?->getId(),
                'name' => $employee->getStore()?->getName(),
            ] : null,
            'createdAt' => $employee->getUser()->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    private function generateTemporaryPassword(): string
    {
        return sprintf(
            'Temp-%s!%s',
            strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)),
            random_int(10, 99)
        );
    }

    private function buildTemporaryPasswordMessage(User $user, string $fullName, string $temporaryPassword): string
    {
        $subject = 'Your Procuratio temporary password';
        $body = sprintf(
            "Hello %s,\n\nA temporary password has been generated for your Procuratio account.\n\nEmail: %s\nTemporary password: %s\n\nPlease sign in and change it from your profile as soon as possible.\n",
            $fullName,
            $user->getEmail(),
            $temporaryPassword,
        );

        $result = $this->notificationGateway->sendEmail($user->getEmail(), $subject, $body);
        if ($result['ok']) {
            return sprintf('Temporary password generated. An email was prepared for %s.', $user->getEmail());
        }

        return 'Temporary password generated. Email delivery is unavailable for this account, so share it manually.';
    }
}
