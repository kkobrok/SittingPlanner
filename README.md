# EasySeating

A web-based application that helps users optimize seating arrangements for weddings and events using AI-powered algorithms and an intuitive drag-and-drop interface.

## Overview

EasySeating simplifies the complex task of planning seating arrangements by considering multiple factors such as relationships, age, drinking habits, dietary restrictions, hobbies/interests, and topics to avoid. The application generates optimized seating plans that maximize guest satisfaction while allowing manual adjustments.

## Key Features

- **AI-Powered Optimization**: Automatically generates seating plans based on guest preferences and relationships
- **Interactive Visual Editor**: Drag-and-drop interface for manual adjustments with real-time feedback
- **Guest Management**: Easy input of guest details including relationships, preferences, and constraints
- **Customizable Rules**: Configure the relative importance of different factors in seating optimization
- **Template System**: Save, load, and reuse seating plan templates for future events
- **Export Options**: Export seating plans to PDF and CSV formats
- **Premium Features**: Access to exclusive layouts, designs, and custom design requests

## Tech Stack

### Frontend
- **[Astro 5](https://astro.build/)** - Modern web framework for fast, content-focused websites
- **[React 19](https://react.dev/)** - Interactive UI components
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - Reusable component library

### Backend
- **[Supabase](https://supabase.com/)** - Backend-as-a-Service providing:
  - PostgreSQL database
  - Authentication
  - Storage
  - Real-time subscriptions

### AI Integration
- **[OpenAI API](https://openai.com/)** - AI service for seating optimization algorithms

### Deployment
- **GitHub Actions** - CI/CD pipeline for automated testing and deployment

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)
- Supabase account (for backend services)
- OpenAI API key (for AI features)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/kkobrok/SittingPlanner.git
cd SittingPlanner
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

4. Run the development server:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Project Structure

```
.
├── src/
│   ├── layouts/       # Astro layouts
│   ├── pages/         # Astro pages
│   │   └── api/       # API endpoints
│   ├── components/    # UI components (Astro & React)
│   └── assets/        # Static assets
├── public/            # Public assets
└── .ai/               # AI development documentation
    ├── prd.md         # Product Requirements Document
    └── tech-stack.md  # Technology Stack Analysis
```

## Core Functionality

### Guest Management (US-001)
- Input guest names, relationships, age ranges, drinking habits, dietary restrictions
- Import guest lists from CSV or Excel files
- Categorize guests into predefined or custom groups

### Automated Seating Plan Generation (US-002)
- AI-powered optimization based on guest preferences and relationships
- Visual indicators for alternate arrangements with equal optimization scores
- Configurable weighting of different factors

### Manual Adjustments (US-003)
- Drag-and-drop guests between seats and tables
- Real-time visual feedback on changes
- Conflict highlighting and rule violation warnings
- Undo/redo functionality

### Template Management (US-004)
- Save seating plans as reusable templates
- Browse, search, and load saved templates
- Auto-save functionality to prevent data loss

### User Authentication (US-005)
- Secure account creation and login
- Password reset functionality
- Data privacy and access control

### Premium Subscription (US-006)
- Advanced features and exclusive designs
- Custom design requests
- Priority support

## Success Metrics

- User adoption rate and growth
- Average user satisfaction rating (target: 4.5/5)
- Manual adjustment rate (target: <30%)
- Template reuse rate
- Premium conversion and retention
- Support ticket volume and resolution time

## Security & Privacy

- Secure handling of guest information
- Supabase Row Level Security (RLS) policies
- Encrypted data storage
- OAuth authentication options

## Roadmap

### MVP (Phase 1)
- Core seating optimization engine
- Basic guest management
- Interactive seating chart editor
- Template system
- User authentication
- Export to PDF/CSV

### Future Enhancements
- Mobile app versions
- Integration with wedding planning platforms
- Advanced AI models for better optimization
- Collaborative planning features
- Multi-language support

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project.

See `.cursor/rules/`, `.github/copilot-instructions.md`, and `.windsurfrules` for development guidelines.

## License

MIT

## Support

For issues, questions, or feature requests, please open an issue on GitHub or contact support@easyseating.com.
