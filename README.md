# TNFD Tools Relational Map Documentation

## Overview

The TNFD Tools Relational Map is an interactive visualization tool designed to help users explore and understand the relationships between various tools related to the Taskforce on Nature-related Financial Disclosures (TNFD). This application visualizes connections between tools based on their functional similarities, target users, data sources, and environmental focus, helping stakeholders identify appropriate tools for their specific needs.

The application includes natural language search functionality powered by Google's Gemini 2.0 Flash-Lite model, allowing users to find relevant tools using everyday language.

## How was the data constructed

### Data Source and Structure

The data for this application comes from a curated CSV file containing detailed information about TNFD-related tools. Each tool entry must include the following columns:

#### **Required CSV Columns**

- **Tool Name** *(string, required)*: The unique name of the tool. This will be used as the identifier.
- **Primary Function** *(string, required)*: The main purpose or capability of the tool. If a tool has multiple functions, separate them with a semicolon (`;`). Example: `Measurement; Assessment`.
- **Data Sources** *(string, required)*: The types of data the tool uses or processes. Multiple data sources should also be separated by semicolons.
- **Target User/Client** *(string, required)*: The intended audience for the tool (e.g., Researcher, Corporate, Field Practitioner). Multiple audiences should be separated by semicolons.
- **Environment Type** *(string, required)*: The environmental contexts the tool is designed for (e.g., Terrestrial, Marine, Freshwater, Multiple). Multiple types should be separated by semicolons.
- **Description** *(string, required)*: A brief explanation of the tool's functionality.
- **TNFD Link** *(string, optional)*: A URL or reference link for the tool (if available).

##### **Example CSV Row**

```
Tool Name,Primary Function,Data Sources,Target User/Client,Environment Type,Description,TNFD Link
"Nature Metrics","Measurement; Assessment","eDNA; Camera Trap","Researcher; Field Practitioner","Terrestrial; Marine","A tool for biodiversity measurement using eDNA and camera traps.",https://naturemetrics.com
```

- **Connections**: Relationships to other tools are generated automatically by the application and do not need to be included in the CSV.

The data was compiled through:
1. **Expert Research**: Analysis of existing biodiversity and environmental assessment tools
2. **Categorization**: Manual classification of tools by primary function, data source, and target audience
3. **Relationship Mapping**: Identification of connections between tools based on similarity thresholds

### Connection Generation

Connections between tools are determined through a multi-dimensional similarity calculation:
1. **Feature Weighting**: Different attributes (function, data sources, users, environment) are assigned configurable weights
2. **Similarity Metrics**: Tools are compared using similarity metrics like Jaccard Index for categorical data
3. **Threshold Application**: Connections are established when similarity exceeds the configurable threshold

## Features

### Natural Language Search

The TNFD Tools Relational Map includes a powerful natural language search feature powered by Google's Gemini 2.0 Flash-Lite model. This allows users to find relevant tools by describing their needs in everyday language rather than having to know specific keywords or categories.

Examples of natural language searches:
- "Find tools for measuring biodiversity in marine environments"
- "Show me tools suitable for corporate sustainability reporting"
- "What tools can help with field assessments?"

## Setup and Installation

### Frontend

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

### Backend API (for Natural Language Search)

