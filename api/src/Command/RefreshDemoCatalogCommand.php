<?php

namespace App\Command;

use App\Demo\DemoBeautyCatalog;
use App\Entity\Brand;
use App\Entity\Category;
use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:refresh-demo-catalog', description: 'Refresh the demo catalog with coherent salon-beauty products and images.')]
class RefreshDemoCatalogCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $this->ensureBrandsAndCategories();
        $brands = $this->indexBrands();
        $categories = $this->indexCategories();

        $definitions = $this->catalogDefinitions();
        $updated = 0;

        foreach ($definitions as $sku => $definition) {
            $product = $this->em->getRepository(Product::class)->findOneBy(['sku' => $sku]);
            if (!$product instanceof Product) {
                continue;
            }

            $brand = $brands[$definition['brand']] ?? null;
            $category = $categories[$definition['category']] ?? null;
            if (!$brand instanceof Brand || !$category instanceof Category) {
                continue;
            }

            $product
                ->setName($definition['name'])
                ->setDescription($definition['description'])
                ->setImageUrl($definition['image'])
                ->setBrand($brand)
                ->setCategory($category)
                ->setPrice($definition['price'])
                ->setIsActive(true);
            $product->touch();
            $updated++;
        }

        $this->em->flush();

        $output->writeln(sprintf('<info>%d demo products refreshed with a coherent salon-beauty catalog.</info>', $updated));

        return Command::SUCCESS;
    }

    private function ensureBrandsAndCategories(): void
    {
        $brandNames = [];
        $categoryNames = [];

        foreach (DemoBeautyCatalog::brandNames() as $name) {
            $brandNames[$name] = true;
        }

        foreach (DemoBeautyCatalog::categoryNames() as $name) {
            $categoryNames[$name] = true;
        }

        foreach (array_keys($brandNames) as $name) {
            $brand = $this->em->getRepository(Brand::class)->findOneBy(['name' => $name]) ?? (new Brand())->setName($name);
            $brand->setIsActive(true);
            $this->em->persist($brand);
        }

        foreach (array_keys($categoryNames) as $name) {
            $category = $this->em->getRepository(Category::class)->findOneBy(['name' => $name]) ?? (new Category())->setName($name);
            $category->setIsActive(true);
            $this->em->persist($category);
        }

        $this->em->flush();
    }

    /**
     * @return array<string, Brand>
     */
    private function indexBrands(): array
    {
        $result = [];
        foreach ($this->em->getRepository(Brand::class)->findAll() as $brand) {
            $result[$brand->getName()] = $brand;
        }

        return $result;
    }

    /**
     * @return array<string, Category>
     */
    private function indexCategories(): array
    {
        $result = [];
        foreach ($this->em->getRepository(Category::class)->findAll() as $category) {
            $result[$category->getName()] = $category;
        }

        return $result;
    }

    /**
     * @return array<string, array{name:string,description:string,price:string,brand:string,category:string,image:string}>
     */
    private function catalogDefinitions(): array
    {
        return DemoBeautyCatalog::productsBySku();
    }
}
