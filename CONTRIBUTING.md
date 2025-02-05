# Contributing to Wizard

Thank you for your interest in contributing to Wizard! We aim to make smart contract development on Arbitrum Stylus accessible to everyone, and we're excited to have you join us in this mission.

## 🌟 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before proceeding.

## 🚀 How to Contribute

There are many ways you can contribute to Wizard:

1. **Report Bugs**
   - Use the GitHub issue tracker
   - Describe what happened and what you expected
   - Include steps to reproduce
   - Add relevant code snippets or screenshots

2. **Suggest Enhancements**
   - Use the GitHub issue tracker
   - Describe your idea in detail
   - Explain why it would be valuable
   - Include mockups or examples if possible

3. **Submit Pull Requests**
   - Fork the repository
   - Create a new branch
   - Make your changes
   - Submit a PR with a clear description

## 💻 Development Setup

1. **Prerequisites**
   ```bash
   node -v  # Must be 18+
   npm -v   # Must be 8+
   ```

2. **Local Development**
   ```bash
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/wizard.git
   cd wizard

   # Install dependencies
   npm install

   # Start development server
   npm run dev
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Fill in required environment variables

## 📝 Pull Request Guidelines

1. **Branch Naming**
   - `feature/description`
   - `fix/description`
   - `docs/description`
   - `refactor/description`

2. **Commit Messages**
   ```
   type(scope): description

   [optional body]

   [optional footer]
   ```
   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

3. **Before Submitting**
   - [ ] Run `npm run lint`
   - [ ] Run `npm run test`
   - [ ] Update documentation if needed
   - [ ] Add tests for new features
   - [ ] Ensure CI passes

## 🏗️ Project Structure

```
wizard/
├── src/
│   ├── components/    # React components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility functions
│   ├── pages/        # Page components
│   └── types/        # TypeScript types
├── public/           # Static assets
└── supabase/         # Database migrations
```

## 🎨 Style Guide

1. **TypeScript**
   - Use TypeScript for all new code
   - Follow existing type patterns
   - Avoid `any` types

2. **React**
   - Use functional components
   - Follow hooks pattern
   - Keep components focused

3. **CSS/Tailwind**
   - Use Tailwind classes
   - Follow existing patterns
   - Keep styles modular

## 🧪 Testing

1. **Unit Tests**
   ```bash
   npm run test:unit
   ```

2. **Integration Tests**
   ```bash
   npm run test:integration
   ```

3. **E2E Tests**
   ```bash
   npm run test:e2e
   ```

## 📚 Documentation

- Update README.md for major changes
- Add JSDoc comments for functions
- Update API documentation
- Include examples for new features

## 🚀 Release Process

1. Version bump in `package.json`
2. Update CHANGELOG.md
3. Create release PR
4. Wait for approvals
5. Merge and tag release

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🤝 Getting Help

- Join our [Telegram channel](https://t.me/arbitrum_stylus)
- Create a GitHub issue
- Read our [documentation](https://docs.thewizard.app)

Thank you for contributing to Wizard! 🧙‍♂️