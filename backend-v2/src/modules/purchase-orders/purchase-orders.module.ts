import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from '../../persistence/schemas/product.schema';
import { PurchaseOrderSchema } from '../../persistence/schemas/purchase-order.schema';
import { SupplierSchema } from '../../persistence/schemas/supplier.schema';
import { WarehouseSchema } from '../../persistence/schemas/warehouse.schema';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  imports: [
    InventoryModule,
    MongooseModule.forFeature([
      { name: 'PurchaseOrder', schema: PurchaseOrderSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'Supplier', schema: SupplierSchema },
      { name: 'Warehouse', schema: WarehouseSchema }
    ])
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService, MongooseModule]
})
export class PurchaseOrdersModule {}
