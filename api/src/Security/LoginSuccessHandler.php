<?php

namespace App\Security;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Http\Authentication\AuthenticationSuccessHandlerInterface;

class LoginSuccessHandler implements AuthenticationSuccessHandlerInterface
{
    public function __construct(
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly CookieTokenManager $cookieTokenManager,
    ) {
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token): ?Response
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['message' => 'Authenticated'], 200);
        }

        $accessToken = $this->jwtManager->create($user);
        $refreshToken = $this->cookieTokenManager->issueRefreshToken($user);

        $response = new JsonResponse(['token' => $accessToken], 200);
        $this->cookieTokenManager->addAuthCookies($response, $accessToken, $refreshToken);

        return $response;
    }
}
