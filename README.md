# Instant Messaging App

A full-stack real-time instant messaging application built with modern web technologies. Features include user authentication, real-time messaging with Socket.IO, persistent message storage, and contact management.

## Live Demo

- **Frontend**: [https://cs314-chat-app.netlify.app](https://cs314-chat-app.netlify.app)
- **Backend API**: [https://instant-messaging-app-production.up.railway.app](https://instant-messaging-app-production.up.railway.app)

Try it out! Create an account, add contacts, and start messaging in real-time.

## Features

- **User Authentication**: Secure signup and login with JWT-based authentication
- **Real-time Messaging**: Instant message delivery using Socket.IO
- **Message Persistence**: All messages stored in MongoDB and retrieved on login
- **Contact Management**: Add and manage contacts to organize conversations
- **Session Management**: Secure session handling with HTTP-only cookies
- **Cross-Origin Support**: CORS configured for multiple deployment environments

## Tech Stack

### Backend
- **Node.js** with **Express.js** - REST API and server framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB Atlas** - Cloud-hosted NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** (jsonwebtoken) - Secure authentication tokens
- **bcrypt** - Password hashing
- **cookie-parser** - Cookie handling middleware

### Frontend
- **React** - UI framework (pre-supplied)
- **Socket.IO Client** - Real-time messaging client

### Deployment
- **Railway** - Backend hosting with auto-deployment from GitHub
- **Netlify** - Frontend static site hosting
- **MongoDB Atlas** - Database hosting

## Project Structure

```
instant-messaging-app/
├── server/
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Authentication middleware
│   ├── models/            # MongoDB schemas (User, Message)
│   ├── routes/            # API route definitions
│   │   ├── authRoutes.js
│   │   ├── contactsRoutes.js
│   │   └── messagesRoutes.js
│   ├── socket/            # Socket.IO event handlers
│   ├── index.js           # Main server entry point
│   ├── package.json
│   └── .env               # Environment variables (not committed)
└── README.md
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login and receive JWT token
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/user-info` - Get current user information

### Contacts (`/api/contacts`)
- `POST /api/contacts/search` - Search for users by email
- `POST /api/contacts/add` - Add a user to contacts
- `GET /api/contacts` - Get all contacts for current user

### Messages (`/api/messages`)
- `POST /api/messages/get` - Retrieve messages between two users

### Health Check
- `GET /` - API status and health check
- `GET /health` - Health check endpoint

## Socket.IO Events

- `connection` - Client connects to server
- `sendMessage` - Send a message to another user
- `receiveMessage` - Receive real-time message updates
- `disconnect` - Client disconnects

## Local Development Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB installation)
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/alejaalvar/instant-messaging-app.git
cd instant-messaging-app
```

2. Install dependencies:
```bash
cd server
npm install
```

3. Create a `.env` file in the `server` directory:
```env
# Frontend URL
ORIGIN="http://localhost:3000"

# MongoDB connection string
DATABASE_URL="your_mongodb_connection_string"

# Server port
PORT=8747

# JWT secret key (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_KEY="your_secure_random_jwt_key"
```

4. Generate a secure JWT key:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and paste it as your `JWT_KEY` in the `.env` file.

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:8747`

### Testing with Frontend

If you have the pre-supplied frontend:
```bash
cd frontend-project
npm start
```

The frontend will run on `http://localhost:3000` and connect to your local backend.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/?appName=messaging-app` |
| `JWT_KEY` | Secret key for JWT signing (512-bit recommended) | `5f2a9eb22dc5e6c9679680f4b3fbca4a...` |
| `ORIGIN` | Frontend URL for CORS | `http://localhost:3000` |
| `PORT` | Server port (Railway sets this automatically) | `8747` |

## Security Features

- **Password Hashing**: User passwords are hashed using bcrypt before storage
- **JWT Authentication**: Secure token-based authentication with 512-bit random keys
- **HTTP-only Cookies**: Session tokens stored in HTTP-only cookies to prevent XSS
- **CORS Protection**: Configured to allow only specific origins
- **Environment Variables**: Sensitive data stored in environment variables (never committed)
- **Input Validation**: Request validation and sanitization

## Potential Future Enhancements

- Group chat functionality
- File and image sharing
- Message read receipts
- Typing indicators
- User presence (online/offline status)
- Message search
- Emoji reactions

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

Alejandro Alvarado - [GitHub](https://github.com/alejaalvar)