1. Navigate to the functions directory:
   ```
   cd functions
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the functions directory with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the API server:
   ```
   node index.js
   ```
   The server will run on port 3001 by default.

**Note:** The natural language search functionality requires both the frontend and backend to be running simultaneously.
   - Text-based features use cosine similarity
   - Categorical features use overlap coefficient
3. **Threshold Filtering**: Connections are only established when similarity scores exceed the user-defined threshold

## What algorithms are used

### Similarity Calculation

The application uses several key algorithms to determine relationships and visualize the data:

1. **Cosine Similarity**: For comparing text-based features like descriptions and functions
   ```typescript
   function calculateCosineSimilarity(textA, textB) {
     // Convert texts to token frequency vectors
     // Calculate dot product and magnitude
     // Return dot product / (magnitude A * magnitude B)
   }
   ```

2. **Overlap Coefficient**: For categorical data like environment types and user categories
   ```typescript
   function calculateOverlap(setA, setB) {
     // Find intersection of sets
     // Return size of intersection / size of smaller set
   }
   ```

3. **Weighted Similarity**: Combined metric based on user-configurable weights
   ```typescript
   function calculateToolSimilarity(tool1, tool2, weights) {
     return (
       weights.function * functionSimilarity(tool1, tool2) +
       weights.dataSources * dataSourceSimilarity(tool1, tool2) +
       weights.targetUser * targetUserSimilarity(tool1, tool2) +
       weights.environmentType * environmentTypeSimilarity(tool1, tool2)
     ) / sumOfWeights;
   }
   ```

### Graph Visualization

The network graph visualization employs:

1. **Force-Directed Layout**: Using D3.js force simulation
   - Charge forces (repulsion between nodes)
   - Link forces (connection-based attraction)
   - Center forces (to keep the visualization centered)
   - Collision detection (to prevent node overlap)

2. **Clustering Algorithm**: Connected components are identified using a breadth-first search (BFS) approach
   ```typescript
   function findClusters(nodes, adjacencyMap) {
     // Use BFS to identify connected components
     // Group nodes by their cluster ID
     // Calculate dominant category for each cluster
     // Return cluster objects with styling information
   }
   ```

3. **Convex Hull Generation**: For visualizing clusters using the D3 polygon hull algorithm
   ```typescript
   const hullPoints = d3.polygonHull(points);
   ```

## Why organized in this way?

### Design Rationale

The project is organized following modern React and TypeScript best practices, with a focus on modularity, readability, and maintainability:

1. **Component-Based Architecture**: 
   - `ForceGraph.tsx`: The core visualization component
   - Controls and UI components separated from visualization logic

2. **Data-Visualization Separation**:
   - Raw data stored in CSV format for easy updates
   - Processing utilities separated from rendering code
   - Dynamic recalculation of relationships based on user inputs

3. **Responsive Design Approach**:
   - Material UI components for consistent styling
   - Dynamic sizing based on viewport
   - Interactive controls for filtering and adjusting parameters

This organization allows:
- **Maintainability**: Clear separation of concerns makes updating components easier
- **Scalability**: New tools can be added to the CSV without modifying code
- **Flexibility**: User-configurable weights and thresholds without code changes

## Why information gathered in this way?

### Data Collection Strategy

The information for this visualization was collected through a systematic, multi-stage process designed to ensure comprehensive coverage and standardization:

1. **Automated Web Scraping**:
   - Utilized Octoparse, a professional web scraping tool, to compile an initial comprehensive inventory of TNFD-relevant tools
   - Extracted basic information including tool names, organizations, and website URLs

2. **AI-Augmented Research Enhancement**:
   - Leveraged AI research agents (including Manus.im) to conduct targeted web searches on identified tools
   - The AI agents systematically collected detailed information on functionality, target users, environmental contexts, and data requirements
   - This approach allowed for consistent depth of information across all tools while minimizing human research time

3. **Taxonomic Regularization**:
   - Standardized tool characteristics into consistent taxonomic categories (Primary Function, Data Sources, Target User/Client, Environment Type)
   - Normalized terminology across different tools to enable accurate similarity calculations
   - This regularization was crucial for enabling the effective visualization of relationships between diverse tools

4. **Flexible Data Architecture**:
   - Implemented a CSV-based data structure that decouples the visualization from the underlying data source
   - This design choice makes the data source interchangeable, allowing for:
     - Easy updates without code modifications
     - Customization by different stakeholders with their own tool datasets
     - Straightforward version control of the tool inventory

### Benefits of This Approach

This methodical approach to data collection and organization enables:

1. **Comprehensive Coverage**: 
   - Including multiple aspects of each tool provides a multi-dimensional understanding
   - Results in more nuanced similarity detection than single-factor analysis

2. **Usability Focus**:
   - Organizing data by specific attributes helps users find tools relevant to their specific needs
   - The visual clustering identifies functional groups of tools that might otherwise be missed

3. **Scalability**:
   - The automated collection process can be rerun to incorporate new tools
   - The standardized format allows for consistent integration of new data

4. **Adaptability**:
   - The weighted similarity approach allows users to prioritize different aspects
   - Accommodates various use cases from policy makers to technical implementers

## Tech Stack

### Core Technologies

The application is built using a modern web development stack:

1. **Frontend Framework**:
   - React 18+ (with functional components and hooks)
   - TypeScript for type safety

2. **Visualization Libraries**:
   - D3.js for force-directed graph layout and data visualization
   - SVG for rendering all graphical elements

3. **UI Components**:
   - Material UI for consistent, accessible interface components
   - Custom styling with Emotion for component-specific CSS

4. **Build Tools**:
   - Vite for fast development and optimized production builds
   - npm for package management

5. **Data Processing**:
   - Custom similarity calculation algorithms
   - CSV parsing for data ingestion

### Deployment

The application can be deployed as a static site to any hosting provider (Netlify, Vercel, GitHub Pages, etc.) since it runs entirely in the browser with no backend dependencies.

---

## Development Guide

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```

### Adding New Tools

To add new tools to the visualization:

1. Edit the CSV file in the project root
2. Add a new row with the tool's information
3. Restart the development server

The application will automatically process the new data and incorporate it into the visualization.

### Modifying Visualization Parameters

Key parameters can be adjusted in the `src/utils/clusteringUtils.ts` file:

- Default similarity thresholds
- Default feature weights
- Clustering algorithm parameters

---

*This documentation was generated in April 2025 for the TNFD Tools Relational Map project.*
