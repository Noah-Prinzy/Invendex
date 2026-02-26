import mongoose from 'mongoose';
import { logger } from './logger.js';

let isPatched = false;

const summarizeObject = (value) => {
  if (!value || typeof value !== 'object') return value ?? null;

  const keys = Object.keys(value);
  if (keys.length <= 12) return value;

  return {
    keys: keys.slice(0, 12),
    keyCount: keys.length
  };
};

const asMs = (start) => Number(process.hrtime.bigint() - start) / 1_000_000;

const wrapQueryExec = (thresholdMs) => {
  const originalQueryExec = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = async function wrappedQueryExec(...args) {
    const startedAt = process.hrtime.bigint();

    try {
      return await originalQueryExec.apply(this, args);
    } finally {
      const durationMs = asMs(startedAt);
      if (durationMs >= thresholdMs) {
        logger.warn('slow_mongo_query', {
          model: this.model?.modelName || null,
          operation: this.op || null,
          durationMs: Number(durationMs.toFixed(2)),
          filter: summarizeObject(this.getFilter?.() || null),
          options: summarizeObject(this.getOptions?.() || null)
        });
      }
    }
  };
};

const wrapAggregateExec = (thresholdMs) => {
  const originalAggregateExec = mongoose.Aggregate.prototype.exec;
  mongoose.Aggregate.prototype.exec = async function wrappedAggregateExec(
    ...args
  ) {
    const startedAt = process.hrtime.bigint();

    try {
      return await originalAggregateExec.apply(this, args);
    } finally {
      const durationMs = asMs(startedAt);
      if (durationMs >= thresholdMs) {
        logger.warn('slow_mongo_aggregate', {
          model: this._model?.modelName || null,
          durationMs: Number(durationMs.toFixed(2)),
          pipelineLength: Array.isArray(this._pipeline)
            ? this._pipeline.length
            : 0
        });
      }
    }
  };
};

export const enableMongoProfiling = ({
  thresholdMs = Number(process.env.SLOW_QUERY_THRESHOLD_MS || 150)
} = {}) => {
  if (isPatched) return;
  isPatched = true;

  wrapQueryExec(thresholdMs);
  wrapAggregateExec(thresholdMs);

  logger.info('mongo_profiling_enabled', { thresholdMs });
};

export default {
  enableMongoProfiling
};
