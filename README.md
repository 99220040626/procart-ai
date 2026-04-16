# 🚀 ProCart AI — Enterprise E-Commerce Mainframe

🌐 **Live Application:** https://procart-ai-nine.vercel.app/

---

# 🧠 Executive Overview

**ProCart AI** is a **production-grade, enterprise-level full-stack e-commerce platform** engineered with a focus on:

* 🔐 Security-first architecture
* ⚡ Real-time distributed systems
* 🧠 AI-driven intelligence
* 🏢 Enterprise admin control

This project simulates real-world systems used by companies like Amazon, Flipkart, and Apple — evolving beyond a simple e-commerce app into a **scalable, intelligent commerce platform**.

📄 Full Architecture Document: 
📄 Architect-Level Expansion: 

---

# 🏗️ System Architecture

```bash
Client (React Frontend)
        ↓
API Gateway (REST + GraphQL)
        ↓
Spring Boot Backend (Microservice-ready)
        ↓
Spring Security + JWT + Rate Limiting
        ↓
Service Layer (Business Logic Engine)
        ↓
Repository Layer (JPA + Routing DataSource)
        ↓
MySQL (Master + Replica Ready)
        ↓
Redis Cache (High-speed memory layer)
```

---

# ⚙️ Technology Stack

## 🖥️ Frontend

* React.js (v18)
* Tailwind CSS (Premium Dark UI)
* React Router DOM
* Recharts (Analytics)
* SockJS + STOMP (WebSockets)
* Leaflet (Geo Mapping)
* Framer Motion Animations
* PWA-ready Service Workers

---

## 🔧 Backend

* Java + Spring Boot
* Spring Security + JWT
* Spring Data JPA (Hibernate)
* GraphQL + REST Hybrid APIs
* WebSocket Real-Time Engine
* OpenPDF (Invoice Generation)
* Multipart & Base64 Processing

---

## 🗄️ Database

* MySQL (Relational DB)
* Redis (Caching Layer)

---

## 🌐 Integrations

* OpenStreetMap (Geo APIs)
* QuickChart (QR Payments)
* Python gRPC (Fraud Detection)
* WebSocket Protocols

---

# 🚀 Core Features

---

## 💳 Manual Payment Verification System

* UPI QR Code generation
* Screenshot upload (Base64)
* Admin approval workflow
* Fraud prevention layer

---

## 🧑‍💼 Admin Command Center

* Real-time analytics dashboard
* Transaction inspection (X-Ray modal)
* Bulk product upload (Excel)
* Live activity stream (WebSockets)
* Inventory control system

---

## 📦 User Order System

* Vertical tracking timeline
* Real-time status updates
* Downloadable PDF invoices
* Integrated Q&A support

---

## 📍 Geo Location Checkout

* Map-based address selection
* Reverse geocoding
* GPS coordinate locking

---

# 🛍️ Advanced E-Commerce Mechanics

### ✅ Infinite Scrolling (Lazy Loading)

* Pageable backend (Spring Boot)
* IntersectionObserver (React)

### ✅ Product Variants

* Size & Color selection
* Dynamic image switching
* Variant-level stock tracking

### ✅ Multi-Language Support

* English / Hindi / Telugu
* Dynamic UI translation

### ✅ Address Book System

* Multiple saved addresses
* Quick selection UI

---

# 🛡️ Enterprise Security & Admin Features

### ✅ Admin 2FA Authentication

* Email OTP verification
* Secure admin access layer

### ✅ Bulk Product Upload

* Excel/CSV ingestion (Apache POI)

### ✅ Soft Deletes & Audit Logging

* Data integrity preservation
* Change tracking system

---

# 🤖 Smart Automation & AI Features

### ✅ AI Chatbot Support

* Automated order queries
* Instant response system

### ✅ Smart Search Auto-Suggest

* Debouncing logic
* Real-time product suggestions

### ✅ Guest Checkout Mode

* No-login purchase system
* Temporary user profiles

---

# 🧠 Next-Gen AI & Intelligence

### ✅ Visual Image Search

* Upload image → find similar products

### ✅ Frequently Bought Together

* Recommendation engine based on order data

---

# 🏢 Enterprise Architecture Features

### ✅ Multi-Vendor Marketplace

* Seller dashboards
* Commission-based system

### ✅ Real-Time Delivery Tracking

* Live order progress (WebSockets)

---

# ✨ Elite UX Features

### ✅ AR 3D Product Viewer

* View products in real-world environment

### ✅ Progressive Web App (PWA)

* Offline browsing support
* Installable web app

---

# 💸 Advanced Business Logic

### ✅ Subscription Billing

* Recurring order system

### ✅ Dynamic Pricing Engine

* Price changes based on demand & stock

---

# 🔒 Platform Integrations

### ✅ OAuth2 Social Login

* Google / GitHub login

### ✅ Redis Caching

* Ultra-fast data retrieval

---

# 🧠 Architect-Level Features (System Design)

### 🔥 Distributed Systems

