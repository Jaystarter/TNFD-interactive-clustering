import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { Tool, tools, categories, colorPalette } from '../data/tools';

interface ForceGraphProps {
  width: number;
  height: number;
  toolsData?: Tool[];
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  category: string;
  relevance: number;
  cluster?: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

interface RelationshipInfo {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  primaryFunction?: string;
  dataSources?: string;
  targetUser?: string;
  environmentType?: string;
  description?: string;
  tnfdLink?: string;
  connections: {
    id: string;
    name: string;
    category: string;
    type: 'incoming' | 'outgoing' | 'both';
  }[];
  // Optional properties for internal use
  _updateTimestamp?: number;
  _nodeId?: string;
}

interface Cluster {
  id: string;
  nodes: Node[];
  color: string;
  category: string;
  secondaryFeature?: string;
  toolCount: number;
}

interface CategoryCounts {
  categoryNames: Record<string, number>;
  colorCounts: Record<string, number>;
}

// Function to parse CSV with proper handling of quoted values
const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Add the last value
  values.push(currentValue);
  return values;
};

// Function to fetch tool details from CSV
const fetchToolDetails = async (toolId: string): Promise<{
  primaryFunction?: string;
  dataSources?: string;
  targetUser?: string;
  environmentType?: string;
  description?: string;
  tnfdLink?: string;
}> => {
  try {
    // Try to load the CSV file with links
    const response = await fetch('/TNFD Prototype Data with links.csv');
    if (!response.ok) {
      return {};
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');

    // Parse header line
    const headers = parseCSVLine(lines[0]);

    // Find the index of each column we need
    const nameIndex = headers.findIndex(h => h === 'Tool Name');
    const primaryFunctionIndex = headers.findIndex(h => h === 'Primary Function');
    const dataSourcesIndex = headers.findIndex(h => h === 'Data Sources');
    const targetUserIndex = headers.findIndex(h => h === 'Target User/Client');
    const environmentTypeIndex = headers.findIndex(h => h === 'Environment Type');
    const descriptionIndex = headers.findIndex(h => h === 'Description');
    const linkIndex = headers.findIndex(h => h === 'TNFD Link');

    // Find the tool in the CSV data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue; // Skip empty lines

      const values = parseCSVLine(line);
      if (values.length <= nameIndex) continue;

      const toolName = values[nameIndex];
      const toolIdFromName = toolName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      if (toolIdFromName === toolId) {
        // Extract all the details
        const result: Record<string, string> = {};

        if (primaryFunctionIndex >= 0 && values.length > primaryFunctionIndex) {
          result.primaryFunction = values[primaryFunctionIndex];
        }

        if (dataSourcesIndex >= 0 && values.length > dataSourcesIndex) {
          result.dataSources = values[dataSourcesIndex];
        }

        if (targetUserIndex >= 0 && values.length > targetUserIndex) {
          result.targetUser = values[targetUserIndex];
        }

        if (environmentTypeIndex >= 0 && values.length > environmentTypeIndex) {
          result.environmentType = values[environmentTypeIndex];
        }

        if (descriptionIndex >= 0 && values.length > descriptionIndex) {
          result.description = values[descriptionIndex];
        }

        if (linkIndex >= 0 && values.length > linkIndex) {
          result.tnfdLink = values[linkIndex];
        }

        return result;
      }
    }

    return {}; // Tool not found
  } catch (error) {
    return {};
  }
};

