# 🧙‍♂️ Wizard - Arbitrum Stylus IDE

Wizard is a powerful browser-based development environment for building, testing, and deploying Rust smart contracts on Arbitrum Stylus. Write, compile, and deploy contracts directly in your browser with zero setup required.

![Wizard IDE](https://thewizard.app/og-image.png)

## ✨ Features

- **Zero Setup Required**
  - Start coding immediately in your browser
  - No local toolchain or wallet setup needed
  - Pre-configured development environment

- **Real-time Development**
  - Instant compilation feedback
  - Built-in Rust language support
  - Automatic error detection

- **One-Click Deployment**
  - Deploy directly to Arbitrum Sepolia
  - Pre-funded deployment wallet
  - Automatic contract verification

- **Interactive Testing**
  - Built-in ABI explorer
  - Real-time contract interactions
  - Transaction monitoring

- **Professional Templates**
  - Ready-to-use contract templates
  - OpenZeppelin implementations (Coming Soon)
  - Best practices and patterns

## 🚀 Getting Started

1. Visit [https://thewizard.app](https://thewizard.app)
2. Sign in with your email
3. Create a new project from scratch or use a template
4. Start building your smart contract

No installation or configuration required! Everything runs directly in your browser.

## 💻 Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wizard.git

# Install dependencies
cd wizard
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_URL=your_api_url
VITE_API_KEY=your_api_key

# Blockchain Configuration
VITE_ARB_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
VITE_ARB_SEPOLIA_CHAIN_ID=421614
VITE_ARB_SEPOLIA_EXPLORER_URL=https://sepolia.arbiscan.io

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## 🏗️ Built With

- [React](https://reactjs.org/) - UI Framework
- [Vite](https://vitejs.dev/) - Build Tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI Components
- [Supabase](https://supabase.com/) - Backend & Authentication
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code Editor
- [Framer Motion](https://www.framer.com/motion/) - Animations

## 📚 Documentation

Visit our [documentation](https://docs.thewizard.app) for:
- Detailed guides
- API reference
- Best practices
- Contract examples

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Website](https://thewizard.app)
- [Documentation](https://docs.thewizard.app)
- [Telegram Community](https://t.me/arbitrum_stylus)

## 💫 Support

For support, join our [Telegram channel](https://t.me/arbitrum_stylus) or create an issue in the GitHub repository.