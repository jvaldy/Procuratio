<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;

class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::EXCEPTION => 'onKernelException'];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $request = $event->getRequest();
        $appEnv = $_SERVER['APP_ENV'] ?? $_ENV['APP_ENV'] ?? null;
        if ($appEnv === 'test') {
            return;
        }

        $path = $request->getPathInfo();
        if (!str_starts_with($path, '/api/')) {
            return;
        }

        // Keep Swagger/OpenAPI responses untouched so doc tooling can expose
        // useful debug details instead of our generic API error envelope.
        if (str_starts_with($path, '/api/doc')) {
            return;
        }

        $exception = $event->getThrowable();
        $statusCode = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500;
        $isDev = ($appEnv === 'dev');
        $message = $this->resolveUserMessage($exception, $statusCode, $isDev);

        $event->setResponse(new JsonResponse([
            'error' => [
                'code' => $statusCode,
                'message' => $message,
            ],
        ], $statusCode));
    }

    private function resolveUserMessage(\Throwable $exception, int $statusCode, bool $isDev): string
    {
        if ($exception instanceof AuthenticationException || $statusCode === 401) {
            return 'Authentification requise.';
        }

        if ($exception instanceof AccessDeniedException || $statusCode === 403) {
            return 'Vous n\'avez pas les droits pour effectuer cette action.';
        }

        if ($statusCode === 404) {
            return $this->normalizeMessage($exception->getMessage(), 'Ressource introuvable.');
        }

        if ($statusCode === 405) {
            return 'Methode HTTP non autorisee sur cette route.';
        }

        if ($statusCode >= 500) {
            return $isDev ? $exception->getMessage() : 'Une erreur interne est survenue.';
        }

        return $this->normalizeMessage($exception->getMessage(), 'Requete invalide.');
    }

    private function normalizeMessage(string $message, string $fallback): string
    {
        $trimmed = trim($message);
        if ($trimmed === '' || $this->isTechnicalMessage($trimmed)) {
            return $fallback;
        }

        $translations = [
            'Invalid JSON payload.' => 'Payload JSON invalide.',
            'Product not found.' => 'Produit introuvable.',
            'Service not found.' => 'Service introuvable.',
            'name is required.' => 'Le champ name est requis.',
        ];

        return $translations[$trimmed] ?? $trimmed;
    }

    private function isTechnicalMessage(string $message): bool
    {
        $technicalPatterns = [
            '/^Access Denied by #\\[IsGranted/i',
            '/^Full authentication is required/i',
            '/^An exception has been thrown during the rendering/i',
        ];

        foreach ($technicalPatterns as $pattern) {
            if (preg_match($pattern, $message) === 1) {
                return true;
            }
        }

        return false;
    }
}
