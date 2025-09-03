# Contributing to Gyaandhara Educational Platform

Thank you for your interest in contributing to Gyaandhara! This document provides guidelines for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## 🤝 Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 8+
- MongoDB 5.0+
- Git

### Local Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/gyaandhara-educational-platform.git
   cd gyaandhara-educational-platform
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development**
   ```bash
   npm run dev:full
   ```

## 🔄 Development Workflow

### Branch Naming

- `feature/feature-name` - New features
- `bugfix/issue-description` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes
- `docs/documentation-update` - Documentation changes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(whiteboard): add 3-step compression algorithm
fix(audio): resolve codec compatibility issue
docs(readme): update installation instructions
style(ui): improve button hover animations
refactor(api): optimize database queries
test(compression): add unit tests for compression utils
```

## 📝 Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new files
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### React Components

- Use functional components with hooks
- Implement proper error boundaries
- Follow React best practices
- Use TypeScript interfaces for props

### CSS/Styling

- Use Tailwind CSS for styling
- Follow mobile-first approach
- Ensure accessibility (WCAG 2.1 AA)
- Test on multiple screen sizes

### Backend

- Use Express.js with proper middleware
- Implement proper error handling
- Follow REST API conventions
- Use MongoDB with Mongoose ODM

## 📤 Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   npm run lint
   npm run type-check
   npm run build
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat(scope): your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use the PR template
   - Add clear description
   - Link related issues
   - Request review from maintainers

### PR Requirements

- [ ] Code follows project standards
- [ ] Tests pass and coverage maintained
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
- [ ] Accessibility tested
- [ ] Mobile responsive

## 🐛 Reporting Issues

### Bug Reports

Use the bug report template and include:

- **Environment**: OS, Browser, Node.js version
- **Steps to Reproduce**: Clear, minimal steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Console Logs**: Error messages

### Feature Requests

Use the feature request template and include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: Your suggested approach
- **Alternatives Considered**: Other options you've thought about
- **Additional Context**: Screenshots, mockups, etc.

## 🔧 Development Guidelines

### Performance

- Optimize for low-bandwidth scenarios
- Use compression for all data transfer
- Implement proper caching strategies
- Monitor bundle sizes

### Security

- Never commit sensitive data
- Validate all user inputs
- Use proper authentication/authorization
- Follow OWASP guidelines

### Accessibility

- Use semantic HTML
- Implement keyboard navigation
- Add ARIA labels where needed
- Test with screen readers

### Testing

- Write unit tests for utilities
- Add integration tests for APIs
- Test on multiple devices/browsers
- Verify low-bandwidth scenarios

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 💬 Community

- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Pull Requests**: Contribute code improvements

Thank you for contributing to Gyaandhara! 🚀
