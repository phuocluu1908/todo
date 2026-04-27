# Todo Reporting Service

Dashboard and analytics microservice for the Todo application.

## Features

- **Dashboard Statistics**: Overdue, due today, due soon, completion rates
- **Priority Breakdown**: Analysis by task priority level
- **Category Breakdown**: Analysis by task category
- **Completion Trends**: Track completion patterns over time

## API Endpoints

### Health Check
- `GET /reporting/health` - Service health status

### Dashboard
- `GET /reporting/dashboard?userId={userId}` - Dashboard statistics
- `GET /reporting/dashboard/priority?userId={userId}` - Priority breakdown
- `GET /reporting/dashboard/category?userId={userId}` - Category breakdown
- `GET /reporting/dashboard/trend?userId={userId}&days=30` - Completion trends

## Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=4002
TODO_API_URL=http://localhost:3000/api
NODE_ENV=development
```

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm start:prod
```
