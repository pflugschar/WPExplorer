import { useMemo, useState } from 'react';
import type { RouteTreeNode } from '@/api/routes';
import { useSite } from '../SiteContext';

export type SidebarView =
  | { kind: 'overview' }
  | { kind: 'route'; node: RouteTreeNode }
  | { kind: 'search' }
  | { kind: 'export' }
  | { kind: 'devtools' };

export interface SidebarProps {
  active: SidebarView;
  onSelect: (view: SidebarView) => void;
}

function countLeaves(node: RouteTreeNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function countLeavesAll(nodes: RouteTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + countLeaves(node), 0);
}

/** Keeps a node whose label matches (with all its children intact), or whose descendants contain a match. */
function filterNode(node: RouteTreeNode, query: string): RouteTreeNode | null {
  if (node.label.toLowerCase().includes(query)) return node;
  if (!node.children) return null;
  const children = node.children.map((child) => filterNode(child, query)).filter((child): child is RouteTreeNode => child !== null);
  if (children.length === 0) return null;
  return { ...node, children };
}

function filterNodes(nodes: RouteTreeNode[], query: string): RouteTreeNode[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return nodes;
  return nodes.map((node) => filterNode(node, trimmed)).filter((node): node is RouteTreeNode => node !== null);
}

function NodeButton({ node, active, onSelect }: { node: RouteTreeNode; active: SidebarView; onSelect: (v: SidebarView) => void }) {
  const isActive = active.kind === 'route' && active.node.id === node.id;
  return (
    <button className={`sidebar-item${isActive ? ' active' : ''}`} onClick={() => onSelect({ kind: 'route', node })}>
      {node.label}
    </button>
  );
}

/** Whether this node or any node nested beneath it is the active route, used to auto-expand it. */
function nodeContainsActive(node: RouteTreeNode, active: SidebarView): boolean {
  if (active.kind !== 'route') return false;
  if (node.id === active.node.id) return true;
  return node.children?.some((child) => nodeContainsActive(child, active)) ?? false;
}

function NodeGroup({ node, active, onSelect, forceOpen }: { node: RouteTreeNode; active: SidebarView; onSelect: (v: SidebarView) => void; forceOpen: boolean }) {
  const children = node.children ?? [];
  const isActive = active.kind === 'route' && active.node.id === node.id;
  const defaultOpen = forceOpen || nodeContainsActive(node, active);
  return (
    // key forces a remount (resetting the uncontrolled open state) only when active route enters/leaves this group
    <details className="sidebar-namespace" open={defaultOpen} key={`${node.id}-${defaultOpen}`}>
      <summary className={isActive ? 'active' : undefined} onClick={node.route ? (e) => { e.preventDefault(); onSelect({ kind: 'route', node }); } : undefined}>
        <span>{node.label}</span>
        <span className="sidebar-count">{countLeaves(node)}</span>
      </summary>
      {children.map((child) =>
        child.children ? (
          <NodeGroup key={child.id} node={child} active={active} onSelect={onSelect} forceOpen={forceOpen} />
        ) : (
          <NodeButton key={child.id} node={child} active={active} onSelect={onSelect} />
        ),
      )}
    </details>
  );
}

function nodesContainActive(nodes: RouteTreeNode[], active: SidebarView): boolean {
  return nodes.some((node) => nodeContainsActive(node, active));
}

function Section({
  title,
  nodes,
  active,
  onSelect,
  forceOpen,
}: {
  title: string;
  nodes: RouteTreeNode[];
  active: SidebarView;
  onSelect: (v: SidebarView) => void;
  forceOpen: boolean;
}) {
  if (nodes.length === 0) return null;
  const defaultOpen = forceOpen || nodesContainActive(nodes, active);
  return (
    <details className="sidebar-section" open={defaultOpen} key={`${title}-${defaultOpen}`}>
      <summary>
        <span>{title}</span>
        <span className="sidebar-count">{countLeavesAll(nodes)}</span>
      </summary>
      <div className="sidebar-section-body">
        {nodes.map((node) =>
          node.children ? (
            <NodeGroup key={node.id} node={node} active={active} onSelect={onSelect} forceOpen={forceOpen} />
          ) : (
            <NodeButton key={node.id} node={node} active={active} onSelect={onSelect} />
          ),
        )}
      </div>
    </details>
  );
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  const { routeTree, origin } = useSite();
  const [filter, setFilter] = useState('');
  const isFiltering = filter.trim().length > 0;

  const core = useMemo(() => filterNodes(routeTree.core, filter), [routeTree.core, filter]);
  const woocommerce = useMemo(() => filterNodes(routeTree.woocommerce, filter), [routeTree.woocommerce, filter]);
  const customPostTypes = useMemo(() => filterNodes(routeTree.customPostTypes, filter), [routeTree.customPostTypes, filter]);
  const apiExplorer = useMemo(() => filterNodes(routeTree.apiExplorer, filter), [routeTree.apiExplorer, filter]);
  const noResults = isFiltering && core.length === 0 && woocommerce.length === 0 && customPostTypes.length === 0 && apiExplorer.length === 0;

  return (
    <nav className="sidebar">
      <div className="sidebar-site">{origin.replace(/^https?:\/\//, '')}</div>
      <button className={`sidebar-item${active.kind === 'overview' ? ' active' : ''}`} onClick={() => onSelect({ kind: 'overview' })}>
        Overview
      </button>
      <button className={`sidebar-item${active.kind === 'search' ? ' active' : ''}`} onClick={() => onSelect({ kind: 'search' })}>
        Global Search
      </button>

      <input
        className="sidebar-filter"
        type="search"
        placeholder="Filter routes…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {noResults && <div className="sidebar-empty">No routes match &quot;{filter.trim()}&quot;</div>}

      <Section title="WordPress Core" nodes={core} active={active} onSelect={onSelect} forceOpen={isFiltering} />
      <Section title="WooCommerce" nodes={woocommerce} active={active} onSelect={onSelect} forceOpen={isFiltering} />
      <Section title="Custom Post Types" nodes={customPostTypes} active={active} onSelect={onSelect} forceOpen={isFiltering} />
      <Section title="API Explorer" nodes={apiExplorer} active={active} onSelect={onSelect} forceOpen={isFiltering} />

      <div className="sidebar-footer">
        <button className={`sidebar-item${active.kind === 'export' ? ' active' : ''}`} onClick={() => onSelect({ kind: 'export' })}>
          Export Site Content
        </button>
        <button className={`sidebar-item${active.kind === 'devtools' ? ' active' : ''}`} onClick={() => onSelect({ kind: 'devtools' })}>
          Developer Tools
        </button>
      </div>
    </nav>
  );
}

