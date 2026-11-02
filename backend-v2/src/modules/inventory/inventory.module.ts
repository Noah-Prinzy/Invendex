import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventorySchema
} from '../../persistence/schemas/inventory.schema';
import { InventorySnapshotSchema } from '../../persistence/schemas/inventory-snapshot.schema';
import { ProductSchema } from '../../persistence/schemas/product.schema';
import { ReorderAlertSchema } from '../../persistence/schemas/reorder-alert.schema';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Inventory', schema: InventorySchema },
      { name: 'InventorySnapshot', schema: InventorySnapshotSchema },
      { name: 'Product', schema: ProductSchema },
      { name: 'ReorderAlert', schema: ReorderAlertSchema }
    ])
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService, MongooseModule]
})
export class InventoryModule {}
