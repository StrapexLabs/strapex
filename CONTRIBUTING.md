# Contributing to Strapex

Thank you for your interest in contributing to Strapex! We aim to make blockchain payments accessible and secure, and we appreciate your help in achieving this goal.

## Getting Started

1. **Fork the repository** by clicking the [Fork](https://github.com/strapexlabs/strapex/fork) button.

2. **Clone your fork**:

   ```bash
   git clone https://github.com/your-username/strapex.git
   cd strapex
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

## Development Workflow

1. **Create a new branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards and practices.

3. **Commit your changes** using conventional commit messages:

   ```bash
   git commit -m "type: description"
   ```

   Common types include:

   - `feat`: New features
   - `fix`: Bug fixes
   - `docs`: Documentation changes
   - `style`: Code style updates (formatting, missing semi-colons, etc)
   - `refactor`: Code changes that neither fix bugs nor add features
   - `perf`: Performance improvements
   - `test`: Adding or modifying tests
   - `chore`: Maintenance tasks

4. **Push your changes**:

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Submit a Pull Request** to the main repository.

## Pull Request Guidelines

When submitting a pull request:

- Provide a clear description of the changes
- Include the purpose of your changes and any relevant issue numbers
- Ensure all tests pass
- Update documentation if necessary
- Include screenshots for UI changes

## Code Standards

- Follow the existing code style and formatting
- Write clear, descriptive variable and function names
- Include comments for complex logic
- Write tests for new functionality
- Keep commits focused and atomic

## Development Setup

Our project uses Turborepo with pnpm workspaces. The repository is structured as follows:

```
apps/
  ├── www/               # Payment gateway interface
  ├── backend/           # Backend services
  ├── contracts/         # Core payment smart contracts
  └── indexer/           # Blockchain data indexer

packages/
  ├── sdk/               # TypeScript SDK
  ├── eslint-config/     # Shared ESLint configuration
  └── typescript-config/ # Shared TypeScript configuration
```

## Questions and Support

If you have questions or need help:

- Open an issue for feature requests or bug reports
- Join our Telegram community [https://t.me/strapexlabs]
- Check our documentation [Documentation](README)

## Security

For security concerns, please contact any of the project maintainers via their GitHub profiles instead of opening an issue.

## License

By contributing to Strapex, you agree that your contributions will be licensed under our project [license](LICENSE).

## Contributors

<a href="https://github.com/StrapexLabs/strapex/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=StrapexLabs/strapex" />
</a>
