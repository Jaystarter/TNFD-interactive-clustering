import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { Tool, tools, categories, colorPalette } from '../data/tools';
import { Paper, Box, Typography, Chip, ClickAwayListener } from '@mui/material';

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
  source: string | Node; // Can be an ID string or a Node object
  target: string | Node; // Can be an ID string or a Node object
  value?: number;
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

const getNodeId = (node: string | Node): string => {
  return typeof node === 'object' ? node.id : node;
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
  // Ref to track if we have already fit to viewport initially
  const hasInitialFitRef = useRef<boolean>(false);
  // Ref to track if we're at the initial zoom level (for conditional panning)
  const initialZoomScaleRef = useRef<number>(1);
  const isAtInitialZoomRef = useRef<boolean>(true);
  // Ref to track if the user has interacted with the graph (zoomed or panned)
  const userInteractedRef = useRef<boolean>(false);
  // Ref to store the zoom behavior
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Sync ref and set popup position + animation
  useLayoutEffect(() => {
    relationshipInfoRef.current = relationshipInfo;
    if (relationshipInfo && popupRef.current) {
      const node = nodesRef.current.find(n => n.id === relationshipInfo._nodeId);
      if (node) {
        // Apply zoom transform to get screen coordinates
        const nodeRadius = node.relevance * 20;
        const sx = zoomTransformRef.current.applyX(node.x || 0);
        const sy = zoomTransformRef.current.applyY(node.y || 0);
        
        // Position the popup next to the node (right side by default)
        let x = sx + nodeRadius + 15; // 15px offset from node edge
        const y = sy - 50; // Position slightly above the center of the node
        
        // Check if popup would go off screen to the right
        const rightEdge = x + 320; // 320px is our popup width
        if (rightEdge > window.innerWidth - 20) {
          // Position to the left of the node instead
          x = sx - nodeRadius - 320 - 15;
        }
        
        // Set position
        popupRef.current.style.left = `${x}px`;
        popupRef.current.style.top = `${y}px`;
        
        // Animate in with small delay for smoother appearance
        setTimeout(() => {
          if (popupRef.current) {
            popupRef.current.style.opacity = '1';
            popupRef.current.style.transform = 'scale(1)';
          }
        }, 50);
      }
    } else if (popupRef.current) {
      // Reset animation properties when hiding
      popupRef.current.style.opacity = '0';
      popupRef.current.style.transform = 'scale(0.95)';
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

    containerRef.current = container.node() as SVGGElement; // Ensure correct type for ref

    // Create zoom behavior with conditional panning
    const zoom: d3.ZoomBehavior<SVGSVGElement, unknown> = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5]) // Allow zooming out, max zoom 5x
      .filter((event: any) => {
        // Always allow wheel zoom for scaling
        if (event.type === 'wheel' || event.type === 'mousewheel') return true;
        // Block panning (mousedown/touchstart/pointerdown) before user interaction
        if ((event.type === 'mousedown' || event.type === 'touchstart' || event.type === 'pointerdown') && !userInteractedRef.current) {
          return false;
        }
        return true;
      })
      .on('zoom', (event) => {
        // Detect if this is a user-initiated zoom/pan (not programmatic)
        if (event.sourceEvent) {
          userInteractedRef.current = true;
        }

        if (containerRef.current) {
          // Store the current transform
          zoomTransformRef.current = event.transform;

          // Check if we're at the initial zoom level (for conditional panning)
          const currentScale = event.transform.k;
          isAtInitialZoomRef.current = Math.abs(currentScale - initialZoomScaleRef.current) < 0.01;

          // Apply the transform to the container
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

    // Store the zoom behavior for later use
    zoomBehaviorRef.current = zoom;

    // Apply zoom behavior to SVG
    svg.call(zoom)
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
    simulation.force('link', d3.forceLink<Node, Link>(links)
      .id((d: Node) => getNodeId(d)) // Corrected: d is a Node here
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
      .selectAll<SVGLineElement, Link>('line.link') // Explicitly type the selection
      .data(links, (d: Link): string => `link-${getNodeId(d.source)}-${getNodeId(d.target)}`);

    const linkEnter = linkElements.enter().append('line')
      .attr('class', 'link')
      .attr('id', (d: Link) => `link-${getNodeId(d.source)}-${getNodeId(d.target)}`)
      .style('stroke', '#94A3B8') // Tailwind gray-400
      .style('stroke-width', 1)
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
      .call(drag(simulation, userInteractedRef) as any)
      .on('mouseover', function(_event, d: Node) {
        // Show label on hover immediately (no animation delay)
        const nodeId = d.id;

        // First update the label position to ensure it's correctly positioned
        // This is crucial for fixing the misalignment issue
        const node = d3.select(this);
        const nodeData = node.datum() as Node;
        const nodeX = nodeData.x || 0;
        const nodeY = nodeData.y || 0;
        const nodeRadius = nodeData.relevance * 20;

        // Find and update the label for this node
        const labelSelection = d3.selectAll<SVGGElement, Node>('.node-label')
          .filter(function(labelData: Node) { // Ensure d is not null and has an id
            return labelData && labelData.id === nodeId;
          });

        if (!labelSelection.empty()) {
          // Update the label position to ensure it's correctly aligned with the node
          labelSelection.attr('transform', `translate(${nodeX + nodeRadius + 5}, ${nodeY})`);

          // Update text content and background rectangle size
          const textElement = labelSelection.select<SVGTextElement>('text');
          const rectElement = labelSelection.select<SVGRectElement>('rect');

          if (!textElement.empty() && nodeData) {
            textElement.text(nodeData.name || nodeData.id); // Use name, fallback to id
            const textBBox = textElement.node()!.getBBox();
            const textWidth = textBBox.width;
            const textHeight = textBBox.height;

            if (!rectElement.empty()) {
              rectElement
                .attr('x', textBBox.x - 8) // Increased horizontal padding
                .attr('y', textBBox.y - 4) // Increased vertical padding
                .attr('width', textWidth + 16) // Increased horizontal padding (8px each side)
                .attr('height', textHeight + 8); // Increased vertical padding (4px each side)
            }
          }

          // Make the label visible immediately
          labelSelection
            .style('opacity', 1)
            .style('visibility', 'visible');
        }
      })
      .on('mouseout', function(_event, d: Node) {
        // Hide label when not hovering - immediate transition
        const nodeId = d.id;
        d3.selectAll('.node-label')
          .filter(function(d: any) {
            return d.id === nodeId;
          })
          .style('opacity', 0)
          .style('visibility', 'hidden');

        // Reset node highlight
        d3.select(this).select('circle')
          .style('stroke-width', d.cluster ? 2 : 1.5)
          .style('filter', 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))');
      })
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

          const radius = node.relevance * 20; // Node radius

          const angleStep = 45;
          for (let angle = 0; angle < 360; angle += angleStep) {
            const radians = (angle * Math.PI) / 180;
            const x = node.x + (radius + 10) * Math.cos(radians);
            const y = node.y + (radius + 10) * Math.sin(radians);
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

        // Add main background pill with enhanced styling
        labelGroup.append('rect')
          .attr('rx', 12)
          .attr('ry', 12)
          .attr('x', -totalWidth/2)
          .attr('y', -15)
          .attr('width', totalWidth)
          .attr('height', cluster.secondaryFeature ? 50 : 30)
          .style('fill', d3.rgb(cluster.color).copy({opacity: 0.35}).toString()) // More opaque
          .style('stroke', d3.rgb(cluster.color).darker(0.3).toString())
          .style('stroke-width', 2) // Thicker border
          .style('filter', 'drop-shadow(0px 3px 5px rgba(0,0,0,0.2))'); // Enhanced shadow

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

        // Add main category text with enhanced styling for more prominence
        labelGroup.append('text')
          .text(cluster.category)
          .attr('text-anchor', 'middle')
          .attr('y', 0)
          .style('font-size', '15px') // Larger font
          .style('font-family', "'Inter', sans-serif")
          .style('font-weight', '700') // Bolder
          .style('letter-spacing', '0.5px') // More spacing
          .style('fill', d3.rgb(cluster.color).darker(1.5).toString())
          .style('pointer-events', 'none')
          .style('text-shadow', '0px 1px 3px rgba(255,255,255,0.9)'); // Enhanced text shadow

        // Add secondary feature text if available - with enhanced styling
        if (cluster.secondaryFeature && cluster.secondaryFeature.length > 0) {
          labelGroup.append('text')
            .text(cluster.secondaryFeature)
            .attr('text-anchor', 'middle')
            .attr('y', 22)
            .style('font-size', '12px') // Slightly larger
            .style('font-family', "'Inter', sans-serif")
            .style('font-weight', '500') // Bolder
            .style('font-style', 'italic')
            .style('fill', d3.rgb(cluster.color).darker(1).toString())
            .style('pointer-events', 'none')
            .style('text-shadow', '0px 1px 2px rgba(255,255,255,0.7)'); // Added text shadow
        }

      });
    };

    const drawNodeLabels = () => {
      const baseSelection = d3.select(containerRef.current!);

      let labelGroup = baseSelection.select<SVGGElement>('g.node-labels'); 
      if (labelGroup.empty()) {
        labelGroup = baseSelection.append<SVGGElement>('g') 
          .attr('class', 'node-labels')
          .style('pointer-events', 'none');
      }

      const labels: d3.Selection<SVGGElement, Node, SVGGElement, unknown> = 
        labelGroup.selectAll<SVGGElement, Node>('g.node-label')
        .data(nodesRef.current, (d: Node) => d.id);

      labels.exit().remove();

      const labelsEnter: d3.Selection<SVGGElement, Node, SVGGElement, Node> = 
        labels.enter()
        .append<SVGGElement>('g')
        .attr('class', 'node-label') 
        .datum((d: Node) => d) 
        .style('opacity', 0) 
        .style('visibility', 'hidden') 
        .style('transition', 'opacity 0.15s ease') 
        .attr('transform', (d: any) => {
          const x = typeof d.x === 'number' ? d.x : 0;
          const y = typeof d.y === 'number' ? d.y : 0;
          const relevance = typeof d.relevance === 'number' ? d.relevance : 1;
          const nodeRadius = relevance * 20;
          return `translate(${x + nodeRadius + 5}, ${y})`;
        });

      labelsEnter.append<SVGGElement>('rect')
        .attr('class', 'node-label-bg')
        .attr('rx', 12)
        .attr('ry', 12)
        .style('fill', '#F0FDF4') // Light green background
        .style('stroke', '#15803D') // Darker green border
        .style('stroke-width', 1.5)
        .style('filter', 'drop-shadow(0px 4px 8px rgba(0,0,0,0.25)')
        // Dynamically size based on future text content
        .each(function(d: Node) {
          const rect = d3.select(this);
          // Temporarily append text to parent group to measure, then size rect, then remove temp text
          const parentGroup = d3.select(this.parentNode as SVGGElement);
          const tempText = parentGroup.append('text')
            .style('font-size', '20px') 
            .style('font-family', "'Inter', sans-serif")
            .style('font-weight', '700')
            .text(d.name || d.id);
          const textBBox = tempText.node()!.getBBox();
          tempText.remove();

          rect.attr('x', textBBox.x - 8)
              .attr('y', textBBox.y - 4)
              .attr('width', textBBox.width + 16)
              .attr('height', textBBox.height + 8);
        });

      labelsEnter.append<SVGGElement>('text')
        .attr('x', 0)
        .attr('y', 0) 
        .style('font-size', '20px') 
        .style('font-family', "'Inter', sans-serif")
        .style('font-weight', '700') 
        .style('fill', '#1a202c') 
        .style('dominant-baseline', 'middle') 
        .style('text-anchor', 'start') 
        .style('pointer-events', 'none');

      const labelsUpdate: d3.Selection<SVGGElement, Node, SVGGElement, unknown> = 
        labelsEnter.merge(labels);

      labelsUpdate.each(function(this: SVGGElement, dNode: Node) { 
        if (dNode.x === undefined || dNode.y === undefined) return; 

        const nodeRadius = dNode.relevance * 20; 
        const labelX = dNode.x + nodeRadius + 5; 
        const labelY = dNode.y;

        const currentLabel = d3.select(this);
        currentLabel.attr('transform', `translate(${labelX}, ${labelY})`);

        currentLabel.select<SVGTextElement>('text').text(dNode.name || dNode.id);
        
        const textElement = currentLabel.select<SVGTextElement>('text');
        const rectElement = currentLabel.select<SVGRectElement>('rect.node-label-bg');

        if (!textElement.empty() && !rectElement.empty()) {
          const textBBox = textElement.node()!.getBBox();
          rectElement
            .attr('x', textBBox.x - 8)
            .attr('y', textBBox.y - 4)
            .attr('width', textBBox.width + 16)
            .attr('height', textBBox.height + 8)
            .style('stroke', dNode.cluster ? d3.rgb(colorPalette.darkGreen).toString() : '#15803D'); // Use consistent border color
        }
      });
    };

    const calculateNodesBounds = () => {
      const currentNodes = nodesRef.current;
      if (currentNodes.length === 0) return null;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      currentNodes.forEach(node => {
        if (node.x === undefined || node.y === undefined) return;

        const radius = node.relevance * 20; // Node radius - consider making this consistent with actual render

        minX = Math.min(minX, node.x - radius);
        minY = Math.min(minY, node.y - radius);
        maxX = Math.max(maxX, node.x + radius);
        maxY = Math.max(maxY, node.y + radius);
      });

      return { minX, minY, maxX, maxY };
    };

    const fitNodesToViewport = () => {
      if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;

      const bounds = calculateNodesBounds();
      if (!bounds) return;

      const { minX, minY, maxX, maxY } = bounds;
      const svgWidth = svgRef.current.clientWidth;
      const svgHeight = svgRef.current.clientHeight;

      const padding = 80; // Increased padding
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      if (contentWidth <= 0 || contentHeight <= 0) return; // Avoid division by zero or negative

      const scale = Math.min(
        svgWidth / (contentWidth + padding * 2),
        svgHeight / (contentHeight + padding * 2),
        2 // Cap initial zoom-in to 2x to prevent extreme zoom on small graphs
      );

      const translateX = svgWidth / 2 - (minX + contentWidth / 2) * scale;
      const translateY = svgHeight / 2 - (minY + contentHeight / 2) * scale;

      const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

      const svgSelection = d3.select(svgRef.current);
      svgSelection.transition().duration(750).call(zoomBehaviorRef.current.transform, transform);

      initialZoomScaleRef.current = scale;
      isAtInitialZoomRef.current = true;
      userInteractedRef.current = false; // Reset user interaction
      zoomTransformRef.current = transform; // Store this transform
    };

    // Fit nodes to viewport ONLY on initial load AFTER simulation settles a bit
    simulation.on('end.fit', () => { // Added .fit namespace for the event
      if (!hasInitialFitRef.current) {
        setTimeout(() => { // Give it a moment for positions to finalize
          fitNodesToViewport();
          hasInitialFitRef.current = true;
        }, 150); // Increased timeout slightly
      }
    });

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

    // Handle window resize - only adjust the view, don't re-zoom
    const handleResize = () => {
      // Fit nodes to viewport on resize
      if (svgRef.current && containerRef.current) {
        fitNodesToViewport();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      simulation.stop();
      simulation.on('end.fit', null); // Clean up namespaced event listener
      window.removeEventListener('resize', handleResize);
    };

  }, [toolsData, width, height]);

  return (
    <>
      <svg ref={svgRef} width={width} height={height} />
      {relationshipInfo && (
        <ClickAwayListener onClickAway={() => setRelationshipInfo(null)}>
          <Paper
            ref={popupRef}
            elevation={3}
            sx={{
              position: 'fixed',
              left: '0px',
              top: '0px',
              width: '320px', // Smaller size as requested
              borderRadius: '12px',
              overflow: 'hidden',
              zIndex: 1300,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              transition: 'opacity 0.2s, transform 0.2s',
              opacity: 0, // Initial opacity, will be animated in useEffect
              transform: 'scale(0.95)', // Initial transform, will be animated in useEffect
              border: '4px solid rgba(0, 128, 96, 0.5)', // Very prominent green border
              bgcolor: 'rgba(255, 255, 255, 0.98)', // Slightly transparent white background
            }}
          >
            {/* Tool Title */}
            <Box sx={{ p: 2, pb: 1.5 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
                {relationshipInfo.name}
              </Typography>
              
              {/* Description */}
              {relationshipInfo.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.875rem' }}>
                  {relationshipInfo.description}
                </Typography>
              )}
              
              {/* Primary Function */}
              {relationshipInfo.primaryFunction && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ 
                    display: 'block', 
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    mb: 0.5,
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em'
                  }}>
                    PRIMARY FUNCTION
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main', 
                        mr: 1 
                      }} 
                    />
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {relationshipInfo.primaryFunction}
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Data Sources as Chips */}
              {relationshipInfo.dataSources && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ 
                    display: 'block', 
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    mb: 0.75,
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em'
                  }}>
                    DATA SOURCES
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {relationshipInfo.dataSources.split(';').map((source, index) => (
                      <Chip
                        key={index}
                        label={source.trim()}
                        size="small"
                        sx={{
                          bgcolor: '#EBF2FA', // Light blue background
                          color: '#4285F4', // Blue text
                          fontSize: '0.75rem',
                          height: '22px',
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              {/* Links To */}
              {(() => {
                // Get outgoing connections
                const outgoingLinks = relationshipInfo.connections.filter(
                  conn => conn.type === 'outgoing' || conn.type === 'both'
                );
                
                if (outgoingLinks.length === 0) return null;
                
                // Show just a few links plus a count for others
                const displayLimit = 1;
                const linksToShow = outgoingLinks.slice(0, displayLimit);
                const remainingCount = outgoingLinks.length - displayLimit;
                
                return (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ 
                      display: 'block', 
                      textTransform: 'uppercase',
                      fontWeight: 500,
                      mb: 0.75,
                      fontSize: '0.7rem',
                      letterSpacing: '0.05em'
                    }}>
                      LINKS TO
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                      {linksToShow.map(link => (
                        <Chip
                          key={link.id}
                          label={link.name}
                          size="small"
                          sx={{
                            bgcolor: '#E8F5E9', // Light green background
                            color: '#0F9D58', // Green text
                            fontSize: '0.75rem',
                            height: '22px',
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                      ))}
                      {remainingCount > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          +{remainingCount} more
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })()}
            </Box>
          </Paper>
        </ClickAwayListener>
      )}
    </>
  );
};

const drag = (simulation: d3.Simulation<Node, undefined>, userHasInteracted: React.MutableRefObject<boolean>) => {
  function dragstarted(event: any) {
    if (event.sourceEvent.type === 'mousedown') {
      event.sourceEvent.stopPropagation();
    }
    
    // Mark that user has interacted with a node (dragging counts as interaction)
    userHasInteracted.current = true;

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