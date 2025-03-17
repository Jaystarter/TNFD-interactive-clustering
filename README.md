# TNFD Tools Interactive Clustering

An interactive visualization tool that displays relationships between biodiversity and environmental assessment tools using a force-directed graph. The application helps users understand the connections between different tools based on their characteristics, methodologies, and focus areas.

## Features

- **Interactive Force-Directed Graph**: Visualizes tools as nodes with dynamic force-based positioning
- **Similarity-Based Connections**: Tools are connected based on their similarity scores
- **Category-Based Coloring**: Different tool categories are represented by distinct colors
- **Interactive Hover Effects**: Highlights connected tools and their relationships
- **Responsive Design**: Adapts to different screen sizes
- **Search Functionality**: Allows users to search for specific tools or categories

## Algorithm

The application uses a sophisticated similarity algorithm to establish connections between tools. The similarity score is calculated based on multiple weighted attributes:

- Primary Function (40% weight): Exact or partial matches in tool functions
- Data Sources (20% weight): Overlap in data source types
- Sector Focus (15% weight): Common industry sectors
- Methodology (15% weight): Shared methodological approaches
- Geographic Scope (5% weight): Matching geographical coverage
- User Interface (5% weight): Similar interface types

Connections are established when tools exceed a similarity threshold, creating a network of related tools.

## Technical Implementation

- **Frontend**: React with TypeScript for type safety
- **Visualization**: D3.js for force-directed graph rendering
- **Build Tool**: Vite for fast development and optimized production builds
- **Data Processing**: Custom CSV parser for tool data processing
- **Styling**: Modern CSS with responsive design

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the local server address

## Data Structure

The tool data is stored in CSV format with the following attributes:
- Tool Name
- Provider
- Primary Function
- Data Sources
- Sector Focus
- Geographic Scope
- Methodology
- User Interface
- Cost

## Visualization Features

- **Node Size**: Represents tool relevance
- **Node Color**: Indicates tool category
- **Edge Lines**: Shows relationships between similar tools
- **Interactive Hover**: Highlights connected tools and dims unrelated ones
- **Smooth Animations**: Provides fluid transitions for better user experience

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
