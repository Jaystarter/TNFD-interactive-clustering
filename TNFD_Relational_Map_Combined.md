# TNFD Tools Relational Map: Combined Documentation & Insights

## Overview
- Interactive visualization for exploring relationships between TNFD-related tools
- Visualizes connections based on functional similarities, target users, data sources, and environmental focus
- Helps useres identify, compare, and select tools for specific needs

## Data Construction & Algorithms
- **Data Sources**:
  - CSV file with details on each tool (name, function, data sources, target user, environment, description, connections)
  - Compiled via expert research, manual categorization, and relationship mapping
- **Automated Web Scraping**:
  - Used Octoparse to collect tool inventory, names, organizations, URLs
- **AI-Augmented Research**:
  - Leveraged AI agents for targeted web searches and systematic information gathering
- **Taxonomic Regularization**:
  - Standardized tool attributes for accurate similarity calculations
- **Flexible Data Architecture**:
  - CSV-based, easily updatable, supports custom datasets and version control

- **Similarity Calculation**:
  - Cosine similarity for text features
  - Overlap coefficient for categorical data
  - Weighted similarity metric (user-configurable in UI)
  - Connections shown if similarity exceeds threshold
- **Graph Visualization**:
  - D3.js force-directed layout
  - Clustering via breadth-first search
  - Convex hulls for cluster visuals

## Advantages Over Static Reports
- **Interactive Exploration**:
  - Dynamic, user-driven analysis of tool relationships and attributes
- **Visual Network Analysis**:
  - Reveals relationships not visible in static lists
- **Customizable Analysis**:
  - Users adjust weights and filters to focus on relevant attributes
- **Automated Clustering**:
  - Identifies natural groupings of tools

## Practical Applications
- Quickly discover relevant, alternative, or complementary tools
- Understand interdependencies and synergies
- Identify gaps and avoid redundancy
- Facilitate collaboration and shared understanding

## Complementary to Static Reports
- **Static Reports Strengths**:
  - Sector-wide context, structured overviews, synthesized insights
  - Lower learning curve and high information density
- **Visualization Tool Strengths**:
  - Relationship discovery, dynamic exploration, active learning
- **Best Used Together**:
  - Combine for comprehensive understanding and decision support

## Tech Stack
- **Frontend**: React 18+, TypeScript
- **Visualization**: D3.js, SVG
- **UI**: Material UI, Emotion CSS
- **Build Tools**: Vite, npm
- **Data Processing**: Custom algorithms, CSV parsing

## Development & Customization
- Easy CSV updates for new tools
- Adjustable similarity thresholds and feature weights
- Scalable and adaptable for new data and use cases
- Deployable as a static site (Netlify, Vercel, GitHub Pages, etc.)

---

### Areas Where Static Reports Excel

- **Sector-Wide Context** - Provide structured overviews of the entire sector landscape with clear categorization frameworks

- **Narrative and Synthesized Insights** - Offer contextual analysis and broader trends with pre-analyzed conclusions

- **Lower Learning Curve** - Present information in a familiar format that requires no interaction to consume

- **Information Density** - Can present detailed descriptions of multiple tools plainly on the page

### Balancing Different Approaches

- **Complementary Methods** - The visualization tool and static reports serve different analytical needs and can be used together

- **Different Primary Focus** - Static reports emphasize broad sector understanding, while the visualization tool focuses on relationship discovery

- **User Preference** - Some users may prefer passive consumption of organized information, while others benefit from active exploration

---

## Risks and Limitations of AI-Augmented Research
- **Potential Bias**:
  - Results can be influenced by the phrasing of queries or the sources prioritized by AI
- **Accuracy & Reliability**:
  - AI may misinterpret context, leading to errors or omissions
  - Information gathered may be outdated or incomplete if not verified
- **Transparency**:
  - AI decision-making processes can be opaque, making it hard to trace how conclusions were reached
- **Over-Reliance**:
  - Excessive dependence on AI can overlook valuable human expertise or nuanced sector knowledge
- **Mitigation Strategies**:
  - Cross-check AI findings with expert review and authoritative sources
  - Regularly update datasets and update information as needed
  - Encourage transparency and documentation of AI-assisted research steps
