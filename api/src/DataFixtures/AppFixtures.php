<?php

namespace App\DataFixtures;

use App\Entity\Brand;
use App\Entity\Category;
use App\Entity\Customer;
use App\Entity\Employee;
use App\Entity\Product;
use App\Entity\Service;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    public function __construct(private readonly UserPasswordHasherInterface $passwordHasher)
    {
    }

    public function load(ObjectManager $manager): void
    {
        $brand = (new Brand())->setName('Generic Brand')->setIsActive(true);
        $manager->persist($brand);

        $category = (new Category())->setName('General')->setIsActive(true);
        $manager->persist($category);

        $admin = (new User())
            ->setEmail('admin@procuratio.local')
            ->setRoles(['ROLE_ADMIN']);
        $admin->setPassword($this->passwordHasher->hashPassword($admin, 'Admin123!'));
        $manager->persist($admin);

        $employeeUser = (new User())
            ->setEmail('employee@procuratio.local')
            ->setRoles(['ROLE_EMPLOYEE']);
        $employeeUser->setPassword($this->passwordHasher->hashPassword($employeeUser, 'Employee123!'));
        $manager->persist($employeeUser);

        $customerUser = (new User())
            ->setEmail('customer@procuratio.local')
            ->setRoles(['ROLE_CUSTOMER']);
        $customerUser->setPassword($this->passwordHasher->hashPassword($customerUser, 'Customer123!'));
        $manager->persist($customerUser);

        $employee = (new Employee())->setUser($employeeUser)->setFullName('Employee Demo');
        $manager->persist($employee);

        $customer = (new Customer())->setUser($customerUser)->setFullName('Customer Demo');
        $manager->persist($customer);

        $product = (new Product())
            ->setName('Shampoo Pro')
            ->setSku('PROD-0001')
            ->setBrand($brand)
            ->setCategory($category)
            ->setPrice('12.90')
            ->setStock(20)
            ->setIsActive(true);
        $manager->persist($product);

        $service = (new Service())
            ->setName('Coupe Femme')
            ->setCategory($category)
            ->setDescription('Coupe standard')
            ->setPrice('35.00')
            ->setIsActive(true);
        $manager->persist($service);

        $manager->flush();
    }
}
