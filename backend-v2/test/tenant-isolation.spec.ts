import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { mongooseTenantPlugin } from '../src/tenant/mongoose-tenant.plugin';
import { TenantContext } from '../src/tenant/tenant-context';
import { TenantIsolationError } from '../src/tenant/tenant-isolation.error';
import { startMongoMemoryServer, stopMongoMemoryServer } from './mongo-memory';

interface IWidget extends Document {
  name: string;
  organization: mongoose.Types.ObjectId;
}

const widgetSchema = new Schema<IWidget>({
  name: { type: String },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization' }
});
widgetSchema.index({ organization: 1, name: 1 });

const ORG_A = '665f0f0f0f0f0f0f0f0f0a01';
const ORG_B = '665f0f0f0f0f0f0f0f0f0b02';

describe('mongoose tenant-isolation plugin (fails queries missing the tenant filter)', () => {
  let Widget: Model<IWidget>;

  beforeAll(async () => {
    const uri = await startMongoMemoryServer();
    const connection = await mongoose.createConnection(uri).asPromise();
    connection.plugin(mongooseTenantPlugin);
    Widget = connection.model<IWidget>('Widget', widgetSchema);
  }, 240000);

  afterAll(async () => {
    await mongoose.disconnect();
    await stopMongoMemoryServer();
  });

  it('fails any query without an active tenant context', async () => {
    await expect(Widget.find()).rejects.toThrow(TenantIsolationError);
    await expect(Widget.countDocuments({})).rejects.toThrow(
      TenantIsolationError
    );
  });

  it('fails queries missing the organization filter even inside a tenant context', async () => {
    await TenantContext.run({ organizationId: ORG_A }, async () => {
      await expect(Widget.find({ name: 'x' })).rejects.toThrow(/organization/);
      await expect(Widget.deleteMany({})).rejects.toThrow(TenantIsolationError);
    });
  });

  it('fails queries whose organization filter belongs to another tenant', async () => {
    await TenantContext.run({ organizationId: ORG_A }, async () => {
      await expect(
        Widget.find({ organization: new mongoose.Types.ObjectId(ORG_B) })
      ).rejects.toThrow(TenantIsolationError);
    });
  });

  it('allows queries carrying the matching organization filter', async () => {
    await TenantContext.run({ organizationId: ORG_A }, async () => {
      await Widget.create({
        name: 'w1',
        organization: new mongoose.Types.ObjectId(ORG_A)
      });
      const found = await Widget.find({
        organization: new mongoose.Types.ObjectId(ORG_A)
      });
      expect(found).toHaveLength(1);
      const updated = await Widget.updateOne(
        { organization: ORG_A, name: 'w1' },
        { name: 'w1-renamed' }
      );
      expect(updated.modifiedCount).toBe(1);
    });
  });

  it('allows explicit system access via tenantBypass', async () => {
    const all = await Widget.find().setOptions({ tenantBypass: true });
    expect(all.length).toBeGreaterThan(0);
  });

  it('fails aggregates without a $match on the tenant organization', async () => {
    await TenantContext.run({ organizationId: ORG_A }, async () => {
      await expect(
        Widget.aggregate([{ $group: { _id: '$organization', n: { $sum: 1 } } }])
      ).rejects.toThrow(TenantIsolationError);
      const rows = await Widget.aggregate([
        { $match: { organization: new mongoose.Types.ObjectId(ORG_A) } },
        { $count: 'n' }
      ]);
      expect(rows).toEqual([{ n: 1 }]);
    });
  });

  it('auto-assigns the tenant on save and rejects cross-tenant saves', async () => {
    await TenantContext.run({ organizationId: ORG_A }, async () => {
      const doc = await Widget.create({ name: 'auto' });
      expect(String(doc.organization)).toBe(ORG_A);
      await expect(
        Widget.create({
          name: 'bad',
          organization: new mongoose.Types.ObjectId(ORG_B)
        })
      ).rejects.toThrow(TenantIsolationError);
    });
  });
});
