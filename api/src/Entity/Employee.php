<?php

namespace App\Entity;

use App\Repository\EmployeeRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EmployeeRepository::class)]
#[ORM\Table(name: 'employees')]
class Employee
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

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $jobTitle = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $phoneNumber = null;

    #[ORM\Column(length: 20)]
    private string $status = 'active';

    #[ORM\Column]
    private bool $isBookable = true;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $archivedAt = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Store $store = null;

    public function getId(): ?int { return $this->id; }
    public function getUser(): User { return $this->user; }
    public function setUser(User $user): self { $this->user = $user; return $this; }
    public function getFullName(): string { return $this->fullName; }
    public function setFullName(string $fullName): self { $this->fullName = $fullName; return $this; }
    public function getJobTitle(): ?string { return $this->jobTitle; }
    public function setJobTitle(?string $jobTitle): self { $this->jobTitle = $jobTitle; return $this; }
    public function getPhoneNumber(): ?string { return $this->phoneNumber; }
    public function setPhoneNumber(?string $phoneNumber): self { $this->phoneNumber = $phoneNumber; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function isBookable(): bool { return $this->isBookable; }
    public function setIsBookable(bool $isBookable): self { $this->isBookable = $isBookable; return $this; }
    public function getArchivedAt(): ?\DateTimeImmutable { return $this->archivedAt; }
    public function setArchivedAt(?\DateTimeImmutable $archivedAt): self { $this->archivedAt = $archivedAt; return $this; }
    public function getStore(): ?Store { return $this->store; }
    public function setStore(?Store $store): self { $this->store = $store; return $this; }
}
