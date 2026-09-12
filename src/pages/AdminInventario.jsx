import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive, Boxes, Edit3, Plus, Search, X, ShoppingCart, Layers, DollarSign,
  Trash2, CheckCircle2, ShieldAlert, Utensils, TrendingUp, AlertTriangle, AlertCircle,
  ArrowRightLeft, ArrowDownRight, ArrowUpRight, FileText, Check, HelpCircle,
  Filter, Calendar, User, Eye, Sparkles, ChevronRight, ChevronDown, RefreshCw
} from 'lucide-react';
import { API_URL } from '../config/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';

const authFetch = (url, options = {}) => {
  const token = sessionStorage.getItem('distrito_admin_token');
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
};

export default function AdminInventario() {
  const fetchAuth = authFetch;
  
  // TABS: 'estado_stock' | 'alertas' | 'insumos' | 'compras' | 'recetas' | 'kardex' | 'rentabilidad'
  const [activeTab, setActiveTab] = useState('estado_stock'); 
  const [query, setQuery] = useState('');
  
  // Data collections
  const [insumos, setInsumos] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [movements, setMovements] = useState([]);
  const [profitability, setProfitability] = useState([]);
  
  const [busy, setBusy] = useState(false);

  // Modern Toast notification system
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((curr) => (curr?.msg === msg ? null : curr));
    }, 3800);
  }, []);

  // Filter tabs for stock status & alerts
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [alertTabFilter, setAlertTabFilter] = useState('ALL');

  // Insumo modal & form (CREACIÓN / EDICIÓN METADATOS)
  const [insumoModal, setInsumoModal] = useState(false);
  const [insumoForm, setInsumoForm] = useState({
    id: null,
    name: '',
    sku: '',
    unit: 'unidad',
    min_stock: 0,
    track_stock: true,
    category: 'General',
    status: 'Activo'
  });

  // Modal para ajuste rápido de stock mínimo
  const [minStockModal, setMinStockModal] = useState(false);
  const [minStockItem, setMinStockItem] = useState(null);
  const [minStockValue, setMinStockValue] = useState(0);

  // Modal para ajuste de stock / merma
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    inventory_id: '',
    adjustment_type: 'MERMA',
    quantity: '',
    reason: ''
  });

  // Modal para creación rápida de insumo desde compras
  const [quickInsumoModal, setQuickInsumoModal] = useState(false);
  const [quickInsumoForm, setQuickInsumoForm] = useState({
    name: '',
    unit: 'unidad',
    min_stock: 0,
    sku: ''
  });

  // Formulario de Compra de Inventario
  const [purchaseForm, setPurchaseForm] = useState({
    inventory_id: '',
    purchase_unit: '',
    quantity: 1,
    unit_cost: '',
    total_cost: '',
    supplier: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // Proveedor Autocomplete Dropdown State
  const [supplierInputFocused, setSupplierInputFocused] = useState(false);
  const [editSupplierInputFocused, setEditSupplierInputFocused] = useState(false);

  // Modal de Edición Segura de Compras
  const [editPurchaseModal, setEditPurchaseModal] = useState(false);
  const [editPurchaseForm, setEditPurchaseForm] = useState({
    id: null,
    inventory_id: '',
    inventory_title: '',
    base_unit: '',
    original_quantity: 0,
    original_total_cost: 0,
    original_unit_cost: 0,
    quantity: 1,
    purchase_unit: '',
    unit_cost: '',
    total_cost: '',
    supplier: '',
    purchase_date: '',
    notes: '',
    edit_reason: ''
  });

  // Recetas
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState('');
  const [newRecipeInsumo, setNewRecipeInsumo] = useState('');
  const [newRecipeQty, setNewRecipeQty] = useState(1);

  // Filtros avanzados de Kardex
  const [kardexFilterInsumo, setKardexFilterInsumo] = useState('');
  const [kardexFilterType, setKardexFilterType] = useState('ALL');
  const [kardexDateFrom, setKardexDateFrom] = useState('');
  const [kardexDateTo, setKardexDateTo] = useState('');
  const [kardexSearch, setKardexSearch] = useState('');

  // Modal de Detalle de Movimiento Kardex
  const [movementDetailModal, setMovementDetailModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);

  // Rentabilidad & Detalle
  const [profitSearch, setProfitSearch] = useState('');
  const [profitFilter, setProfitFilter] = useState('ALL');
  const [expandedProfitId, setExpandedProfitId] = useState(null);

  // ==========================================
  // DATA LOADERS
  // ==========================================
  const loadInsumos = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory`);
      const data = await res.json();
      if (res.ok) {
        const list = data.inventory || data.items || data.data || [];
        setInsumos(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Error cargando insumos:', err);
    }
  }, [fetchAuth]);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory-suppliers`);
      const data = await res.json();
      if (res.ok) setSuppliersList(data.suppliers || []);
    } catch (err) {
      console.error('Error cargando proveedores:', err);
    }
  }, [fetchAuth]);

  const loadPurchases = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory-purchases`);
      const data = await res.json();
      if (res.ok) setPurchases(data.data || data.purchases || []);
    } catch (err) {
      console.error(err);
    }
  }, [fetchAuth]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/products`);
      const data = await res.json();
      if (res.ok) setProducts(data.data || data.products || []);
    } catch (err) {
      console.error(err);
    }
  }, [fetchAuth]);

  const loadRecipes = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/recipes`);
      const data = await res.json();
      if (res.ok) setRecipes(data.data || data.recipes || []);
    } catch (err) {
      console.error(err);
    }
  }, [fetchAuth]);

  const loadMovements = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (kardexFilterInsumo) params.append('inventory_id', kardexFilterInsumo);
      if (kardexFilterType && kardexFilterType !== 'ALL') params.append('movement_type', kardexFilterType);
      if (kardexDateFrom) params.append('date_from', kardexDateFrom);
      if (kardexDateTo) params.append('date_to', kardexDateTo);
      if (kardexSearch.trim()) params.append('search', kardexSearch.trim());
      params.append('limit', '200');

      const res = await fetchAuth(`${API_URL}/admin/stock-movements?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setMovements(data.data || data.movements || []);
    } catch (err) {
      console.error(err);
    }
  }, [fetchAuth, kardexFilterInsumo, kardexFilterType, kardexDateFrom, kardexDateTo, kardexSearch]);

  const loadProfitability = useCallback(async () => {
    try {
      const res = await fetchAuth(`${API_URL}/admin/profitability`);
      const data = await res.json();
      if (res.ok) setProfitability(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [fetchAuth]);

  const reloadAll = useCallback(async () => {
    setBusy(true);
    await Promise.all([
      loadInsumos(),
      loadSuppliers(),
      loadPurchases(),
      loadProducts(),
      loadRecipes(),
      loadMovements(),
      loadProfitability()
    ]);
    setBusy(false);
  }, [loadInsumos, loadSuppliers, loadPurchases, loadProducts, loadRecipes, loadMovements, loadProfitability]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Recargar kardex cuando cambian los filtros
  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  // ==========================================
  // LÓGICA DE SEMÁFORO Y ESTADO DE STOCK
  // ==========================================
  const getStockStatus = useCallback((item) => {
    const stock = Number(item.stock) || 0;
    const minStock = Number(item.min_stock) || 0;

    if (stock <= 0) {
      return {
        key: 'agotado',
        label: 'Agotado',
        symbol: '⚫',
        badgeClass: 'ds-badge-neutral',
        actionBadge: '🚨 AGOTADO',
        description: 'Sin existencia disponible'
      };
    }
    if (minStock > 0 && stock <= minStock) {
      return {
        key: 'critico',
        label: 'Crítico',
        symbol: '🔴',
        badgeClass: 'ds-badge-danger',
        actionBadge: '⚠️ NECESITA COMPRA',
        description: `Por debajo o igual al mínimo (${minStock})`
      };
    }
    if (minStock > 0 && stock <= minStock * 1.4) {
      return {
        key: 'bajo',
        label: 'Stock Bajo',
        symbol: '🟡',
        badgeClass: 'ds-badge-warning',
        actionBadge: '⚠️ COMPRAR PRONTO',
        description: 'Próximo a llegar al mínimo (margen 40%)'
      };
    }
    return {
      key: 'saludable',
      label: minStock > 0 ? 'Saludable' : 'Sin alerta',
      symbol: '🟢',
      badgeClass: 'ds-badge-success',
      actionBadge: '✓ ÓPTIMO',
      description: minStock > 0 ? `Por encima de ${Math.round(minStock * 1.4)}` : 'Sin stock mínimo configurado'
    };
  }, []);

  // Insumos con estado calculado
  const insumosWithStatus = useMemo(() => {
    return insumos.map((i) => ({
      ...i,
      statusMeta: getStockStatus(i)
    }));
  }, [insumos, getStockStatus]);

  // Resumen del inventario para tarjetas superiores
  const inventorySummary = useMemo(() => {
    let total = insumosWithStatus.length;
    let saludable = 0;
    let bajo = 0;
    let critico = 0;
    let agotado = 0;

    for (const item of insumosWithStatus) {
      if (item.statusMeta.key === 'agotado') agotado++;
      else if (item.statusMeta.key === 'critico') critico++;
      else if (item.statusMeta.key === 'bajo') bajo++;
      else saludable++;
    }

    return { total, saludable, bajo, critico, agotado };
  }, [insumosWithStatus]);

  // Sincronizar unidad de compra cuando se selecciona un insumo
  const selectedPurchaseInsumo = useMemo(() => {
    return insumos.find((i) => String(i.id) === String(purchaseForm.inventory_id));
  }, [insumos, purchaseForm.inventory_id]);

  useEffect(() => {
    if (selectedPurchaseInsumo) {
      const baseUnit = (selectedPurchaseInsumo.unit || 'unidad').toLowerCase();
      if (['gramos', 'g'].includes(baseUnit)) {
        setPurchaseForm((prev) => ({ ...prev, purchase_unit: prev.purchase_unit || 'kg' }));
      } else if (['mililitros', 'ml'].includes(baseUnit)) {
        setPurchaseForm((prev) => ({ ...prev, purchase_unit: prev.purchase_unit || 'l' }));
      } else {
        setPurchaseForm((prev) => ({ ...prev, purchase_unit: baseUnit }));
      }
    }
  }, [selectedPurchaseInsumo]);

  // Calculadora de conversión en compras
  const purchaseConversionInfo = useMemo(() => {
    if (!selectedPurchaseInsumo) return null;
    const baseUnit = (selectedPurchaseInsumo.unit || 'unidad').toLowerCase();
    const pUnit = (purchaseForm.purchase_unit || baseUnit).toLowerCase();
    const qty = Number(purchaseForm.quantity) || 0;
    const totalCost = Number(purchaseForm.total_cost) || 0;

    let multiplier = 1;
    if (['gramos', 'g'].includes(baseUnit)) {
      if (['kg', 'kilogramos', 'kilos'].includes(pUnit)) multiplier = 1000;
      else if (['lb', 'libras'].includes(pUnit)) multiplier = 500;
    } else if (['mililitros', 'ml'].includes(baseUnit)) {
      if (['l', 'litros'].includes(pUnit)) multiplier = 1000;
    } else if (['unidad', 'unidades'].includes(baseUnit)) {
      if (['docena', 'docenas'].includes(pUnit)) multiplier = 12;
    }

    const convertedQty = qty * multiplier;
    const costPerBaseUnit = convertedQty > 0 && totalCost > 0 ? totalCost / convertedQty : 0;
    const costPerPurchaseUnit = qty > 0 && totalCost > 0 ? totalCost / qty : 0;

    return {
      multiplier,
      convertedQty,
      baseUnit,
      pUnit,
      costPerBaseUnit,
      costPerPurchaseUnit,
      isConverted: multiplier !== 1
    };
  }, [selectedPurchaseInsumo, purchaseForm.purchase_unit, purchaseForm.quantity, purchaseForm.total_cost]);

  // Calculadora para el modal de edición de compras
  const editPurchaseConversionInfo = useMemo(() => {
    if (!editPurchaseForm.id) return null;
    const baseUnit = (editPurchaseForm.base_unit || 'unidad').toLowerCase();
    const pUnit = (editPurchaseForm.purchase_unit || baseUnit).toLowerCase();
    const rawQty = Number(editPurchaseForm.quantity) || 0;
    const totalCost = Number(editPurchaseForm.total_cost) || 0;

    let multiplier = 1;
    if (['gramos', 'g'].includes(baseUnit)) {
      if (['kg', 'kilogramos', 'kilos'].includes(pUnit)) multiplier = 1000;
      else if (['lb', 'libras'].includes(pUnit)) multiplier = 500;
    } else if (['mililitros', 'ml'].includes(baseUnit)) {
      if (['l', 'litros'].includes(pUnit)) multiplier = 1000;
    } else if (['unidad', 'unidades'].includes(baseUnit)) {
      if (['docena', 'docenas'].includes(pUnit)) multiplier = 12;
    }

    const newConvertedQty = rawQty * multiplier;
    const oldQty = Number(editPurchaseForm.original_quantity) || 0;
    const deltaQty = newConvertedQty - oldQty;
    const currentStock = Number(insumos.find((i) => String(i.id) === String(editPurchaseForm.inventory_id))?.stock) || 0;
    const resultingStock = currentStock + deltaQty;
    const costPerBaseUnit = newConvertedQty > 0 && totalCost > 0 ? totalCost / newConvertedQty : 0;

    return {
      multiplier,
      newConvertedQty,
      deltaQty,
      resultingStock,
      isNegative: resultingStock < 0,
      costPerBaseUnit
    };
  }, [editPurchaseForm, insumos]);

  // Proveedores sugeridos filtrados
  const filteredSuppliers = useMemo(() => {
    const input = (purchaseForm.supplier || '').trim().toLowerCase();
    if (!input) return suppliersList.slice(0, 6);
    return suppliersList.filter((s) => s.toLowerCase().includes(input)).slice(0, 6);
  }, [purchaseForm.supplier, suppliersList]);

  const editFilteredSuppliers = useMemo(() => {
    const input = (editPurchaseForm.supplier || '').trim().toLowerCase();
    if (!input) return suppliersList.slice(0, 6);
    return suppliersList.filter((s) => s.toLowerCase().includes(input)).slice(0, 6);
  }, [editPurchaseForm.supplier, suppliersList]);

  // ==========================================
  // HANDLERS: INSUMOS Y STOCK MÍNIMO
  // ==========================================
  const handleOpenInsumo = (insumo = null) => {
    if (insumo) {
      setInsumoForm({
        id: insumo.id,
        name: insumo.name || '',
        sku: insumo.sku || '',
        unit: insumo.unit || 'unidad',
        min_stock: Number(insumo.min_stock) || 0,
        track_stock: insumo.track_stock !== false,
        category: insumo.category || 'General',
        status: insumo.status || 'Activo'
      });
    } else {
      setInsumoForm({
        id: null,
        name: '',
        sku: '',
        unit: 'unidad',
        min_stock: 0,
        track_stock: true,
        category: 'General',
        status: 'Activo'
      });
    }
    setInsumoModal(true);
  };

  const handleSaveInsumo = async (e) => {
    e.preventDefault();
    if (!insumoForm.name.trim()) return showToast('El nombre del insumo es requerido', 'error');

    setBusy(true);
    try {
      const url = insumoForm.id
        ? `${API_URL}/admin/inventory/${insumoForm.id}`
        : `${API_URL}/admin/inventory`;
      const method = insumoForm.id ? 'PUT' : 'POST';

      const res = await fetchAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insumoForm)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al guardar insumo');

      showToast(insumoForm.id ? '✓ Insumo actualizado' : '✓ Insumo creado correctamente');
      setInsumoModal(false);
      await loadInsumos();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenMinStockModal = (item) => {
    setMinStockItem(item);
    setMinStockValue(Number(item.min_stock) || 0);
    setMinStockModal(true);
  };

  const handleSaveMinStock = async (e) => {
    e.preventDefault();
    if (!minStockItem) return;

    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory/${minStockItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_stock: Number(minStockValue) || 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar stock mínimo');

      showToast(`✓ Stock mínimo de "${minStockItem.name}" actualizado a ${minStockValue} ${minStockItem.unit}`);
      setMinStockModal(false);
      await loadInsumos();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // Creación rápida de insumo desde compras
  const handleQuickSaveInsumo = async (e) => {
    e.preventDefault();
    if (!quickInsumoForm.name.trim()) return showToast('El nombre es requerido', 'error');

    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickInsumoForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear insumo');

      showToast('✓ Insumo registrado y seleccionado');
      setQuickInsumoModal(false);
      await loadInsumos();

      const created = data.item || data.inventory;
      if (created) {
        setPurchaseForm((prev) => ({
          ...prev,
          inventory_id: created.id,
          purchase_unit: created.unit
        }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // HANDLERS: COMPRAS Y EDICIÓN SEGURA
  // ==========================================
  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.inventory_id) return showToast('Selecciona un insumo para la compra', 'error');
    if (!purchaseForm.quantity || Number(purchaseForm.quantity) <= 0) return showToast('Indica una cantidad válida', 'error');
    if (!purchaseForm.total_cost && !purchaseForm.unit_cost) {
      return showToast('Indica el costo total o el costo unitario', 'error');
    }

    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory-purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar compra');

      showToast('✓ Compra registrada correctamente y stock actualizado');
      setPurchaseForm({
        inventory_id: '',
        purchase_unit: '',
        quantity: 1,
        unit_cost: '',
        total_cost: '',
        supplier: '',
        purchase_date: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      await Promise.all([loadPurchases(), loadInsumos(), loadMovements(), loadSuppliers()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenEditPurchase = (purchase) => {
    const inv = insumos.find((i) => String(i.id) === String(purchase.inventory_id));
    setEditPurchaseForm({
      id: purchase.id,
      inventory_id: purchase.inventory_id,
      inventory_title: purchase.inventory_title || inv?.name || 'Insumo',
      base_unit: purchase.inventory_unit || inv?.unit || 'unidad',
      original_quantity: Number(purchase.quantity) || 0,
      original_total_cost: Number(purchase.total_cost) || 0,
      original_unit_cost: Number(purchase.unit_cost) || 0,
      quantity: Number(purchase.quantity) || 0,
      purchase_unit: purchase.inventory_unit || inv?.unit || 'unidad',
      unit_cost: purchase.unit_cost || '',
      total_cost: purchase.total_cost || '',
      supplier: purchase.supplier || '',
      purchase_date: purchase.purchase_date ? String(purchase.purchase_date).slice(0, 10) : '',
      notes: purchase.notes || '',
      edit_reason: ''
    });
    setEditPurchaseModal(true);
  };

  const handleSaveEditPurchase = async (e) => {
    e.preventDefault();
    if (!editPurchaseForm.id) return;
    if (editPurchaseConversionInfo?.isNegative) {
      return showToast('No es posible guardar: el stock resultante quedaría en negativo', 'error');
    }

    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory-purchases/${editPurchaseForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPurchaseForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar compra');

      showToast('✓ Compra actualizada y Kardex recalculado');
      setEditPurchaseModal(false);
      await Promise.all([loadPurchases(), loadInsumos(), loadMovements(), loadSuppliers()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // HANDLERS: AJUSTES Y MERMAS
  // ==========================================
  const handleOpenAdjust = (insumo = null) => {
    setAdjustForm({
      inventory_id: insumo ? insumo.id : insumos[0]?.id || '',
      adjustment_type: 'MERMA',
      quantity: '',
      reason: ''
    });
    setAdjustModal(true);
  };

  const handleSaveAdjust = async (e) => {
    e.preventDefault();
    if (!adjustForm.inventory_id) return showToast('Selecciona un insumo', 'error');
    if (!adjustForm.quantity || Number(adjustForm.quantity) <= 0) return showToast('La cantidad debe ser mayor a cero', 'error');

    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/inventory-adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar ajuste');

      showToast(`✓ Ajuste (${adjustForm.adjustment_type}) aplicado y registrado en Kardex`);
      setAdjustModal(false);
      await Promise.all([loadInsumos(), loadMovements()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // HANDLERS: RECETAS
  // ==========================================
  const handleAddRecipeItem = async (e) => {
    e.preventDefault();
    if (!selectedRecipeProduct) return showToast('Selecciona un producto de venta', 'error');
    if (!newRecipeInsumo) return showToast('Selecciona un insumo', 'error');
    if (!newRecipeQty || Number(newRecipeQty) <= 0) return showToast('La cantidad debe ser mayor a cero', 'error');

    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedRecipeProduct,
          inventory_id: newRecipeInsumo,
          quantity: Number(newRecipeQty),
          is_controlled: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al asociar insumo');

      showToast('✓ Insumo agregado a la receta del producto');
      setNewRecipeInsumo('');
      setNewRecipeQty(1);
      await Promise.all([loadRecipes(), loadProfitability()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteRecipeItem = async (id) => {
    if (!window.confirm('¿Seguro que deseas retirar este insumo de la receta?')) return;
    setBusy(true);
    try {
      const res = await fetchAuth(`${API_URL}/admin/recipes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar ingrediente');
      showToast('✓ Insumo retirado de la receta');
      await Promise.all([loadRecipes(), loadProfitability()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // FILTRADOS DE VISTA
  // ==========================================
  const filteredStockInsumos = useMemo(() => {
    return insumosWithStatus.filter((item) => {
      if (stockStatusFilter !== 'ALL' && item.statusMeta.key !== stockStatusFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSku = (item.sku || '').toLowerCase().includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        return matchName || matchSku || matchCat;
      }
      return true;
    });
  }, [insumosWithStatus, stockStatusFilter, query]);

  const alertInsumos = useMemo(() => {
    return insumosWithStatus.filter((item) => {
      const key = item.statusMeta.key;
      if (!['critico', 'bajo', 'agotado'].includes(key)) return false;
      if (alertTabFilter !== 'ALL' && key !== alertTabFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [insumosWithStatus, alertTabFilter, query]);

  const activeRecipeItems = useMemo(() => {
    if (!selectedRecipeProduct) return [];
    return recipes.filter((r) => String(r.product_id) === String(selectedRecipeProduct));
  }, [recipes, selectedRecipeProduct]);

  const activeRecipeCost = useMemo(() => {
    return activeRecipeItems.reduce((sum, item) => {
      const unitCost = Number(item.inventory_average_cost) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + unitCost * qty;
    }, 0);
  }, [activeRecipeItems]);

  const activeSelectedProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(selectedRecipeProduct));
  }, [products, selectedRecipeProduct]);

  // Rentabilidad filtrada y KPIs
  const filteredProfitability = useMemo(() => {
    return profitability.filter((p) => {
      const title = (p.title || p.product_title || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const q = profitSearch.trim().toLowerCase();
      if (q && !title.includes(q) && !cat.includes(q)) return false;

      const hasRec = Boolean(p.has_recipe || (p.ingredients_count > 0) || (p.ingredients && p.ingredients.length > 0));
      const margin = Number(p.margin ?? p.margin_percent ?? 0);

      if (profitFilter === 'WITH_RECIPE' && !hasRec) return false;
      if (profitFilter === 'WITHOUT_RECIPE' && hasRec) return false;
      if (profitFilter === 'HIGH_MARGIN' && margin < 50) return false;
      if (profitFilter === 'LOW_MARGIN' && margin >= 30) return false;

      return true;
    });
  }, [profitability, profitSearch, profitFilter]);

  const profitStats = useMemo(() => {
    const total = profitability.length;
    const withRecipe = profitability.filter((p) => p.has_recipe || (p.ingredients_count > 0) || (p.ingredients && p.ingredients.length > 0)).length;
    const totalMargin = profitability.reduce((acc, p) => acc + Number(p.margin ?? p.margin_percent ?? 0), 0);
    const avgMargin = total > 0 ? (totalMargin / total).toFixed(1) : '0.0';
    const totalCost = profitability.reduce((acc, p) => acc + Number(p.cost ?? p.recipe_cost ?? 0), 0);
    const avgCost = withRecipe > 0 ? Math.round(totalCost / withRecipe) : 0;
    return { total, withRecipe, avgMargin, avgCost };
  }, [profitability]);

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  return (
    <div className="ds-page inventory-page">
      {/* Toast Notification Moderno */}
      {toast && (
        <div className={`ds-inline-alert ds-inline-alert-${toast.type === 'error' ? 'danger' : toast.type === 'warning' ? 'warning' : 'success'}`} style={{ marginBottom: '20px' }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : toast.type === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
        </div>
      )}
      {/* HEADER PRINCIPAL */}
      <header className="ds-page-header">
        <div>
          <div style={{ color: 'var(--ds-text-secondary)', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
            Dashboard <span style={{ margin: '0 8px' }}>/</span> <span style={{ color: 'var(--ds-text-primary)' }}>Inventario</span>
          </div>
          <h1 className="ds-page-title">Inventario & Rentabilidad</h1>
          <p style={{ color: 'var(--ds-text-secondary)', fontSize: '16px', margin: 0 }}>
            Control selectivo por producto, compras de insumos, recetas y trazabilidad.
          </p>
        </div>
        <div className="ds-page-actions">
          <button onClick={() => reloadAll()} disabled={busy} className="ds-btn ds-btn-secondary" title="Recargar datos">
            <RefreshCw size={17} className={busy ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
          <button onClick={() => setActiveTab('compras')} className="ds-btn ds-btn-primary">
            <ShoppingCart size={17} />
            <span>Nueva Compra</span>
          </button>
        </div>
      </header>
      {/* TARJETAS RESUMEN INTERACTIVAS (CLICK FILTRA O CAMBIA VISTA) */}
      <section className="product-kpi-grid" style={{ marginBottom: '24px' }}>
        <article onClick={() => setActiveTab('insumos')} style={{ cursor: 'pointer' }}>
          <Boxes size={22} />
          <div>
            <strong>{inventorySummary.total}</strong>
            <span>Total Insumos</span>
          </div>
        </article>
        <article onClick={() => { setActiveTab('estado_stock'); setStockStatusFilter('saludable'); }} style={{ cursor: 'pointer' }}>
          <CheckCircle2 size={22} style={{ color: 'var(--ds-success)' }} />
          <div>
            <strong style={{ color: 'var(--ds-success)' }}>{inventorySummary.saludable}</strong>
            <span>Saludable</span>
          </div>
        </article>
        <article className={inventorySummary.bajo ? 'warning' : ''} onClick={() => { setActiveTab('alertas'); setAlertTabFilter('bajo'); }} style={{ cursor: 'pointer' }}>
          <AlertTriangle size={22} />
          <div>
            <strong>{inventorySummary.bajo}</strong>
            <span>Stock Bajo</span>
          </div>
        </article>
        <article className={inventorySummary.critico ? 'danger' : ''} onClick={() => { setActiveTab('alertas'); setAlertTabFilter('critico'); }} style={{ cursor: 'pointer' }}>
          <ShieldAlert size={22} />
          <div>
            <strong>{inventorySummary.critico}</strong>
            <span>Crítico</span>
          </div>
        </article>
        <article className={inventorySummary.agotado ? 'danger' : ''} onClick={() => { setActiveTab('alertas'); setAlertTabFilter('agotado'); }} style={{ cursor: 'pointer' }}>
          <Archive size={22} />
          <div>
            <strong>{inventorySummary.agotado}</strong>
            <span>Agotados</span>
          </div>
        </article>
      </section>

      {/* NAVEGACIÓN DE PESTAÑAS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'estado_stock' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('estado_stock')}>
          📦 Estado de Stock
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'alertas' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('alertas')}>
          🚨 Alertas {(inventorySummary.critico > 0 || inventorySummary.bajo > 0) ? `(${inventorySummary.critico + inventorySummary.bajo})` : ''}
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'insumos' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('insumos')}>
          <Boxes size={15} /> Insumos ({insumos.length})
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'compras' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('compras')}>
          <ShoppingCart size={15} /> Compras ({purchases.length})
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'recetas' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('recetas')}>
          <Utensils size={15} /> Recetas ({products.length})
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'kardex' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('kardex')}>
          <Archive size={15} /> Kardex / Movimientos ({movements.length})
        </button>
        <button className={`ds-btn ds-btn-sm ${activeTab === 'rentabilidad' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} onClick={() => setActiveTab('rentabilidad')}>
          <TrendingUp size={15} /> Rentabilidad
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: ESTADO DE STOCK 🚦 */}
      {/* ========================================================================= */}
      {activeTab === 'estado_stock' && (
        <div className="space-y-4">
          <div className="inventory-toolbar">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search size={18} className="ds-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar insumo por nombre, categoría o SKU…"
                className="ds-input ds-search"
              />
              {query && (
                <button onClick={() => setQuery('')} className="ds-text-muted hover:ds-text-secondary">
                  <X size={16} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', marginRight: '4px' }}>Filtros:</span>
              <button
                onClick={() => setStockStatusFilter('ALL')}
                className={`ds-btn ds-btn-sm ${stockStatusFilter === 'ALL' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
              >
                Todos ({insumosWithStatus.length})
              </button>
              <button
                onClick={() => setStockStatusFilter('saludable')}
                className={`ds-btn ds-btn-sm ${stockStatusFilter === 'saludable' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
                style={stockStatusFilter !== 'saludable' ? { color: 'var(--ds-success)' } : {}}
              >
                🟢 Saludable ({inventorySummary.saludable})
              </button>
              <button
                onClick={() => setStockStatusFilter('bajo')}
                className={`ds-btn ds-btn-sm ${stockStatusFilter === 'bajo' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
                style={stockStatusFilter !== 'bajo' ? { color: 'var(--ds-warning)' } : {}}
              >
                🟡 Bajo ({inventorySummary.bajo})
              </button>
              <button
                onClick={() => setStockStatusFilter('critico')}
                className={`ds-btn ds-btn-sm ${stockStatusFilter === 'critico' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
                style={stockStatusFilter !== 'critico' ? { color: 'var(--ds-danger)' } : {}}
              >
                🔴 Crítico ({inventorySummary.critico})
              </button>
              <button
                onClick={() => setStockStatusFilter('agotado')}
                className={`ds-btn ds-btn-sm ${stockStatusFilter === 'agotado' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
              >
                ⚫ Agotado ({inventorySummary.agotado})
              </button>
            </div>
          </div>

          <div className="ds-card">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead className=" ds-text-secondary font-bold uppercase text-xs tracking-wider border-b ">
                  <tr>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Insumo</th>
                    <th className="py-3.5 px-4 text-right">Stock Actual</th>
                    <th className="py-3.5 px-4">Unidad</th>
                    <th className="py-3.5 px-4 text-right">Stock Mínimo</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {filteredStockInsumos.map((item) => {
                    const status = item.statusMeta;
                    const stockNum = Number(item.stock) || 0;
                    const minStockNum = Number(item.min_stock) || 0;

                    return (
                      <tr key={item.id} className="hover: transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`ds-badge ${status.badgeClass}`} style={{ fontSize: '12px', padding: '4px 10px', gap: '6px' }}>
                            <span>{status.symbol}</span>
                            <span>{status.label}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold ">{item.name}</div>
                          <div className="text-xs ds-text-muted">
                            {item.category || 'General'} {item.sku ? `· SKU: ${item.sku}` : ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black ">
                          {stockNum.toLocaleString('es-CO')}
                        </td>
                        <td className="py-3.5 px-4 ds-text-secondary capitalize">
                          {item.unit || 'unidad'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {minStockNum > 0 ? (
                            <span className="font-semibold text-neutral-700">
                              {minStockNum.toLocaleString('es-CO')} {item.unit}
                            </span>
                          ) : (
                            <span className="text-xs ds-text-muted italic">Sin alerta configurada</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenMinStockModal(item)}
                              className="ds-btn ds-btn-secondary ds-btn-sm"
                              title="Configurar stock mínimo"
                            >
                              Configurar Mínimo
                            </button>
                            <button
                              onClick={() => {
                                setPurchaseForm((prev) => ({
                                  ...prev,
                                  inventory_id: item.id,
                                  purchase_unit: item.unit
                                }));
                                setActiveTab('compras');
                              }}
                              className="ds-btn ds-btn-primary ds-btn-sm"
                              title="Comprar este insumo"
                            >
                              Comprar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!filteredStockInsumos.length && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center ds-text-muted">
                        No se encontraron insumos con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: ALERTAS DE INVENTARIO 🚨 */}
      {/* ========================================================================= */}
      {activeTab === 'alertas' && (
        <div className="space-y-4">
          <div className="inventory-toolbar">
            <div className="text-sm font-semibold ds-text-secondary">
              Insumos con atención requerida: Críticos, Bajos y Agotados
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setAlertTabFilter('ALL')}
                className={`ds-btn ds-btn-sm ${alertTabFilter === 'ALL' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
              >
                Todas las alertas ({inventorySummary.critico + inventorySummary.bajo + inventorySummary.agotado})
              </button>
              <button
                onClick={() => setAlertTabFilter('critico')}
                className={`ds-btn ds-btn-sm ${alertTabFilter === 'critico' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
                style={alertTabFilter !== 'critico' ? { color: 'var(--ds-danger)' } : {}}
              >
                🔴 Críticos ({inventorySummary.critico})
              </button>
              <button
                onClick={() => setAlertTabFilter('bajo')}
                className={`ds-btn ds-btn-sm ${alertTabFilter === 'bajo' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
                style={alertTabFilter !== 'bajo' ? { color: 'var(--ds-warning)' } : {}}
              >
                🟡 Stock Bajo ({inventorySummary.bajo})
              </button>
              <button
                onClick={() => setAlertTabFilter('agotado')}
                className={`ds-btn ds-btn-sm ${alertTabFilter === 'agotado' ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
              >
                ⚫ Agotados ({inventorySummary.agotado})
              </button>
            </div>
          </div>

          {alertInsumos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alertInsumos.map((item) => {
                const status = item.statusMeta;
                const stockNum = Number(item.stock) || 0;
                const minStockNum = Number(item.min_stock) || 0;

                return (
                  <div
                    key={item.id}
                    className="ds-card"
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span className={`ds-badge ${status.badgeClass}`} style={{ fontSize: '12px', padding: '4px 10px', gap: '6px' }}>
                          <span>{status.symbol}</span>
                          <span>{status.actionBadge}</span>
                        </span>
                        <span className="ds-badge ds-badge-neutral">{item.category || 'General'}</span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--ds-text-primary)', marginBottom: '12px' }}>
                        {item.name}
                      </h3>

                      <div style={{ background: 'var(--ds-bg-elevated)', borderRadius: '10px', padding: '12px', border: '1px solid var(--ds-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                          <span style={{ color: 'var(--ds-text-secondary)' }}>Stock Actual:</span>
                          <strong style={{ color: status.key === 'agotado' ? 'var(--ds-text-muted)' : status.key === 'critico' ? 'var(--ds-danger)' : 'var(--ds-warning)' }}>
                            {stockNum.toLocaleString('es-CO')} {item.unit}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                          <span style={{ color: 'var(--ds-text-secondary)' }}>Stock Mínimo:</span>
                          <span style={{ color: 'var(--ds-text-primary)', fontWeight: '600' }}>
                            {minStockNum > 0 ? `${minStockNum.toLocaleString('es-CO')} ${item.unit}` : 'No definido'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '6px', borderTop: '1px solid var(--ds-border)', color: 'var(--ds-text-muted)' }}>
                          <span>Diagnóstico:</span>
                          <span>{status.description}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--ds-border)', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenMinStockModal(item)}
                        className="ds-btn ds-btn-secondary ds-btn-sm"
                      >
                        Ajustar Mínimo
                      </button>
                      <button
                        onClick={() => {
                          setPurchaseForm((prev) => ({
                            ...prev,
                            inventory_id: item.id,
                            purchase_unit: item.unit
                          }));
                          setActiveTab('compras');
                        }}
                        className="ds-btn ds-btn-primary ds-btn-sm"
                      >
                        <ShoppingCart size={14} />
                        <span>Comprar Ahora</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="ds-card ds-empty-state">
              <div className="w-16 h-16  rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={36} className="ds-text-success" />
              </div>
              <h3 className="text-xl font-black text-emerald-900 mb-1">✓ Todo el inventario está en buen estado</h3>
              <p className="text-sm ds-text-success max-w-md mx-auto">
                No hay insumos críticos, bajos ni agotados en este momento. Todos los insumos con stock mínimo cuentan con suficiente existencia.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: INSUMOS (CATÁLOGO MAESTRO) */}
      {/* ========================================================================= */}
      {activeTab === 'insumos' && (
        <div className="space-y-4">
          <div className="inventory-toolbar">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search size={18} className="ds-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar insumo por nombre o SKU…"
                className="ds-input ds-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleOpenAdjust()} className="ds-btn ds-btn-secondary">
                <AlertTriangle size={16} />
                <span>Merma / Ajuste</span>
              </button>
              <button onClick={() => handleOpenInsumo()} className="ds-btn ds-btn-primary">
                <Plus size={16} />
                <span>Nuevo Insumo</span>
              </button>
            </div>
          </div>

          <div className="ds-card">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead className=" ds-text-secondary font-bold uppercase text-xs tracking-wider border-b ">
                  <tr>
                    <th className="py-3.5 px-4">Insumo</th>
                    <th className="py-3.5 px-4">Categoría</th>
                    <th className="py-3.5 px-4 text-right">Existencia</th>
                    <th className="py-3.5 px-4">Unidad Base</th>
                    <th className="py-3.5 px-4 text-right">Stock Mínimo</th>
                    <th className="py-3.5 px-4 text-right">Costo Promedio</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {filteredStockInsumos.map((item) => (
                    <tr key={item.id} className="hover: transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold ">{item.name}</div>
                        <div className="text-xs ds-text-muted">SKU: {item.sku || 'N/A'}</div>
                      </td>
                      <td className="py-3.5 px-4 ds-text-secondary">{item.category || 'General'}</td>
                      <td className="py-3.5 px-4 text-right font-black ">
                        {Number(item.stock).toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 ds-text-secondary capitalize">{item.unit || 'unidad'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-neutral-700">
                        {Number(item.min_stock) > 0 ? Number(item.min_stock).toLocaleString('es-CO') : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold ds-text-warning">
                        {formatCurrency(Number(item.average_cost) || 0)} / {item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenInsumo(item)}
                            className="ds-btn ds-btn-secondary ds-btn-sm"
                            title="Editar datos del insumo"
                          >
                            <Edit3 size={14} /> Editar
                          </button>
                          <button
                            onClick={() => handleOpenAdjust(item)}
                            className="ds-btn ds-btn-secondary ds-btn-sm"
                            style={{ color: 'var(--ds-warning)' }}
                            title="Registrar merma o ajuste"
                          >
                            <AlertTriangle size={14} /> Ajuste
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredStockInsumos.length && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center ds-text-muted">
                        No hay insumos registrados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: COMPRAS DE INVENTARIO (CON PROVEEDORES INTELIGENTES Y EDICIÓN) */}
      {/* ========================================================================= */}
      {activeTab === 'compras' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. Formulario de Registro (Arriba, Espacioso y Cómodo) */}
          <section className="ds-card">
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="ds-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <ShoppingCart size={20} color="var(--ds-primary)" /> Registrar Compra de Inventario
              </h2>
              <span className="ds-badge ds-badge-success">+ Entrada de Stock Físico</span>
            </div>

            <form onSubmit={handleSavePurchase} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Insumo */}
                <div className="ds-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="ds-form-label" style={{ margin: 0 }}>Insumo a Comprar *</label>
                    <button
                      type="button"
                      onClick={() => setQuickInsumoModal(true)}
                      className="ds-btn ds-btn-ghost ds-btn-sm"
                      style={{ fontSize: '12px', color: 'var(--ds-primary)', padding: '2px 8px', height: 'auto' }}
                    >
                      + Crear Insumo
                    </button>
                  </div>
                  <select
                    className="ds-select"
                    value={purchaseForm.inventory_id}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, inventory_id: e.target.value })}
                    required
                  >
                    <option value="">Selecciona un insumo del catálogo…</option>
                    {insumos.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit}) — Stock Actual: {Number(i.stock).toLocaleString('es-CO')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proveedor Inteligente Autocompletable */}
                <div className="ds-form-group" style={{ position: 'relative' }}>
                  <label className="ds-form-label">
                    Proveedor (Sugerencias Inteligentes)
                  </label>
                  <input
                    type="text"
                    className="ds-input"
                    placeholder="Escribe o selecciona proveedor…"
                    value={purchaseForm.supplier}
                    onFocus={() => setSupplierInputFocused(true)}
                    onBlur={() => setTimeout(() => setSupplierInputFocused(false), 250)}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                  />

                  {supplierInputFocused && filteredSuppliers.length > 0 && (
                    <div className="ds-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, maxHeight: '180px', overflowY: 'auto', marginTop: '4px', boxShadow: 'var(--ds-shadow-lg)' }}>
                      <div style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--ds-text-muted)', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid var(--ds-border)' }}>
                        Proveedores sugeridos
                      </div>
                      {filteredSuppliers.map((sup, idx) => (
                        <div
                          key={idx}
                          onMouseDown={() => {
                            setPurchaseForm((prev) => ({ ...prev, supplier: sup }));
                            setSupplierInputFocused(false);
                          }}
                          style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span>{sup}</span>
                          <Check size={14} color="var(--ds-primary)" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Fila Cantidades y Costos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Cantidad Comprada *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="ds-input"
                    placeholder="Ej: 5"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Unidad de Compra *</label>
                  <select
                    className="ds-select capitalize"
                    value={purchaseForm.purchase_unit}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_unit: e.target.value })}
                    required
                  >
                    {selectedPurchaseInsumo?.unit === 'gramos' ? (
                      <>
                        <option value="kg">Kilogramos (Kg)</option>
                        <option value="lb">Libras (Lb = 500g)</option>
                        <option value="gramos">Gramos (g)</option>
                      </>
                    ) : selectedPurchaseInsumo?.unit === 'mililitros' ? (
                      <>
                        <option value="l">Litros (L)</option>
                        <option value="mililitros">Mililitros (ml)</option>
                      </>
                    ) : selectedPurchaseInsumo?.unit === 'unidad' ? (
                      <>
                        <option value="unidad">Unidad (und)</option>
                        <option value="docena">Docena (12 und)</option>
                      </>
                    ) : (
                      <option value={selectedPurchaseInsumo?.unit || 'unidad'}>
                        {selectedPurchaseInsumo?.unit || 'Unidad'}
                      </option>
                    )}
                  </select>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Costo Total Pagado ($) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="ds-input"
                    placeholder="Ej: 75000"
                    value={purchaseForm.total_cost}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, total_cost: e.target.value })}
                    required
                  />
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Costo Unit. Factura ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="ds-input"
                    placeholder="Calculado auto"
                    value={
                      purchaseConversionInfo?.costPerPurchaseUnit
                        ? Math.round(purchaseConversionInfo.costPerPurchaseUnit)
                        : ''
                    }
                    readOnly
                  />
                </div>
              </div>

              {/* Conversión matemática */}
              {purchaseConversionInfo && (
                <div style={{ background: 'rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.25)', borderRadius: '10px', padding: '14px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--ds-text-secondary)', fontWeight: '600' }}>Conversión a Unidad Base del Inventario:</span>
                    <strong style={{ color: 'var(--ds-primary)', fontSize: '15px' }}>
                      +{purchaseConversionInfo.convertedQty.toLocaleString('es-CO')} {purchaseConversionInfo.baseUnit}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ds-text-secondary)', fontSize: '12px' }}>
                    <span>Costo unitario resultante por unidad base:</span>
                    <span style={{ color: 'var(--ds-text-primary)', fontWeight: '700' }}>
                      ${purchaseConversionInfo.costPerBaseUnit.toFixed(2)} / {purchaseConversionInfo.baseUnit}
                    </span>
                  </div>
                </div>
              )}

              {/* Fila Fecha y Notas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', gap: '16px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Fecha de Compra *</label>
                  <input
                    type="date"
                    className="ds-input"
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                    required
                  />
                </div>
                <div className="ds-form-group">
                  <label className="ds-form-label">Notas u Observaciones del Insumo / Factura</label>
                  <input
                    type="text"
                    className="ds-input"
                    placeholder="Ej: Factura #1042, Proveedor Don Pedro, lote fresco, etc."
                    value={purchaseForm.notes}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={busy || !purchaseForm.inventory_id}
                  className="ds-btn ds-btn-primary"
                  style={{ minWidth: '220px', height: '42px', justifyContent: 'center' }}
                >
                  <CheckCircle2 size={18} />
                  <span>Registrar Entrada de Stock</span>
                </button>
              </div>
            </form>
          </section>

          {/* 2. Historial de Compras (Abajo, Ancho Completo, con Notas Visibles) */}
          <section className="ds-card">
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="ds-card-title" style={{ margin: 0 }}>Historial de Compras</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
                  Registro de compras y facturación con trazabilidad y notas
                </p>
              </div>
              <span className="ds-badge ds-badge-neutral">{purchases.length} registradas</span>
            </div>

            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Insumo</th>
                    <th>Cant. Factura</th>
                    <th>Ingreso a Stock Base</th>
                    <th>Costo Total</th>
                    <th>Proveedor</th>
                    <th>Notas / Observaciones</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono ds-text-muted" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {p.purchase_date ? new Date(p.purchase_date).toLocaleDateString('es-CO') : '—'}
                      </td>
                      <td>
                        <strong>{p.inventory_title}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--ds-text-muted)' }}>Compra #{p.id}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600' }}>
                          {Number(p.quantity).toLocaleString('es-CO')} {p.purchase_unit || p.inventory_unit}
                        </span>
                      </td>
                      <td>
                        <span className="ds-badge ds-badge-success" style={{ fontSize: '12px' }}>
                          +{Number(p.converted_quantity || p.quantity).toLocaleString('es-CO')} {p.inventory_unit}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--ds-warning)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(p.total_cost)}
                      </td>
                      <td>
                        <span className="ds-badge ds-badge-neutral">{p.supplier || 'General'}</span>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '12px' }}>
                        {p.notes ? (
                          <span style={{ color: 'var(--ds-text-primary)' }}>{p.notes}</span>
                        ) : (
                          <span style={{ color: 'var(--ds-text-muted)', fontStyle: 'italic' }}>Sin notas</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenEditPurchase(p)}
                          className="ds-btn ds-btn-secondary ds-btn-sm"
                          title="Editar compra de forma segura"
                        >
                          <Edit3 size={13} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!purchases.length && (
                    <tr>
                      <td colSpan={8} className="ds-empty-state" style={{ textAlign: 'center', padding: '32px' }}>
                        No hay compras registradas aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 5: RECETAS */}
      {/* ========================================================================= */}
      {activeTab === 'recetas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Columna Izquierda: Selección y Adición */}
          <section className="ds-card">
            <div className="ds-card-header">
              <h2 className="ds-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Utensils size={18} color="var(--ds-primary)" /> Configurar Receta
              </h2>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="ds-form-group">
                <label className="ds-form-label">Producto de Venta (Carta) *</label>
                <select
                  className="ds-select"
                  value={selectedRecipeProduct}
                  onChange={(e) => setSelectedRecipeProduct(e.target.value)}
                >
                  <option value="">Selecciona un producto…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({formatCurrency(p.price)})
                    </option>
                  ))}
                </select>
              </div>

              {activeSelectedProduct && (
                <form onSubmit={handleAddRecipeItem} style={{ background: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ds-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    + Agregar Insumo a la Receta
                  </h3>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Insumo Físico *</label>
                    <select
                      className="ds-select"
                      value={newRecipeInsumo}
                      onChange={(e) => setNewRecipeInsumo(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar insumo…</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} (en {i.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">
                      Cantidad por Venta (en unidad base) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      className="ds-input"
                      placeholder="Ej: 120 (g) o 1 (und)"
                      value={newRecipeQty}
                      onChange={(e) => setNewRecipeQty(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={busy} className="ds-btn ds-btn-primary ds-w-full" style={{ justifyContent: 'center' }}>
                    <Plus size={16} />
                    <span>Vincular Ingrediente</span>
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* Columna Derecha: Ficha Técnica */}
          <section className="ds-card">
            <div className="ds-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="ds-card-title" style={{ margin: 0 }}>
                  {activeSelectedProduct ? `Ficha Técnica: ${activeSelectedProduct.title}` : 'Ficha Técnica de Insumos'}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
                  Insumos físicos que se descuentan automáticamente con cada venta
                </p>
              </div>
              {activeSelectedProduct && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Costo Receta</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ds-warning)' }}>{formatCurrency(activeRecipeCost)}</div>
                </div>
              )}
            </div>

            {selectedRecipeProduct ? (
              <div>
                <div className="ds-table-container">
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>Insumo</th>
                        <th style={{ textAlign: 'right' }}>Dosificación</th>
                        <th style={{ textAlign: 'right' }}>Costo Promedio</th>
                        <th style={{ textAlign: 'right' }}>Costo en Porción</th>
                        <th style={{ textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRecipeItems.map((item) => {
                        const unitCost = Number(item.inventory_average_cost) || 0;
                        const qty = Number(item.quantity) || 0;
                        const portionCost = unitCost * qty;

                        return (
                          <tr key={item.id}>
                            <td><strong>{item.inventory_title}</strong></td>
                            <td style={{ textAlign: 'right', fontWeight: '700' }}>
                              {qty} {item.inventory_unit}
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--ds-text-muted)' }}>
                              {formatCurrency(unitCost)} / {item.inventory_unit}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--ds-warning)' }}>
                              {formatCurrency(portionCost)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteRecipeItem(item.id)}
                                className="ds-btn ds-btn-danger ds-btn-sm"
                                title="Eliminar insumo de receta"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!activeRecipeItems.length && (
                        <tr>
                          <td colSpan={5} className="ds-empty-state" style={{ textAlign: 'center', padding: '32px' }}>
                            Este producto aún no tiene insumos vinculados en su receta.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {activeSelectedProduct && activeRecipeItems.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px', background: 'var(--ds-bg-elevated)', borderTop: '1px solid var(--ds-border)', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: 'var(--ds-text-secondary)' }}>Precio Venta: </span>
                      <strong style={{ color: 'var(--ds-text-primary)' }}>{formatCurrency(activeSelectedProduct.price)}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--ds-text-secondary)' }}>Ganancia Bruta: </span>
                      <strong style={{ color: 'var(--ds-success)' }}>
                        {formatCurrency(activeSelectedProduct.price - activeRecipeCost)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--ds-text-secondary)' }}>Margen Teórico: </span>
                      <span className="ds-badge ds-badge-success" style={{ fontSize: '12px' }}>
                        {(
                          ((activeSelectedProduct.price - activeRecipeCost) / (activeSelectedProduct.price || 1)) *
                          100
                        ).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="ds-empty-state" style={{ textAlign: 'center', padding: '48px', color: 'var(--ds-text-muted)' }}>
                Selecciona un producto en la columna izquierda para gestionar o crear su receta técnica.
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 6: KARDEX / MOVIMIENTOS POTENCIADO (CON ORIGEN Y MODAL) */}
      {/* ========================================================================= */}
      {activeTab === 'kardex' && (
        <div className="space-y-4">
          {/* Filtros avanzados del Kardex */}
          <section className="ds-card" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
              {/* Buscador */}
              <div className="ds-form-group">
                <label className="ds-form-label">Buscar en Movimientos</label>
                <div className="ds-search">
                  <Search size={16} className="ds-search-icon" />
                  <input
                    type="text"
                    value={kardexSearch}
                    onChange={(e) => setKardexSearch(e.target.value)}
                    placeholder="Insumo, pedido, proveedor…"
                    className="ds-search-input ds-input"
                  />
                  {kardexSearch && (
                    <button onClick={() => setKardexSearch('')} style={{ background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer', padding: '4px' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Insumo */}
              <div className="ds-form-group">
                <label className="ds-form-label">Insumo</label>
                <select
                  className="ds-select"
                  value={kardexFilterInsumo}
                  onChange={(e) => setKardexFilterInsumo(e.target.value)}
                >
                  <option value="">Todos los insumos</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div className="ds-form-group">
                <label className="ds-form-label">Tipo de Movimiento</label>
                <select
                  className="ds-select"
                  value={kardexFilterType}
                  onChange={(e) => setKardexFilterType(e.target.value)}
                >
                  <option value="ALL">Todos los tipos</option>
                  <option value="COMPRA">COMPRA</option>
                  <option value="VENTA">VENTA</option>
                  <option value="CANCELACION">CANCELACIÓN</option>
                  <option value="MERMA">MERMA</option>
                  <option value="CORRECCION">CORRECCIÓN</option>
                  <option value="CONTEO_FISICO">CONTEO FÍSICO</option>
                  <option value="AJUSTE">AJUSTE</option>
                </select>
              </div>

              {/* Fecha Desde */}
              <div className="ds-form-group">
                <label className="ds-form-label">Fecha Desde</label>
                <input
                  type="date"
                  className="ds-input"
                  value={kardexDateFrom}
                  onChange={(e) => setKardexDateFrom(e.target.value)}
                />
              </div>

              {/* Fecha Hasta */}
              <div className="ds-form-group">
                <label className="ds-form-label">Fecha Hasta</label>
                <input
                  type="date"
                  className="ds-input"
                  value={kardexDateTo}
                  onChange={(e) => setKardexDateTo(e.target.value)}
                />
              </div>
            </div>

            {(kardexFilterInsumo || kardexFilterType !== 'ALL' || kardexDateFrom || kardexDateTo || kardexSearch) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  onClick={() => {
                    setKardexFilterInsumo('');
                    setKardexFilterType('ALL');
                    setKardexDateFrom('');
                    setKardexDateTo('');
                    setKardexSearch('');
                  }}
                  className="ds-btn ds-btn-secondary ds-btn-sm"
                >
                  <X size={14} /> Limpiar Filtros
                </button>
              </div>
            )}
          </section>

          <div className="ds-card">
            <div className="p-4 border-b  flex items-center justify-between text-xs ds-text-muted font-bold">
              <span>{movements.length} movimientos encontrados</span>
              <span className="ds-text-muted">Haz clic en cualquier fila para ver el detalle completo</span>
            </div>

            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Insumo</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Entrada</th>
                    <th style={{ textAlign: 'right' }}>Salida</th>
                    <th style={{ textAlign: 'right' }}>Stock Resultante</th>
                    <th>Origen del Movimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {movements.map((m) => {
                    const qty = Number(m.quantity) || 0;
                    const isPositive = qty > 0;
                    const isNegative = qty < 0;

                    // Formatear origen
                    let origenTexto = 'Operación directa';
                    if (m.order_id) {
                      origenTexto = `Pedido #${m.order_id}${m.sold_product_title ? ` · ${m.sold_product_title}` : ''}`;
                    } else if (m.purchase_id) {
                      origenTexto = `Compra #${m.purchase_id}${m.purchase_supplier ? ` · ${m.purchase_supplier}` : ''}`;
                    } else if (m.reason) {
                      origenTexto = m.reason;
                    }

                    return (
                      <tr
                        key={m.id}
                        onClick={() => {
                          setSelectedMovement(m);
                          setMovementDetailModal(true);
                        }}
                        className="hover: cursor-pointer transition-colors text-xs"
                      >
                        <td className="py-3 px-3 whitespace-nowrap ds-text-muted font-mono">
                          {formatDateTime(m.created_at)}
                        </td>
                        <td className="py-3 px-3 font-bold ">{m.inventory_title}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`ds-badge ${
    m.movement_type === 'COMPRA'
      ? 'ds-badge-success'
      : m.movement_type === 'VENTA'
      ? 'ds-badge-info'
      : m.movement_type === 'CANCELACION'
      ? 'ds-badge-warning'
      : m.movement_type === 'CORRECCION'
      ? 'ds-badge-primary'
      : 'ds-badge-danger'
  }`}
                          >
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black ds-text-success">
                          {isPositive ? `+${qty.toLocaleString('es-CO')}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-black ds-text-danger">
                          {isNegative ? `${qty.toLocaleString('es-CO')}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold ">
                          {Number(m.balance_after).toLocaleString('es-CO')} {m.inventory_unit}
                        </td>
                        <td className="py-3 px-3 ds-text-secondary max-w-xs truncate" title={origenTexto}>
                          {origenTexto}
                        </td>
                      </tr>
                    );
                  })}
                  {!movements.length && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center ds-text-muted">
                        No hay movimientos de stock que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 7: RENTABILIDAD DE PRODUCTOS */}
      {/* ========================================================================= */}
      {activeTab === 'rentabilidad' && (
        <div className="ds-form-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header & Subtítulo */}
          <div className="ds-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="ds-card-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <TrendingUp size={20} style={{ color: 'var(--ds-primary)' }} />
                  <span>Rentabilidad de la Carta</span>
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
                  Comparativa detallada entre precio de venta, costo de receta técnica y margen bruto por porción
                </p>
              </div>
              <button 
                onClick={() => reloadAll()} 
                disabled={busy} 
                className="ds-btn ds-btn-sm ds-btn-secondary"
                title="Recargar datos de rentabilidad"
              >
                <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                <span>Actualizar Datos</span>
              </button>
            </div>

            {/* Micro-KPIs de Rentabilidad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--ds-border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Productos</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-text-primary)', marginTop: '2px' }}>{profitStats.total}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--ds-border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Con Receta Técnica</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-success)', marginTop: '2px' }}>{profitStats.withRecipe} / {profitStats.total}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--ds-border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Costo Promedio Receta</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-warning)', marginTop: '2px' }}>{formatCurrency(profitStats.avgCost)}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--ds-border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--ds-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Margen Promedio</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-primary)', marginTop: '2px' }}>{profitStats.avgMargin}%</div>
              </div>
            </div>
          </div>

          {/* Filtros y Buscador */}
          <div className="ds-card" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'end' }}>
              <div className="ds-form-group">
                <label className="ds-form-label">Buscar Producto o Categoría</label>
                <div className="ds-search">
                  <Search size={16} className="ds-search-icon" />
                  <input
                    type="text"
                    value={profitSearch}
                    onChange={(e) => setProfitSearch(e.target.value)}
                    placeholder="Ej: Combo 1, Hamburguesa, Postre…"
                    className="ds-search-input ds-input"
                  />
                  {profitSearch && (
                    <button onClick={() => setProfitSearch('')} style={{ background: 'none', border: 'none', color: 'var(--ds-text-muted)', cursor: 'pointer', padding: '4px' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="ds-form-group">
                <label className="ds-form-label">Filtrar por Estado o Margen</label>
                <select
                  className="ds-select"
                  value={profitFilter}
                  onChange={(e) => setProfitFilter(e.target.value)}
                >
                  <option value="ALL">Todos los productos ({profitability.length})</option>
                  <option value="WITH_RECIPE">Con Receta Técnica Configurada</option>
                  <option value="WITHOUT_RECIPE">Sin Receta (Costo $0)</option>
                  <option value="HIGH_MARGIN">Margen Alto (≥ 50%)</option>
                  <option value="LOW_MARGIN">Margen Bajo (&lt; 30%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Rentabilidad con Detalle */}
          <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="p-4 border-b flex items-center justify-between text-xs ds-text-muted font-bold" style={{ padding: '14px 20px' }}>
              <span>{filteredProfitability.length} productos analizados</span>
              <span style={{ color: 'var(--ds-text-secondary)', fontSize: '12px' }}>
                💡 Haz clic en cualquier fila o en "Detalle" para ver los insumos y costos de cada receta
              </span>
            </div>

            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Receta Técnica</th>
                    <th style={{ textAlign: 'right' }}>Precio Venta</th>
                    <th style={{ textAlign: 'right' }}>Costo Receta</th>
                    <th style={{ textAlign: 'right' }}>Ganancia Bruta</th>
                    <th style={{ textAlign: 'right' }}>Margen (%)</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfitability.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ds-text-muted)' }}>
                        <Utensils size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>No se encontraron productos</div>
                        <div style={{ fontSize: '13px', marginTop: '4px' }}>
                          {profitSearch ? 'Prueba con otro término de búsqueda.' : 'No hay productos disponibles en la carta.'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProfitability.map((p) => {
                      const id = p.id || p.product_id;
                      const title = p.title || p.product_title || 'Sin Nombre';
                      const category = p.category || 'General';
                      const price = Number(p.price ?? p.sale_price ?? 0);
                      const cost = Number(p.cost ?? p.recipe_cost ?? 0);
                      const profit = Number(p.profit ?? p.gross_profit ?? (price - cost));
                      const margin = Number(p.margin ?? p.margin_percent ?? (price > 0 ? ((profit / price) * 100) : 0));
                      const ingredients = p.ingredients || [];
                      const hasRecipe = Boolean(p.has_recipe || p.ingredients_count > 0 || ingredients.length > 0);
                      const isExpanded = expandedProfitId === id;

                      return (
                        <React.Fragment key={id}>
                          <tr 
                            style={{ 
                              cursor: 'pointer', 
                              backgroundColor: isExpanded ? 'rgba(212, 160, 23, 0.05)' : 'transparent',
                              transition: 'background-color 0.15s ease'
                            }}
                            onClick={() => setExpandedProfitId(isExpanded ? null : id)}
                          >
                            <td>
                              <strong style={{ color: 'var(--ds-text-primary)', fontSize: '13px' }}>{title}</strong>
                            </td>
                            <td>
                              <span style={{ color: 'var(--ds-text-secondary)', fontSize: '13px' }}>{category}</span>
                            </td>
                            <td>
                              {hasRecipe ? (
                                <span className="ds-badge ds-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Check size={11} /> {p.ingredients_count || ingredients.length} insumo{(p.ingredients_count || ingredients.length) !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="ds-badge ds-badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <AlertCircle size={11} /> Sin receta
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ds-text-primary)' }}>
                              {formatCurrency(price)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: cost > 0 ? 'var(--ds-warning)' : 'var(--ds-text-muted)' }}>
                              {formatCurrency(cost)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: profit > 0 ? 'var(--ds-success)' : 'var(--ds-danger)' }}>
                              {formatCurrency(profit)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span
                                className={`ds-badge ${
                                  margin >= 50
                                    ? 'ds-badge-success'
                                    : margin >= 30
                                    ? 'ds-badge-warning'
                                    : 'ds-badge-danger'
                                }`}
                                style={{ fontWeight: 700 }}
                              >
                                {margin.toFixed(1)}%
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className={`ds-btn ds-btn-xs ${isExpanded ? 'ds-btn-primary' : 'ds-btn-secondary'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedProfitId(isExpanded ? null : id);
                                }}
                                title="Ver desglose de insumos y costos"
                              >
                                {isExpanded ? <ChevronDown size={13} /> : <Eye size={13} />}
                                <span>{isExpanded ? 'Ocultar' : 'Detalle'}</span>
                              </button>
                            </td>
                          </tr>

                          {/* FILA EXPANDIBLE: DESGLOSE DE RECETA / INSUMOS */}
                          {isExpanded && (
                            <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}>
                              <td colSpan={8} style={{ padding: '16px 20px', borderLeft: '3px solid var(--ds-primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Utensils size={16} style={{ color: 'var(--ds-primary)' }} />
                                    <strong style={{ fontSize: '14px', color: 'var(--ds-text-primary)' }}>
                                      Ficha de Insumos & Costos: {title}
                                    </strong>
                                    <span style={{ fontSize: '12px', color: 'var(--ds-text-muted)' }}>
                                      ({ingredients.length} componentes vinculados)
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="ds-btn ds-btn-xs ds-btn-secondary"
                                    onClick={() => {
                                      setSelectedRecipeProduct(id);
                                      setActiveTab('recetas');
                                    }}
                                  >
                                    <Edit3 size={13} />
                                    <span>Editar Receta en Gestión</span>
                                  </button>
                                </div>

                                {ingredients.length === 0 ? (
                                  <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', textAlign: 'center', color: 'var(--ds-text-secondary)', fontSize: '13px' }}>
                                    Este producto aún no tiene insumos asignados a su receta. Su costo se asume en $0.{' '}
                                    <button
                                      type="button"
                                      className="ds-btn ds-btn-xs ds-btn-primary"
                                      style={{ marginLeft: '10px' }}
                                      onClick={() => {
                                        setSelectedRecipeProduct(id);
                                        setActiveTab('recetas');
                                      }}
                                    >
                                      + Configurar Receta Ahora
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ background: 'var(--ds-surface)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--ds-border-subtle)' }}>
                                    <table className="ds-table" style={{ margin: 0, fontSize: '12px' }}>
                                      <thead>
                                        <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                          <th style={{ padding: '8px 12px' }}>Insumo</th>
                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cantidad Dosificada</th>
                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Costo Unitario Prom.</th>
                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Costo en la Porción</th>
                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>% del Costo</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {ingredients.map((ing) => {
                                          const subtotal = Number(ing.subtotal_cost) || 0;
                                          const pct = cost > 0 ? ((subtotal / cost) * 100).toFixed(1) : '0.0';
                                          return (
                                            <tr key={ing.id || ing.inventory_id}>
                                              <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ds-text-primary)' }}>
                                                {ing.name}
                                              </td>
                                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--ds-text-secondary)' }}>
                                                {Number(ing.quantity).toLocaleString('es-CO')} {ing.unit}
                                              </td>
                                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--ds-text-muted)' }}>
                                                {formatCurrency(ing.average_cost)} / {ing.unit}
                                              </td>
                                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--ds-warning)' }}>
                                                {formatCurrency(subtotal)}
                                              </td>
                                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--ds-text-secondary)' }}>
                                                {pct}%
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot>
                                        <tr style={{ background: 'rgba(255, 255, 255, 0.04)', fontWeight: 700, borderTop: '1px solid var(--ds-border-subtle)' }}>
                                          <td style={{ padding: '10px 12px', color: 'var(--ds-text-primary)' }}>
                                            Total Costo Receta:
                                          </td>
                                          <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--ds-text-secondary)' }}>
                                            Precio Venta: <strong>{formatCurrency(price)}</strong> · Ganancia: <strong style={{ color: 'var(--ds-success)' }}>{formatCurrency(profit)}</strong>
                                          </td>
                                          <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--ds-warning)', fontSize: '13px' }}>
                                            {formatCurrency(cost)}
                                          </td>
                                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                            <span className={`ds-badge ${margin >= 50 ? 'ds-badge-success' : margin >= 30 ? 'ds-badge-warning' : 'ds-badge-danger'}`}>
                                              {margin.toFixed(1)}% Margen
                                            </span>
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AJUSTE RÁPIDO DE STOCK MÍNIMO */}
      {/* ========================================================================= */}
      {minStockModal && minStockItem && (
        <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setMinStockModal(false)}>
          <div className="ds-modal" style={{ maxWidth: '480px' }}>
            <div className="ds-modal-header">
              <h2 className="ds-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="var(--ds-warning)" />
                <span>Configurar Stock Mínimo</span>
              </h2>
              <button className="ds-modal-close" onClick={() => setMinStockModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMinStock}>
              <div className="ds-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--ds-text-primary)' }}>{minStockItem.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', marginTop: '4px' }}>
                    Stock actual: <strong style={{ color: 'var(--ds-text-primary)' }}>{Number(minStockItem.stock).toLocaleString('es-CO')} {minStockItem.unit}</strong>
                  </div>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">
                    Umbral Mínimo de Alerta ({minStockItem.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="ds-input"
                    style={{ fontSize: '16px', fontWeight: '700' }}
                    value={minStockValue}
                    onChange={(e) => setMinStockValue(e.target.value)}
                    placeholder="0 para desactivar"
                    required
                  />
                  <small style={{ color: 'var(--ds-text-muted)', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                    Si el stock cae por debajo de este valor se marcará en 🔴 Crítico. Si está dentro del 40% por encima, se marcará en 🟡 Bajo.
                  </small>
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" onClick={() => setMinStockModal(false)} className="ds-btn ds-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="ds-btn ds-btn-primary">
                  <CheckCircle2 size={16} /> Guardar Umbral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALLE DEL MOVIMIENTO KARDEX (MODAL MODERNO CON ORIGEN) */}
      {/* ========================================================================= */}
      {movementDetailModal && selectedMovement && (
        <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setMovementDetailModal(false)}>
          <div className="ds-modal" style={{ maxWidth: '540px' }}>
            <div className="ds-modal-header">
              <div>
                <span className="ds-page-kicker" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>
                  Movimiento #{selectedMovement.id}
                </span>
                <h2 className="ds-modal-title" style={{ margin: 0 }}>{selectedMovement.inventory_title}</h2>
              </div>
              <button className="ds-modal-close" onClick={() => setMovementDetailModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="ds-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Impacto en stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ds-text-muted)', fontWeight: '700' }}>Stock Antes</span>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ds-text-primary)', marginTop: '4px' }}>
                    {(Number(selectedMovement.balance_after) - Number(selectedMovement.quantity)).toLocaleString('es-CO')}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid var(--ds-border)', borderRight: '1px solid var(--ds-border)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ds-text-muted)', fontWeight: '700' }}>Movimiento</span>
                  <div style={{ fontSize: '15px', fontWeight: '800', marginTop: '4px', color: Number(selectedMovement.quantity) > 0 ? 'var(--ds-success)' : 'var(--ds-danger)' }}>
                    {Number(selectedMovement.quantity) > 0 ? '+' : ''}{Number(selectedMovement.quantity).toLocaleString('es-CO')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ds-text-muted)', fontWeight: '700' }}>Stock Después</span>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--ds-text-primary)', marginTop: '4px' }}>
                    {Number(selectedMovement.balance_after).toLocaleString('es-CO')} {selectedMovement.inventory_unit}
                  </div>
                </div>
              </div>

              {/* Origen */}
              <div>
                <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ds-primary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  🧾 Origen del Movimiento
                </h4>

                {selectedMovement.order_id ? (
                  <div style={{ background: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--ds-primary)' }}>Pedido #{selectedMovement.order_id}</strong>
                      <span className="ds-badge ds-badge-info">{selectedMovement.order_status || 'Venta'}</span>
                    </div>
                    {selectedMovement.sold_product_title && (
                      <div style={{ color: 'var(--ds-text-secondary)' }}>
                        Producto: <strong style={{ color: 'var(--ds-text-primary)' }}>{selectedMovement.sold_product_title}</strong>
                      </div>
                    )}
                    {selectedMovement.customer_name && (
                      <div style={{ color: 'var(--ds-text-secondary)' }}>
                        Cliente: <strong style={{ color: 'var(--ds-text-primary)' }}>{selectedMovement.customer_name} {selectedMovement.customer_phone ? `(${selectedMovement.customer_phone})` : ''}</strong>
                      </div>
                    )}
                    {selectedMovement.order_total && (
                      <div style={{ color: 'var(--ds-text-secondary)' }}>
                        Total Pedido: <strong style={{ color: 'var(--ds-text-primary)' }}>{formatCurrency(selectedMovement.order_total)}</strong>
                      </div>
                    )}
                  </div>
                ) : selectedMovement.purchase_id ? (
                  <div style={{ background: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--ds-success)' }}>Compra #{selectedMovement.purchase_id}</strong>
                      <span className="ds-badge ds-badge-success">Ingreso de Stock</span>
                    </div>
                    <div style={{ color: 'var(--ds-text-secondary)' }}>
                      Proveedor: <strong style={{ color: 'var(--ds-text-primary)' }}>{selectedMovement.purchase_supplier || 'General'}</strong>
                    </div>
                    {selectedMovement.purchase_total_cost && (
                      <div style={{ color: 'var(--ds-text-secondary)' }}>
                        Total Factura: <strong style={{ color: 'var(--ds-text-primary)' }}>{formatCurrency(selectedMovement.purchase_total_cost)}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--ds-text-primary)' }}>{selectedMovement.movement_type}</strong>
                      <span className="ds-badge ds-badge-neutral">Ajuste</span>
                    </div>
                    <div style={{ color: 'var(--ds-text-secondary)' }}>
                      Motivo: <strong style={{ color: 'var(--ds-text-primary)' }}>{selectedMovement.reason || 'Operación directa'}</strong>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: 'var(--ds-text-muted)', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Registrado por: <strong>{selectedMovement.created_by || 'Sistema'}</strong></span>
                  <span>{formatDateTime(selectedMovement.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="ds-modal-footer">
              <button type="button" onClick={() => setMovementDetailModal(false)} className="ds-btn ds-btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDICIÓN SEGURA DE COMPRA */}
      {/* ========================================================================= */}
      {editPurchaseModal && (
        <div className="ds-modal-overlay">
          <div className="ds-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b  pb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider ds-text-warning">
                  Corrección Segura de Compra #{editPurchaseForm.id}
                </span>
                <h3 className="text-lg font-black ">{editPurchaseForm.inventory_title}</h3>
              </div>
              <button onClick={() => setEditPurchaseModal(false)} className="ds-text-muted hover:ds-text-secondary">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditPurchase} className="space-y-4">
              <div className="/70 border  p-3 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold">Datos originales de la compra:</div>
                <div className="flex justify-between ds-text-secondary">
                  <span>Cantidad original:</span>
                  <strong>{editPurchaseForm.original_quantity} {editPurchaseForm.base_unit}</strong>
                </div>
                <div className="flex justify-between ds-text-secondary">
                  <span>Costo original:</span>
                  <strong>{formatCurrency(editPurchaseForm.original_total_cost)}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-form-label" style={{ fontSize: "13px", color: "var(--ds-text-secondary)", marginBottom: "6px" }}>Nueva Cantidad *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="ds-input w-full"
                    value={editPurchaseForm.quantity}
                    onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="ds-form-label" style={{ fontSize: "13px", color: "var(--ds-text-secondary)", marginBottom: "6px" }}>Unidad</label>
                  <input
                    type="text"
                    className="ds-input w-full  capitalize"
                    value={editPurchaseForm.purchase_unit}
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="ds-form-label" style={{ fontSize: "13px", color: "var(--ds-text-secondary)", marginBottom: "6px" }}>Nuevo Costo Total Pagado ($) *</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="ds-input w-full"
                  value={editPurchaseForm.total_cost}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, total_cost: e.target.value })}
                  required
                />
              </div>

              {/* Proveedor en Edición */}
              <div className="relative">
                <label className="ds-form-label" style={{ fontSize: "13px", color: "var(--ds-text-secondary)", marginBottom: "6px" }}>Proveedor</label>
                <input
                  type="text"
                  className="ds-input w-full"
                  value={editPurchaseForm.supplier}
                  onFocus={() => setEditSupplierInputFocused(true)}
                  onBlur={() => setTimeout(() => setEditSupplierInputFocused(false), 250)}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, supplier: e.target.value })}
                />
                {editSupplierInputFocused && editFilteredSuppliers.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 ds-card" style={{ maxHeight: "150px", overflowY: "auto" }}>
                    {editFilteredSuppliers.map((sup, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => {
                          setEditPurchaseForm((prev) => ({ ...prev, supplier: sup }));
                          setEditSupplierInputFocused(false);
                        }}
                        className="px-3 py-1.5 text-xs  hover: cursor-pointer"
                      >
                        {sup}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="ds-form-label" style={{ fontSize: "13px", color: "var(--ds-text-secondary)", marginBottom: "6px" }}>
                  Motivo de la Modificación *
                </label>
                <input
                  type="text"
                  className="ds-input w-full"
                  placeholder="Ej: Error en factura, conteo real, ajuste de precio"
                  value={editPurchaseForm.edit_reason}
                  onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, edit_reason: e.target.value })}
                  required
                />
              </div>

              {/* Previsualización del Impacto */}
              {editPurchaseConversionInfo && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    editPurchaseConversionInfo.isNegative
                      ? '  text-red-900'
                      : '  '
                  }`}
                >
                  <div className="font-bold flex justify-between">
                    <span>Diferencia de Stock:</span>
                    <span className="font-black">
                      {editPurchaseConversionInfo.deltaQty >= 0 ? '+' : ''}
                      {editPurchaseConversionInfo.deltaQty} {editPurchaseForm.base_unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock Resultante en Almacén:</span>
                    <span className="font-black text-sm">
                      {editPurchaseConversionInfo.resultingStock} {editPurchaseForm.base_unit}
                    </span>
                  </div>
                  {editPurchaseConversionInfo.isNegative && (
                    <div className="ds-text-danger font-bold pt-1">
                      ⚠️ No se puede aplicar este cambio porque el insumo ya fue consumido y el stock quedaría en negativo.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditPurchaseModal(false)}
                  className="ds-btn ds-btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy || editPurchaseConversionInfo?.isNegative}
                  className="ds-btn ds-btn-primary"
                >
                  Confirmar Corrección y Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES ADICIONALES: CREAR/EDITAR INSUMO, MERMA, CREACIÓN RÁPIDA */}
      {/* ========================================================================= */}
      {insumoModal && (
        <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setInsumoModal(false)}>
          <div className="ds-modal" style={{ maxWidth: '520px' }}>
            <div className="ds-modal-header">
              <h2 className="ds-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Boxes size={20} color="var(--ds-primary)" />
                <span>{insumoForm.id ? 'Editar Metadatos del Insumo' : 'Nuevo Insumo'}</span>
              </h2>
              <button className="ds-modal-close" onClick={() => setInsumoModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInsumo}>
              <div className="ds-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Nombre del Insumo *</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={insumoForm.name}
                    onChange={(e) => setInsumoForm({ ...insumoForm, name: e.target.value })}
                    placeholder="Ej: Pan Hamburguesa Brioche"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Unidad Base *</label>
                    <select
                      className="ds-select"
                      value={insumoForm.unit}
                      onChange={(e) => setInsumoForm({ ...insumoForm, unit: e.target.value })}
                    >
                      <option value="unidad">Unidad (und)</option>
                      <option value="gramos">Gramos (g)</option>
                      <option value="mililitros">Mililitros (ml)</option>
                    </select>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Stock Mínimo</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="ds-input"
                      value={insumoForm.min_stock}
                      onChange={(e) => setInsumoForm({ ...insumoForm, min_stock: e.target.value })}
                      placeholder="0 para desactivar"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Categoría</label>
                    <input
                      type="text"
                      className="ds-input"
                      value={insumoForm.category}
                      onChange={(e) => setInsumoForm({ ...insumoForm, category: e.target.value })}
                      placeholder="Carnes, Panes, Salsas…"
                    />
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Código SKU / Referencia</label>
                    <input
                      type="text"
                      className="ds-input"
                      value={insumoForm.sku}
                      onChange={(e) => setInsumoForm({ ...insumoForm, sku: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div style={{ background: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: 'var(--ds-text-secondary)', lineHeight: 1.5 }}>
                  ℹ️ <strong>Regla de Inventario:</strong> El stock físico siempre inicia en 0 y únicamente se incrementa al registrar una <strong>Compra de Inventario</strong>.
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" onClick={() => setInsumoModal(false)} className="ds-btn ds-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="ds-btn ds-btn-primary">
                  <CheckCircle2 size={16} />
                  <span>{insumoForm.id ? 'Guardar Cambios' : 'Crear Insumo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ajuste / Merma */}
      {adjustModal && (
        <div className="ds-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setAdjustModal(false)}>
          <div className="ds-modal" style={{ maxWidth: '480px' }}>
            <div className="ds-modal-header">
              <h2 className="ds-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="var(--ds-warning)" />
                <span>Ajuste de Stock / Merma</span>
              </h2>
              <button className="ds-modal-close" onClick={() => setAdjustModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust}>
              <div className="ds-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="ds-form-group">
                  <label className="ds-form-label">Insumo Afectado *</label>
                  <select
                    className="ds-select"
                    value={adjustForm.inventory_id}
                    onChange={(e) => setAdjustForm({ ...adjustForm, inventory_id: e.target.value })}
                    required
                  >
                    <option value="">Selecciona insumo…</option>
                    {insumos.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Stock: {Number(i.stock).toLocaleString('es-CO')} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Tipo de Ajuste</label>
                    <select
                      className="ds-select"
                      value={adjustForm.adjustment_type}
                      onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                    >
                      <option value="MERMA">Merma (Desecho)</option>
                      <option value="DAÑO">Producto Dañado</option>
                      <option value="VENCIDO">Vencido</option>
                      <option value="PERDIDA">Pérdida</option>
                      <option value="CONTEO_FISICO">Conteo Físico</option>
                      <option value="AJUSTE">Ajuste General</option>
                    </select>
                  </div>
                  <div className="ds-form-group">
                    <label className="ds-form-label">Cantidad a Restar *</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      className="ds-input"
                      value={adjustForm.quantity}
                      onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="ds-form-group">
                  <label className="ds-form-label">Motivo u Observación *</label>
                  <input
                    type="text"
                    className="ds-input"
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    placeholder="Ej: Pan quemado, carne vencida, rotura"
                    required
                  />
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" onClick={() => setAdjustModal(false)} className="ds-btn ds-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="ds-btn ds-btn-primary">
                  <CheckCircle2 size={16} /> Aplicar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Creación Rápida de Insumo desde Compras */}
      {quickInsumoModal && (
        <div className="ds-modal-overlay">
          <div className="ds-modal max-w-md w-full p-6">
            <div className="flex items-center justify-between border-b  pb-3 mb-4">
              <h3 className="text-lg font-black ">Creación Rápida de Insumo</h3>
              <button onClick={() => setQuickInsumoModal(false)} className="ds-text-muted hover:ds-text-secondary">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleQuickSaveInsumo} className="space-y-4">
              <div>
                <label className="ds-form-label" style={{ fontSize: "13px", color: "var(--ds-text-secondary)", marginBottom: "6px" }}>Nombre del Insumo *</label>
                <input
                  type="text"
                  className="ds-input w-full"
                  placeholder="Ej: Queso Cheddar Tajado"
                  value={quickInsumoForm.name}
                  onChange={(e) => setQuickInsumoForm({ ...quickInsumoForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-form-label" style={{ fontSize: "13px", color: "var(--ds-text-secondary)", marginBottom: "6px" }}>Unidad Base *</label>
                  <select
                    className="ds-select w-full"
                    value={quickInsumoForm.unit}
                    onChange={(e) => setQuickInsumoForm({ ...quickInsumoForm, unit: e.target.value })}
                  >
                    <option value="unidad">Unidad (und)</option>
                    <option value="gramos">Gramos (g)</option>
                    <option value="mililitros">Mililitros (ml)</option>
                  </select>
                </div>
                <div>
                  <label className="ds-form-label" style={{ fontSize: "13px", color: "var(--ds-text-secondary)", marginBottom: "6px" }}>Stock Mínimo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="ds-input w-full"
                    value={quickInsumoForm.min_stock}
                    onChange={(e) => setQuickInsumoForm({ ...quickInsumoForm, min_stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setQuickInsumoModal(false)} className="ds-btn ds-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="ds-btn ds-btn-primary">
                  Crear y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
