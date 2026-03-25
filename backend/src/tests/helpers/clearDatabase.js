const SYSTEM_COLLECTION_PREFIX = 'system.';

const isClearableCollection = (collectionName) =>
  String(collectionName || '').trim() &&
  !String(collectionName).startsWith(SYSTEM_COLLECTION_PREFIX);

export const clearDatabase = async (connection) => {
  if (!connection?.db) return;

  const collections = await connection.db.collections();
  const clearableCollections = collections.filter((collection) =>
    isClearableCollection(collection?.collectionName || collection?.name)
  );

  await Promise.all(
    clearableCollections.map((collection) => collection.deleteMany({}))
  );
};

export const clearModels = async (models = []) => {
  const validModels = Array.isArray(models)
    ? models.filter((model) => model && typeof model.deleteMany === 'function')
    : [];

  await Promise.all(validModels.map((model) => model.deleteMany({})));
};

export const dropDatabase = async (connection) => {
  if (!connection?.db) return;
  await connection.db.dropDatabase();
};

export default clearDatabase;
