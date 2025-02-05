# Contributing to Wizard

Thank you for your interest in contributing to Wizard! We aim to make smart contract development on Arbitrum Stylus accessible to everyone.

::: tip Quick Links
- [GitHub Repository](https://github.com/tolgayayci/wizard)
- [Report a Bug](https://github.com/tolgayayci/wizard/issues/new)
- [Suggest a Feature](https://github.com/tolgayayci/wizard/issues/new)
:::

## Ways to Contribute

### 🐛 Report Bugs
Help us improve by reporting bugs you encounter:
- Use the GitHub issue tracker
- Include steps to reproduce
- Describe expected vs actual behavior
- Add screenshots if relevant

### 💡 Suggest Features
Have an idea to make Wizard better?
- Describe your suggestion in detail
- Explain the benefits
- Include examples or mockups if possible

### 🔧 Submit Code
Want to contribute code? Here's how:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Development Setup

```bash
# Requirements
node -v  # Must be 18+
npm -v   # Must be 8+

# Setup
git clone https://github.com/tolgayayci/wizard.git
cd wizard
npm install
npm run dev
```

::: warning Environment Setup
Don't forget to copy `.env.example` to `.env` and fill in required variables.
:::

## Pull Request Guidelines

### Branch Naming
- `feature/description`
- `fix/description`
- `docs/description`
- `refactor/description`

### Commit Messages
```
type(scope): description

[optional body]
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Style Guide

### TypeScript
- Use TypeScript for all new code
- Avoid `any` types
- Follow existing patterns

### React
- Use functional components
- Follow hooks pattern
- Keep components focused

### CSS/Tailwind
- Use Tailwind classes
- Keep styles modular

### Shadcn/UI
- Follow Shadcn component patterns
- Use existing theme variables
- Maintain accessibility standards

## Getting Help

- Join our [Telegram Community](https://t.me/arbitrum_stylus)
- Check our [Documentation](https://docs.thewizard.app)
- Create a GitHub issue

::: tip License
By contributing, you agree that your contributions will be licensed under the MIT License.
::: 