<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'customers')]
class Customer
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(length: 120)]
    private string $fullName;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $phoneNumber = null;

    #[ORM\Column(type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $birthDate = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Store $preferredStore = null;

    public function getId(): ?int { return $this->id; }
    public function getUser(): User { return $this->user; }
    public function setUser(User $user): self { $this->user = $user; return $this; }
    public function getFullName(): string { return $this->fullName; }
    public function setFullName(string $fullName): self { $this->fullName = $fullName; return $this; }
    public function getPhoneNumber(): ?string { return $this->phoneNumber; }
    public function setPhoneNumber(?string $phoneNumber): self { $this->phoneNumber = $phoneNumber; return $this; }
    public function getBirthDate(): ?\DateTimeImmutable { return $this->birthDate; }
    public function setBirthDate(?\DateTimeImmutable $birthDate): self { $this->birthDate = $birthDate; return $this; }
    public function getPreferredStore(): ?Store { return $this->preferredStore; }
    public function setPreferredStore(?Store $preferredStore): self { $this->preferredStore = $preferredStore; return $this; }
}
