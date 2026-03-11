# Todo App Feature Plan

## Project summary

This project is a NestJS-based todo backend with REST, GraphQL, JWT authentication, TypeORM, Swagger, scheduling, and role-based access control.

## Features already present

### Authentication and users

- User registration
- JWT login
- Protected endpoints with `AuthGuard('jwt')`
- User profile retrieval and update
- Change password
- Admin-only user listing and user deletion
- Role-based authorization with `RolesGuard`

### Todo management

- Create, read, update, and delete todos
- Soft delete and restore
- Todo ownership guard
- Completion status tracking
- Due dates
- Priority levels: `low`, `medium`, `high`
- Category field
- Recurring todos: `daily`, `weekly`, `monthly`
- Automatic next-instance creation for recurring items

### Querying and organization

- Pagination
- Filter by completion status
- Filter by priority
- Filter by category
- Filter by due date range
- Search by title

### Activity and reminders

- Activity log for todo actions
- Scheduled reminder scan for upcoming due todos

### API and platform

- REST API
- GraphQL API
- Swagger documentation
- Global filters and interceptors
- Database migrations
- Unit and e2e test setup
- Docker and deployment files

## Features this project should have

### Must-have

- Full todo ownership enforcement on update, delete, soft delete, and restore endpoints
- Validation for auth and user registration DTOs instead of raw request bodies
- Refresh token flow and logout
- Password reset flow
- Email verification
- Proper activity logging for update, complete, delete, restore, and login actions
- Consistent API response format and error model
- Environment variable validation on startup
- Rate limiting for auth endpoints
- Better test coverage for auth, guards, and reminders

### Should-have

- Subtasks / checklist items
- Tags or labels
- Sorting by due date, priority, and created date
- Archived todos view
- Bulk actions for complete, delete, restore, and category updates
- Dashboard statistics: overdue, due today, completed this week
- Real reminder delivery by email, push, or websocket instead of only server logs
- GraphQL auth context so GraphQL operations use the current user
- Audit trail for user profile changes and admin actions
- API versioning

### Nice-to-have

- Shared lists and collaboration
- Comments on todos
- File attachments
- Calendar view
- Recurrence exceptions and custom recurrence rules
- Notification preferences per user
- Export to CSV or JSON
- Webhook integrations
- Public API tokens for third-party integrations
- Multi-tenant workspace support

## Suggested release scope

### MVP

- Registration, login, profile
- CRUD todos
- Pagination, filters, search
- Due dates, priority, category
- Soft delete and restore
- Swagger docs
- PostgreSQL migrations

### V2

- Refresh tokens and logout
- Password reset and email verification
- Reminder delivery
- Bulk actions
- Dashboard stats
- Better activity logging

### V3

- Collaboration
- Attachments
- Calendar and advanced recurrence
- Integrations and exports

## Recommended next build order

1. Secure auth flow: refresh token, logout, rate limiting
2. Close authorization gaps on todo mutation endpoints
3. Add DTOs and stronger validation for all user/auth inputs
4. Improve activity logging coverage
5. Upgrade reminders from logs to real notifications
6. Add dashboard, bulk actions, and sorting
7. Add collaboration and integrations
