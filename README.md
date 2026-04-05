# GitHub Visualizer

A modern web application that allows you to search for GitHub users and visualize their profile information and programming language statistics with interactive charts.

## 📋 Overview

GitHub Visualizer is a full-stack application that integrates with the GitHub API to provide insights into developer profiles. Search for any GitHub user by username and instantly view their account details, repository count, follower statistics, and programming language distribution across their projects.

## ✨ Features

- **GitHub User Search**: Search for any GitHub user by username
- **Profile Information Display**: View comprehensive user details including:
  - Avatar
  - Bio/Description
  - Follower and following counts
  - Number of public repositories
- **Programming Language Analytics**: Visualize language distribution across user repositories with interactive charts
- **Error Handling**: Graceful error messages for invalid usernames or API issues
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Real-time Data**: Fetches live data directly from the GitHub API
- **Docker Support**: Containerized deployment with Docker and Docker Compose

## 🚀 Tech Stack

### Backend
- **Framework**: ASP.NET Core 8.0
- **Language**: C#
- **API**: REST API with Swagger/OpenAPI documentation
- **GitHub Integration**: Octokit (GitHub API client)
- **CORS**: Configured for cross-origin requests

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + PostCSS
- **Data Visualization**: Recharts
- **HTTP Client**: Axios
- **Package Manager**: npm

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Ports**: Frontend (5173), Backend (5225)

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### Local Development
- [.NET SDK 8.0+](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

### Docker Deployment
- [Docker](https://www.docker.com/products/docker-desktop)
- [Docker Compose](https://docs.docker.com/compose/)

## 🔧 Installation & Setup

### Option 1: Local Development Setup

#### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Restore NuGet packages
dotnet restore

# Build the project
dotnet build

# Run the backend server
dotnet run
```

The backend API will be available at `https://localhost:5225`

Swagger UI will be available at `https://localhost:5225/swagger/index.html`

#### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Option 2: Docker Compose (Recommended)

```bash
# From the project root directory
docker-compose up --build
```

This will:
- Build and start the backend service on port 5225
- Build and start the frontend service on port 5173
- Both services will communicate via container networking

Access the application at `http://localhost:5173`

#### Stopping Docker Services
```bash
docker-compose down
```

## 📚 API Documentation

### Endpoints

#### Get User Information
```
GET /api/github/user/{username}
```

**Parameters:**
- `username` (string, required): GitHub username

**Response:**
```json
{
  "username": "string",
  "avatarUrl": "string",
  "bio": "string",
  "followers": "integer",
  "following": "integer",
  "publicRepos": "integer"
}
```

**Example:**
```bash
curl https://localhost:5225/api/github/user/torvalds
```

#### Get User Language Statistics
```
GET /api/github/user/{username}/languages
```

**Parameters:**
- `username` (string, required): GitHub username

**Response:**
```json
{
  "language": "integer (byte count)",
  ...
}
```

**Example:**
```bash
curl https://localhost:5225/api/github/user/torvalds/languages
```

### Error Handling

The API returns appropriate HTTP status codes:
- `200 OK`: Successful request
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server-side error

All errors include a descriptive error message in the response body.

## 🏗️ Project Structure

```
GithubVisualizer/
├── backend/                          # ASP.NET Core backend
│   ├── Controllers/
│   │   └── GitHubController.cs      # API endpoints
│   ├── Services/
│   │   ├── IGitHubService.cs        # Service interface
│   │   └── GitHubService.cs         # GitHub API integration
│   ├── Properties/
│   │   └── launchSettings.json      # Launch configuration
│   ├── Program.cs                    # Application entry point
│   ├── backend.csproj               # Project file
│   ├── Dockerfile                    # Docker configuration
│   └── appsettings.json             # Configuration settings
│
├── frontend/                         # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── LanguageChart.tsx    # Chart visualization component
│   │   ├── services/
│   │   │   └── api.ts               # API client and types
│   │   ├── assets/                  # Static assets
│   │   ├── App.tsx                  # Main application component
│   │   ├── main.tsx                 # Entry point
│   │   ├── App.css                  # Component styles
│   │   └── index.css                # Global styles
│   ├── public/                       # Public static files
│   ├── index.html                    # HTML template
│   ├── package.json                  # Dependencies
│   ├── tsconfig.json                # TypeScript configuration
│   ├── vite.config.ts               # Vite build configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   ├── Dockerfile                    # Docker configuration
│   └── README.md                     # Frontend documentation
│
├── docker-compose.yml               # Docker Compose configuration
├── GithubVisualizer.sln             # Visual Studio solution file
└── README.md                         # This file
```

## 💻 Usage

### Searching for a User

1. Open the application at `http://localhost:5173`
2. Enter a GitHub username in the search box
3. Click "Search" or press Enter
4. View the user's profile information and language statistics

### Features

- **Search Bar**: Fast, interactive search with immediate feedback
- **Profile Card**: Displays user avatar, bio, follower count, and public repository count
- **Language Chart**: Visual representation of programming languages used across all repositories
- **Error Messages**: Clear feedback if the user is not found or an error occurs

## 🔐 Security Considerations

- The application uses the GitHub public API, which has rate limiting
- CORS is properly configured to allow frontend-to-backend communication
- No sensitive credentials are stored in the repository
- All API requests are made server-side from the backend

## 🚢 Deployment

### Docker Deployment

1. Build Docker images:
```bash
docker-compose build
```

2. Run the containers:
```bash
docker-compose up
```

3. Access the application:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5225`
   - Swagger UI: `http://localhost:5225/swagger/index.html`

### Production Considerations

For production deployment, consider:
- Setting `ASPNETCORE_ENVIRONMENT=Production` in docker-compose.yml
- Configuring appropriate CORS policies for your domain
- Using environment variables for sensitive configuration
- Implementing rate limiting and caching
- Setting up proper logging and monitoring

## 🛠️ Development

### Running Tests

```bash
# Backend tests (when added)
cd backend
dotnet test

# Frontend tests (when added)
cd frontend
npm test
```

### Building for Production

#### Backend
```bash
cd backend
dotnet publish -c Release -o ./publish
```

#### Frontend
```bash
cd frontend
npm run build
```

### Code Quality

#### Backend
- Follow C# coding standards and conventions
- Use meaningful variable and method names
- Include XML documentation comments for public APIs

#### Frontend
- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Use ESLint for code quality

```bash
cd frontend
npm run lint
```

## 📝 API Rate Limiting

GitHub API has rate limiting:
- **Unauthenticated requests**: 60 requests per hour
- **Authenticated requests**: 5,000 requests per hour

For higher rate limits, consider adding a GitHub personal access token to the backend configuration.

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find and kill process using port 5173 (frontend)
lsof -i :5173
kill -9 <PID>

# Or for port 5225 (backend)
lsof -i :5225
kill -9 <PID>
```

**Docker Issues**
```bash
# Remove dangling containers
docker-compose down --remove-orphans

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up
```

**API Connection Issues**
- Ensure backend is running on correct port (5225)
- Check CORS configuration in `Program.cs`
- Verify frontend API endpoint in `frontend/src/services/api.ts`

## 📖 Resources

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Octokit.net Documentation](https://octokitnet.readthedocs.io/)
- [ASP.NET Core Documentation](https://docs.microsoft.com/en-us/aspnet/core/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Recharts Documentation](https://recharts.org/)

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Created by [Your Name/Organization]

## 🙏 Acknowledgments

- GitHub for providing the free public API
- [Octokit](https://github.com/octokit/octokit.net) for the excellent GitHub API client
- [React](https://react.dev/) and [Vite](https://vitejs.dev/) communities
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Recharts](https://recharts.org/) for beautiful charting components

## 📞 Support

For support, please:
- Create an issue on GitHub
- Check existing documentation and FAQs
- Review the troubleshooting section above

---

**Last Updated**: April 5, 2026
