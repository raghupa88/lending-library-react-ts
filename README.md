# XXXXX Library - React TypeScript Application

A production-ready subscription-based lending library web application built with React, TypeScript, and modern web technologies.

## 🚀 Features

### Core Functionality

- **User Authentication** - Secure login/register with role-based access
- **Book Catalog** - Browse, search, and filter extensive book collection
- **Subscription Management** - Multiple subscription tiers with different benefits
- **User Dashboard** - Manage borrowed books, reading history, and profile
- **Admin Panel** - Complete library management system
- **Responsive Design** - Mobile-first approach with modern UI

### Technical Features

- **React 18** with TypeScript for type safety
- **React Router v6** for navigation and routing
- **Context API** for global state management
- **CSS Modules** for component-scoped styling
- **Dark/Light Theme** support with persistence
- **Form Validation** with comprehensive error handling
- **Loading States** and error boundaries
- **Accessibility** features (ARIA labels, keyboard navigation)

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button/         # Button component with variants
│   ├── Input/          # Input component with validation
│   ├── BookCard/       # Book display component
│   ├── LoadingSpinner/ # Loading indicator
│   └── Navbar/         # Navigation component
├── pages/              # Route-level components
│   ├── Home/           # Landing page
│   ├── Books/          # Book catalog page
│   ├── Login/          # Authentication page
│   └── Dashboard/      # User dashboard
├── context/            # React Context providers
│   ├── AuthContext     # User authentication state
│   ├── ThemeContext    # Theme management
│   └── BookContext     # Book catalog state
├── types/              # TypeScript interfaces
│   ├── User.ts         # User-related types
│   ├── Book.ts         # Book-related types
│   ├── Subscription.ts # Subscription types
│   └── Order.ts        # Order management types
├── App.tsx             # Main app component with routing
└── index.tsx           # Application entry point
```

## 🛠 Installation & Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd lending-library-react-ts
```

2. **Install dependencies**

```bash
npm install
```

3. **Start development server (Vite)**

```bash
npm start
```

4. **Build for production**

```bash
npm run build
```

## 💻 Usage

### Demo Credentials

- **Member Account**: member@example.com / password123
- **Admin Account**: admin@example.com / password123

### Subscription Plans

- **Basic**: ₹299/month - 2 books, SMS notifications
- **Standard**: ₹499/month - 4 books, WhatsApp support (Popular)
- **Premium**: ₹799/month - 6 books, free home delivery
- **Family**: ₹1199/month - 8 books, delivery, community events

## 🎯 Business Model Integration

This application implements a complete subscription-based lending library business model:

- **Revenue Streams**: Multiple subscription tiers with different pricing
- **Customer Management**: User profiles, reading history, subscription tracking
- **Inventory Management**: Book catalog with availability tracking
- **Delivery System**: Home delivery options for premium plans
- **Community Features**: Book clubs and reading events
- **Analytics**: User engagement and business metrics tracking

## 🔧 Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run test suite
- `npm eject` - Eject from Create React App

### Code Quality

- TypeScript strict mode enabled
- ESLint configuration included
- Consistent component structure
- Comprehensive error handling
- Performance optimizations with React.memo and lazy loading

### Environment Variables

Vite reads client-side env variables that start with `VITE_`. Use `import.meta.env.VITE_*` in your code.

Create a `.env` file for configuration:

```
VITE_API_URL=http://localhost:3001/api
VITE_PAYMENT_KEY=your_payment_gateway_key
```

## ⚡ Performance Automation

This project includes comprehensive performance validation using three complementary approaches:

### 1. Puppeteer CDP - Direct Performance Metrics

```bash
npm run perf:cdp
```

- Audits all routes: `/`, `/books`, `/login`, `/dashboard`
- Handles authentication automatically
- Measures: Layout Count, JS Heap Size, DOM Nodes
- Runs in visible mode for observation

### 2. Lighthouse CI - Industry Standards

```bash
npm run perf:lighthouse
```

- Validates against web vitals (LCP < 2.5s, CLS < 0.1)
- Generates HTML reports in `./lhci_reports/`
- Enforces performance score > 70%

### 3. MCP - AI-Friendly Automation

```bash
npm run perf:mcp
```

- Demonstrates Model Context Protocol integration
- Suitable for AI-driven testing workflows
- Tools: navigate, snapshot, click, fill, wait_for

### Full Validation Suite

```bash
npm run perf:validate
```

Runs: Build → Lighthouse CI → Puppeteer CDP

**Comparison**:

| Tool | Best For | Metrics | AI-Friendly |
|------|----------|---------|-------------|
| Puppeteer CDP | NFR Validation | Full Access | No |
| Lighthouse CI | Standard Audits | Web Vitals | No |
| MCP | AI Automation | Limited | Yes |

## 🚀 Deployment

The application is production-ready and can be deployed to:

- **Netlify** - Static hosting with continuous deployment
- **Vercel** - Serverless deployment with optimizations
- **AWS S3** - Static website hosting
- **Traditional web servers** - Build and serve static files

## 📱 Mobile Support

- Responsive design works on all devices
- Touch-friendly interface elements
- Mobile navigation menu
- Optimized performance for mobile networks

## 🔒 Security

- Input validation and sanitization
- XSS protection measures
- Role-based access control
- Secure route protection
- Session management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:

- Email: support@XXXXXlibrary.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues](repository-url/issues)

---

Built with ❤️ for the reading community in Tamil Nadu.
