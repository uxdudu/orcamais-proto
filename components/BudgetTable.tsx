
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MoreVertical, 
  GripVertical, 
  Folder, 
  ChevronDown, 
  ChevronRight,
  Trash2,
  Check,
  X,
  Database,
  LayoutList,
  Map as MapIcon,
  Maximize2,
  Network,
  FolderPlus,
  FilePlus,
  CornerDownRight,
  Info,
  AlignJustify,
  Rows,
  LayoutGrid,
  RefreshCw,
  Package,
  Save,
  PlusCircle,
  Plus,
  BookMarked,
  Globe,
  AlertCircle,
  Copy
} from 'lucide-react';
import { BudgetItem, DatabaseItem, ItemType, SavedBlock } from '../types';
import { MOCK_SEARCH_RESULTS, INITIAL_PROJECT_DATE } from '../constants';
import { searchConstructionItems } from '../services/geminiService';
import VersionConflictModal from './VersionConflictModal';
import ItemDetailsPanel from './ItemDetailsPanel';
import BlockLibraryModal from './BlockLibraryModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

// --- TREE MANIPULATION HELPERS ---

interface TreeNode {
  item: BudgetItem;
  children: TreeNode[];
}

// Converts flat list to tree based on 'level' string hierarchy
const buildTree = (items: BudgetItem[]): TreeNode[] => {
  // Sort by level to ensure parents come before children
  const sorted = [...items].sort((a, b) => {
    const aParts = a.level.split('.').map(Number);
    const bParts = b.level.split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
       if ((aParts[i] || 0) !== (bParts[i] || 0)) return (aParts[i] || 0) - (bParts[i] || 0);
    }
    return 0;
  });

  const rootNodes: TreeNode[] = [];
  const levelMap = new Map<string, TreeNode>();

  sorted.forEach(item => {
    const node: TreeNode = { item: { ...item }, children: [] };
    levelMap.set(item.level, node);

    const parts = item.level.split('.');
    if (parts.length === 1) {
      rootNodes.push(node);
    } else {
      // Find parent
      const parentLevel = parts.slice(0, -1).join('.');
      const parent = levelMap.get(parentLevel);
      if (parent) {
        parent.children.push(node);
      } else {
        // Fallback for orphaned items: treat as root
        rootNodes.push(node);
      }
    }
  });

  return rootNodes;
};

// Flattens tree back to list and recalculates 'level' strings
const flattenTree = (nodes: TreeNode[], parentLevel: string = ''): BudgetItem[] => {
  let result: BudgetItem[] = [];
  
  nodes.forEach((node, index) => {
    const currentLevel = parentLevel ? `${parentLevel}.${index + 1}` : `${index + 1}`;
    
    // Update the item's level
    const newItem = { ...node.item, level: currentLevel };
    result.push(newItem);

    if (node.children.length > 0) {
      result = result.concat(flattenTree(node.children, currentLevel));
    }
  });

  return result;
};

// Find a node and remove it from the tree
const removeNodeFromTree = (nodes: TreeNode[], id: string): { node: TreeNode | null, cleanedNodes: TreeNode[] } => {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].item.id === id) {
      const node = nodes[i];
      const cleanedNodes = [...nodes];
      cleanedNodes.splice(i, 1);
      return { node, cleanedNodes };
    }
    
    if (nodes[i].children.length > 0) {
      const { node, cleanedNodes: cleanedChildren } = removeNodeFromTree(nodes[i].children, id);
      if (node) {
        const newNodes = [...nodes];
        newNodes[i] = { ...newNodes[i], children: cleanedChildren };
        return { node, cleanedNodes: newNodes };
      }
    }
  }
  return { node: null, cleanedNodes: nodes };
};

// Insert a node into the tree
const insertNodeInTree = (
    rootNodes: TreeNode[], 
    nodeToInsert: TreeNode, 
    targetId: string, 
    mode: 'INSIDE' | 'AFTER' | 'BEFORE'
): TreeNode[] => {
  // Helper to recursively find target and insert
  const traverse = (nodes: TreeNode[]): TreeNode[] => {
    const newNodes: TreeNode[] = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const currentNode = nodes[i];
      
      if (currentNode.item.id === targetId) {
        if (mode === 'INSIDE') {
          // Add to children
          newNodes.push({
             ...currentNode,
             children: [...currentNode.children, nodeToInsert]
          });
        } else if (mode === 'BEFORE') {
          // Add as sibling before
          newNodes.push(nodeToInsert);
          newNodes.push(currentNode);
        } else {
          // Add as sibling after (Default)
          newNodes.push(currentNode);
          newNodes.push(nodeToInsert);
        }
      } else {
        // Continue searching deeper
        newNodes.push({
           ...currentNode,
           children: traverse(currentNode.children)
        });
      }
    }
    return newNodes;
  };

  return traverse(rootNodes);
};

// Helper to sort items by level "1", "1.1", "1.2", "1.10", "2"
const sortItems = (items: BudgetItem[]) => {
  return [...items].sort((a, b) => {
    const aParts = a.level.split('.').map(Number);
    const bParts = b.level.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const partA = aParts[i] || 0;
      const partB = bParts[i] || 0;
      if (partA !== partB) return partA - partB;
    }
    return 0;
  });
};

type PendingActionType = 'ADD_ROOT_STAGE' | 'ADD_SIBLING_STAGE' | 'ADD_CHILD_STAGE' | 'ADD_CHILD_ITEM' | 'ADD_SIBLING_ITEM' | 'REPLACE_ITEM' | null;
type DensityType = 'compact' | 'normal' | 'comfortable';
type DropPosition = 'before' | 'inside' | 'after' | null;

interface PendingAction {
  targetId: string | null; // The ID of the item we clicked on (null if root)
  type: PendingActionType;
  suggestedLevel: string;
}

interface DeleteState {
  isOpen: boolean;
  item: BudgetItem | null;
  childCount: number;
}

interface BudgetTableProps {
  onAddToUserDb: (newItem: DatabaseItem) => void;
}

