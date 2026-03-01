import { body } from 'express-validator';

export const seedSampleDataValidator = [
  body('force').optional().isBoolean().withMessage('force must be a boolean')
];

export default {
  seedSampleDataValidator
};
