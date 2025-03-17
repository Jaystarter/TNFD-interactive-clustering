import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Tool, tools, categories } from '../data/tools';

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
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

export const ForceGraph = ({ width, height, toolsData }: ForceGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Create nodes and links data
    const toolsToUse = toolsData || tools;
    
    const nodes: Node[] = toolsToUse.map(tool => ({
      id: tool.id,
      name: tool.name,
      category: tool.category,
      relevance: tool.relevance,
    }));

    const links: Link[] = toolsToUse.flatMap(tool =>
      tool.connections.map(target => ({
        source: tool.id,
        target,
      }))
    );

    // Create SVG container
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create enhanced force simulation with better parameters
    const simulation = d3
      .forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-250).distanceMax(300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'link',
        d3.forceLink(links).id((d: any) => d.id).distance(120).strength(0.7)
      )
      .force('collision', d3.forceCollide().radius(d => (d as Node).relevance * 25))
      .alphaDecay(0.01); // Slower decay for smoother animation

    // Create links
    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .style('stroke', '#cbd5e0')
      .style('stroke-opacity', 0.5)
      .style('stroke-width', 1.5)
      .style('stroke-dasharray', '4,4')
      .style('transition', 'all 0.3s ease');

    // Create nodes
    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(drag(simulation));

    // Create radial gradients for nodes
    const defs = svg.append('defs');
    
    // Create a gradient for each category
    categories.forEach(category => {
      const gradient = defs.append('radialGradient')
        .attr('id', `gradient-${category.name.toLowerCase().replace(/\s+/g, '-')}`)
        .attr('cx', '30%')
        .attr('cy', '30%')
        .attr('r', '70%');
        
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.rgb(category.color).brighter(0.5));
        
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', category.color);
    });
    
    // Add circles to nodes with enhanced styling
    node
      .append('circle')
      .attr('r', d => d.relevance * 20)
      .style('fill', d => {
        const category = categories.find(c => c.name === d.category);
        return category ? `url(#gradient-${category.name.toLowerCase().replace(/\s+/g, '-')})` : '#999';
      })
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .style('filter', 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))')
      .style('transition', 'all 0.3s ease');

    // Add labels to nodes with improved styling
    node
      .append('text')
      .text(d => d.name)
      .attr('x', 0)
      .attr('y', d => -d.relevance * 20 - 8)
      .attr('text-anchor', 'middle')
      .style('fill', '#2d3748')
      .style('font-size', d => `${10 + d.relevance * 4}px`)
      .style('font-weight', '600')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(255, 255, 255, 0.8), 0 1px 5px rgba(255, 255, 255, 0.6)')
      .style('transition', 'all 0.3s ease');

    // Add enhanced hover effects with smooth transitions
    node
      .on('mouseover', function(event, d) {
        const relatedLinks = links.filter(
          l => l.source === d.id || l.target === d.id
        );
        const relatedNodeIds = new Set(
          relatedLinks.flatMap(l => [l.source, l.target])
        );

        // Apply subtle highlighting to nodes (less dramatic fading)
        node.transition().duration(300)
          .style('opacity', n => relatedNodeIds.has(n.id) || n.id === d.id ? 1 : 0.7)
          .select('circle')
          .style('stroke-width', n => n.id === d.id ? 3 : 2);

        // Apply subtle highlighting to links (less dramatic fading)
        link.transition().duration(300)
          .style('opacity', l => l.source === d.id || l.target === d.id ? 0.8 : 0.4)
          .style('stroke-width', l => l.source === d.id || l.target === d.id ? 2 : 1.5);

        // Highlight the current node
        d3.select(this).select('circle')
          .transition().duration(300)
          .style('stroke', '#3182ce')
          .style('filter', 'drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.3))')
          .attr('r', d => d.relevance * 22); // Slightly increase size

        // Enhance the text
        d3.select(this).select('text')
          .transition().duration(300)
          .style('font-weight', '700')
          .style('font-size', d => `${12 + d.relevance * 5}px`);
      })
      .on('mouseout', function() {
        // Restore all nodes and links
        node.transition().duration(300)
          .style('opacity', 1)
          .select('circle')
          .style('stroke', '#fff')
          .style('stroke-width', 2)
          .style('filter', 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))')
          .attr('r', d => d.relevance * 20);

        // Restore links
        link.transition().duration(300)
          .style('opacity', 0.5)
          .style('stroke-width', 1.5);

        // Restore text
        d3.select(this).select('text')
          .transition().duration(300)
          .style('font-weight', '600')
          .style('font-size', d => `${10 + d.relevance * 4}px`);
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [width, height, toolsData]);

  return <svg ref={svgRef} />;
};

// Drag behavior
const drag = (simulation: d3.Simulation<Node, undefined>) => {
  function dragstarted(event: any) {
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