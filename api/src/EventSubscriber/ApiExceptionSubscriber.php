<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::EXCEPTION => 'onKernelException'];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $request = $event->getRequest();
        if ($request->server->get('APP_ENV') === 'test') {
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
        $statusCode = method_exists($exception, 'getStatusCode') ? $exception->getStatusCode() : 500;

        $event->setResponse(new JsonResponse([
            'error' => [
                'code' => $statusCode,
                'message' => $statusCode >= 500 ? 'Internal server error' : $exception->getMessage(),
            ],
        ], $statusCode));
    }
}
