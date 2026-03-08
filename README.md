# Carpenter Shop Management System

A full-stack carpentry business management system with React frontend and Node.js backend.

## Features

- **User Management**: Customer registration, admin/employee roles
- **Order Management**: Custom orders with status tracking
- **Inventory Management**: Material tracking and supplier management
- **Service Catalog**: Predefined carpentry services with pricing
- **Notifications**: Email/WhatsApp notifications for order updates
- **File Uploads**: Image uploads for orders and services
- **Authentication**: JWT-based auth with email/WhatsApp verification

## Tech Stack

### Frontend
- React 18
- React Router
- Axios
- React Toastify
- React Icons
- Bootstrap

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- Nodemailer for emails
- Twilio for WhatsApp

## Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB
- Git

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd carpenter-shop
```

2. **Install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Set up environment variables**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
```

4. **Start the development servers**
```bash
# Start backend (from server directory)
npm run dev

# Start frontend (from client directory)
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Environment Variables

### Required for Production
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `ADMIN_EMAIL`: Admin account email
- `ADMIN_PASSWORD`: Admin account password
- `ADMIN_NAME`: Admin account name
- `ADMIN_PHONE`: Admin account phone

### Optional Features
- `SMTP_*`: Email configuration for notifications
- `TWILIO_*`: WhatsApp configuration
- `APP_URL`: Your deployed application URL
- `CORS_ORIGIN`: Allowed frontend origins

## Deployment

### Option 1: Vercel (Recommended for Frontend)

1. **Deploy Frontend to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# From client directory
cd client
vercel --prod
```

2. **Deploy Backend to Vercel**
```bash
# From server directory
cd server
vercel --prod
```

### Option 2: Traditional Hosting

1. **Build the frontend**
```bash
cd client
npm run build
```

2. **Deploy to hosting service**
- Upload the `client/build` folder to your hosting service
- Deploy the backend to a cloud service (Heroku, DigitalOcean, etc.)
- Update environment variables in production

### Option 3: Docker Deployment

1. **Create Dockerfile for backend**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

2. **Build and run**
```bash
docker build -t carpenter-shop-backend .
docker run -p 5000:5000 carpenter-shop-backend
```

## Default Admin Account

After first run, an admin account is created using the environment variables:
- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`
- Role: Admin

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/send-verification-code` - Send verification code

### Orders
- `GET /api/orders` - Get all orders (admin/employee)
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Services
- `GET /api/services` - Get all services
- `POST /api/services` - Create service (admin)
- `PUT /api/services/:id` - Update service (admin)
- `DELETE /api/services/:id` - Delete service (admin)

### Inventory
- `GET /api/inventory` - Get inventory items
- `POST /api/inventory` - Add inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item

## File Structure

```
carpenter-shop/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React context providers
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   └── styles/         # CSS files
│   └── package.json
├── server/                 # Node.js backend
│   ├── uploads/           # File upload directory
│   ├── server.js          # Main server file
│   └── package.json
├── .env.example           # Environment variables template
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.
