# RBAC Matrix

Core roles found in the current backend and frontend:

- `owner`
- `admin`
- `manager`
- `staff`

Observed access expectations from the app today:

| Capability                                | Owner | Admin | Manager       | Staff   |
| ----------------------------------------- | ----- | ----- | ------------- | ------- |
| Sign in to workspace                      | Yes   | Yes   | Yes           | Yes     |
| View dashboard                            | Yes   | Yes   | Yes           | Yes     |
| View products and warehouses              | Yes   | Yes   | Yes           | Yes     |
| Adjust stock / run operational actions    | Yes   | Yes   | Usually       | Limited |
| Access reports endpoints                  | Yes   | Yes   | No by default | No      |
| Manage users and organization settings    | Yes   | Yes   | Limited       | No      |
| Review compliance / subscription settings | Yes   | Yes   | Limited       | No      |

Important note:

- The frontend already shows that `/api/reports/*` is admin-restricted.
- Fine-grained authorization lives in backend permission and role middleware, so this table should be treated as a living summary rather than the only source of truth.

Source anchors:

- `backend/src/authorization/permissions.js`
- `backend/src/middlewares/requireRoles.js`
- `backend/src/middlewares/requirePermission.js`
