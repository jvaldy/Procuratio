<?php

namespace App\Entity;

use App\Repository\StoreRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StoreRepository::class)]
#[ORM\Table(name: 'stores')]
class Store
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    private string $name;

    #[ORM\Column(length: 40, unique: true)]
    private string $code;

    #[ORM\Column(length: 180, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $phoneNumber = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $addressLine1 = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $addressLine2 = null;

    #[ORM\Column(length: 40, nullable: true)]
    private ?string $postalCode = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $city = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $country = null;

    #[ORM\Column(length: 20)]
    private string $status = 'active';

    #[ORM\Column(length: 20)]
    private string $themeColor = 'soft';

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = trim($name); return $this; }
    public function getCode(): string { return $this->code; }
    public function setCode(string $code): self { $this->code = strtoupper(trim($code)); return $this; }
    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): self { $this->email = $email ? strtolower(trim($email)) : null; return $this; }
    public function getPhoneNumber(): ?string { return $this->phoneNumber; }
    public function setPhoneNumber(?string $phoneNumber): self { $this->phoneNumber = $phoneNumber ? trim($phoneNumber) : null; return $this; }
    public function getAddressLine1(): ?string { return $this->addressLine1; }
    public function setAddressLine1(?string $addressLine1): self { $this->addressLine1 = $addressLine1 ? trim($addressLine1) : null; return $this; }
    public function getAddressLine2(): ?string { return $this->addressLine2; }
    public function setAddressLine2(?string $addressLine2): self { $this->addressLine2 = $addressLine2 ? trim($addressLine2) : null; return $this; }
    public function getPostalCode(): ?string { return $this->postalCode; }
    public function setPostalCode(?string $postalCode): self { $this->postalCode = $postalCode ? trim($postalCode) : null; return $this; }
    public function getCity(): ?string { return $this->city; }
    public function setCity(?string $city): self { $this->city = $city ? trim($city) : null; return $this; }
    public function getCountry(): ?string { return $this->country; }
    public function setCountry(?string $country): self { $this->country = $country ? trim($country) : null; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = strtolower(trim($status)) ?: 'active'; return $this; }
    public function getThemeColor(): string { return $this->themeColor; }
    public function setThemeColor(string $themeColor): self { $this->themeColor = strtolower(trim($themeColor)) ?: 'soft'; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