export const ForceGraph = ({ width, height, toolsData }: ForceGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<Node, undefined> | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const linksRef = useRef<Link[]>([]);
  const [relationshipInfo, setRelationshipInfo] = useState<RelationshipInfo | null>(null);
  // Ref for popup DOM element and current info
  const popupRef = useRef<HTMLDivElement>(null);
  const relationshipInfoRef = useRef<RelationshipInfo | null>(null);
  // Sync ref and set initial popup position
  useLayoutEffect(() => {
    relationshipInfoRef.current = relationshipInfo;
    if (relationshipInfo && popupRef.current) {
      const node = nodesRef.current.find(n => n.id === relationshipInfo._nodeId);
      if (node) {
        const sx = zoomTransformRef.current.applyX(node.x || 0);
        const sy = zoomTransformRef.current.applyY(node.y || 0);
        popupRef.current.style.left = `${sx}px`;
        popupRef.current.style.top = `${sy}px`;
      }
    }
  }, [relationshipInfo]);

  // Create a ref to track the current zoom transform
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    categories.forEach(category => {
      const gradientId = `gradient-${category.name.toLowerCase().replace(/\s+/g, '-')}`;
      const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.rgb(category.color).brighter(0.5).toString());

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', category.color);
    });

    const container = svg.append('g')
      .attr('class', 'container');

    containerRef.current = container.node();

    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        if (containerRef.current) {
          zoomTransformRef.current = event.transform;
          d3.select(containerRef.current).attr('transform', event.transform.toString());

          // Imperatively update popup position on zoom
          if (popupRef.current && relationshipInfoRef.current) {
            const info = relationshipInfoRef.current;
            const node = nodesRef.current.find(n => n.id === info._nodeId);
            if (node) {
              popupRef.current.style.left = `${event.transform.applyX(node.x || 0)}px`;
              popupRef.current.style.top = `${event.transform.applyY(node.y || 0)}px`;
            }
          }
        }
      });

    svg.call(zoom as any)
      .on('dblclick.zoom', null);

    container.append('g').attr('class', 'hull-group');
    container.append('g').attr('class', 'links');
    container.append('g').attr('class', 'nodes');

    svg.on('click', () => {
      setRelationshipInfo(null);
    });

    const simulation = d3.forceSimulation<Node>()
      .force('charge', d3.forceManyBody().strength(-180).distanceMax(250))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force('collision', d3.forceCollide().radius((d: any) => (d as Node).relevance * 18))
      .alphaDecay(0.01)
      .velocityDecay(0.25);

    simulationRef.current = simulation;

  }, [width, height]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const container = d3.select(containerRef.current);
    const simulation = simulationRef.current;
    if (!simulation) return;

    const toolsToUse = toolsData || tools;

    const existingNodesMap = new Map(nodesRef.current.map(node => [node.id, node]));

    const nodes: Node[] = toolsToUse.map(tool => {
      const existingNode = existingNodesMap.get(tool.id);
      return {
        id: tool.id,
        name: tool.name,
        category: tool.category,
        relevance: tool.relevance,
        x: existingNode?.x,
        y: existingNode?.y,
        vx: existingNode?.vx,
        vy: existingNode?.vy,
      };
    });

    nodesRef.current = nodes;

    const nodeIds = new Set(nodes.map(node => node.id));

    const links: Link[] = toolsToUse.flatMap(tool =>
      tool.connections
        .filter(targetId => nodeIds.has(targetId))
        .map(target => ({
          source: tool.id,
          target,
        }))
    );

    linksRef.current = links;

    simulation.nodes(nodes);
    simulation.force('link', d3.forceLink(links)
      .id((d: any) => d.id)
      .distance(70)
      .strength(0.75)
    );

    const adjacencyMap = new Map<string, string[]>();
    nodes.forEach(node => {
      adjacencyMap.set(node.id, []);
    });

    links.forEach(link => {
      const source = typeof link.source === 'string' ? link.source : link.source.id;
      const target = typeof link.target === 'string' ? link.target : link.target.id;

      adjacencyMap.get(source)?.push(target);
      adjacencyMap.get(target)?.push(source);
    });

    const findClusters = () => {
      const visited = new Set<string>();
      const clusterMap = new Map<string, string[]>();
      let clusterCounter = 0;

      const bfs = (startNodeId: string) => {
        const queue: string[] = [startNodeId];
        visited.add(startNodeId);
        const nodesInCluster: string[] = [startNodeId];

        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const neighbors = adjacencyMap.get(currentId) || [];

          for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
              visited.add(neighborId);
              queue.push(neighborId);
              nodesInCluster.push(neighborId);
            }
          }
        }

        return nodesInCluster;
      };

      for (const node of nodes) {
        if (!visited.has(node.id)) {
          const clusterId = `cluster-${clusterCounter++}`;
          const nodesInCluster = bfs(node.id);

          if (nodesInCluster.length > 1) {
            clusterMap.set(clusterId, nodesInCluster);
          }
        }
      }

      const clusters: Cluster[] = [];

      clusterMap.forEach((nodeIds, clusterId) => {
        const clusterNodes = nodes.filter(node => nodeIds.includes(node.id));

        const categoryCounts: CategoryCounts = {
          categoryNames: {},
          colorCounts: {}
        };

        clusterNodes.forEach(node => {
          const category = categories.find(c => c.name === node.category);
          if (category) {
            categoryCounts.colorCounts[category.color] = (categoryCounts.colorCounts[category.color] || 0) + 1;
            categoryCounts.categoryNames[category.name] = (categoryCounts.categoryNames[category.name] || 0) + 1;
          }
        });

        const colorEntries = Object.entries(categoryCounts.colorCounts);
        const dominantColor = colorEntries.length > 0
          ? colorEntries.sort((a, b) => b[1] - a[1])[0][0]
          : '#cccccc';

        const categoryNameEntries = Object.entries(categoryCounts.categoryNames);
        const dominantCategory = categoryNameEntries.length > 0
          ? categoryNameEntries.sort((a, b) => b[1] - a[1])[0][0]
          : 'Misc';

        // For better secondary labels, determine what actually groups these tools together
        // First, what common category do they share (if any)?
        const categoryDistribution: Record<string, number> = {};
        clusterNodes.forEach(node => {
          // Skip 'Biodiversity' as a category for grouping
          if (node.category.toLowerCase() !== 'biodiversity') {
            categoryDistribution[node.category] = (categoryDistribution[node.category] || 0) + 1;
          }
        });

        // Sort categories by frequency
        const sortedCategories = Object.entries(categoryDistribution)
          .sort((a, b) => b[1] - a[1]);

        // If all tools have the same category, look for other common attributes
        let secondaryFeature = '';
        if (sortedCategories.length === 1) {
          // They all share the same category, so we need another distinguishing feature
          // Use tool names to extract meaningful keywords
          const wordFrequency: Record<string, number> = {};

          clusterNodes.forEach(node => {
            const words = node.name.toLowerCase()
              .split(/\s+/)
              .filter(word => word.length > 3 && !['with', 'from', 'that', 'this', 'tool', 'biodiversity'].includes(word));

            words.forEach(word => {
              wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            });
          });

          // Find the most common meaningful words
          const commonWords = Object.entries(wordFrequency)
            .filter(([_, count]) => count > 1) // At least 2 tools share this word
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([word]) => word);

          if (commonWords.length > 0) {
            secondaryFeature = commonWords.join('/');
          } else {
            // If no common words, indicate the number of tools
            secondaryFeature = `${clusterNodes.length} tools`;
          }
        } else if (sortedCategories.length > 1) {
          // They have mixed categories - show the top 2
          secondaryFeature = sortedCategories
            .slice(0, Math.min(2, sortedCategories.length))
            .map(([cat]) => cat)
            .join(' & ');
        }

        clusterNodes.forEach(node => {
          node.cluster = clusterId;
        });

        clusters.push({
          id: clusterId,
          nodes: clusterNodes,
          color: dominantColor,
          category: dominantCategory,
          secondaryFeature: secondaryFeature,
          toolCount: clusterNodes.length
        });
      });

      return clusters;
    };

    const calculateCentroid = (points: [number, number][]) => {
      const sumX = points.reduce((sum, point) => sum + point[0], 0);
      const sumY = points.reduce((sum, point) => sum + point[1], 0);
      return {
        x: sumX / points.length,
        y: sumY / points.length
      };
    };

    const calculateBounds = (points: [number, number][]) => {
      const xs = points.map(p => p[0]);
      const ys = points.map(p => p[1]);
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys)
      };
    };

    const linkElements = container.select('.links')
      .selectAll('line')
      .data(links, (d: any) => `${typeof d.source === 'object' ? d.source.id : d.source}-${typeof d.target === 'object' ? d.target.id : d.target}`);

    linkElements.exit().remove();

    const linkEnter = linkElements.enter()
      .append('line')
      .style('stroke', '#cbd5e0')
      .style('stroke-opacity', 0.5)
      .style('stroke-width', 1.5)
      .style('stroke-dasharray', '4,4')
      .style('transition', 'all 0.3s ease');

    const linkUpdate = linkEnter.merge(linkElements as any);

    const nodeElements = container.select('.nodes')
      .selectAll('g.node')
      .data(nodes, (d: any) => d.id);

    nodeElements.exit().remove();

    const nodeEnter = nodeElements.enter()
      .append('g')
      .attr('class', 'node')
      .call(drag(simulation) as any)
      .on('click', async function(event, d: Node) {
        event.stopPropagation();

        const nodeConnections: RelationshipInfo['connections'] = [];

        toolsToUse.forEach(tool => {
          if (tool.id !== d.id && tool.connections.includes(d.id)) {
            nodeConnections.push({
              id: tool.id,
              name: tool.name,
              category: tool.category,
              type: 'incoming'
            });
          }
        });

        const currentTool = toolsToUse.find(tool => tool.id === d.id);
        if (currentTool) {
          currentTool.connections.forEach(targetId => {
            const targetTool = toolsToUse.find(tool => tool.id === targetId);
            if (targetTool) {
              const existingConnection = nodeConnections.find(conn => conn.id === targetId);
              if (existingConnection) {
                existingConnection.type = 'both';
              } else {
                nodeConnections.push({
                  id: targetTool.id,
                  name: targetTool.name,
                  category: targetTool.category,
                  type: 'outgoing'
                });
              }
            }
          });
        }

        // Fetch additional tool details from CSV
        try {
          const toolDetails = await fetchToolDetails(d.id);

          const nodeX = d.x || 0;
          const nodeY = d.y || 0;
          const screenX = zoomTransformRef.current.applyX(nodeX);
          const screenY = zoomTransformRef.current.applyY(nodeY);
          setRelationshipInfo({
            id: d.id,
            name: d.name,
            category: d.category,
            x: nodeX,
            y: nodeY,
            screenX,
            screenY,
            primaryFunction: toolDetails.primaryFunction,
            dataSources: toolDetails.dataSources,
            targetUser: toolDetails.targetUser,
            environmentType: toolDetails.environmentType,
            description: toolDetails.description,
            tnfdLink: toolDetails.tnfdLink,
            connections: nodeConnections,
            _nodeId: d.id
          });
        } catch (error) {
          const directLink = `https://tnfd.global/tools-platforms/${d.id}/`;
          const nodeX = d.x || 0;
          const nodeY = d.y || 0;
          const screenX = zoomTransformRef.current.applyX(nodeX);
          const screenY = zoomTransformRef.current.applyY(nodeY);
          setRelationshipInfo({
            id: d.id,
            name: d.name,
            category: d.category,
            x: nodeX,
            y: nodeY,
            screenX,
            screenY,
            tnfdLink: directLink,
            connections: nodeConnections,
            _nodeId: d.id
          });
        }
      });

    nodeEnter
      .append('circle')
      .attr('r', (d: Node) => d.relevance * 20)
      .style('filter', 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))')
      .style('transition', 'all 0.3s ease')
      // Set initial fill to white for all nodes to ensure consistency
      .attr('fill', '#ffffff')
      .attr('stroke', '#cccccc')
      .attr('stroke-width', 1.5);

    // We'll handle all node labels in the drawNodeLabels function
    // This ensures no text labels appear on nodes in clusters

    const nodeUpdate = nodeEnter.merge(nodeElements as any);

    const drawHulls = () => {
      const hullGroup = container.select('.hull-group');
      hullGroup.selectAll('*').remove();

      const currentClusters = findClusters();

      // Reset all node cluster assignments first
      nodes.forEach(node => {
        node.cluster = undefined;
      });

      // Then mark nodes that belong to clusters
      currentClusters.forEach(cluster => {
        cluster.nodes.forEach(node => {
          node.cluster = cluster.id;
        });
      });

      // Force an immediate style update with direct attribute manipulation
      // First, get all node elements
      const nodeElements = d3.selectAll('.nodes circle');

      // Apply styles to all nodes first
      nodeElements.each(function(d: any) {
        const node = d3.select(this);
        if (d.cluster) {
          // Node is in a cluster - ALWAYS make it white with colored border
          node.attr('fill', '#ffffff');
          node.attr('stroke', colorPalette.darkGreen);
          node.attr('stroke-width', 2);
        } else {
          // Node is standalone - use color from palette
          node.attr('fill', colorPalette.mediumGreen);
          node.attr('stroke', colorPalette.darkGreen);
          node.attr('stroke-width', 1.5);
        }
      });

      // Double-check and force white fill for all nodes in clusters
      currentClusters.forEach(cluster => {
        cluster.nodes.forEach(node => {
          // Find the DOM element for this node
          nodeElements.filter(function(d: any) {
            return d.id === node.id;
          }).attr('fill', '#ffffff')
            .attr('stroke', d3.rgb(cluster.color).darker(0.3).toString())
            .attr('stroke-width', 2);
        });
      });

      // Update text label visibility
      d3.selectAll('.nodes text').each(function(d: any) {
        const text = d3.select(this);
        text.attr('opacity', d.cluster ? 0 : 1);
      });

      // Draw the hulls for each cluster
      currentClusters.forEach(cluster => {
        if (cluster.nodes.length < 2) return;

        const points: [number, number][] = [];

        cluster.nodes.forEach(node => {
          if (node.x === undefined || node.y === undefined) return;

          const radius = node.relevance * 20;
          const padding = 10;

          const angleStep = 45;
          for (let angle = 0; angle < 360; angle += angleStep) {
            const radians = (angle * Math.PI) / 180;
            const x = node.x + (radius + padding) * Math.cos(radians);
            const y = node.y + (radius + padding) * Math.sin(radians);
            points.push([x, y]);
          }
        });

        if (points.length < 3) {
          if (cluster.nodes.length === 2 &&
              cluster.nodes[0].x !== undefined &&
              cluster.nodes[0].y !== undefined &&
              cluster.nodes[1].x !== undefined &&
              cluster.nodes[1].y !== undefined) {

            const node1 = cluster.nodes[0];
            const node2 = cluster.nodes[1];
            const radius1 = node1.relevance * 20 + 10;
            const radius2 = node2.relevance * 20 + 10;
            const x1 = node1.x!;
            const y1 = node1.y!;
            const x2 = node2.x!;
            const y2 = node2.y!;

            const angle = Math.atan2(y2 - y1, x2 - x1);
            const perpAngle1 = angle + Math.PI/2;
            const perpAngle2 = angle - Math.PI/2;
            const width = 20;

            points.push([x1 + radius1 * Math.cos(angle), y1 + radius1 * Math.sin(angle)]);
            points.push([x1 + width * Math.cos(perpAngle1), y1 + width * Math.sin(perpAngle1)]);
            points.push([x2 + width * Math.cos(perpAngle1), y2 + width * Math.sin(perpAngle1)]);
            points.push([x2 + radius2 * Math.cos(angle + Math.PI), y2 + radius2 * Math.sin(angle + Math.PI)]);
            points.push([x2 + width * Math.cos(perpAngle2), y2 + width * Math.sin(perpAngle2)]);
            points.push([x1 + width * Math.cos(perpAngle2), y1 + width * Math.sin(perpAngle2)]);
          } else {
            return;
          }
        }

        const hullPoints = d3.polygonHull(points);
        if (!hullPoints) return;

        hullGroup.append('path')
          .attr('class', 'hull')
          .attr('d', 'M' + hullPoints.join('L') + 'Z')
          .style('fill', d3.rgb(colorPalette.lightGreen).copy({opacity: 0.3}).toString())
          .style('stroke', colorPalette.darkGreen)
          .style('stroke-width', 1.5)
          .style('stroke-linejoin', 'round')
          .style('pointer-events', 'none');

        const centroid = calculateCentroid(hullPoints);

        const bounds = calculateBounds(hullPoints);
        const labelPosition = {
          x: centroid.x,
          y: bounds.maxY + 25
        };

        const labelGroup = hullGroup.append('g')
          .attr('class', 'cluster-label')
          .attr('transform', `translate(${labelPosition.x}, ${labelPosition.y})`);

        // Calculate width based on content
        const primaryWidth = cluster.category.length * 7 + 20;
        const secondaryWidth = cluster.secondaryFeature ? (cluster.secondaryFeature.length * 6 + 20) : 0;
        const totalWidth = Math.max(primaryWidth, secondaryWidth) + 30; // Add extra space for badge

        // Add main background pill
        labelGroup.append('rect')
          .attr('rx', 12)
          .attr('ry', 12)
          .attr('x', -totalWidth/2)
          .attr('y', -15)
          .attr('width', totalWidth)
          .attr('height', cluster.secondaryFeature ? 50 : 30)
          .style('fill', d3.rgb(cluster.color).copy({opacity: 0.25}).toString())
          .style('stroke', d3.rgb(cluster.color).darker(0.3).toString())
          .style('stroke-width', 1.5)
          .style('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.15))');

        // Add count badge - repositioned for better visibility
        const badgeX = totalWidth/2 - 15;
        const badgeY = cluster.secondaryFeature ? -5 : 0;

        labelGroup.append('circle')
          .attr('cx', badgeX)
          .attr('cy', badgeY)
          .attr('r', 12)
          .style('fill', d3.rgb(cluster.color).darker(0.2).toString())
          .style('stroke', 'white')
          .style('stroke-width', 1.5)
          .style('filter', 'drop-shadow(0px 1px 2px rgba(0,0,0,0.2))');

        // Add count text
        labelGroup.append('text')
          .text(cluster.toolCount)
          .attr('x', badgeX)
          .attr('y', badgeY + 1) // Slight vertical adjustment for better centering
          .style('font-size', '11px')
          .style('font-family', "'Inter', sans-serif")
          .style('font-weight', '700')
          .style('text-anchor', 'middle')
          .style('dominant-baseline', 'middle')
          .style('fill', 'white')
          .style('pointer-events', 'none');

        // Add main category text
        labelGroup.append('text')
          .text(cluster.category)
          .attr('text-anchor', 'middle')
          .attr('y', 0)
          .style('font-size', '13px')
          .style('font-family', "'Inter', sans-serif")
          .style('font-weight', '600')
          .style('letter-spacing', '0.3px')
          .style('fill', d3.rgb(cluster.color).darker(1.5).toString())
          .style('pointer-events', 'none')
          .style('text-shadow', '0px 1px 2px rgba(255,255,255,0.7)');

        // Add secondary feature text if available - with more reliable display
        if (cluster.secondaryFeature && cluster.secondaryFeature.length > 0) {
          labelGroup.append('text')
            .text(cluster.secondaryFeature)
            .attr('text-anchor', 'middle')
            .attr('y', 22)
            .style('font-size', '11px')
            .style('font-family', "'Inter', sans-serif")
            .style('font-weight', '400')
            .style('font-style', 'italic')
            .style('fill', d3.rgb(cluster.color).darker(1).toString())
            .style('pointer-events', 'none');
        }

      });
    };

    const drawNodeLabels = () => {
      // Only show labels for standalone nodes (not in clusters)
      const standaloneNodes = nodes.filter(node => !node.cluster);

      container.select('.node-labels').remove();

      const labelGroup = container.append('g')
        .attr('class', 'node-labels')
        .style('pointer-events', 'none');

      standaloneNodes.forEach(node => {
        if (!node.x || !node.y) return;

        const labelContainer = labelGroup
          .append('g')
          .attr('transform', `translate(${node.x + node.relevance * 20 + 10}, ${node.y})`);

        labelContainer.append('rect')
          .attr('rx', 8)
          .attr('ry', 8)
          .attr('x', -5)
          .attr('y', -10)
          .attr('width', node.name.length * 6.5 + 10)
          .attr('height', 22)
          .style('fill', 'white')
          .style('fill-opacity', 0.85)
          .style('stroke', '#e2e8f0')
          .style('stroke-width', 1)
          .style('filter', 'drop-shadow(0px 1px 2px rgba(0,0,0,0.1))');

        labelContainer.append('text')
          .text(node.name)
          .attr('x', 0)
          .attr('y', 4)
          .style('font-size', '12px')
          .style('font-family', "'Inter', sans-serif")
          .style('font-weight', '500')
          .style('fill', '#2d3748')
          .style('pointer-events', 'none');
      });
    };

    simulation.on('tick', () => {
      linkUpdate
        .attr('x1', (d: any) => (typeof d.source === 'object' ? d.source.x : 0))
        .attr('y1', (d: any) => (typeof d.source === 'object' ? d.source.y : 0))
        .attr('x2', (d: any) => (typeof d.target === 'object' ? d.target.x : 0))
        .attr('y2', (d: any) => (typeof d.target === 'object' ? d.target.y : 0));

      nodeUpdate
        .attr('transform', (d: any) => `translate(${d.x || 0},${d.y || 0})`);

      // Draw hulls and update node colors
      drawHulls();

      // Imperatively update popup position on simulation tick
      if (popupRef.current && relationshipInfoRef.current) {
        const info = relationshipInfoRef.current;
        const node = nodesRef.current.find(n => n.id === info._nodeId);
        if (node) {
          popupRef.current.style.left = `${zoomTransformRef.current.applyX(node.x || 0)}px`;
          popupRef.current.style.top = `${zoomTransformRef.current.applyY(node.y || 0)}px`;
        }
      }

      // Draw node labels after hulls to ensure proper layering
      drawNodeLabels();
    });

    if (existingNodesMap.size > 0) {
      simulation.alpha(0.5).restart();
    } else {
      simulation.alpha(0.9).restart();

      // Add some initial random velocity to help separation
      nodes.forEach(node => {
        node.vx = (Math.random() - 0.5) * 2;
        node.vy = (Math.random() - 0.5) * 2;
      });
    }

    return () => {
      simulation.stop();
    };

  }, [toolsData, width, height]);

  return (
    <>
      <svg ref={svgRef} width={width} height={height} />
      {relationshipInfo && (
        <div
          ref={popupRef}
          className="relationship-info"
          style={{
            position: 'fixed',
            left: '0px',
            top: '0px',
            background: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 0,
            width: '380px',
            maxWidth: 'calc(100vw - 20px)',
            overflow: 'auto',
            maxHeight: '80vh',
            fontFamily: "'Inter', sans-serif",
            transition: 'none',
          }}
        >
          {/* Header with tool name and category */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            background: `linear-gradient(135deg, ${colorPalette.darkGreen}, ${colorPalette.mediumGreen})`,
            color: 'white',
            position: 'relative',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}>
            {/* Close button */}
            <div
              onClick={() => setRelationshipInfo(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', paddingRight: '20px' }}>
              {relationshipInfo.name}
            </h3>
            <div style={{
              display: 'inline-block',
              padding: '3px 8px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.25)',
              fontSize: '12px',
              fontWeight: '500',
              marginTop: '4px'
            }}>
              {relationshipInfo.category}
            </div>
          </div>

          {/* Tool details section */}
          <div style={{ padding: '16px 20px' }}>
            {/* TNFD Link Button - more compact version */}
            <div style={{
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 10
            }}>
              {relationshipInfo.tnfdLink ? (
                <a
                  href={relationshipInfo.tnfdLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 12px',
                    backgroundColor: colorPalette.darkGreen, // Dark green from palette
                    color: 'white',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '13px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                    gap: '6px',
                    width: '100%',
                    maxWidth: '250px',
                    cursor: 'pointer',
                    height: '32px',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = d3.rgb(colorPalette.darkGreen).darker(0.3).toString();
                    e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = colorPalette.darkGreen;
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                  onClick={() => {
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  View on TNFD Platform
                </a>
              ) : (
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#f0f0f0',
                  color: '#666',
                  borderRadius: '4px',
                  fontWeight: '500',
                  fontSize: '13px',
                  textAlign: 'center',
                  width: '100%',
                  maxWidth: '250px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  No link available for this tool
                </div>
              )}
            </div>

            {relationshipInfo.description && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.6', color: '#333', fontWeight: '400' }}>
                  {relationshipInfo.description}
                </p>
              </div>
            )}

            {/* Tool characteristics in a more aesthetic layout */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                color: '#333',
                fontWeight: '600',
                borderBottom: '1px solid #f0f0f0',
                paddingBottom: '10px',
                letterSpacing: '0.3px'
              }}>
                Characteristics
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '16px',
                background: '#f9f9f9',
                borderRadius: '8px',
                padding: '16px'
              }}>
                {relationshipInfo.primaryFunction && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#444',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Primary Function
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: '#333',
                      lineHeight: '1.5'
                    }}>
                      {relationshipInfo.primaryFunction}
                    </span>
                  </div>
                )}

                {relationshipInfo.dataSources && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#444',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Data Sources
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: '#333',
                      lineHeight: '1.5'
                    }}>
                      {relationshipInfo.dataSources}
                    </span>
                  </div>
                )}

                {relationshipInfo.targetUser && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#444',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Target Users
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: '#333',
                      lineHeight: '1.5'
                    }}>
                      {relationshipInfo.targetUser}
                    </span>
                  </div>
                )}

                {relationshipInfo.environmentType && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#444',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Environment Type
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: '#333',
                      lineHeight: '1.5'
                    }}>
                      {relationshipInfo.environmentType}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setRelationshipInfo(null)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(255,255,255,0.3)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'white',
              fontWeight: 'bold',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};



const drag = (simulation: d3.Simulation<Node, undefined>) => {
  function dragstarted(event: any) {
    if (event.sourceEvent.type === 'mousedown') {
      event.sourceEvent.stopPropagation();
    }

    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: any) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event: any) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3
    .drag<SVGGElement, Node>()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
};