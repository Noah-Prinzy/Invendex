import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { paginate, parseSort, paginationQuerySchema } from '../src/common/dto/pagination.dto';
import { mongooseTenantPlugin } from '../src/tenant/mongoose-tenant.plugin';
import { TenantContext } from '../src/tenant/tenant-context';
import { TenantIsolationError } from '../src/tenant/tenant-isolation.error';
import { startMongoMemoryServer, stopMongoMemoryServer } from './mongo-memory';

interface IRow extends Document {
  name: string;
  organization: mongoose.Types.ObjectId;
}

const rowSchema = new Schema<IRow>({
  name: String,
  organization: { type: Schema.Types.ObjectId, ref: 'Organization' }
});

const ORG_A = '665f0f0f0f0f0f0f0f0f0a01';

describe('pagination helper', () => {
  let Row: Model<IRow>;

  beforeAll(async () => {
    const uri = await startMongoMemoryServer();
    const connection = await mongoose.createConnection(uri).asPromise();
    connection.plugin(mongooseTenantPlugin);
    Row = connection.model<IRow>('Row', rowSchema);
    await TenantContext.run({ organizationId: ORG_A }, async () => {
      const docs = Array.from({ length: 30 }, (_, i) => ({
        name: `row-${String(i).padStart(2, '0')}`,
        organization: new mongoose.Types.ObjectId(ORG_A)
      }));
      await Row.insertMany(docs);
    });
  }, 240000);

  afterAll(async () => {
    await mongoose.disconnect();
    await stopMongoMemoryServer();
  });

  it('parses sort strings', () => {
    expect(parseSort('-createdAt,name')).toEqual({ createdAt: -1, name: 1 });
    expect(parseSort(undefined)).toBeUndefined();
  });

  it('coerces and clamps query params via zod', () => {
    const parsed = paginationQuerySchema.parse({ page: '2', limit: '10' });
    expect(parsed).toEqual({ page: 2, limit: 10, sort: undefined, q: undefined });
    expect(() => paginationQuerySchema.parse({ limit: 1000 })).toThrow();
  });

  it('paginates tenant-scoped lists with meta', async () => {
    await TenantContext.run({ organizationId: ORG_A }, async () => {
      const result = await paginate(
        Row,
        { organization: new mongoose.Types.ObjectId(ORG_A) },
        paginationQuerySchema.parse({ page: 2, limit: 10, sort: 'name' })
      );
      expect(result.data).toHaveLength(10);
      expect(result.meta).toMatchObject({
        page: 2,
        limit: 10,
        total: 30,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true
      });
      expect((result.data[0] as IRow).name).toBe('row-10');
    });
  });

  it('fails list queries that omit the tenant filter (hardening)', async () => {
    await TenantContext.run({ organizationId: ORG_A }, async () => {
      await expect(
        paginate(Row, {}, paginationQuerySchema.parse({}))
      ).rejects.toThrow(TenantIsolationError);
    });
  });
});