* Database sharding & replicas
* GraphQL API Gateway
* Micro-frontend architecture

### 🔥 Observability

* Distributed tracing (Sleuth + Zipkin)

### 🔥 Security

* Zero-trust rate limiting
* IP banning system
* Data encryption at rest

### 🔥 Cloud Engineering

* Kubernetes auto-scaling
* Blue/Green deployments
* Chaos engineering

### 🔥 SaaS Capability

* Multi-tenant architecture
* Subdomain-based stores

---

# 📂 Project Structure

```bash
E-COMMERCEJAVA/
│
├── .vscode/
│   ├── launch.json
│   └── settings.json
│
├── backend/
│   └── ecommerce-backend/
│       │
│       ├── ecommerce-backend/
│       │   ├── __pycache__/
│       │   │   ├── fraud_pb2_grpc.cpython-312.pyc
│       │   │   └── fraud_pb2.cpython-312.pyc
│       │   │
│       │   ├── .mvn/
│       │   │   └── wrapper/
│       │   │       └── maven-wrapper.properties
│       │   │
│       │   ├── k8s/
│       │   │   ├── deployment.yaml
│       │   │   └── hpa.yaml
│       │   │
│       │   ├── src/
│       │   │   ├── main/
│       │   │   │   ├── java/com/procart/
│       │   │   │   │   ├── config/
│       │   │   │   │   │   ├── DataSourceConfig.java
│       │   │   │   │   │   ├── MasterReplicaRoutingDataSource.java
│       │   │   │   │   │   ├── RedisConfig.java
│       │   │   │   │   │   ├── SecurityConfig.java
│       │   │   │   │   │   ├── SwaggerConfig.java
│       │   │   │   │   │   ├── WebConfig.java
│       │   │   │   │   │   └── WebSocketConfig.java
│       │   │   │   │   │
│       │   │   │   │   ├── controller/
│       │   │   │   │   │   ├── AddressController.java
│       │   │   │   │   │   ├── AdminController.java
│       │   │   │   │   │   ├── AnalyticsController.java
│       │   │   │   │   │   ├── AuthController.java
│       │   │   │   │   │   ├── CartController.java
│       │   │   │   │   │   ├── ChatController.java
│       │   │   │   │   │   ├── EmailController.java
│       │   │   │   │   │   ├── OrderController.java
│       │   │   │   │   │   ├── PaymentController.java
│       │   │   │   │   │   ├── ProductController.java
│       │   │   │   │   │   ├── ProductGraphQLController.java
│       │   │   │   │   │   ├── PromoController.java
│       │   │   │   │   │   ├── QAController.java
│       │   │   │   │   │   ├── ReviewController.java
│       │   │   │   │   │   ├── VoiceCommerceController.java
│       │   │   │   │   │   └── WishlistController.java
│       │   │   │   │   │
│       │   │   │   │   ├── dto/
│       │   │   │   │   │   ├── AuthResponseDTO.java
│       │   │   │   │   │   ├── LoginRequest.java
│       │   │   │   │   │   ├── LoginRequestDTO.java
│       │   │   │   │   │   ├── OrderRequestDTO.java
│       │   │   │   │   │   └── ProductDTO.java
│       │   │   │   │   │
│       │   │   │   │   ├── exception/
│       │   │   │   │   │   └── GlobalExceptionHandler.java
│       │   │   │   │   │
│       │   │   │   │   ├── model/
│       │   │   │   │   │   ├── Cart.java
│       │   │   │   │   │   ├── Order.java
│       │   │   │   │   │   ├── Product.java
│       │   │   │   │   │   ├── ProductAudit.java
│       │   │   │   │   │   ├── ProductQA.java
│       │   │   │   │   │   ├── PromoCode.java
│       │   │   │   │   │   ├── Review.java
│       │   │   │   │   │   ├── User.java
│       │   │   │   │   │   ├── UserAddress.java
│       │   │   │   │   │   └── Wishlist.java
│       │   │   │   │   │
│       │   │   │   │   ├── repository/
│       │   │   │   │   │   ├── CartRepository.java
│       │   │   │   │   │   ├── OrderRepository.java
│       │   │   │   │   │   ├── ProductAuditRepository.java
│       │   │   │   │   │   ├── ProductQARepository.java
│       │   │   │   │   │   ├── ProductRepository.java
│       │   │   │   │   │   ├── PromoCodeRepository.java
│       │   │   │   │   │   ├── ReviewRepository.java
│       │   │   │   │   │   ├── UserAddressRepository.java
│       │   │   │   │   │   ├── UserRepository.java
│       │   │   │   │   │   └── WishlistRepository.java
│       │   │   │   │   │
│       │   │   │   │   ├── security/
│       │   │   │   │   │   ├── JwtFilter.java
│       │   │   │   │   │   ├── JwtUtil.java
│       │   │   │   │   │   └── RateLimitFilter.java
│       │   │   │   │   │
│       │   │   │   │   └── service/
│       │   │   │   │       ├── CartService.java
│       │   │   │   │       ├── DynamicPricingService.java
│       │   │   │   │       ├── EmailService.java
│       │   │   │   │       ├── FraudDetectionService.java
│       │   │   │   │       ├── OrderService.java
│       │   │   │   │       ├── ProductService.java
│       │   │   │   │       └── UserService.java
│       │   │   │   │
│       │   │   │   ├── proto/
│       │   │   │   │   └── fraud.proto
│       │   │   │   │
│       │   │   │   └── resources/
│       │   │   │       ├── graphql/
│       │   │   │       │   └── schema.graphqls
│       │   │   │       ├── static/
│       │   │   │       ├── templates/
│       │   │   │       └── application.properties
│       │   │   │
│       │   │   └── test/java/com/procart/service/
│       │   │       └── EcommerceBackendApplicationTests.java
│       │   │
│       │   ├── target/
│       │   ├── uploads/
│       │   ├── .env
│       │   ├── .gitattributes
│       │   ├── .gitignore
│       │   ├── Dockerfile
│       │   ├── fraud_pb2_grpc.py
│       │   ├── fraud_pb2.py
│       │   ├── fraud_server.py
│       │   ├── HELP.md
│       │   ├── hs_err_pid3332.log
│       │   ├── mvnw
│       │   ├── mvnw.cmd
│       │   ├── pom.xml
│       │   ├── replay_pid3332.log
│       │   ├── node_modules/
│       │   ├── routes/
│       │   │   ├── auth.js
│       │   │   ├── orders.js
│       │   │   └── db.js
│       │   ├── package.json
│       │   └── server.js
│
├── frontend/
│   └── ecommerce-frontend/
│       │
│       ├── public/
│       │   ├── favicon.ico
│       │   ├── index.html
│       │   ├── logo192.png
│       │   ├── logo512.png
│       │   ├── manifest.json
│       │   ├── robots.txt
│       │   └── service-worker.js
│       │
│       ├── src/
│       │   ├── components/
│       │   │   ├── AdminRoute.js
│       │   │   ├── Chatbot.js
│       │   │   ├── CheckoutModal.js
│       │   │   ├── InstallApp.js
│       │   │   ├── MobileBottomNav.js
│       │   │   ├── Navbar.js
│       │   │   ├── OrderTracking.js
│       │   │   ├── PaymentModal.js
│       │   │   ├── ProductCard.js
│       │   │   ├── ProtectedRoute.js
│       │   │   └── VoiceAssistant.js
│       │   │
│       │   ├── context/
│       │   │   ├── CartContext.js
│       │   │   └── ThemeContext.js
│       │   │
│       │   ├── pages/
│       │   │   ├── AdminDashboard.js
│       │   │   ├── Cart.js
│       │   │   ├── Home.js
│       │   │   ├── Login.js
│       │   │   ├── Orders.js
│       │   │   ├── ProductDetail.js
│       │   │   ├── Products.js
│       │   │   ├── Profile.js
│       │   │   ├── Register.js
│       │   │   ├── ResetPassword.js
│       │   │   └── Wishlist.js
│       │   │
│       │   ├── services/
│       │   │   ├── api.js
│       │   │   ├── OfflineStorage.js
│       │   │   └── SyncManager.js
│       │   │
│       │   ├── styles/
│       │   │   └── App.css
│       │   │
│       │   ├── App.js
│       │   ├── App.test.js
│       │   ├── bootstrap.js
│       │   ├── i18n.js
│       │   ├── index.css
│       │   ├── index.js
│       │   ├── logo.svg
│       │   ├── reportWebVitals.js
│       │   └── setupTests.js
│       │
│       ├── .env
│       ├── .gitignore
│       ├── capacitor.config.json
│       ├── craco.config.js
│       ├── package-lock.json
│       ├── package.json
│       ├── postcss.config.js
│       ├── README.md
│       ├── replay_pid6456.log
│       └── tailwind.config.js
│
└── database/
    └── procart_db.sql
```

---

# 🔐 Authentication Flow

```bash
User Login → JWT Token → API Requests → Validation → Access Control
```

---

# 📊 Resume Highlights

* Built **enterprise-grade full-stack system**
* Implemented **real-time WebSocket architecture**
* Designed **secure payment verification flow**
* Integrated **AI & recommendation systems**
* Developed **scalable backend architecture**

---

# 🚀 Deployment

| Layer    | Platform    |
| -------- | ----------- |
| Frontend | Vercel      |
| Backend  | Spring Boot |
| Database | MySQL       |

---

# 💡 Why This Project is Special

This is not just a project — it is:

👉 A **startup-ready product**
👉 A **distributed system prototype**
👉 A **resume game-changer**

---

# 👨‍💻 Author

**MANYAM SIVA SANTHOSH KUMAR REDDY — Software Engineer and Full Stack developer 🚀**

---

# ⭐ Support

If you like this project, give it a ⭐ on GitHub!
