<?php

namespace App\Command;

use App\Entity\Category;
use App\Entity\Order;
use App\Entity\OrderItem;
use App\Entity\Product;
use App\Entity\SaleItem;
use App\Entity\Service;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:normalize-demo-catalog-english', description: 'Normalizes demo products, services and related labels to English.')]
class NormalizeDemoCatalogEnglishCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $categoryMap = [
            'Shampooing' => 'Shampoo',
            'Coloration' => 'Color',
            'Soin' => 'Treatment',
            'Accessoire' => 'Accessory',
            'Coiffage' => 'Styling',
        ];

        $productMap = [
            'PROD-1001' => 'Radiance Shampoo',
            'PROD-1002' => 'Nutrition Mask+',
            'PROD-1003' => 'Sculpting Fix Gel',
            'PROD-1004' => 'Volume Pro Spray',
            'PROD-1005' => 'Protective Oil',
            'PROD-1006' => 'Ceramic XL Brush',
            'PROD-1007' => 'Soft Curl Cream',
            'PROD-1008' => 'Ends Serum',
            'PROD-1009' => 'Texturizing Powder',
            'PROD-1010' => 'Purifying Shampoo',
            'PROD-1011' => 'Mini Straightener',
            'PROD-1012' => 'Anti-Static Comb',
        ];

        $serviceMap = [
            'Coupe Femme Signature' => ['name' => 'Signature Women Cut', 'description' => 'Cut and shape styling'],
            'Coupe Homme D?grad?' => ['name' => 'Men Fade Cut', 'description' => 'Classic or progressive fade'],
            'Coupe Homme Degrade' => ['name' => 'Men Fade Cut', 'description' => 'Classic or progressive fade'],
            'Brushing Lisse' => ['name' => 'Smooth Blow-Dry', 'description' => 'Smooth blow-dry for short to mid-length hair'],
            'Coloration Racines' => ['name' => 'Root Color Refresh', 'description' => 'Root touch-up only'],
            'Patine Gloss' => ['name' => 'Gloss Toner', 'description' => 'Tone correction and shine boost'],
            'Soin Profond K?ratine' => ['name' => 'Deep Keratin Treatment', 'description' => 'Intensive repairing treatment'],
            'Soin Profond Keratine' => ['name' => 'Deep Keratin Treatment', 'description' => 'Intensive repairing treatment'],
            'Barbe Entretien' => ['name' => 'Beard Grooming', 'description' => 'Beard trim and contouring'],
            'Forfait Mariage Essai' => ['name' => 'Bridal Trial Package', 'description' => 'Ceremony styling with trial session'],
            'Diagnostic Capillaire' => ['name' => 'Hair Diagnosis', 'description' => 'Hair analysis and routine advice'],
            'Pose Extensions' => ['name' => 'Extensions Application', 'description' => 'Full application, extensions not included'],
        ];

        foreach ($this->em->getRepository(Category::class)->findAll() as $category) {
            $name = $category->getName();
            if (isset($categoryMap[$name])) {
                $category->setName($categoryMap[$name]);
            }
        }

        foreach ($this->em->getRepository(Product::class)->findAll() as $product) {
            $sku = $product->getSku();
            if (isset($productMap[$sku])) {
                $product->setName($productMap[$sku]);
            }
        }

        foreach ($this->em->getRepository(Service::class)->findAll() as $service) {
            $name = $service->getName();
            if (isset($serviceMap[$name])) {
                $service->setName($serviceMap[$name]['name']);
                $service->setDescription($serviceMap[$name]['description']);
                if ($service->getComposition()) {
                    $service->setComposition('Please ask the salon team for the full protocol details.');
                }
            }
        }

        foreach ($this->em->getRepository(SaleItem::class)->findAll() as $saleItem) {
            if ($saleItem->getItemType() === 'product') {
                $product = $this->em->getRepository(Product::class)->find($saleItem->getItemId());
                if ($product instanceof Product && isset($productMap[$product->getSku()])) {
                    $saleItem->setLabel($productMap[$product->getSku()]);
                }
            }

            if ($saleItem->getItemType() === 'service' && isset($serviceMap[$saleItem->getLabel()])) {
                $saleItem->setLabel($serviceMap[$saleItem->getLabel()]['name']);
            }
        }

        foreach ($this->em->getRepository(Order::class)->findAll() as $order) {
            if ($order->getPickupNote() === 'Retrait comptoir principal') {
                $order->setPickupNote('Main counter pickup');
            }
            foreach ($order->getItems() as $item) {
                if (isset($productMap[$item->getProductSku()])) {
                    $item->setProductName($productMap[$item->getProductSku()]);
                }
            }
        }

        $this->em->flush();
        $output->writeln('<info>Demo catalog and related data normalized to English.</info>');

        return Command::SUCCESS;
    }
}
