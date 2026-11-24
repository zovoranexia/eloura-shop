// Role-based access control. Permissions are fixed in code (routes reference them); roles are data:
// the six default roles below are seeded and admins may create custom roles / edit permissions in the dashboard.

export const PERMISSIONS = [
  ['dashboard.view', 'Dashboard', 'See the analytics overview'],
  ['products.view', 'Catalogue', 'View products, variants and stock'],
  ['products.create', 'Catalogue', 'Create products'],
  ['products.update', 'Catalogue', 'Edit products and variants'],
  ['products.delete', 'Catalogue', 'Delete or deactivate products'],
  ['inventory.update', 'Catalogue', 'Adjust stock levels'],
  ['categories.manage', 'Catalogue', 'Manage categories'],
  ['coupons.manage', 'Catalogue', 'Manage coupons and discounts'],
  ['reviews.moderate', 'Catalogue', 'Hide or publish product reviews'],
  ['banners.manage', 'Storefront CMS', 'Manage hero and promo banners'],
  ['cms.manage', 'Storefront CMS', 'Edit static pages (About, COD terms, Privacy...)'],
  ['orders.view', 'Orders', 'View orders'],
  ['orders.update_status', 'Orders', 'Confirm COD, pack, dispatch and deliver orders'],
  ['orders.cancel', 'Orders', 'Cancel orders'],
  ['orders.assign_courier', 'Orders', 'Assign couriers to Dili COD deliveries'],
  ['invoices.print', 'Orders', 'Print invoices and packing slips'],
  ['payments.view', 'Payments', 'View payment proofs and the verification queue'],
  ['payments.verify', 'Payments', 'Approve or reject payment proofs'],
  ['payments.refund', 'Payments', 'Mark refunds as completed'],
  ['cod.reconcile', 'Payments', 'Reconcile COD cash collected by couriers'],
  ['cod.flag_customers', 'Payments', 'Flag / unflag customers for COD refusals'],
  ['customers.view', 'Customers', 'View customers'],
  ['customers.manage', 'Customers', 'Activate or deactivate customer accounts'],
  ['inquiries.manage', 'Customers', 'Read and answer contact inquiries'],
  ['reports.view', 'Reports', 'View revenue and payment reports'],
  ['reports.export', 'Reports', 'Export CSV reports'],
  ['zones.manage', 'Settings', 'Manage delivery zones, fees and COD zones'],
  ['settings.manage', 'Settings', 'Store, payment-method and COD settings'],
  ['staff.manage', 'Access control', 'Create staff accounts and assign roles'],
  ['roles.manage', 'Access control', 'Edit roles and their permissions'],
  ['audit.view', 'Access control', 'View the immutable audit log'],
].map(([key, group, description]) => ({ key, group, description }));

export type Permission = string;
export const ALL_PERMISSIONS: string[] = PERMISSIONS.map((p) => p.key);

export const SYSTEM_ROLES: { key: string; name: string; description: string; permissions: string[] }[] = [
  { key: 'SUPER_ADMIN', name: 'Super Admin', description: 'Unrestricted access, including roles, staff, settings and audit logs.', permissions: ALL_PERMISSIONS },
  {
    key: 'STORE_MANAGER',
    name: 'Store Manager',
    description: 'Catalogue, inventory, coupons, banners, CMS and order oversight.',
    permissions: [
      'dashboard.view', 'products.view', 'products.create', 'products.update', 'products.delete', 'inventory.update', 'categories.manage',
      'coupons.manage', 'banners.manage', 'cms.manage', 'orders.view', 'orders.update_status', 'orders.cancel', 'orders.assign_courier', 'customers.view',
      'reports.view', 'invoices.print', 'reviews.moderate',
    ],
  },
  {
    key: 'FINANCE_STAFF',
    name: 'Finance Staff',
    description: 'Payment verification, COD reconciliation, revenue reports and exports.',
    permissions: [
      'dashboard.view', 'orders.view', 'payments.view', 'payments.verify', 'payments.refund', 'cod.reconcile', 'cod.flag_customers',
      'customers.view', 'reports.view', 'reports.export', 'invoices.print',
    ],
  },
  {
    key: 'ORDER_FULFILLMENT',
    name: 'Order Fulfilment',
    description: 'Pack, dispatch and deliver orders; Dili COD courier assignments.',
    permissions: ['dashboard.view', 'orders.view', 'orders.update_status', 'orders.cancel', 'orders.assign_courier', 'invoices.print', 'products.view'],
  },
  {
    key: 'CUSTOMER_SUPPORT',
    name: 'Customer Support',
    description: 'Customers, orders (read-only), inquiries and review moderation.',
    permissions: ['dashboard.view', 'customers.view', 'orders.view', 'inquiries.manage', 'reviews.moderate', 'products.view'],
  },
  { key: 'CUSTOMER', name: 'Customer', description: 'Storefront customer. Blocked from /admin.', permissions: [] },
];
