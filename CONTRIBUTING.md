# Contributing to Defense Terminal

Thank you for your interest in contributing to Defense Terminal! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Database Migrations](#database-migrations)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Prioritize security and privacy
- Maintain professional communication

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Publishing others' private information
- Malicious code submissions
- Security vulnerability exploitation

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Git version control
- Supabase account (free tier is fine)
- Code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Security-Operations-Platform.git
   cd Security-Operations-Platform
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/fnti888/Security-Operations-Platform.git
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Feature Branch

```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

### Keeping Your Branch Updated

```bash
git checkout develop
git pull upstream develop
git checkout feature/your-feature-name
git rebase develop
```

## Project Structure

### Key Directories

```
src/
├── components/       # React components organized by feature
├── contexts/         # React context providers
├── lib/             # Utility functions and configurations
└── main.tsx         # Application entry point

supabase/
├── migrations/      # Database schema migrations
└── functions/       # Edge functions (serverless APIs)

docs/                # Documentation files
public/              # Static assets
```

### Component Organization

Each feature component should be self-contained:

```
components/FeatureName/
├── FeatureName.tsx        # Main component
├── FeatureSubComponent.tsx # Sub-components if needed
└── README.md              # Component documentation
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary
- Use strict mode

Example:
```typescript
interface IncidentData {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'contained' | 'resolved';
  created_at: string;
}
```

### React

- Use functional components with hooks
- Follow React best practices
- Keep components focused and single-purpose
- Use meaningful prop names

Example:
```typescript
interface IncidentCardProps {
  incident: IncidentData;
  onStatusChange: (id: string, status: string) => void;
}

export function IncidentCard({ incident, onStatusChange }: IncidentCardProps) {
  // Component implementation
}
```

### Styling

- Use Tailwind CSS utility classes
- Follow the existing design system
- Maintain responsive design
- Use semantic color names from the theme

Example:
```tsx
<div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
  <h3 className="text-lg font-semibold text-slate-100">Title</h3>
  <p className="text-sm text-slate-400">Description</p>
</div>
```

### Code Formatting

- Use 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Maximum line length: 100 characters

Run linter before committing:
```bash
npm run lint
```

## Database Migrations

### Creating Migrations

When modifying the database schema, create a new migration file:

1. Name format: `YYYYMMDDHHMMSS_description.sql`
2. Include detailed comments explaining changes
3. Use idempotent SQL (IF EXISTS, IF NOT EXISTS)
4. Always include RLS policies for new tables

Example migration structure:
```sql
/*
  # Add incident attachments feature

  1. New Tables
    - `incident_attachments`
      - `id` (uuid, primary key)
      - `incident_id` (uuid, foreign key)
      - `file_name` (text)
      - `file_url` (text)
      - `uploaded_by` (uuid, foreign key)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `incident_attachments` table
    - Add policies for authenticated users
*/

-- Create table
CREATE TABLE IF NOT EXISTS incident_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE incident_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view attachments for incidents they can access"
  ON incident_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM incidents
      WHERE incidents.id = incident_attachments.incident_id
      AND (incidents.assigned_to = auth.uid() OR incidents.created_by = auth.uid())
    )
  );

-- Add indexes
CREATE INDEX idx_incident_attachments_incident_id
  ON incident_attachments(incident_id);
```

### Migration Guidelines

- Never modify existing migrations
- Always test migrations locally first
- Consider data migration separately from schema changes
- Document breaking changes clearly
- Include rollback instructions if needed

## Testing

### Manual Testing

Before submitting changes:

1. Test all affected features
2. Verify responsive design (mobile, tablet, desktop)
3. Check for console errors
4. Test with authentication (logged in/out)
5. Verify database queries work correctly

### Testing Checklist

- [ ] Feature works as expected
- [ ] No console errors or warnings
- [ ] Responsive on all screen sizes
- [ ] Accessible (keyboard navigation, screen readers)
- [ ] No performance regressions
- [ ] Database queries optimized
- [ ] RLS policies tested

## Submitting Changes

### Commit Messages

Follow conventional commit format:

```
type(scope): brief description

Detailed explanation of changes (optional)

Fixes #issue-number
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Build process or tooling changes

Examples:
```
feat(incidents): add attachment support to incidents

- Add incident_attachments table
- Create upload UI component
- Implement file storage with Supabase Storage
- Add RLS policies for secure access

Fixes #123
```

```
fix(alerts): resolve duplicate alert notifications

The alert processor was creating duplicate notifications
when multiple correlation rules matched. Now using a
deduplication cache to prevent this.

Fixes #456
```

### Pull Request Process

1. **Update your branch**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout your-branch
   git rebase develop
   ```

2. **Run quality checks**
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

3. **Push your changes**
   ```bash
   git push origin your-branch
   ```

4. **Create Pull Request**
   - Go to GitHub and create a PR from your branch to `develop`
   - Fill out the PR template completely
   - Link related issues
   - Add screenshots for UI changes
   - Request review from maintainers

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested these changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Changes tested locally
- [ ] Database migrations included (if needed)
- [ ] RLS policies added (for new tables)

## Related Issues
Fixes #(issue number)
```

## Reporting Issues

### Bug Reports

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots or error messages
- Environment details (OS, browser, version)
- Console logs if relevant

### Feature Requests

Include:
- Clear description of the feature
- Use case and benefits
- Potential implementation approach
- Related features or integrations
- Mockups or examples (if applicable)

### Security Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email security concerns directly to the maintainers
2. Include detailed description of the vulnerability
3. Wait for response before public disclosure
4. Allow reasonable time for fix implementation

## Development Tips

### Useful Commands

```bash
# Start development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Debugging

- Use browser DevTools for frontend debugging
- Check Supabase Dashboard for database queries
- View Edge Function logs in Supabase Dashboard
- Use React DevTools for component debugging

### Performance

- Use React DevTools Profiler for performance analysis
- Minimize re-renders with proper memoization
- Optimize database queries (use indexes)
- Lazy load components where appropriate
- Optimize images and assets

## Resources

### Documentation

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)

### Community

- GitHub Discussions: For questions and general discussion
- GitHub Issues: For bug reports and feature requests
- Pull Requests: For code contributions

## Recognition

Contributors will be recognized in:
- Project README acknowledgments
- Release notes for significant contributions
- Project documentation (for major features)

## Questions?

If you have questions about contributing:
- Check existing documentation
- Search closed issues and PRs
- Open a GitHub Discussion
- Reach out to maintainers

Thank you for contributing to Defense Terminal!
