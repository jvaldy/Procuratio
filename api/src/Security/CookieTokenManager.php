<?php

namespace App\Security;

use App\Entity\RefreshToken;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class CookieTokenManager
{
    private const ACCESS_COOKIE = 'access_token';
    private const REFRESH_COOKIE = 'refresh_token';

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function issueRefreshToken(User $user, int $ttlSeconds = 1209600): string
    {
        $rawToken = bin2hex(random_bytes(48));
        $token = (new RefreshToken())
            ->setUser($user)
            ->setTokenHash(hash('sha256', $rawToken))
            ->setExpiresAt(new \DateTimeImmutable(sprintf('+%d seconds', $ttlSeconds)));

        $this->em->persist($token);
        $this->em->flush();

        return $rawToken;
    }

    public function rotateRefreshToken(string $rawToken): ?User
    {
        $repo = $this->em->getRepository(RefreshToken::class);
        $token = $repo->findOneBy(['tokenHash' => hash('sha256', $rawToken), 'revokedAt' => null]);
        if (!$token instanceof RefreshToken) {
            return null;
        }

        if ($token->getExpiresAt() <= new \DateTimeImmutable()) {
            return null;
        }

        $token->setRevokedAt(new \DateTimeImmutable());

        return $token->getUser();
    }

    public function revokeRefreshTokenFromRequest(Request $request): void
    {
        $rawToken = $request->cookies->get(self::REFRESH_COOKIE);
        if (!$rawToken) {
            return;
        }

        $token = $this->em->getRepository(RefreshToken::class)->findOneBy([
            'tokenHash' => hash('sha256', $rawToken),
            'revokedAt' => null,
        ]);
        if ($token instanceof RefreshToken) {
            $token->setRevokedAt(new \DateTimeImmutable());
            $this->em->flush();
        }
    }

    public function addAuthCookies(Response $response, string $accessToken, string $refreshToken): void
    {
        // Les tokens ne doivent jamais etre lisibles par JS; on force HttpOnly pour limiter l'impact d'un XSS.
        $response->headers->setCookie($this->buildCookie(self::ACCESS_COOKIE, $accessToken, 3600));
        $response->headers->setCookie($this->buildCookie(self::REFRESH_COOKIE, $refreshToken, 1209600));
    }

    public function clearAuthCookies(Response $response): void
    {
        $response->headers->clearCookie(self::ACCESS_COOKIE, '/', null, true, true, Cookie::SAMESITE_STRICT);
        $response->headers->clearCookie(self::REFRESH_COOKIE, '/', null, true, true, Cookie::SAMESITE_STRICT);
    }

    private function buildCookie(string $name, string $value, int $ttlSeconds): Cookie
    {
        return Cookie::create(
            $name,
            $value,
            new \DateTimeImmutable(sprintf('+%d seconds', $ttlSeconds)),
            '/',
            null,
            true,
            true,
            false,
            Cookie::SAMESITE_STRICT
        );
    }
}