const BudgetTable: React.FC<BudgetTableProps> = ({ onAddToUserDb }) => {
  // --- State ---
  const [items, setItems] = useState<BudgetItem[]>([
    { id: '1', level: '1', description: 'SERVIÇOS PRELIMINARES', type: ItemType.SYNTHETIC, value: 16330 },
    { id: '1-1', level: '1.1', description: 'Instalação de Canteiro', type: ItemType.SYNTHETIC, value: 4450 },
    { 
      id: '1-1-1', 
      level: '1.1.1', 
      description: 'Mobilização e desmobilização de obra', 
      type: ItemType.ANALYTIC, 
      value: 4200, 
      quantity: 1,
      unit: 'gl',
      unitPrice: 4200,
      databaseItem: { ...MOCK_SEARCH_RESULTS[0], code: '89237', type: 'COMPOSICAO' } 
    },
     { 
      id: '1-1-2', 
      level: '1.1.2', 
      description: 'Placa de Identificação da Obra', 
      type: ItemType.ANALYTIC, 
      value: 250, 
      quantity: 1,
      unit: 'un',
      unitPrice: 250,
      databaseItem: { ...MOCK_SEARCH_RESULTS[1], code: '7350' } 
    },
     { id: '1-2', level: '1.2', description: 'Proteção do Entorno', type: ItemType.SYNTHETIC, value: 11880 },
     { id: '2', level: '2', description: 'TERRAPLANAGEM', type: ItemType.SYNTHETIC, value: 13005 },
  ]);

  // View State
  const [density, setDensity] = useState<DensityType>('normal');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [activeToolbarMenu, setActiveToolbarMenu] = useState<'density' | 'tree' | null>(null);

  // Selection State
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null); 
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);

  // Action State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [insertTargetId, setInsertTargetId] = useState<string | null>(null); // For Block Insert
  
  // Delete State
  const [deleteState, setDeleteState] = useState<DeleteState>({ isOpen: false, item: null, childCount: 0 });

  // Input values
  const [inputText, setInputText] = useState(''); // For Stages
  const [searchQuery, setSearchQuery] = useState(''); // For Items
  const [searchResults, setSearchResults] = useState<DatabaseItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Conflict Modal State
  const [conflictItem, setConflictItem] = useState<DatabaseItem | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Block Library State
  const [savedBlocks, setSavedBlocks] = useState<SavedBlock[]>([
    { id: 'b1', name: 'Kit Canteiro Padrão', createdAt: new Date().toISOString(), itemCount: 2, items: [], isGlobal: false }
  ]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSaveBlockModalOpen, setIsSaveBlockModalOpen] = useState(false);
  const [blockNameInput, setBlockNameInput] = useState('');
  const [isGlobalBlock, setIsGlobalBlock] = useState(false);
  const [tempBlockItems, setTempBlockItems] = useState<BudgetItem[] | null>(null);
  const [overwriteConflictId, setOverwriteConflictId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const toolbarMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (toolbarMenuRef.current && !toolbarMenuRef.current.contains(event.target as Node)) {
        setActiveToolbarMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear highlight after animation duration
  useEffect(() => {
    if (highlightedItemId) {
      const timer = setTimeout(() => {
        setHighlightedItemId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedItemId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search Effect
  useEffect(() => {
    const performSearch = async () => {
      if (!pendingAction || (pendingAction.type !== 'ADD_CHILD_ITEM' && pendingAction.type !== 'REPLACE_ITEM' && pendingAction.type !== 'ADD_SIBLING_ITEM')) return;
      
      if (!debouncedQuery || debouncedQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const localMatches = MOCK_SEARCH_RESULTS.filter(i => 
        i.description.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        i.code.includes(debouncedQuery)
      );

      try {
        const aiMatches = await searchConstructionItems(debouncedQuery);
        setSearchResults([...localMatches, ...aiMatches]);
      } catch (e) {
        setSearchResults(localMatches);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery, pendingAction]);

  // --- Logic: Tree & Density ---

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        return next;
    });
  };

  const expandAll = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setCollapsedIds(new Set());
      setActiveToolbarMenu(null);
  };

  const collapseAll = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const syntheticIds = items
        .filter(i => i.type === ItemType.SYNTHETIC)
        .map(i => i.id);
      setCollapsedIds(new Set(syntheticIds));
      setActiveToolbarMenu(null);
  };

  const isItemVisible = (item: BudgetItem): boolean => {
      if (!item.level.includes('.')) return true; 

      const parts = item.level.split('.');
      let currentLevel = parts[0];
      for (let i = 0; i < parts.length - 1; i++) {
          if (i > 0) currentLevel += '.' + parts[i];
          const ancestor = items.find(it => it.level === currentLevel);
          if (ancestor && collapsedIds.has(ancestor.id)) {
              return false;
          }
      }
      return true;
  };

  const getDensityClasses = () => {
      switch(density) {
          case 'compact': return 'py-1 text-xs';
          case 'comfortable': return 'py-4 text-base';
          case 'normal': default: return 'py-2.5 text-sm';
      }
  };

  // --- Logic: Drag and Drop (Enhanced) ---

  const handleDragStart = (e: React.DragEvent, item: BudgetItem) => {
      setDraggedItemId(item.id);
      e.dataTransfer.effectAllowed = 'move';
      // Create a clean ghost image if needed, or rely on browser default
  };

  const handleDragOver = (e: React.DragEvent, targetItem: BudgetItem) => {
      e.preventDefault(); 
      if (!draggedItemId || draggedItemId === targetItem.id) return;

      // Prevent dropping a parent into its own child
      const dragged = items.find(i => i.id === draggedItemId);
      if (dragged && targetItem.level.startsWith(dragged.level + '.')) {
          setDragOverId(null);
          setDropPosition(null);
          return;
      }

      setDragOverId(targetItem.id);

      // Geometry calculation for precise drop position
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      // Logic:
      // If Synthetic (Folder):
      // - Top 25%: Insert Before
      // - Middle 50%: Insert Inside
      // - Bottom 25%: Insert After
      // If Analytic (Item):
      // - Top 50%: Insert Before
      // - Bottom 50%: Insert After

      if (targetItem.type === ItemType.SYNTHETIC) {
          if (y < height * 0.25) {
              setDropPosition('before');
          } else if (y > height * 0.75) {
              setDropPosition('after');
          } else {
              setDropPosition('inside');
          }
      } else {
          if (y < height * 0.5) {
              setDropPosition('before');
          } else {
              setDropPosition('after');
          }
      }
  };

  const handleDragLeave = () => {
    // We intentionally don't clear immediately to avoid flickering, 
    // unless we actually left the valid drop zones. 
    // Usually handled by the next DragOver or Drop.
    // However, if we leave the table area, we might want to clear.
  };

  const handleDrop = (e: React.DragEvent, targetItem: BudgetItem) => {
      e.preventDefault();
      
      if (!draggedItemId || draggedItemId === targetItem.id) {
        setDragOverId(null);
        setDropPosition(null);
        return;
      }

      const draggedItem = items.find(i => i.id === draggedItemId);
      if (!draggedItem) return;

      const tree = buildTree(items);
      const { node: draggedNode, cleanedNodes } = removeNodeFromTree(tree, draggedItemId);
      
      if (!draggedNode) {
          setDraggedItemId(null);
          setDragOverId(null);
          setDropPosition(null);
          return;
      }

      // Determine insertion mode based on dropPosition state
      let mode: 'INSIDE' | 'AFTER' | 'BEFORE' = 'AFTER';
      
      if (dropPosition) {
          mode = dropPosition === 'inside' ? 'INSIDE' : (dropPosition === 'before' ? 'BEFORE' : 'AFTER');
      } else {
          // Fallback if dropPosition failed (shouldn't happen with correct DragOver)
          mode = targetItem.type === ItemType.SYNTHETIC ? 'INSIDE' : 'AFTER';
      }

      // Execute Insertion
      const newTree = insertNodeInTree(cleanedNodes, draggedNode, targetItem.id, mode);
      const newFlatList = flattenTree(newTree);

      setItems(newFlatList);
      setDraggedItemId(null);
      setDragOverId(null);
      setDropPosition(null);

      // If dropped inside, ensure target is expanded
      if (mode === 'INSIDE') {
          setCollapsedIds(prev => {
              const next = new Set(prev);
              next.delete(targetItem.id);
              return next;
          });
      }
  };

  // --- Logic: Level Calculation ---

  const calculateNextLevel = (targetId: string | null, type: PendingActionType): string => {
    if (!items.length) return '1';

    const targetItem = items.find(i => i.id === targetId);
    
    if (type === 'REPLACE_ITEM') {
        return targetItem ? targetItem.level : '';
    }

    if (type === 'ADD_SIBLING_STAGE' || type === 'ADD_SIBLING_ITEM') {
        if (!targetItem) {
             const roots = items.filter(i => !i.level.includes('.'));
             const lastRoot = roots[roots.length - 1];
             return lastRoot ? (parseInt(lastRoot.level) + 1).toString() : '1';
        }
        
        const parentLevel = targetItem.level.includes('.') 
            ? targetItem.level.substring(0, targetItem.level.lastIndexOf('.')) 
            : '';
            
        const siblings = items.filter(i => {
            if (parentLevel === '') return !i.level.includes('.');
            return i.level.startsWith(parentLevel + '.') && i.level.split('.').length === parentLevel.split('.').length + 1;
        });

        const lastSibling = siblings[siblings.length - 1]; 
        const parts = lastSibling.level.split('.');
        parts[parts.length - 1] = (parseInt(parts[parts.length - 1]) + 1).toString();
        return parts.join('.');
    }

    if (type === 'ADD_CHILD_STAGE' || type === 'ADD_CHILD_ITEM') {
        if (!targetItem) return '1'; 

        const parentLevel = targetItem.level;
        const children = items.filter(i => i.level.startsWith(parentLevel + '.') && i.level.split('.').length === parentLevel.split('.').length + 1);
        
        if (children.length === 0) {
            return `${parentLevel}.1`;
        }

        const lastChild = children[children.length - 1];
        const parts = lastChild.level.split('.');
        parts[parts.length - 1] = (parseInt(parts[parts.length - 1]) + 1).toString();
        return parts.join('.');
    }

    return '';
  };

  // --- Logic: Deletion ---

  const initiateDelete = (itemId: string) => {
    setActiveMenuId(null);
    const itemToDelete = items.find(i => i.id === itemId);
    if (!itemToDelete) return;

    // Count children (items starting with "level.")
    const children = items.filter(i => i.level.startsWith(itemToDelete.level + '.'));
    
    setDeleteState({
      isOpen: true,
      item: itemToDelete,
      childCount: children.length
    });
  };

  const confirmDelete = () => {
    if (!deleteState.item) return;

    const targetLevel = deleteState.item.level;
    
    // Remove item and all children
    const remainingItems = items.filter(i => 
      i.id !== deleteState.item!.id && !i.level.startsWith(targetLevel + '.')
    );
    
    // Rebuild tree to fix numbering
    const tree = buildTree(remainingItems);
    const flattened = flattenTree(tree);

    setItems(flattened);
    setDeleteState({ isOpen: false, item: null, childCount: 0 });
    setSelectedItemId(null); // Close details if open
  };

  // --- Logic: Blocks ---
  
  const initiateSaveBlock = (rootItemId: string) => {
    setActiveMenuId(null);
    const rootItem = items.find(i => i.id === rootItemId);
    if (!rootItem) return;

    const descendants = items.filter(i => i.id === rootItemId || i.level.startsWith(rootItem.level + '.'));
    const sortedDescendants = sortItems(descendants);

    const cleanedItems = sortedDescendants.map(item => ({
      ...item,
      value: 0,
      quantity: item.quantity || 1,
      unit: item.unit || 'un',
      unitPrice: 0,
      price: 0,
      databaseItem: item.databaseItem ? { ...item.databaseItem, price: 0 } : undefined
    }));

    setTempBlockItems(cleanedItems);
    setBlockNameInput(rootItem.description);
    setIsGlobalBlock(false);
    setOverwriteConflictId(null);
    setIsSaveBlockModalOpen(true);
  };

  const handleSaveBlockAttempt = () => {
    if (!tempBlockItems || !blockNameInput.trim()) return;

    // Check for name conflict
    const existingBlock = savedBlocks.find(b => b.name.toLowerCase() === blockNameInput.trim().toLowerCase());

    if (existingBlock) {
      setOverwriteConflictId(existingBlock.id);
    } else {
      performSave('NEW');
    }
  };

  const performSave = (mode: 'NEW' | 'OVERWRITE') => {
    if (!tempBlockItems || !blockNameInput.trim()) return;

    if (mode === 'OVERWRITE' && overwriteConflictId) {
       setSavedBlocks(prev => prev.map(b => {
         if (b.id === overwriteConflictId) {
           return {
             ...b,
             items: tempBlockItems,
             itemCount: tempBlockItems.length,
             createdAt: new Date().toISOString(),
             isGlobal: isGlobalBlock
             // originalId keeps the same
           };
         }
         return b;
       }));
    } else {
      // NEW (or Fork)
      const newBlock: SavedBlock = {
        id: Math.random().toString(36).substr(2, 9),
        name: blockNameInput,
        createdAt: new Date().toISOString(),
        itemCount: tempBlockItems.length,
        items: tempBlockItems,
        isGlobal: isGlobalBlock,
        originalId: overwriteConflictId || undefined // Use the conflicting ID as origin if forking
      };
      setSavedBlocks(prev => [newBlock, ...prev]);
    }

    setIsSaveBlockModalOpen(false);
    setTempBlockItems(null);
    setBlockNameInput('');
    setOverwriteConflictId(null);
    setIsGlobalBlock(false);
  };

  const handleDeleteBlock = (id: string) => {
    setSavedBlocks(prev => prev.filter(b => b.id !== id));
  };

  const openLibraryToInsert = (targetId: string) => {
    setInsertTargetId(targetId);
    setIsLibraryOpen(true);
  }

  const handleInsertBlock = (block: SavedBlock) => {
    if (!insertTargetId) return; 
    
    const targetItem = items.find(i => i.id === insertTargetId);
    if (!targetItem) return;

    const tree = buildTree(items);
    
    // We need to regenerate IDs for all block items to avoid conflicts
    const idMap = new Map<string, string>();
    block.items.forEach(bi => idMap.set(bi.id, Math.random().toString(36).substr(2, 9)));

    const newBlockItems = block.items.map(bi => ({
        ...bi,
        id: idMap.get(bi.id)!,
        level: bi.level
    }));

    const blockTreeRoots = buildTree(newBlockItems);
    
    blockTreeRoots.forEach(rootNode => {
       const { cleanedNodes } = removeNodeFromTree(tree, 'dummy'); 
       
       // Insert INSIDE the target ID
       const updatedTree = insertNodeInTree(tree, rootNode, insertTargetId, 'INSIDE');
       
       const newFlatList = flattenTree(updatedTree);
       setItems(newFlatList);
    });

    setIsLibraryOpen(false);
    setInsertTargetId(null);
    setCollapsedIds(prev => {
        const next = new Set(prev);
        next.delete(insertTargetId);
        return next;
    });
  };

  // --- Logic: User Database ---

  const handleSaveToUserBase = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newItem: DatabaseItem = {
      id: Math.random().toString(36).substr(2, 9),
      code: item.databaseItem?.code ? `P-${item.databaseItem.code}` : `P-${Math.floor(Math.random() * 10000)}`,
      source: 'PRÓPRIA',
      description: item.description,
      unit: item.unit || item.databaseItem?.unit || 'un',
      price: item.unitPrice || item.value || 0,
      type: item.databaseItem?.type || 'INSUMO',
      date: new Date().toISOString()
    };

    onAddToUserDb(newItem);
    setActiveMenuId(null);
  };

  // --- Handlers ---

  const initiateAction = (targetId: string | null, actionType: PendingActionType) => {
    setActiveMenuId(null);
    if ((actionType === 'ADD_CHILD_STAGE' || actionType === 'ADD_CHILD_ITEM') && targetId) {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            next.delete(targetId);
            return next;
        });
    }

    // NEW LOGIC: ADD_ROOT_STAGE
    let effectiveTargetId = targetId;
    let nextLevel = '';

    if (actionType === 'ADD_ROOT_STAGE') {
        if (!targetId) {
            // Toolbar click, add to end
            const roots = items.filter(i => !i.level.includes('.'));
            const lastRoot = roots[roots.length - 1];
            nextLevel = lastRoot ? (parseInt(lastRoot.level) + 1).toString() : '1';
            effectiveTargetId = items.length > 0 ? items[items.length - 1].id : null;
        } else {
            // Hover click
            const targetItem = items.find(i => i.id === targetId);
            if (targetItem) {
                 const rootLevel = targetItem.level.split('.')[0];
                 // Find all items belonging to this root branch
                 const blockItems = items.filter(i => i.level.split('.')[0] === rootLevel);
                 const lastBlockItem = blockItems[blockItems.length - 1];
                 
                 // Visual target for input is after the last item of this block
                 effectiveTargetId = lastBlockItem.id;
                 nextLevel = (parseInt(rootLevel) + 1).toString();
            }
        }
    } else {
        nextLevel = calculateNextLevel(targetId, actionType);
    }

    setPendingAction({
        targetId: effectiveTargetId,
        type: actionType,
        suggestedLevel: nextLevel
    });
    setInputText('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const cancelAction = () => {
    setPendingAction(null);
    setInputText('');
    setSearchQuery('');
  };

  const confirmAddStage = () => {
    if (!inputText.trim() || !pendingAction) return;
    
    const newItem: BudgetItem = {
        id: Math.random().toString(36).substr(2, 9),
        level: pendingAction.suggestedLevel,
        description: inputText,
        type: ItemType.SYNTHETIC,
        value: 0
    };

    setItems(prev => sortItems([...prev, newItem]));
    
    if (pendingAction.type === 'ADD_ROOT_STAGE') {
       initiateAction(newItem.id, 'ADD_ROOT_STAGE');
    } else {
       initiateAction(newItem.id, 'ADD_SIBLING_STAGE');
    }
  };

  // Adds a manual item (no DB link) when user types and hits check or enter
  const confirmAddManualItem = () => {
    if (!searchQuery.trim() || !pendingAction) return;

    const newItem: BudgetItem = {
        id: Math.random().toString(36).substr(2, 9),
        level: pendingAction.suggestedLevel,
        description: searchQuery,
        type: ItemType.ANALYTIC,
        value: 0,
        quantity: 1,
        unit: 'un',
        unitPrice: 0,
        // No databaseItem
    };
    
    setItems(prev => sortItems([...prev, newItem]));
    setHighlightedItemId(newItem.id);
    setPendingAction(null);
    setSearchQuery('');
  };

  const handleItemSelect = (dbItem: DatabaseItem) => {
    const projectDate = new Date(INITIAL_PROJECT_DATE);
    const itemDate = new Date(dbItem.date);

    if (itemDate > projectDate) {
      setConflictItem(dbItem);
      setIsConflictModalOpen(true);
    } else {
      confirmAddItem(dbItem);
    }
  };

  const handleConflictResolution = (updateToBase: boolean) => {
    if (conflictItem) {
        confirmAddItem(conflictItem);
    }
    setIsConflictModalOpen(false);
    setConflictItem(null);
  };

  const confirmAddItem = (dbItem: DatabaseItem) => {
     if (!pendingAction) return;

     if (pendingAction.type === 'REPLACE_ITEM' && pendingAction.targetId) {
        setItems(prev => prev.map(item => {
            if (item.id === pendingAction.targetId) {
                return {
                    ...item,
                    description: dbItem.description,
                    value: dbItem.price,
                    unitPrice: dbItem.price,
                    unit: dbItem.unit,
                    databaseItem: dbItem,
                };
            }
            return item;
        }));
        setHighlightedItemId(pendingAction.targetId);
     } else {
        const newItem: BudgetItem = {
            id: Math.random().toString(36).substr(2, 9),
            level: pendingAction.suggestedLevel,
            description: dbItem.description,
            type: ItemType.ANALYTIC,
            value: dbItem.price,
            quantity: 1,
            unit: dbItem.unit,
            unitPrice: dbItem.price,
            databaseItem: dbItem
        };
        setItems(prev => sortItems([...prev, newItem]));
        setHighlightedItemId(newItem.id);
     }

     setPendingAction(null);
     setSearchQuery('');
  };

  const toggleDetails = (itemId: string) => {
      if (selectedItemId === itemId) {
          setSelectedItemId(null);
      } else {
          setSelectedItemId(itemId);
      }
      setActiveMenuId(null);
  };

  // Update inline values (Qty, Unit, Price)
  const handleUpdateItem = (id: string, field: 'quantity' | 'unit' | 'unitPrice', value: string) => {
    setItems(prev => prev.map(item => {
        if (item.id === id) {
            const updates: Partial<BudgetItem> = {};
            if (field === 'quantity') updates.quantity = parseFloat(value) || 0;
            if (field === 'unit') updates.unit = value;
            if (field === 'unitPrice') updates.unitPrice = parseFloat(value) || 0;
            
            return { ...item, ...updates };
        }
        return item;
    }));
  };

  // --- Rendering ---

  const renderInputRow = () => {
    if (!pendingAction) return null;

    const isItemSearch = pendingAction.type === 'ADD_CHILD_ITEM' || pendingAction.type === 'REPLACE_ITEM' || pendingAction.type === 'ADD_SIBLING_ITEM';
    const isReplacement = pendingAction.type === 'REPLACE_ITEM';
    
    // Adjust placeholder based on type
    let placeholder = "Nome da Etapa";
    if (pendingAction.type === 'ADD_CHILD_STAGE') placeholder = "Nome da Sub-etapa";
    if (pendingAction.type === 'ADD_SIBLING_STAGE') placeholder = "Nome da Etapa/Sub-etapa";
    if (pendingAction.type === 'ADD_ROOT_STAGE') placeholder = "Nome da Nova Etapa (Raiz)";

    return (
        <div className="bg-white shadow-lg border-y-2 border-blue-500 my-1 relative z-10 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                <div className="col-span-1 text-center text-blue-600 font-bold text-sm">{pendingAction.suggestedLevel}</div>
                <div className="col-span-11 relative flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isItemSearch ? 'border-gray-300' : 'border-blue-500 bg-blue-500'}`}></div>
                    
                    {isItemSearch ? (
                        <input 
                            autoFocus
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && confirmAddManualItem()}
                            className="w-full outline-none bg-white text-gray-900 placeholder-gray-400 font-medium h-8"
                            placeholder={isReplacement ? "Busque o novo item para substituir..." : "Busque ou digite para criar um item manual..."} 
                        />
                    ) : (
                        <input 
                            autoFocus
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && confirmAddStage()}
                            className="w-full outline-none bg-white text-gray-900 placeholder-gray-400 font-bold h-8"
                            placeholder={placeholder} 
                        />
                    )}

                    {(searchQuery || inputText) && (
                        <button onClick={() => {setSearchQuery(''); setInputText('')}} className="text-gray-400 hover:text-red-500 bg-white rounded-full p-0.5"><X size={14}/></button>
                    )}
                    
                    <div className="flex gap-1">
                        {/* Always show check for manual confirmation if there is text */}
                        <button 
                            onClick={isItemSearch ? confirmAddManualItem : confirmAddStage} 
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded hover:bg-gray-50 text-green-600 bg-white"
                            title={isItemSearch ? "Adicionar como item manual" : "Adicionar"}
                        >
                            <Check size={14}/>
                        </button>
                        
                        <button onClick={cancelAction} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded hover:bg-gray-50 text-red-500 bg-white"><Trash2 size={14}/></button>
                    </div>
                </div>
            </div>

            {/* Search Results */}
            {isItemSearch && (
                <div className="border-t border-gray-100 p-4 bg-white">
                    <div className="flex gap-2 mb-4 overflow-x-auto">
                        {['Insumo', 'Composição', 'Material', 'Mão de obra'].map((filter, idx) => (
                            <button key={filter} className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${idx === 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{filter}</button>
                        ))}
                        <div className="flex-1"></div>
                        <button className="px-3 py-1 text-xs border border-gray-200 rounded text-gray-600 flex items-center gap-1 bg-white">Banco <ChevronDown size={12}/></button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {isSearching && (
                            <div className="text-center py-4 text-gray-400 flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>Buscando itens na base inteligente...</div>
                        )}
                        {!isSearching && searchResults.length === 0 && searchQuery.length > 2 && (
                            <div className="text-center py-4 text-gray-400 text-sm">
                                Nenhum item encontrado na base.<br/>
                                <span className="text-blue-600 cursor-pointer hover:underline" onClick={confirmAddManualItem}>Clique no <Check size={12} className="inline"/> para adicionar como item manual.</span>
                            </div>
                        )}
                        {!isSearching && searchResults.map((res) => (
                            <div key={res.id} onClick={() => handleItemSelect(res)} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group bg-white">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1"><span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200 uppercase tracking-wider">{res.type}</span></div>
                                    <div className="flex-shrink-0 mt-1"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded border border-gray-200 flex items-center gap-1"><Database size={8} /> {res.source}</span></div>
                                    <div className="flex-1"><div className="text-sm text-gray-800 leading-relaxed"><span className="font-mono text-gray-500 mr-2">{res.code} -</span><span className="font-medium" dangerouslySetInnerHTML={{ __html: res.description.replace(new RegExp(`(${debouncedQuery})`, 'gi'), '<mark class="bg-yellow-100 text-gray-900">$1</mark>') }} /></div></div>
                                    <div className="text-right min-w-[80px]"><div className="font-bold text-gray-900 text-sm">R$ {res.price.toFixed(2)}</div><div className="text-[10px] text-gray-400 mt-1">Unid: {res.unit}</div></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
  };

  const getRenderList = () => {
    const renderList: React.ReactNode[] = [];
    let inputRendered = false;
    const densityClass = getDensityClasses();

    items.forEach((item, index) => {
        if (!isItemVisible(item)) return;

        const isSelected = selectedItemId === item.id;
        const isCollapsed = collapsedIds.has(item.id);
        const isSynthetic = item.type === ItemType.SYNTHETIC;
        const isDragOver = dragOverId === item.id;
        const isHighlighted = highlightedItemId === item.id;
        const isHovered = hoveredItemId === item.id;
        const isRoot = !item.level.includes('.');
        
        // --- Drag & Drop Visual Styles ---
        let dropStyle = '';
        if (isDragOver && dropPosition) {
            if (dropPosition === 'inside') {
                dropStyle = 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10'; 
            }
            // For 'before' and 'after', we render a separate div line to avoid layout shifting or weird borders on the main row
        }

        const highlightStyle = isHighlighted ? 'bg-green-100 duration-1000 ease-out' : 'transition-colors duration-200';
        const indentLevel = item.level.split('.').length - 1;
        const paddingLeft = indentLevel * 16;
        
        // Calculate values
        const quantity = item.quantity ?? 1;
        const unitPrice = item.unitPrice ?? (item.value || 0);
        const totalValue = isSynthetic ? (item.value || 0) : (quantity * unitPrice);

        renderList.push(
             <div 
                key={item.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => handleDragOver(e, item)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item)}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                className={`group relative ${highlightStyle} ${isSelected && !isHighlighted ? 'bg-blue-50' : ''} ${draggedItemId === item.id ? 'opacity-40' : ''}`}
             >
               {/* Drop Indicator Lines */}
               {isDragOver && dropPosition === 'before' && (
                   <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 z-20 pointer-events-none shadow-[0_1px_4px_rgba(37,99,235,0.5)]"></div>
               )}
               {isDragOver && dropPosition === 'after' && (
                   <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 z-20 pointer-events-none shadow-[0_-1px_4px_rgba(37,99,235,0.5)]"></div>
               )}

               <div className={`grid grid-cols-12 gap-4 px-4 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors ${densityClass} ${isSynthetic ? 'font-bold text-gray-800 bg-gray-50/50' : 'text-gray-700'} ${dropStyle} ${isHighlighted ? 'bg-green-50' : ''}`}>
                  <div className="col-span-1 text-center flex items-center justify-center gap-2 text-sm text-gray-500 font-mono cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400" />
                    {item.level}
                  </div>
                  <div className="col-span-6 flex items-center gap-2" style={{ paddingLeft: `${paddingLeft}px` }}>
                    {isSynthetic ? (
                        <div 
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => toggleCollapse(item.id)}
                        >
                             {isCollapsed ? <ChevronRight size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                             <Folder size={16} className={`flex-shrink-0 ${isDragOver && dropPosition === 'inside' ? 'text-blue-500 fill-blue-50' : 'text-orange-500 fill-orange-50'}`} />
                        </div>
                    ) : (
                        <div 
                            onClick={() => toggleDetails(item.id)}
                            className="w-4 h-4 rounded-full border border-blue-200 text-blue-500 flex items-center justify-center text-[9px] font-bold cursor-pointer hover:bg-blue-100 ml-6"
                        >
                            {isSelected ? 'i' : 'c'}
                        </div>
                    )}
                    {item.databaseItem && <div className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px] font-bold text-gray-600 flex-shrink-0">{item.databaseItem.source}</div>}
                    <span className="truncate cursor-default select-none" title={item.description}>{item.description}</span>
                  </div>
                  
                  {/* Editables for Analytic Items */}
                  <div className="col-span-1 text-center text-sm">
                      {!isSynthetic ? (
                          <input 
                            type="number"
                            className="w-full bg-transparent text-center hover:bg-white hover:border hover:border-blue-200 rounded px-1 focus:outline-none focus:border-blue-400 transition-all"
                            value={quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                      ) : ''}
                  </div>
                  <div className="col-span-1 text-center text-sm">
                      {!isSynthetic ? (
                          <input 
                            type="text"
                            className="w-full bg-transparent text-center hover:bg-white hover:border hover:border-blue-200 rounded px-1 focus:outline-none focus:border-blue-400 transition-all uppercase"
                            value={item.unit || (item.databaseItem?.unit || 'un')}
                            onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                      ) : ''}
                  </div>
                  <div className="col-span-1 text-right text-sm">
                      {!isSynthetic ? (
                          <div className="relative group/price">
                            <span className="absolute left-0 text-gray-400 text-xs pointer-events-none">R$</span>
                             <input 
                                type="number"
                                className="w-full bg-transparent text-right hover:bg-white hover:border hover:border-blue-200 rounded px-1 focus:outline-none focus:border-blue-400 transition-all"
                                value={unitPrice}
                                onChange={(e) => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                             />
                          </div>
                      ) : ''}
                  </div>
                  
                  <div className="col-span-1 text-right text-sm font-medium">R$ {totalValue.toFixed(2)}</div>
                  
                  <div className="col-span-1 text-right flex justify-end relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }}
                        className={`p-1 rounded hover:bg-gray-200 ${activeMenuId === item.id ? 'bg-gray-200 text-gray-800' : 'text-gray-400'}`}
                      >
                        <MoreVertical size={14} />
                      </button>
                      
                      {activeMenuId === item.id && (
                        <div ref={menuRef} className="absolute right-8 top-0 w-60 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <div className="py-1">
                                <button onClick={() => initiateAction(item.id, 'ADD_SIBLING_STAGE')} className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                    <FolderPlus size={14} className="text-gray-400"/> Adicionar Sub-etapa (Irmã)
                                </button>
                                {isSynthetic && (
                                    <>
                                        <button onClick={() => initiateAction(item.id, 'ADD_CHILD_STAGE')} className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                            <CornerDownRight size={14} className="text-gray-400"/> Criar Sub-etapa (Filha)
                                        </button>
                                        <button onClick={() => initiateAction(item.id, 'ADD_CHILD_ITEM')} className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">
                                            <FilePlus size={14} className="text-blue-500"/> Inserir Item/Insumo
                                        </button>
                                        {/* SAVE BLOCK OPTION */}
                                        <button onClick={() => initiateSaveBlock(item.id)} className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">
                                            <Package size={14} className="text-purple-500"/> Salvar como Bloco
                                        </button>
                                    </>
                                )}
                                {!isSynthetic && (
                                    <>
                                        <button onClick={() => initiateAction(item.id, 'REPLACE_ITEM')} className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">
                                            <RefreshCw size={14} className="text-orange-500"/> Substituir Item
                                        </button>
                                        <button onClick={() => toggleDetails(item.id)} className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                            <Info size={14} className="text-blue-400"/> Ver Detalhes
                                        </button>
                                        {/* SAVE TO USER DB OPTION */}
                                        <button onClick={() => handleSaveToUserBase(item.id)} className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">
                                            <Database size={14} className="text-green-500"/> Salvar na Minha Base
                                        </button>
                                    </>
                                )}
                                <div className="border-t border-gray-100 my-1"></div>
                                <button 
                                  onClick={() => initiateDelete(item.id)}
                                  className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 size={14}/> Excluir
                                </button>
                            </div>
                        </div>
                      )}
                  </div>
               </div>

               {/* HOVER QUICK ACTION BAR */}
               {isHovered && !pendingAction && (
                   <div className="absolute -bottom-3 left-0 right-0 z-30 flex items-center justify-center pointer-events-none">
                        {/* Line */}
                        <div className="absolute w-full h-[1.5px] bg-blue-200 top-1/2 transform -translate-y-1/2 opacity-50"></div>
                        
                        {/* Buttons Container */}
                        <div className="flex items-center gap-2 px-2 relative pointer-events-auto">
                             
                             {/* 1. ROOT STAGE HOVER (Level 1) */}
                             {isRoot && isSynthetic && (
                                 <>
                                    <button 
                                        onClick={() => initiateAction(item.id, 'ADD_ROOT_STAGE')}
                                        className="flex items-center gap-1.5 bg-white text-gray-700 text-[11px] font-medium px-3 py-1 rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200"
                                    >
                                        <PlusCircle size={12} className="text-gray-400"/> Etapa
                                    </button>
                                    <button 
                                        onClick={() => initiateAction(item.id, 'ADD_CHILD_STAGE')}
                                        className="flex items-center gap-1.5 bg-white text-gray-700 text-[11px] font-medium px-3 py-1 rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200"
                                    >
                                        <PlusCircle size={12} className="text-gray-400"/> Sub-etapa
                                    </button>
                                    <button 
                                        onClick={() => initiateAction(item.id, 'ADD_CHILD_ITEM')}
                                        className="flex items-center gap-1.5 bg-white text-gray-700 text-[11px] font-medium px-3 py-1 rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200"
                                    >
                                        <PlusCircle size={12} className="text-gray-400"/> Item
                                    </button>
                                    <button 
                                        onClick={() => openLibraryToInsert(item.id)}
                                        className="flex items-center gap-1.5 bg-white text-gray-700 text-[11px] font-medium px-3 py-1 rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200"
                                    >
                                        <PlusCircle size={12} className="text-gray-400"/> Bloco
                                    </button>
                                 </>
                             )}

                             {/* 2. SUB-STAGE HOVER (Nested Synthetic) */}
                             {!isRoot && isSynthetic && (
                                 <>
                                    <button 
                                        onClick={() => initiateAction(item.id, 'ADD_SIBLING_STAGE')}
                                        className="flex items-center gap-1.5 bg-white text-gray-700 text-[11px] font-medium px-3 py-1 rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200"
                                    >
                                        <PlusCircle size={12} className="text-gray-400"/> Sub-etapa
                                    </button>
                                    <button 
                                        onClick={() => initiateAction(item.id, 'ADD_CHILD_ITEM')}
                                        className="flex items-center gap-1.5 bg-white text-gray-700 text-[11px] font-medium px-3 py-1 rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200"
                                    >
                                        <PlusCircle size={12} className="text-gray-400"/> Item
                                    </button>
                                    <button 
                                        onClick={() => openLibraryToInsert(item.id)}
                                        className="flex items-center gap-1.5 bg-white text-gray-700 text-[11px] font-medium px-3 py-1 rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200"
                                    >
                                        <PlusCircle size={12} className="text-gray-400"/> Bloco
                                    </button>
                                 </>
                             )}

                             {/* 3. ITEM HOVER (Analytic) */}
                             {!isSynthetic && (
                                <button 
                                    onClick={() => initiateAction(item.id, 'ADD_SIBLING_ITEM')}
                                    className="flex items-center gap-1.5 bg-white text-gray-700 text-[11px] font-medium px-3 py-1 rounded-full hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm border border-gray-200"
                                >
                                    <PlusCircle size={12} className="text-gray-400"/> Item
                                </button>
                             )}
                        </div>
                   </div>
               )}

             </div>
        );
        
        if (pendingAction && !inputRendered) {
            const isChildAction = pendingAction.targetId === item.id && (pendingAction.type === 'ADD_CHILD_STAGE' || pendingAction.type === 'ADD_CHILD_ITEM');
            const isReplacement = pendingAction.targetId === item.id && pendingAction.type === 'REPLACE_ITEM';
            const isSiblingAction = pendingAction.targetId === item.id && (pendingAction.type === 'ADD_SIBLING_STAGE' || pendingAction.type === 'ADD_SIBLING_ITEM');
            const isRootAction = pendingAction.targetId === item.id && pendingAction.type === 'ADD_ROOT_STAGE';
            
            if (isChildAction && !collapsedIds.has(item.id)) {
                renderList.push(<div key="input-row">{renderInputRow()}</div>);
                inputRendered = true;
            } else if (isSiblingAction || isReplacement || isRootAction) {
                renderList.push(<div key="input-row">{renderInputRow()}</div>);
                inputRendered = true;
            }
        }
    });

    if (pendingAction && !inputRendered) {
        renderList.push(<div key="input-row">{renderInputRow()}</div>);
    }

    return renderList;
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden h-full">
       {/* Toolbar */}
       <div className="h-10 border-b border-gray-200 bg-white flex items-center px-4 gap-4 text-sm text-gray-700 shadow-sm z-10 flex-shrink-0 relative">
          <button className="flex items-center gap-1.5 hover:text-black font-medium"><LayoutList size={14}/> Editar EAP</button>
          
          {/* Libraries Button */}
          <button 
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center gap-1.5 hover:text-black"
          >
            <Package size={14}/> Bibliotecas
          </button>

          <button className="flex items-center gap-1.5 hover:text-black"><MapIcon size={14}/> Mapa</button>
          
          <div className="relative" ref={toolbarMenuRef}>
            <button 
                onClick={() => setActiveToolbarMenu(activeToolbarMenu === 'density' ? null : 'density')}
                className={`flex items-center gap-1.5 hover:text-black ${activeToolbarMenu === 'density' ? 'text-blue-600 font-medium' : ''}`}
            >
                <Maximize2 size={14}/> Densidade
            </button>
            {activeToolbarMenu === 'density' && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="py-1">
                        <button onClick={() => { setDensity('compact'); setActiveToolbarMenu(null); }} className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-gray-50 ${density === 'compact' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                            Compacto <AlignJustify size={12}/>
                        </button>
                        <button onClick={() => { setDensity('normal'); setActiveToolbarMenu(null); }} className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-gray-50 ${density === 'normal' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                            Normal <Rows size={12}/>
                        </button>
                        <button onClick={() => { setDensity('comfortable'); setActiveToolbarMenu(null); }} className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-gray-50 ${density === 'comfortable' ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                            Confortável <LayoutGrid size={12}/>
                        </button>
                    </div>
                </div>
            )}
          </div>

          <div className="relative">
            <button 
                onClick={(e) => { e.stopPropagation(); setActiveToolbarMenu(activeToolbarMenu === 'tree' ? null : 'tree'); }}
                className={`flex items-center gap-1.5 hover:text-black ${activeToolbarMenu === 'tree' ? 'text-blue-600 font-medium' : ''}`}
            >
                <Network size={14}/> Árvore
            </button>
             {activeToolbarMenu === 'tree' && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="py-1">
                        <button onClick={expandAll} className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <ChevronDown size={12}/> Expandir Tudo
                        </button>
                        <button onClick={collapseAll} className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <ChevronRight size={12}/> Recolher Tudo
                        </button>
                    </div>
                </div>
            )}
          </div>

          <div className="flex-1"></div>
          <button 
            onClick={() => initiateAction(null, 'ADD_ROOT_STAGE')}
            className="flex items-center gap-1.5 bg-orange-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-orange-700 shadow-sm transition-colors"
          >
            <FolderPlus size={14}/> Nova Etapa
          </button>
          <div className="flex items-center gap-3 text-gray-400 ml-2">
             <div className="w-px h-4 bg-gray-300"></div>
             <div className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center text-[10px]">?</div>
          </div>
       </div>

       {/* Main Content Split View */}
       <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-200 flex-shrink-0">
                    <div className="col-span-1 text-center">Posição</div>
                    <div className="col-span-6">Descrição</div>
                    <div className="col-span-1 text-center">Qtd</div>
                    <div className="col-span-1 text-center">Und</div>
                    <div className="col-span-1 text-right">Vlr Unitário</div>
                    <div className="col-span-1 text-right">Vlr Total</div>
                    <div className="col-span-1 text-center">Ações</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                    {getRenderList()}
                    {items.length === 0 && !pendingAction && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <FolderPlus size={48} className="mb-4 opacity-20"/>
                            <p className="text-sm">O orçamento está vazio.</p>
                            <button onClick={() => initiateAction(null, 'ADD_ROOT_STAGE')} className="mt-2 text-blue-600 hover:underline text-sm">Criar primeira etapa</button>
                        </div>
                    )}
                </div>
            </div>

            {selectedItemId && items.find(i => i.id === selectedItemId) && (
                <ItemDetailsPanel 
                    item={items.find(i => i.id === selectedItemId)!} 
                    onClose={() => setSelectedItemId(null)} 
                />
            )}
       </div>

       <VersionConflictModal 
          isOpen={isConflictModalOpen}
          newItem={conflictItem}
          projectDate={INITIAL_PROJECT_DATE}
          onClose={() => setIsConflictModalOpen(false)}
          onConfirm={handleConflictResolution}
       />

       <DeleteConfirmationModal 
          isOpen={deleteState.isOpen}
          itemDescription={deleteState.item?.description || ''}
          isSynthetic={deleteState.item?.type === ItemType.SYNTHETIC}
          childCount={deleteState.childCount}
          onClose={() => setDeleteState({ isOpen: false, item: null, childCount: 0 })}
          onConfirm={confirmDelete}
       />

       <BlockLibraryModal 
          isOpen={isLibraryOpen}
          blocks={savedBlocks}
          onClose={() => setIsLibraryOpen(false)}
          onDeleteBlock={handleDeleteBlock}
          onInsertBlock={insertTargetId ? handleInsertBlock : undefined}
       />
       
       {/* Save Block Name Input Modal */}
       {isSaveBlockModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-[420px] p-0 animate-in fade-in zoom-in-95 overflow-hidden border border-gray-100">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Package size={18} className="text-purple-600"/>
                      Salvar Etapa como Bloco
                    </h3>
                    <button onClick={() => setIsSaveBlockModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                </div>
                
                <div className="p-5">
                    {/* Conflict View */}
                    {overwriteConflictId ? (
                        <div className="space-y-4">
                           <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-3">
                              <AlertCircle className="text-orange-600 flex-shrink-0" size={20}/>
                              <div className="text-sm">
                                  <p className="font-bold text-orange-800">Bloco já existente</p>
                                  <p className="text-orange-700 text-xs mt-1">
                                    Já existe um bloco chamado <strong>"{blockNameInput}"</strong>. O que deseja fazer?
                                  </p>
                              </div>
                           </div>
                           <div className="flex flex-col gap-2">
                              <button 
                                onClick={() => performSave('OVERWRITE')} 
                                className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <RefreshCw size={14}/> Sobrescrever Existente
                              </button>
                              <button 
                                onClick={() => performSave('NEW')} 
                                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <Copy size={14}/> Salvar como Novo (Fork)
                              </button>
                           </div>
                        </div>
                    ) : (
                        /* Normal View */
                        <>
                           <p className="text-xs text-gray-500 mb-3">
                               O bloco será salvo na sua biblioteca pessoal. Os valores monetários serão zerados para reuso.
                           </p>
                           
                           <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Bloco</label>
                           <input 
                              type="text" 
                              value={blockNameInput}
                              onChange={(e) => setBlockNameInput(e.target.value)}
                              placeholder="Ex: Kit Banheiro Padrão..."
                              className="w-full border border-gray-300 rounded p-2 text-sm mb-4 focus:border-purple-500 outline-none bg-white focus:ring-1 focus:ring-purple-200"
                              autoFocus
                           />

                           <label className="flex items-center gap-2 p-2 border border-gray-200 rounded bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={isGlobalBlock}
                                onChange={(e) => setIsGlobalBlock(e.target.checked)}
                                className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                              />
                              <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-800 flex items-center gap-1">
                                    <Globe size={14} className="text-gray-500"/> Tornar composição Global
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    Se marcado, este bloco ficará visível para todos os usuários da organização.
                                  </div>
                              </div>
                           </label>
                        </>
                    )}
                </div>

                {!overwriteConflictId && (
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                     <button onClick={() => setIsSaveBlockModalOpen(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded">Cancelar</button>
                     <button onClick={handleSaveBlockAttempt} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1 font-medium shadow-sm">
                        <Save size={14}/> Salvar Bloco
                     </button>
                  </div>
                )}
            </div>
         </div>
       )}
    </div>
  );
};

export default BudgetTable;
