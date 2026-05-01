<?php

namespace App\Repository;

use App\Entity\Cart;
use App\Entity\Customer;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class CartRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Cart::class);
    }

    public function findOpenByCustomer(Customer $customer): ?Cart
    {
        return $this->findOneBy(['customer' => $customer, 'status' => Cart::STATUS_OPEN], ['id' => 'DESC']);
    }
}

