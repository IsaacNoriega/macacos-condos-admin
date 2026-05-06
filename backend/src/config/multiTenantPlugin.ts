import { Schema, Query, ToObjectOptions } from 'mongoose';
import { getTenantId } from '../middleware/context';

export const multiTenantPlugin = (schema: Schema) => {
  // Add tenantId field if not already present (though models should have it)
  if (!schema.path('tenantId')) {
    schema.add({
      tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        index: true,
      },
    });
  }

  // Define hooks to automatically inject tenantId in queries
  const hooks = ['find', 'findOne', 'countDocuments', 'updateMany', 'deleteOne', 'deleteMany'];

  hooks.forEach((hook) => {
    schema.pre(hook as any, function (this: Query<any, any>) {
      const tenantId = getTenantId();

      // If tenantId is present in context, inject it into the query filter
      if (tenantId) {
        this.where({ tenantId });
      }
    });
  });

  // Also handle save hooks to ensure tenantId is set
  schema.pre('save', function (this: any) {
    const tenantId = getTenantId();
    if (tenantId && !this.get('tenantId')) {
      this.set('tenantId', tenantId);
    }
  });
};
