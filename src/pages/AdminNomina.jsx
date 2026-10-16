import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import {
  Users, Calendar, Clock, DollarSign, Plus, Edit3, Trash2, CheckCircle2,
  AlertCircle, AlertTriangle, FileText, ChevronRight, Download, RefreshCw,
  Search, Filter, ShieldCheck, ArrowUpRight, ArrowDownRight, Coffee,
  CreditCard, Banknote, Briefcase, ChevronDown, Check, X, ShieldAlert,
  Info, ExternalLink, Award, FileSpreadsheet, Send
} from 'lucide-react';
import { API_URL } from '../config/api';
import { AuthContext } from '../context/AuthContext';
import { formatCurrency, formatNumber, formatDateOnly, formatDateTime } from '../utils/formatters';

const BOGOTA_TZ = 'America/Bogota';

function getTodayBogota() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BOGOTA_TZ }).format(new Date());
}

function generateIdempotencyKey(prefix = 'pay') {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `${prefix}_${rand}`;
}

export default function AdminNomina() {
  const { hasPermission, user } = useContext(AuthContext);
  const token = sessionStorage.getItem('distrito_admin_token');

  // Pestañas principales
  const [activeTab, setActiveTab] = useState('periodos'); // 'periodos' | 'asistencia' | 'empleados' | 'comidas' | 'deducciones' | 'liquidaciones' | 'config'
  
  // Estado global y notificaciones
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'info'|'warning', message: '' }

  // 1. CONFIGURACIÓN LABORAL
  const [payrollConfig, setPayrollConfig] = useState(null);
  const [configForm, setConfigForm] = useState({
    smmlv_amount: 1750905,
    transport_allowance_monthly: 249095,
    transport_allowance_daily: 8303.17,
    night_shift_surcharge_pct: 35,
    holiday_surcharge_pct: 75,
    standard_daily_hours: 8,
    health_employee_pct: 4,
    pension_employee_pct: 4,
    valid_from: getTodayBogota()
  });

  // 2. EMPLEADOS
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeFilterStatus, setEmployeeFilterStatus] = useState('Activo');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    document_type: 'CC',
    document_number: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    position: 'Cocina',
    contract_type: 'Laboral Fijo Quincenal',
    salary_base: '',
    daily_rate: '',
    hourly_rate: '',
    has_transport_allowance: true,
    payment_method: 'Efectivo',
    bank_name: '',
    bank_account_type: 'Ahorros',
    bank_account_number: '',
    hire_date: getTodayBogota(),
    status: 'Activo',
    notes: ''
  });

  // 3. PERIODOS DE NÓMINA
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [periodDetails, setPeriodDetails] = useState(null);
  const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState({
    name: '',
    period_type: 'quincenal',
    start_date: '',
    end_date: '',
    notes: ''
  });
  const [calculatingPeriod, setCalculatingPeriod] = useState(false);

  // 4. PAGOS & MODAL DE PAGO CON IDEMPOTENCIA
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentItemTarget, setPaymentItemTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_method: 'Transferencia',
    voucher_reference: '',
    notes: '',
    idempotency_key: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // 5. ASISTENCIA DIARIA
  const [attendanceDate, setAttendanceDate] = useState(getTodayBogota());
  const [dailyAttendance, setDailyAttendance] = useState([]);
  const [savingAttendanceId, setSavingAttendanceId] = useState(null);

  // 6. COMIDAS Y SUMINISTROS (CONSUMO INTERNO)
  const [meals, setMeals] = useState([]);
  const [mealsDateStart, setMealsDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return new Intl.DateTimeFormat('en-CA', { timeZone: BOGOTA_TZ }).format(d);
  });
  const [mealsDateEnd, setMealsDateEnd] = useState(getTodayBogota());
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [mealForm, setMealForm] = useState({
    employee_id: '',
    item_type: 'Menu', // 'Menu' | 'Insumo'
    product_id: '',
    inventory_id: '',
    quantity: 1,
    allow_untracked_meal: false,
    notes: ''
  });
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableInventory, setAvailableInventory] = useState([]);

  // 7. DEDUCCIONES & PRÉSTAMOS
  const [deductions, setDeductions] = useState([]);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [deductionForm, setDeductionForm] = useState({
    employee_id: '',
    type: 'Préstamo', // 'Préstamo' | 'Anticipo'
    amount: '',
    reason: 'Préstamo Personal',
    installments_total: 1,
    installment_amount: '',
    notes: ''
  });

  // 8. LIQUIDACIONES DEFINITIVAS
  const [settlements, setSettlements] = useState([]);
  const [settlementPreviewEmployeeId, setSettlementPreviewEmployeeId] = useState('');
  const [settlementRetirementDate, setSettlementRetirementDate] = useState(getTodayBogota());
  const [settlementReason, setSettlementReason] = useState('Renuncia Voluntaria');
  const [settlementPreview, setSettlementPreview] = useState(null);
  const [benefitRecords, setBenefitRecords] = useState([]);
  const [isBenefitRecordModalOpen, setIsBenefitRecordModalOpen] = useState(false);
  const [benefitRecordForm, setBenefitRecordForm] = useState({
    employee_id: '',
    benefit_type: 'CESANTIAS', // 'CESANTIAS' | 'INTERESES_CESANTIAS' | 'PRIMA' | 'VACACIONES'
    period_year: new Date().getFullYear() - 1,
    period_semester: 1,
    status: 'Consignado', // 'Consignado' | 'Pagado' | 'Pendiente' | 'Disfrutado' | 'Compensado'
    amount: '',
    days: '',
    evidence_reference: '',
    notes: ''
  });

  // Helper para headers autenticados
  const authHeaders = useMemo(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  // Mensajes de Feedback con autodismiss
  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 8000);
  };

  // ==========================================================================
  // CARGAS DE DATOS INICIALES (ENDPOINTS CONTRATADOS)
  // ==========================================================================

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/nomina/config`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setPayrollConfig(data.config);
          setConfigForm({
            smmlv_amount: Number(data.config.smmlv_amount) || 1750905,
            transport_allowance_monthly: Number(data.config.transport_allowance_monthly) || 249095,
            transport_allowance_daily: Number(data.config.transport_allowance_daily) || 8303.17,
            night_shift_surcharge_pct: Number(data.config.night_shift_surcharge_pct) || 35,
            holiday_surcharge_pct: Number(data.config.holiday_surcharge_pct) || 75,
            standard_daily_hours: Number(data.config.standard_daily_hours) || 8,
            health_employee_pct: Number(data.config.health_employee_pct) || 4,
            pension_employee_pct: Number(data.config.pension_employee_pct) || 4,
            valid_from: data.config.valid_from ? formatDateOnly(data.config.valid_from) : getTodayBogota()
          });
        }
      }
    } catch (err) {
      console.error('Error cargando configuración laboral:', err);
    }
  }, [authHeaders]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/nomina/employees`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Error cargando empleados:', err);
    }
  }, [authHeaders]);

  const loadPeriods = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/nomina/periods`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const list = data.periods || [];
        setPeriods(list);
        if (list.length > 0 && !selectedPeriodId) {
          setSelectedPeriodId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando periodos:', err);
    }
  }, [authHeaders, selectedPeriodId]);

  const loadPeriodDetails = useCallback(async (periodId) => {
    if (!periodId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/nomina/periods/${periodId}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setPeriodDetails(data);
      } else {
        showFeedback('error', 'No fue posible consultar el detalle del periodo.');
      }
    } catch (err) {
      console.error('Error cargando periodo:', err);
      showFeedback('error', 'Error de red al consultar el periodo.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const loadDailyAttendance = useCallback(async (date) => {
    if (!date) return;
    try {
      // CONTRATO CORREGIDO: date_from y date_to
      const res = await fetch(`${API_URL}/admin/nomina/attendance?date_from=${date}&date_to=${date}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setDailyAttendance(data.attendance || []);
      }
    } catch (err) {
      console.error('Error cargando asistencia:', err);
    }
  }, [authHeaders]);

  const loadMeals = useCallback(async () => {
    try {
      // CONTRATO CORREGIDO: date_from y date_to
      const query = `date_from=${mealsDateStart}&date_to=${mealsDateEnd}`;
      const res = await fetch(`${API_URL}/admin/nomina/meals?${query}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setMeals(data.meals || []);
      }
    } catch (err) {
      console.error('Error cargando comidas:', err);
    }
  }, [authHeaders, mealsDateStart, mealsDateEnd]);

  const loadDeductions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/nomina/deductions`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setDeductions(data.deductions || []);
      }
    } catch (err) {
      console.error('Error cargando deducciones:', err);
    }
  }, [authHeaders]);

  const loadSettlements = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/nomina/settlements`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSettlements(data.settlements || []);
      }
    } catch (err) {
      console.error('Error cargando liquidaciones:', err);
    }
  }, [authHeaders]);

  const loadCatalogForMeals = useCallback(async () => {
    try {
      // CONTRATO OPTIMIZADO: catálogo especializado de nómina con recipe_items_count
      const res = await fetch(`${API_URL}/admin/nomina/catalog-items`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setAvailableProducts(data.products || []);
        setAvailableInventory(data.inventory || []);
      }
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    }
  }, [authHeaders]);

  // Carga inicial
  useEffect(() => {
    if (!token) return;
    loadConfig();
    loadEmployees();
    loadPeriods();
    loadCatalogForMeals();
  }, [token, loadConfig, loadEmployees, loadPeriods, loadCatalogForMeals]);

  // Sincronizar detalle de periodo
  useEffect(() => {
    if (selectedPeriodId) {
      loadPeriodDetails(selectedPeriodId);
    }
  }, [selectedPeriodId, loadPeriodDetails]);

  // Sincronizar asistencias por fecha
  useEffect(() => {
    if (activeTab === 'asistencia') {
      loadDailyAttendance(attendanceDate);
    }
  }, [activeTab, attendanceDate, loadDailyAttendance]);

  // Sincronizar comidas
  useEffect(() => {
    if (activeTab === 'comidas') {
      loadMeals();
    }
  }, [activeTab, loadMeals]);

  // Sincronizar deducciones
  useEffect(() => {
    if (activeTab === 'deducciones') {
      loadDeductions();
    }
  }, [activeTab, loadDeductions]);

  // Sincronizar liquidaciones
  useEffect(() => {
    if (activeTab === 'liquidaciones') {
      loadSettlements();
    }
  }, [activeTab, loadSettlements]);

  // ==========================================================================
  // MANEJADORES: EMPLEADOS (CONTRATO HOMOLOGADO)
  // ==========================================================================

  const handleOpenEmployeeModal = (emp = null) => {
    if (emp) {
      setEditingEmployee(emp);
      setEmployeeForm({
        document_type: emp.document_type || 'CC',
        document_number: emp.document_number || '',
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
        phone: emp.phone || '',
        email: emp.email || '',
        address: emp.address || '',
        position: emp.position || 'Cocina',
        contract_type: emp.contract_type || 'Laboral Fijo Quincenal',
        salary_base: emp.salary_base || '',
        daily_rate: emp.daily_rate || '',
        hourly_rate: emp.hourly_rate || '',
        has_transport_allowance: emp.has_transport_allowance ?? true,
        payment_method: emp.payment_method || 'Efectivo',
        bank_name: emp.bank_name || '',
        bank_account_type: emp.bank_account_type || 'Ahorros',
        bank_account_number: emp.bank_account_number || '',
        hire_date: emp.hire_date ? emp.hire_date.substring(0, 10) : getTodayBogota(),
        status: emp.status || 'Activo',
        notes: emp.notes || ''
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({
        document_type: 'CC',
        document_number: '',
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        address: '',
        position: 'Cocina',
        contract_type: 'Laboral Fijo Quincenal',
        salary_base: '',
        daily_rate: '',
        hourly_rate: '',
        has_transport_allowance: true,
        payment_method: 'Efectivo',
        bank_name: '',
        bank_account_type: 'Ahorros',
        bank_account_number: '',
        hire_date: getTodayBogota(),
        status: 'Activo',
        notes: ''
      });
    }
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!employeeForm.first_name?.trim() || !employeeForm.last_name?.trim() || !employeeForm.document_number?.trim() || !employeeForm.position?.trim()) {
      showFeedback('warning', 'Por favor ingresa nombre, apellidos, número de documento y cargo.');
      return;
    }

    setLoading(true);
    try {
      const url = editingEmployee 
        ? `${API_URL}/admin/nomina/employees/${editingEmployee.id}`
        : `${API_URL}/admin/nomina/employees`;
      const method = editingEmployee ? 'PUT' : 'POST';

      // CONTRATO CORREGIDO: position, salary_base, has_transport_allowance
      const payload = {
        first_name: employeeForm.first_name.trim(),
        last_name: employeeForm.last_name.trim(),
        document_type: employeeForm.document_type,
        document_number: employeeForm.document_number.trim(),
        phone: employeeForm.phone?.trim() || null,
        email: employeeForm.email?.trim() || null,
        address: employeeForm.address?.trim() || null,
        position: employeeForm.position.trim(),
        contract_type: employeeForm.contract_type,
        salary_base: employeeForm.salary_base ? Number(employeeForm.salary_base) : 0,
        daily_rate: employeeForm.daily_rate ? Number(employeeForm.daily_rate) : 0,
        hourly_rate: employeeForm.hourly_rate ? Number(employeeForm.hourly_rate) : 0,
        has_transport_allowance: Boolean(employeeForm.has_transport_allowance),
        bank_name: employeeForm.bank_name?.trim() || null,
        bank_account_type: employeeForm.bank_account_type,
        bank_account_number: employeeForm.bank_account_number?.trim() || null,
        hire_date: employeeForm.hire_date || null,
        status: employeeForm.status,
        notes: employeeForm.notes?.trim() || null
      };

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showFeedback('success', editingEmployee ? 'Empleado actualizado exitosamente.' : 'Empleado creado con éxito.');
        setIsEmployeeModalOpen(false);
        loadEmployees();
      } else {
        showFeedback('error', data.error || 'Ocurrió un error al guardar el empleado.');
      }
    } catch (err) {
      showFeedback('error', 'Error de red al guardar el empleado.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // MANEJADORES: PERIODOS DE NÓMINA (CONTRATO HOMOLOGADO PATCH /status)
  // ==========================================================================

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    if (!newPeriodForm.start_date || !newPeriodForm.end_date) {
      showFeedback('warning', 'Debes indicar fecha de inicio y fin del periodo.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: newPeriodForm.name?.trim() || null,
        period_type: newPeriodForm.period_type?.toLowerCase() || 'quincenal',
        start_date: newPeriodForm.start_date,
        end_date: newPeriodForm.end_date,
        notes: newPeriodForm.notes?.trim() || null
      };

      const res = await fetch(`${API_URL}/admin/nomina/periods`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', 'Periodo de nómina creado correctamente en estado Borrador.');
        setIsNewPeriodModalOpen(false);
        loadPeriods();
        setSelectedPeriodId(data.period.id);
      } else {
        showFeedback('error', data.error || 'Error creando el periodo.');
      }
    } catch (err) {
      showFeedback('error', 'Error de red al crear periodo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePeriod = async () => {
    if (!selectedPeriodId) return;
    setCalculatingPeriod(true);
    try {
      const res = await fetch(`${API_URL}/admin/nomina/periods/${selectedPeriodId}/calculate`, {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', data.message || `Nómina calculada con éxito.`);
        loadPeriodDetails(selectedPeriodId);
        loadPeriods();
      } else {
        showFeedback('error', data.error || 'Fallo al procesar el cálculo de nómina.');
      }
    } catch (err) {
      showFeedback('error', 'Error de red al ejecutar el cálculo.');
    } finally {
      setCalculatingPeriod(false);
    }
  };

  const handleApprovePeriod = async () => {
    if (!selectedPeriodId || !window.confirm('¿Confirmas la APROBACIÓN de este periodo? Una vez aprobado quedará habilitado para pagos de nómina.')) return;
    setLoading(true);
    try {
      // CONTRATO CORREGIDO: PATCH /periods/:id/status con { status: 'Aprobado' }
      const res = await fetch(`${API_URL}/admin/nomina/periods/${selectedPeriodId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'Aprobado' })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', 'Periodo aprobado correctamente. Listo para dispersión de pagos.');
        loadPeriodDetails(selectedPeriodId);
        loadPeriods();
      } else {
        showFeedback('error', data.error || 'No fue posible aprobar el periodo.');
      }
    } catch (err) {
      showFeedback('error', 'Error al aprobar el periodo.');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePeriod = async () => {
    if (!selectedPeriodId || !window.confirm('¿Seguro que deseas CERRAR definitivamente este periodo? Se validará que todos los saldos estén saldados.')) return;
    setLoading(true);
    try {
      // CONTRATO CORREGIDO: PATCH /periods/:id/status con { status: 'Cerrado' }
      const res = await fetch(`${API_URL}/admin/nomina/periods/${selectedPeriodId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'Cerrado' })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', 'Periodo cerrado y archivado exitosamente.');
        loadPeriodDetails(selectedPeriodId);
        loadPeriods();
      } else {
        showFeedback('error', data.error || 'No se puede cerrar el periodo si aún tiene saldos pendientes de pago.');
      }
    } catch (err) {
      showFeedback('error', 'Error al cerrar el periodo.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // MANEJADORES: PAGOS IDEMPOTENTES (CONTRATO HOMOLOGADO amount_paid)
  // ==========================================================================

  const handleOpenPaymentModal = (item) => {
    setPaymentItemTarget(item);
    const pendingVal = Number(item.pending_balance !== undefined ? item.pending_balance : (item.net_payable - (item.total_paid || 0)));
    setPaymentForm({
      amount_paid: pendingVal > 0 ? pendingVal : '',
      payment_method: item.payment_method || 'Transferencia',
      voucher_reference: '',
      notes: '',
      idempotency_key: generateIdempotencyKey('pay')
    });
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentItemTarget) return;

    const amountNum = Number(paymentForm.amount_paid);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      showFeedback('warning', 'El monto a pagar debe ser mayor a cero.');
      return;
    }

    setSubmittingPayment(true);
    try {
      // CONTRATO CORREGIDO: amount_paid, voucher_reference, idempotency_key
      const payload = {
        payroll_item_id: Number(paymentItemTarget.id),
        amount_paid: amountNum,
        payment_method: paymentForm.payment_method,
        voucher_reference: paymentForm.voucher_reference?.trim() || null,
        notes: paymentForm.notes?.trim() || null,
        idempotency_key: paymentForm.idempotency_key
      };

      const res = await fetch(`${API_URL}/admin/nomina/payments`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'X-Idempotency-Key': paymentForm.idempotency_key
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showFeedback('success', data.is_duplicate 
          ? `Operación duplicada: Se re-confirmó el pago original (#${data.payment?.id}).`
          : `Pago por ${formatCurrency(amountNum)} registrado exitosamente.`);
        setIsPaymentModalOpen(false);
        loadPeriodDetails(selectedPeriodId);
        loadPeriods();
      } else {
        showFeedback('error', data.error || 'No fue posible asentar el comprobante de pago.');
      }
    } catch (err) {
      showFeedback('error', 'Error al registrar el pago.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ==========================================================================
  // MANEJADORES: ASISTENCIA RÁPIDA (ESTADOS HOMOLOGADOS)
  // ==========================================================================

  const handleSaveAttendanceRow = async (empId, fields) => {
    setSavingAttendanceId(empId);
    try {
      const payload = {
        employee_id: empId,
        attendance_date: attendanceDate,
        shift_type: fields.shift_type || 'Completo',
        status: fields.status || 'Trabajó',
        hours_worked: fields.hours_worked !== undefined ? Number(fields.hours_worked) : 8,
        overtime_day_hours: Number(fields.overtime_day_hours || 0),
        overtime_night_hours: Number(fields.overtime_night_hours || 0),
        night_hours: Number(fields.night_hours || 0),
        holiday_hours: Number(fields.holiday_hours || 0),
        had_meal: Boolean(fields.had_meal),
        notes: fields.notes?.trim() || null
      };

      const res = await fetch(`${API_URL}/admin/nomina/attendance`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showFeedback('success', 'Asistencia registrada para el colaborador.');
        loadDailyAttendance(attendanceDate);
      } else {
        showFeedback('error', data.error || 'Error al guardar la marcación diaria.');
      }
    } catch (err) {
      showFeedback('error', 'Error de conexión.');
    } finally {
      setSavingAttendanceId(null);
    }
  };

  // ==========================================================================
  // MANEJADORES: COMIDAS Y SUMINISTROS (allow_untracked_meal)
  // ==========================================================================

  const handleSaveMealDelivery = async (e) => {
    e.preventDefault();
    if (!mealForm.employee_id) {
      showFeedback('warning', 'Selecciona el colaborador receptor.');
      return;
    }
    if (mealForm.item_type === 'Menu' && !mealForm.product_id) {
      showFeedback('warning', 'Selecciona el producto del menú.');
      return;
    }
    if (mealForm.item_type === 'Insumo' && !mealForm.inventory_id) {
      showFeedback('warning', 'Selecciona el insumo de almacén.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employee_id: mealForm.employee_id,
        item_type: mealForm.item_type,
        product_id: mealForm.item_type === 'Menu' ? mealForm.product_id : null,
        inventory_id: mealForm.item_type === 'Insumo' ? mealForm.inventory_id : null,
        quantity: Number(mealForm.quantity || 1),
        allow_untracked_meal: Boolean(mealForm.allow_untracked_meal),
        notes: mealForm.notes?.trim() || null,
        idempotency_key: generateIdempotencyKey('meal')
      };

      const res = await fetch(`${API_URL}/admin/nomina/meals`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showFeedback('success', data.message || `Entrega de consumo interno registrada.`);
        setIsMealModalOpen(false);
        loadMeals();
      } else if (data.code === 'RECIPE_REQUIRED') {
        const isDirective = ['Super Administrador', 'Administrador', 'Gerente'].includes(user?.role);
        if (isDirective && window.confirm(`${data.error}\n\n¿Como directivo, autorizas registrar el consumo financiero sin salida física de inventario (allow_untracked_meal)?`)) {
          // Reintentar con autorización directiva
          const authRes = await fetch(`${API_URL}/admin/nomina/meals`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ ...payload, allow_untracked_meal: true })
          });
          const authData = await authRes.json();
          if (authRes.ok) {
            showFeedback('success', authData.message || 'Entrega autorizada sin receta.');
            setIsMealModalOpen(false);
            loadMeals();
          } else {
            showFeedback('error', authData.error || 'Autorización rechazada.');
          }
        } else {
          showFeedback('error', data.error);
        }
      } else {
        showFeedback('error', data.error || 'No fue posible registrar la entrega.');
      }
    } catch (err) {
      showFeedback('error', 'Error al registrar consumo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMeal = async (mealId) => {
    const reason = window.prompt('Indica el motivo de anulación para revertir el movimiento de inventario en Kardex:');
    if (!reason || !reason.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/nomina/meals/${mealId}/cancel`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason: reason.trim() })
      });
      const data = await res.json();

      if (res.ok) {
        showFeedback('success', 'Consumo anulado e inventario restituido con éxito.');
        loadMeals();
      } else {
        showFeedback('error', data.error || 'No fue posible anular el consumo.');
      }
    } catch (err) {
      showFeedback('error', 'Error de red.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // MANEJADORES: DEDUCCIONES & PRÉSTAMOS (CONTRATO amount y reason)
  // ==========================================================================

  const handleSaveDeduction = async (e) => {
    e.preventDefault();
    if (!deductionForm.employee_id || !deductionForm.amount || !deductionForm.reason?.trim()) {
      showFeedback('warning', 'Completa empleado, monto y motivo de la deducción.');
      return;
    }

    setLoading(true);
    try {
      // CONTRATO CORREGIDO: amount, reason, installments_total, installment_amount
      const payload = {
        employee_id: deductionForm.employee_id,
        type: deductionForm.type || 'Préstamo',
        amount: Number(deductionForm.amount),
        reason: deductionForm.reason.trim(),
        installments_total: Math.max(1, Number(deductionForm.installments_total || 1)),
        installment_amount: deductionForm.installment_amount ? Number(deductionForm.installment_amount) : Math.round(Number(deductionForm.amount) / Math.max(1, Number(deductionForm.installments_total || 1)))
      };

      const res = await fetch(`${API_URL}/admin/nomina/deductions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showFeedback('success', data.message || 'Préstamo / deducción programado con éxito.');
        setIsDeductionModalOpen(false);
        loadDeductions();
      } else {
        showFeedback('error', data.error || 'Error al programar la deducción.');
      }
    } catch (err) {
      showFeedback('error', 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // MANEJADORES: LIQUIDACIÓN DEFINITIVA & SOPORTES (CONTRATOS REALES)
  // ==========================================================================

  const handlePreviewSettlement = async () => {
    if (!settlementPreviewEmployeeId) {
      showFeedback('warning', 'Selecciona un colaborador para estimar su liquidación.');
      return;
    }

    setLoading(true);
    try {
      // CONTRATO CORREGIDO: POST /settlements/estimate con discharge_date
      const payload = {
        employee_id: settlementPreviewEmployeeId,
        discharge_date: settlementRetirementDate,
        confirm_last_period_settled: true
      };

      const res = await fetch(`${API_URL}/admin/nomina/settlements/estimate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        // CONTRATO CORREGIDO: data.estimate
        setSettlementPreview(data.estimate);

        // Consultar soportes históricos reales de este colaborador
        const bRes = await fetch(`${API_URL}/admin/nomina/benefit-records?employee_id=${settlementPreviewEmployeeId}`, {
          headers: authHeaders
        });
        if (bRes.ok) {
          const bData = await bRes.json();
          setBenefitRecords(bData.records || []);
        }
      } else {
        showFeedback('error', data.error || 'No fue posible calcular la liquidación provisional.');
      }
    } catch (err) {
      showFeedback('error', 'Error de red calculando liquidación.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBenefitRecord = async (e) => {
    e.preventDefault();
    if (!benefitRecordForm.employee_id || !benefitRecordForm.period_year || !benefitRecordForm.evidence_reference?.trim()) {
      showFeedback('warning', 'Completa colaborador, año de cobertura y referencia de soporte (evidencia).');
      return;
    }

    setLoading(true);
    try {
      // CONTRATO CORREGIDO: benefit_type (MAYÚSCULAS), period_year, amount, status, evidence_reference
      const payload = {
        employee_id: benefitRecordForm.employee_id,
        benefit_type: benefitRecordForm.benefit_type,
        period_year: Number(benefitRecordForm.period_year),
        period_semester: benefitRecordForm.benefit_type === 'PRIMA' ? Number(benefitRecordForm.period_semester || 1) : null,
        status: benefitRecordForm.status,
        amount: Number(benefitRecordForm.amount || 0),
        days: benefitRecordForm.days ? Number(benefitRecordForm.days) : null,
        evidence_reference: benefitRecordForm.evidence_reference.trim(),
        notes: benefitRecordForm.notes?.trim() || null
      };

      const res = await fetch(`${API_URL}/admin/nomina/benefit-records`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showFeedback('success', 'Soporte legal de prestación registrado con éxito.');
        setIsBenefitRecordModalOpen(false);
        handlePreviewSettlement();
      } else {
        showFeedback('error', data.error || 'Error registrando soporte histórico.');
      }
    } catch (err) {
      showFeedback('error', 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // MANEJADORES: PARÁMETROS LABORALES (CONTRATO smmlv_amount)
  // ==========================================================================

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // CONTRATO CORREGIDO: smmlv_amount, night_shift_surcharge_pct, standard_daily_hours
      const payload = {
        smmlv_amount: Number(configForm.smmlv_amount),
        transport_allowance_monthly: Number(configForm.transport_allowance_monthly),
        transport_allowance_daily: Number(configForm.transport_allowance_daily),
        night_shift_surcharge_pct: Number(configForm.night_shift_surcharge_pct),
        holiday_surcharge_pct: Number(configForm.holiday_surcharge_pct),
        standard_daily_hours: Number(configForm.standard_daily_hours),
        health_employee_pct: Number(configForm.health_employee_pct),
        pension_employee_pct: Number(configForm.pension_employee_pct),
        valid_from: configForm.valid_from || getTodayBogota()
      };

      const res = await fetch(`${API_URL}/admin/nomina/config`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showFeedback('success', 'Parámetros laborales actualizados con éxito.');
        loadConfig();
      } else {
        showFeedback('error', data.error || 'Error actualizando parámetros.');
      }
    } catch (err) {
      showFeedback('error', 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // FILTRADO DE EMPLEADOS
  // ==========================================================================

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = `${emp.first_name} ${emp.last_name} ${emp.document_number} ${emp.position || ''}`
        .toLowerCase()
        .includes(employeeSearch.toLowerCase());
      const matchStatus = employeeFilterStatus === 'Todos' || emp.status === employeeFilterStatus;
      return matchSearch && matchStatus;
    });
  }, [employees, employeeSearch, employeeFilterStatus]);

  // KPIs DEL PERIODO (CONTRATO CORREGIDO: total_accrued, total_net_payable)
  const periodKpis = useMemo(() => {
    if (!periodDetails?.period) {
      return { totalGross: 0, totalDeductions: 0, totalNet: 0, totalPaid: 0, totalPending: 0, count: 0 };
    }
    const p = periodDetails.period;
    const gross = Number(p.total_accrued !== undefined ? p.total_accrued : (p.total_gross || 0));
    const deductions = Number(p.total_deductions || 0);
    const net = Number(p.total_net_payable !== undefined ? p.total_net_payable : (p.total_net || 0));
    const paid = Number(p.total_paid || 0);
    const pending = Math.max(0, net - paid);

    return {
      totalGross: gross,
      totalDeductions: deductions,
      totalNet: net,
      totalPaid: paid,
      totalPending: pending,
      count: periodDetails.items?.length || 0
    };
  }, [periodDetails]);

  return (
    <div className="ds-page-container" style={{ padding: 'var(--ds-space-lg)' }}>
      {/* HEADER DE PÁGINA */}
      <div className="ds-page-header" style={{ marginBottom: 'var(--ds-space-lg)' }}>
        <div className="ds-page-title-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="ds-badge ds-badge-primary">Distric House RRHH</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)' }}>Módulo Oficial de Nómina</span>
          </div>
          <h1 className="ds-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Banknote size={28} color="var(--ds-primary)" />
            Nómina y Gestión de Personal
          </h1>
          <p className="ds-page-subtitle">
            Liquidación de quincenas (base comercial 360), control de turnos, consumo interno con trazabilidad en Kardex y liquidaciones conforme a la legislación colombiana.
          </p>
        </div>

        <div className="ds-page-actions" style={{ display: 'flex', gap: 'var(--ds-space-sm)', flexWrap: 'wrap' }}>
          {hasPermission('Nomina', 'crear') && (
            <>
              <button 
                className="ds-btn ds-btn-secondary ds-btn-sm" 
                onClick={() => handleOpenEmployeeModal()}
                title="Registrar nuevo trabajador en el sistema"
              >
                <Plus size={16} /> + Nuevo Colaborador
              </button>
              <button 
                className="ds-btn ds-btn-primary ds-btn-sm" 
                onClick={() => {
                  setNewPeriodForm({
                    name: '',
                    period_type: 'quincenal',
                    start_date: '',
                    end_date: '',
                    notes: ''
                  });
                  setIsNewPeriodModalOpen(true);
                }}
                title="Crear un nuevo periodo quincenal o mensual"
              >
                <Calendar size={16} /> + Nueva Quincena
              </button>
            </>
          )}
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div 
          className={`ds-card`} 
          style={{ 
            marginBottom: 'var(--ds-space-md)', 
            padding: '12px 16px',
            backgroundColor: feedback.type === 'success' ? 'var(--ds-success-bg)' : feedback.type === 'error' ? 'var(--ds-danger-bg)' : 'var(--ds-warning-bg)',
            borderColor: feedback.type === 'success' ? 'var(--ds-success)' : feedback.type === 'error' ? 'var(--ds-danger)' : 'var(--ds-warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedback.type === 'success' && <CheckCircle2 size={18} color="var(--ds-success)" />}
            {feedback.type === 'error' && <AlertCircle size={18} color="var(--ds-danger)" />}
            {feedback.type === 'warning' && <AlertTriangle size={18} color="var(--ds-warning)" />}
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* NAVEGACIÓN POR PESTAÑAS */}
      <div className="ds-tabs" style={{ marginBottom: 'var(--ds-space-lg)', overflowX: 'auto', display: 'flex' }}>
        <button 
          className={`ds-tab ${activeTab === 'periodos' ? 'active' : ''}`}
          onClick={() => setActiveTab('periodos')}
        >
          <Calendar size={17} /> Quincenas y Periodos
        </button>
        <button 
          className={`ds-tab ${activeTab === 'asistencia' ? 'active' : ''}`}
          onClick={() => setActiveTab('asistencia')}
        >
          <Clock size={17} /> Asistencia y Turnos
        </button>
        <button 
          className={`ds-tab ${activeTab === 'empleados' ? 'active' : ''}`}
          onClick={() => setActiveTab('empleados')}
        >
          <Users size={17} /> Personal ({employees.length})
        </button>
        <button 
          className={`ds-tab ${activeTab === 'comidas' ? 'active' : ''}`}
          onClick={() => setActiveTab('comidas')}
        >
          <Coffee size={17} /> Consumo Interno (Comidas)
        </button>
        <button 
          className={`ds-tab ${activeTab === 'deducciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('deducciones')}
        >
          <CreditCard size={17} /> Préstamos y Anticipos
        </button>
        <button 
          className={`ds-tab ${activeTab === 'liquidaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('liquidaciones')}
        >
          <Award size={17} /> Simulador Liquidaciones
        </button>
        <button 
          className={`ds-tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <ShieldCheck size={17} /> Parámetros 2026
        </button>
      </div>

      {/* =====================================================================
          TAB 1: PERIODOS Y LIQUIDACIÓN DE QUINCENAS
      ====================================================================== */}
      {activeTab === 'periodos' && (
        <div style={{ display: 'grid', gap: 'var(--ds-space-lg)' }}>
          {/* SELECTOR DE PERIODO */}
          <div className="ds-card" style={{ padding: 'var(--ds-space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ds-space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ds-text-secondary)' }}>Periodo de Nómina:</span>
                <select 
                  className="ds-input" 
                  style={{ width: 'auto', minWidth: '280px', fontWeight: 600 }}
                  value={selectedPeriodId || ''}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                >
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name || `${p.period_type} (${formatDateOnly(p.start_date)} - ${formatDateOnly(p.end_date)})`} — [{p.status}]
                    </option>
                  ))}
                  {periods.length === 0 && <option value="">Sin periodos creados</option>}
                </select>
              </div>

              {periodDetails?.period && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`ds-badge ${
                    periodDetails.period.status === 'Cerrado' ? 'ds-badge-success' :
                    periodDetails.period.status === 'Aprobado' ? 'ds-badge-info' : 'ds-badge-warning'
                  }`}>
                    {periodDetails.period.status}
                  </span>

                  {hasPermission('Nomina', 'calcular') && periodDetails.period.status !== 'Cerrado' && (
                    <button 
                      className="ds-btn ds-btn-primary ds-btn-sm"
                      onClick={handleCalculatePeriod}
                      disabled={calculatingPeriod}
                      title="Procesa la asistencia diaria, aplica base comercial 360 y calcula prestaciones"
                    >
                      <RefreshCw size={15} className={calculatingPeriod ? 'spin' : ''} />
                      {calculatingPeriod ? 'Calculando...' : 'Calcular / Recalcular Nómina'}
                    </button>
                  )}

                  {hasPermission('Nomina', 'editar') && (periodDetails.period.status === 'Borrador' || periodDetails.period.status === 'Calculado') && (
                    <button 
                      className="ds-btn ds-btn-secondary ds-btn-sm"
                      onClick={handleApprovePeriod}
                      disabled={loading || periodKpis.count === 0}
                      title="Aprobar el periodo para autorizar la dispersión de pagos"
                    >
                      <CheckCircle2 size={15} color="var(--ds-info)" /> Aprobar Periodo
                    </button>
                  )}

                  {hasPermission('Nomina', 'editar') && periodDetails.period.status === 'Aprobado' && (
                    <button 
                      className="ds-btn ds-btn-secondary ds-btn-sm"
                      onClick={handleClosePeriod}
                      disabled={loading}
                      title="Cerrar definitivamente el periodo cuando los saldos estén saldados"
                    >
                      <Check size={15} color="var(--ds-success)" /> Cerrar Quincena
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* TARJETAS KPI DE LA QUINCENA */}
          <div className="ds-cards-grid">
            <div className="ds-stat-card">
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)', fontWeight: 600 }}>Total Devengado (Bruto)</span>
              <strong style={{ fontSize: '1.6rem', color: 'var(--ds-text-primary)' }}>
                {formatCurrency(periodKpis.totalGross)}
              </strong>
              <small style={{ color: 'var(--ds-text-secondary)' }}>Salarios base + Aux. Transp. + Extras</small>
            </div>

            <div className="ds-stat-card">
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)', fontWeight: 600 }}>Deducciones Totales</span>
              <strong style={{ fontSize: '1.6rem', color: 'var(--ds-danger)' }}>
                {formatCurrency(periodKpis.totalDeductions)}
              </strong>
              <small style={{ color: 'var(--ds-text-secondary)' }}>Salud (4%) + Pensión (4%) + Préstamos</small>
            </div>

            <div className="ds-stat-card" style={{ borderColor: 'var(--ds-primary-border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-primary)', fontWeight: 700 }}>Neto a Pagar</span>
              <strong style={{ fontSize: '1.6rem', color: 'var(--ds-primary)' }}>
                {formatCurrency(periodKpis.totalNet)}
              </strong>
              <small style={{ color: 'var(--ds-text-secondary)' }}>Líquido causado para {periodKpis.count} colaboradores</small>
            </div>

            <div className="ds-stat-card">
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)', fontWeight: 600 }}>Total Pagado</span>
              <strong style={{ fontSize: '1.6rem', color: 'var(--ds-success)' }}>
                {formatCurrency(periodKpis.totalPaid)}
              </strong>
              <small style={{ color: 'var(--ds-text-secondary)' }}>Comprobantes asentados en caja</small>
            </div>

            <div className="ds-stat-card" style={{ backgroundColor: periodKpis.totalPending > 0 ? 'var(--ds-warning-bg)' : undefined }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)', fontWeight: 600 }}>Saldo Pendiente</span>
              <strong style={{ fontSize: '1.6rem', color: periodKpis.totalPending > 0 ? 'var(--ds-warning)' : 'var(--ds-success)' }}>
                {formatCurrency(periodKpis.totalPending)}
              </strong>
              <small style={{ color: 'var(--ds-text-secondary)' }}>{periodKpis.totalPending === 0 ? 'Quincena totalmente cancelada' : 'Pendiente de desembolso'}</small>
            </div>
          </div>

          {/* TABLA DETALLE DE COLABORADORES EN LA QUINCENA */}
          <div className="ds-card">
            <div className="ds-card-header">
              <span className="ds-card-title">Planilla Detallada de Colaboradores</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)' }}>
                {periodDetails?.items?.length || 0} registros calculados
              </span>
            </div>

            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Modalidad</th>
                    <th>Días / Turnos</th>
                    <th>Salario Base</th>
                    <th>Aux. Transporte</th>
                    <th>Extras / Recargos</th>
                    <th>Deducciones</th>
                    <th>Neto a Pagar</th>
                    <th>Pagado</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {periodDetails?.items?.map(item => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.first_name} {item.last_name}</strong>
                        <small>{item.document_number} · {item.position}</small>
                      </td>
                      <td>
                        <span className="ds-badge ds-badge-neutral">{item.contract_type}</span>
                      </td>
                      <td>
                        <strong>{item.days_worked} d</strong>
                      </td>
                      <td>{formatCurrency(item.base_salary_earned)}</td>
                      <td>{formatCurrency(item.transport_allowance_earned)}</td>
                      <td>{formatCurrency(item.overtime_amount)}</td>
                      <td style={{ color: 'var(--ds-danger)' }}>
                        {formatCurrency(item.total_deductions)}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--ds-primary)' }}>{formatCurrency(item.net_payable)}</strong>
                      </td>
                      <td style={{ color: 'var(--ds-success)' }}>{formatCurrency(item.total_paid || 0)}</td>
                      <td>
                        <strong style={{ color: (item.pending_balance || 0) > 0 ? 'var(--ds-warning)' : 'var(--ds-text-muted)' }}>
                          {formatCurrency(item.pending_balance || 0)}
                        </strong>
                      </td>
                      <td>
                        <span className={`ds-badge ${
                          item.payment_status === 'Pagado' ? 'ds-badge-success' :
                          item.payment_status === 'Parcial' ? 'ds-badge-warning' : 'ds-badge-danger'
                        }`}>
                          {item.payment_status || 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        {hasPermission('Nomina', 'pagar') && periodDetails?.period?.status === 'Aprobado' && item.payment_status !== 'Pagado' && (
                          <button 
                            className="ds-btn ds-btn-primary ds-btn-sm"
                            onClick={() => handleOpenPaymentModal(item)}
                            title="Registrar comprobante de pago con idempotencia transaccional"
                          >
                            <DollarSign size={14} /> Pagar
                          </button>
                        )}
                        {periodDetails?.period?.status !== 'Aprobado' && item.payment_status !== 'Pagado' && (
                          <small style={{ color: 'var(--ds-text-muted)' }}>Requiere aprobación</small>
                        )}
                        {item.payment_status === 'Pagado' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--ds-success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} /> Saldado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {(!periodDetails?.items || periodDetails.items.length === 0) && (
                    <tr>
                      <td colSpan="12" style={{ textAlign: 'center', padding: 'var(--ds-space-xl)' }}>
                        <div style={{ display: 'grid', placeItems: 'center', gap: '8px' }}>
                          <AlertCircle size={32} color="var(--ds-text-muted)" />
                          <p style={{ color: 'var(--ds-text-muted)', fontWeight: 600 }}>
                            Este periodo aún no tiene liquidación calculada.
                          </p>
                          {hasPermission('Nomina', 'calcular') && (
                            <button className="ds-btn ds-btn-primary ds-btn-sm" onClick={handleCalculatePeriod}>
                              <RefreshCw size={15} /> Ejecutar Primer Cálculo de Nómina
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: ASISTENCIA Y TURNOS DIARIOS
      ====================================================================== */}
      {activeTab === 'asistencia' && (
        <div style={{ display: 'grid', gap: 'var(--ds-space-lg)' }}>
          {/* BARRA DE FECHA Y FILTROS */}
          <div className="ds-card" style={{ padding: 'var(--ds-space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ds-space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={20} color="var(--ds-primary)" />
                <span style={{ fontWeight: 700 }}>Fecha de Asistencia:</span>
                <input 
                  type="date" 
                  className="ds-input" 
                  style={{ width: 'auto' }}
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                />
                <button 
                  className="ds-btn ds-btn-ghost ds-btn-sm" 
                  onClick={() => setAttendanceDate(getTodayBogota())}
                >
                  Hoy
                </button>
              </div>

              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)' }}>
                Los turnos guardados se totalizan por fecha al calcular la nómina sin duplicar subsidios.
              </span>
            </div>
          </div>

          {/* TABLA DE ASISTENCIA POR COLABORADOR */}
          <div className="ds-card">
            <div className="ds-card-header">
              <span className="ds-card-title">Marcaciones del {formatDateOnly(attendanceDate)}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)' }}>
                {employees.filter(e => e.status === 'Activo').length} colaboradores activos
              </span>
            </div>

            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Estado de Jornada</th>
                    <th>Tipo de Turno</th>
                    <th>Horas Trab.</th>
                    <th>Rec. Nocturno (35%)</th>
                    <th>Festivo (75%)</th>
                    <th>¿Comió?</th>
                    <th>Guardar</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.filter(e => e.status === 'Activo').map(emp => {
                    const record = dailyAttendance.find(a => a.employee_id === emp.id) || {};
                    return (
                      <AttendanceRow 
                        key={emp.id}
                        employee={emp}
                        record={record}
                        saving={savingAttendanceId === emp.id}
                        onSave={(fields) => handleSaveAttendanceRow(emp.id, fields)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: EMPLEADOS Y PERSONAL (FICHAS)
      ====================================================================== */}
      {activeTab === 'empleados' && (
        <div style={{ display: 'grid', gap: 'var(--ds-space-lg)' }}>
          {/* BUSCADOR Y FILTROS */}
          <div className="ds-card" style={{ padding: 'var(--ds-space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ds-space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '480px' }}>
                <Search size={18} color="var(--ds-text-muted)" />
                <input 
                  type="text" 
                  className="ds-input" 
                  placeholder="Buscar por nombre, documento o cargo..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)' }}>Estado:</span>
                <select 
                  className="ds-input" 
                  style={{ width: 'auto' }}
                  value={employeeFilterStatus}
                  onChange={(e) => setEmployeeFilterStatus(e.target.value)}
                >
                  <option value="Activo">Activos</option>
                  <option value="Retirado">Retirados</option>
                  <option value="Todos">Todos</option>
                </select>
              </div>
            </div>
          </div>

          {/* LISTADO DE EMPLEADOS */}
          <div className="ds-card">
            <div className="ds-card-header">
              <span className="ds-card-title">Directorio de Colaboradores</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)' }}>
                {filteredEmployees.length} encontrados
              </span>
            </div>

            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Cargo / Posición</th>
                    <th>Tipo Contrato</th>
                    <th>Salario Base / Tarifa</th>
                    <th>Aux. Transporte</th>
                    <th>Medio de Pago</th>
                    <th>Fecha Ingreso</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <strong>{emp.first_name} {emp.last_name}</strong>
                        <small>{emp.document_type}: {emp.document_number}</small>
                      </td>
                      <td>
                        <span className="ds-badge ds-badge-neutral">{emp.position}</span>
                      </td>
                      <td>{emp.contract_type}</td>
                      <td>
                        <strong>
                          {emp.contract_type?.includes('Turno') || emp.contract_type?.includes('Jornal')
                            ? `${formatCurrency(emp.daily_rate || emp.hourly_rate * 8)} / turno`
                            : formatCurrency(emp.salary_base)}
                        </strong>
                      </td>
                      <td>
                        {emp.has_transport_allowance 
                          ? <span className="ds-badge ds-badge-success">Aplica</span> 
                          : <span className="ds-badge ds-badge-neutral">Exento</span>}
                      </td>
                      <td>
                        <span>{emp.payment_method || 'Transferencia'}</span>
                        {emp.bank_name ? <small>{emp.bank_name} - {emp.bank_account_number}</small> : null}
                      </td>
                      <td>{formatDateOnly(emp.hire_date)}</td>
                      <td>
                        <span className={`ds-badge ${emp.status === 'Activo' ? 'ds-badge-success' : 'ds-badge-neutral'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td>
                        {hasPermission('Nomina', 'editar') && (
                          <button 
                            className="ds-btn ds-btn-ghost ds-btn-sm"
                            onClick={() => handleOpenEmployeeModal(emp)}
                            title="Editar ficha del empleado"
                          >
                            <Edit3 size={15} /> Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: 'var(--ds-space-xl)', color: 'var(--ds-text-muted)' }}>
                        No se encontraron colaboradores con los criterios seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: COMIDAS Y SUMINISTROS (CONSUMO INTERNO / COGS)
      ====================================================================== */}
      {activeTab === 'comidas' && (
        <div style={{ display: 'grid', gap: 'var(--ds-space-lg)' }}>
          {/* BARRA DE ACCIÓN Y FECHAS */}
          <div className="ds-card" style={{ padding: 'var(--ds-space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ds-space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Coffee size={20} color="var(--ds-primary)" />
                <span style={{ fontWeight: 700 }}>Rango de Entrega:</span>
                <input 
                  type="date" 
                  className="ds-input" 
                  style={{ width: 'auto' }}
                  value={mealsDateStart}
                  onChange={(e) => setMealsDateStart(e.target.value)}
                />
                <span>hasta</span>
                <input 
                  type="date" 
                  className="ds-input" 
                  style={{ width: 'auto' }}
                  value={mealsDateEnd}
                  onChange={(e) => setMealsDateEnd(e.target.value)}
                />
                <button className="ds-btn ds-btn-secondary ds-btn-sm" onClick={loadMeals}>
                  <RefreshCw size={14} /> Filtrar
                </button>
              </div>

              {hasPermission('Nomina', 'crear') && (
                <button 
                  className="ds-btn ds-btn-primary ds-btn-sm"
                  onClick={() => {
                    setMealForm({
                      employee_id: employees[0]?.id || '',
                      item_type: 'Menu',
                      product_id: availableProducts[0]?.id || '',
                      inventory_id: availableInventory[0]?.id || '',
                      quantity: 1,
                      allow_untracked_meal: false,
                      notes: ''
                    });
                    setIsMealModalOpen(true);
                  }}
                >
                  <Plus size={16} /> + Registrar Entrega de Comida / Insumo
                </button>
              )}
            </div>
          </div>

          {/* TABLA DE CONSUMOS */}
          <div className="ds-card">
            <div className="ds-card-header">
              <span className="ds-card-title">Historial de Consumo Interno y Suministros</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)' }}>
                {meals.length} entregas registradas
              </span>
            </div>

            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Colaborador</th>
                    <th>Ítem Entregado</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Costo Unitario</th>
                    <th>Costo Total</th>
                    <th>Kardex / Receta</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {meals.map(m => (
                    <tr key={m.id}>
                      <td>{formatDateOnly(m.delivery_date)}</td>
                      <td>
                        <strong>{m.first_name} {m.last_name}</strong>
                        <small>{m.position}</small>
                      </td>
                      <td><strong>{m.item_title}</strong></td>
                      <td>
                        <span className="ds-badge ds-badge-neutral">{m.item_type}</span>
                      </td>
                      <td>{m.quantity}</td>
                      <td>{formatCurrency(m.unit_cost)}</td>
                      <td><strong>{formatCurrency(m.total_cost)}</strong></td>
                      <td>
                        {m.is_untracked ? (
                          <span className="ds-badge ds-badge-warning" title="Consumo financiero autorizado sin descuento físico">Sin Receta</span>
                        ) : (
                          <span className="ds-badge ds-badge-success" title="Descontado de stock físico en Kardex">Kardex OK</span>
                        )}
                      </td>
                      <td>
                        <span className={`ds-badge ${m.status === 'Entregado' ? 'ds-badge-info' : 'ds-badge-danger'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td>
                        {hasPermission('Nomina', 'eliminar') && m.status === 'Entregado' && (
                          <button 
                            className="ds-btn ds-btn-ghost ds-btn-sm" 
                            style={{ color: 'var(--ds-danger)' }}
                            onClick={() => handleCancelMeal(m.id)}
                            title="Anular consumo y restituir ingredientes en bodega"
                          >
                            <Trash2 size={14} /> Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {meals.length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: 'var(--ds-space-xl)', color: 'var(--ds-text-muted)' }}>
                        No hay registros de consumo interno para el rango de fechas seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: DEDUCCIONES, ANTICIPOS Y PRÉSTAMOS
      ====================================================================== */}
      {activeTab === 'deducciones' && (
        <div style={{ display: 'grid', gap: 'var(--ds-space-lg)' }}>
          <div className="ds-card" style={{ padding: 'var(--ds-space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ds-space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CreditCard size={20} color="var(--ds-primary)" />
                <span style={{ fontWeight: 700 }}>Préstamos y Amortizaciones de Personal</span>
              </div>

              {hasPermission('Nomina', 'crear') && (
                <button 
                  className="ds-btn ds-btn-primary ds-btn-sm"
                  onClick={() => {
                    setDeductionForm({
                      employee_id: employees[0]?.id || '',
                      type: 'Préstamo',
                      amount: '',
                      reason: 'Préstamo Personal',
                      installments_total: 1,
                      installment_amount: '',
                      notes: ''
                    });
                    setIsDeductionModalOpen(true);
                  }}
                >
                  <Plus size={16} /> + Registrar Nuevo Préstamo / Anticipo
                </button>
              )}
            </div>
          </div>

          <div className="ds-card">
            <div className="ds-card-header">
              <span className="ds-card-title">Control de Deducciones Periódicas</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)' }}>
                {deductions.length} registradas
              </span>
            </div>

            <div className="ds-table-container">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Motivo / Razón</th>
                    <th>Tipo</th>
                    <th>Monto Total</th>
                    <th>Cuota Quincenal</th>
                    <th>Pagado / Restante</th>
                    <th>Progreso</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map(d => {
                    const total = Number(d.amount || 0);
                    const remaining = Number(d.balance_remaining || 0);
                    const paid = Math.max(0, total - remaining);
                    const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                    return (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.first_name} {d.last_name}</strong>
                          <small>{d.position}</small>
                        </td>
                        <td><strong>{d.reason}</strong></td>
                        <td>
                          <span className="ds-badge ds-badge-neutral">{d.type}</span>
                        </td>
                        <td>{formatCurrency(total)}</td>
                        <td>{formatCurrency(d.installment_amount)}</td>
                        <td>
                          <span style={{ color: 'var(--ds-success)' }}>{formatCurrency(paid)}</span> / <span style={{ color: 'var(--ds-warning)' }}>{formatCurrency(remaining)}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '6px', background: 'var(--ds-border)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ds-primary)' }} />
                            </div>
                            <small>{pct}%</small>
                          </div>
                        </td>
                        <td>
                          <span className={`ds-badge ${d.status === 'Activo' || d.status === 'Pendiente' ? 'ds-badge-info' : 'ds-badge-success'}`}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {deductions.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: 'var(--ds-space-xl)', color: 'var(--ds-text-muted)' }}>
                        No hay deducciones o préstamos activos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: SIMULADOR DE LIQUIDACIÓN DEFINITIVA
      ====================================================================== */}
      {activeTab === 'liquidaciones' && (
        <div style={{ display: 'grid', gap: 'var(--ds-space-lg)' }}>
          {/* SIMULADOR HEADER */}
          <div className="ds-card" style={{ padding: 'var(--ds-space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--ds-space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={22} color="var(--ds-primary)" />
              Simulador Técnico de Retiro y Liquidación Definitiva (CST / Ley 50 de 1990)
            </h3>
            <p style={{ color: 'var(--ds-text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--ds-space-md)' }}>
              Calcula las prestaciones sociales causadas al retiro. Por mandato legal, las cesantías de años anteriores debieron ser consignadas al fondo antes del 15 de febrero y NO se asumen como deuda pendiente sin soporte documental.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--ds-space-md)', alignItems: 'end' }}>
              <div>
                <label className="ds-label" style={{ fontWeight: 600 }}>Colaborador a Retirar:</label>
                <select 
                  className="ds-input"
                  value={settlementPreviewEmployeeId}
                  onChange={(e) => setSettlementPreviewEmployeeId(e.target.value)}
                >
                  <option value="">-- Seleccionar Colaborador --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.document_number}) · {e.contract_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label" style={{ fontWeight: 600 }}>Fecha de Retiro / Salida:</label>
                <input 
                  type="date" 
                  className="ds-input"
                  value={settlementRetirementDate}
                  onChange={(e) => setSettlementRetirementDate(e.target.value)}
                />
              </div>

              <div>
                <button 
                  className="ds-btn ds-btn-primary" 
                  style={{ width: '100%' }}
                  onClick={handlePreviewSettlement}
                  disabled={loading || !settlementPreviewEmployeeId}
                >
                  <RefreshCw size={16} /> Calcular Estimación
                </button>
              </div>
            </div>
          </div>

          {/* DESGLOSE DE LIQUIDACIÓN ESTIMADA */}
          {settlementPreview && (
            <div className="ds-card" style={{ padding: 'var(--ds-space-lg)' }}>
              {settlementPreview.is_provisional && (
                <div style={{ 
                  backgroundColor: 'var(--ds-warning-bg)', 
                  border: '1px solid var(--ds-warning)', 
                  padding: '14px 18px', 
                  borderRadius: 'var(--ds-radius-md)',
                  marginBottom: 'var(--ds-space-lg)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <AlertTriangle size={24} color="var(--ds-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--ds-warning)', fontSize: '0.98rem' }}>Liquidación en Estado PROVISIONAL</strong>
                    <p style={{ fontSize: '0.88rem', marginTop: '4px', color: 'var(--ds-text-primary)' }}>
                      Existen años de antigüedad sin soportes documentados de consignación de cesantías al fondo o confirmación de salario variable.
                    </p>
                    <button 
                      className="ds-btn ds-btn-ghost ds-btn-sm" 
                      style={{ marginTop: '8px', border: '1px solid var(--ds-warning)' }}
                      onClick={() => {
                        setBenefitRecordForm({
                          employee_id: settlementPreviewEmployeeId,
                          benefit_type: 'CESANTIAS',
                          period_year: new Date().getFullYear() - 1,
                          period_semester: 1,
                          status: 'Consignado',
                          amount: '',
                          days: '',
                          evidence_reference: '',
                          notes: ''
                        });
                        setIsBenefitRecordModalOpen(true);
                      }}
                    >
                      <Plus size={14} /> + Adjuntar Comprobante de Años Anteriores
                    </button>
                  </div>
                </div>
              )}

              <div className="ds-card-header" style={{ padding: 0, paddingBottom: 'var(--ds-space-md)', marginBottom: 'var(--ds-space-md)' }}>
                <span className="ds-card-title">Desglose de Conceptos Causados al Retiro</span>
                <span className="ds-badge ds-badge-primary">
                  Días Totales: {settlementPreview.days_total}
                </span>
              </div>

              <div className="ds-table-container" style={{ marginBottom: 'var(--ds-space-lg)' }}>
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Concepto Prestacional</th>
                      <th>Base de Liquidación</th>
                      <th>Días Causados</th>
                      <th>Valor Causado</th>
                      <th>Estado / Documentación</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Cesantías Año en Curso</strong></td>
                      <td>{formatCurrency(settlementPreview.base_salary_transport)}</td>
                      <td>{settlementPreview.cesantias_current_days} d</td>
                      <td><strong>{formatCurrency(settlementPreview.cesantias_current_amount)}</strong></td>
                      <td><span className="ds-badge ds-badge-success">Causado en año de retiro</span></td>
                    </tr>
                    <tr>
                      <td><strong>Intereses a las Cesantías (12% anual)</strong></td>
                      <td>{formatCurrency(settlementPreview.cesantias_current_amount)}</td>
                      <td>{settlementPreview.cesantias_current_days} d</td>
                      <td><strong>{formatCurrency(settlementPreview.intereses_current_amount)}</strong></td>
                      <td><span className="ds-badge ds-badge-success">Interés proporcional</span></td>
                    </tr>
                    <tr>
                      <td><strong>Prima de Servicios (Semestre Actual)</strong></td>
                      <td>{formatCurrency(settlementPreview.base_salary_transport)}</td>
                      <td>{settlementPreview.prima_current_days} d</td>
                      <td><strong>{formatCurrency(settlementPreview.prima_current_amount)}</strong></td>
                      <td><span className="ds-badge ds-badge-success">Semestre corriente</span></td>
                    </tr>
                    <tr>
                      <td><strong>Vacaciones Compensadas en Dinero</strong></td>
                      <td>{formatCurrency(settlementPreview.base_salary_only)}</td>
                      <td>{settlementPreview.vacaciones_pending_days} d</td>
                      <td><strong>{formatCurrency(settlementPreview.vacaciones_amount)}</strong></td>
                      <td><span className="ds-badge ds-badge-success">Sin auxilio de transporte</span></td>
                    </tr>
                    {Number(settlementPreview.prior_cesantias_pending || 0) > 0 && (
                      <tr style={{ backgroundColor: 'var(--ds-warning-bg)' }}>
                        <td><strong>Cesantías Años Anteriores (Documentadas Pendientes)</strong></td>
                        <td>—</td>
                        <td>—</td>
                        <td><strong>{formatCurrency(settlementPreview.prior_cesantias_pending)}</strong></td>
                        <td><span className="ds-badge ds-badge-warning">Por consignar</span></td>
                      </tr>
                    )}
                    {Number(settlementPreview.pending_deductions_total || 0) > 0 && (
                      <tr style={{ color: 'var(--ds-danger)' }}>
                        <td><strong>Deducciones / Préstamos por Descontar</strong></td>
                        <td>—</td>
                        <td>—</td>
                        <td><strong>- {formatCurrency(settlementPreview.pending_deductions_total)}</strong></td>
                        <td><span className="ds-badge ds-badge-danger">Descuento de finiquito</span></td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--ds-bg-elevated)', fontSize: '1.05rem' }}>
                      <td colSpan="3"><strong>TOTAL NETO ESTIMADO DE LIQUIDACIÓN</strong></td>
                      <td colSpan="2">
                        <strong style={{ fontSize: '1.35rem', color: 'var(--ds-primary)' }}>
                          {formatCurrency(settlementPreview.net_settlement_payable)}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* LISTADO DE COMPROBANTES HISTÓRICOS REGISTRADOS */}
              {benefitRecords.length > 0 && (
                <div style={{ marginTop: 'var(--ds-space-md)' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Soportes de Prestaciones Previas Registrados:</h4>
                  <ul>
                    {benefitRecords.map(r => (
                      <li key={r.id} style={{ fontSize: '0.85rem', color: 'var(--ds-text-secondary)', marginBottom: '4px' }}>
                        <strong>{r.benefit_type} ({r.period_year}):</strong> {formatCurrency(r.amount)} — Estado: {r.status} (Ref: {r.evidence_reference})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 7: PARÁMETROS LABORALES
      ====================================================================== */}
      {activeTab === 'config' && (
        <div style={{ display: 'grid', gap: 'var(--ds-space-lg)' }}>
          <div className="ds-card" style={{ padding: 'var(--ds-space-lg)' }}>
            <div className="ds-card-header" style={{ padding: 0, paddingBottom: 'var(--ds-space-md)', marginBottom: 'var(--ds-space-md)' }}>
              <span className="ds-card-title">Parámetros Laborales Oficiales (República de Colombia)</span>
              <span className="ds-badge ds-badge-primary">Vigencia 2026</span>
            </div>
            <p style={{ color: 'var(--ds-text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--ds-space-lg)' }}>
              Estos valores rigen los cálculos quincenales, horas extras, auxilio de transporte diario y deducciones de ley. Conservan vigencia temporal para no alterar periodos históricos ya cerrados.
            </p>

            <form onSubmit={handleSaveConfig} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--ds-space-md)' }}>
              <div>
                <label className="ds-label">Salario Mínimo Legal Mensual (SMMLV):</label>
                <input 
                  type="number" 
                  className="ds-input"
                  value={configForm.smmlv_amount}
                  onChange={(e) => setConfigForm({ ...configForm, smmlv_amount: e.target.value })}
                />
              </div>

              <div>
                <label className="ds-label">Auxilio de Transporte Mensual:</label>
                <input 
                  type="number" 
                  className="ds-input"
                  value={configForm.transport_allowance_monthly}
                  onChange={(e) => setConfigForm({ ...configForm, transport_allowance_monthly: e.target.value })}
                />
              </div>

              <div>
                <label className="ds-label">Auxilio de Transporte Diario:</label>
                <input 
                  type="number" 
                  className="ds-input"
                  value={configForm.transport_allowance_daily}
                  onChange={(e) => setConfigForm({ ...configForm, transport_allowance_daily: e.target.value })}
                />
              </div>

              <div>
                <label className="ds-label">Recargo Nocturno (%):</label>
                <input 
                  type="number" 
                  className="ds-input"
                  value={configForm.night_shift_surcharge_pct}
                  onChange={(e) => setConfigForm({ ...configForm, night_shift_surcharge_pct: e.target.value })}
                />
              </div>

              <div>
                <label className="ds-label">Recargo Dominical / Festivo (%):</label>
                <input 
                  type="number" 
                  className="ds-input"
                  value={configForm.holiday_surcharge_pct}
                  onChange={(e) => setConfigForm({ ...configForm, holiday_surcharge_pct: e.target.value })}
                />
              </div>

              <div>
                <label className="ds-label">Jornada Diaria Estándar (Horas):</label>
                <input 
                  type="number" 
                  className="ds-input"
                  value={configForm.standard_daily_hours}
                  onChange={(e) => setConfigForm({ ...configForm, standard_daily_hours: e.target.value })}
                />
              </div>

              <div>
                <label className="ds-label">Deducción Salud Trabajador (%):</label>
                <input 
                  type="number" 
                  className="ds-input"
                  value={configForm.health_employee_pct}
                  onChange={(e) => setConfigForm({ ...configForm, health_employee_pct: e.target.value })}
                />
              </div>

              <div>
                <label className="ds-label">Deducción Pensión Trabajador (%):</label>
                <input 
                  type="number" 
                  className="ds-input"
                  value={configForm.pension_employee_pct}
                  onChange={(e) => setConfigForm({ ...configForm, pension_employee_pct: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: 'var(--ds-space-md)', display: 'flex', justifyContent: 'flex-end' }}>
                {hasPermission('Nomina', 'editar') && (
                  <button type="submit" className="ds-btn ds-btn-primary" disabled={loading}>
                    <ShieldCheck size={16} /> Guardar Parámetros de Nómina
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: NUEVO / EDITAR EMPLEADO
      ====================================================================== */}
      {isEmployeeModalOpen && (
        <div className="ds-modal-overlay">
          <div className="ds-modal ds-modal-lg">
            <div className="ds-modal-header">
              <span className="ds-modal-title">
                {editingEmployee ? 'Editar Ficha de Colaborador' : 'Registrar Nuevo Colaborador'}
              </span>
              <button className="ds-modal-close" onClick={() => setIsEmployeeModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee}>
              <div className="ds-modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--ds-space-md)' }}>
                <div>
                  <label className="ds-label">Tipo Documento:</label>
                  <select 
                    className="ds-input"
                    value={employeeForm.document_type}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, document_type: e.target.value })}
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PPT">Permiso por Protección Temporal (PPT)</option>
                    <option value="PEP">Permiso Especial (PEP)</option>
                    <option value="PAS">Pasaporte</option>
                  </select>
                </div>

                <div>
                  <label className="ds-label">Número de Documento *:</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    required
                    value={employeeForm.document_number}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, document_number: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Nombres *:</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    required
                    value={employeeForm.first_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, first_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Apellidos *:</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    required
                    value={employeeForm.last_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, last_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Cargo / Posición *:</label>
                  <select 
                    className="ds-input"
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                  >
                    <option value="Cocina">Cocina</option>
                    <option value="Parrilla">Parrilla</option>
                    <option value="Caja">Caja</option>
                    <option value="Domicilios">Domiciliario</option>
                    <option value="Administrador">Administrador de Turno</option>
                    <option value="Servicios Generales">Servicios Generales</option>
                  </select>
                </div>

                <div>
                  <label className="ds-label">Tipo de Contrato:</label>
                  <select 
                    className="ds-input"
                    value={employeeForm.contract_type}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, contract_type: e.target.value })}
                  >
                    <option value="Laboral Fijo Quincenal">Laboral Fijo Quincenal (360 días)</option>
                    <option value="Laboral Indefinido">Laboral Indefinido</option>
                    <option value="Jornal / Por Turno">Jornal / Por Turno</option>
                    <option value="Prestación de Servicios">Prestación de Servicios</option>
                  </select>
                </div>

                <div>
                  <label className="ds-label">Salario Base Mensual:</label>
                  <input 
                    type="number" 
                    className="ds-input"
                    placeholder="Ej. 1750905"
                    value={employeeForm.salary_base}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, salary_base: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Tarifa Diaria / Turno:</label>
                  <input 
                    type="number" 
                    className="ds-input"
                    placeholder="Ej. 60000"
                    value={employeeForm.daily_rate}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, daily_rate: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                  <input 
                    type="checkbox"
                    id="chkTransport"
                    checked={employeeForm.has_transport_allowance}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, has_transport_allowance: e.target.checked })}
                  />
                  <label htmlFor="chkTransport" style={{ cursor: 'pointer', fontWeight: 600 }}>Aplica Auxilio de Transporte</label>
                </div>

                <div>
                  <label className="ds-label">Medio de Pago:</label>
                  <select 
                    className="ds-input"
                    value={employeeForm.payment_method}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, payment_method: e.target.value })}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Bancolombia">Bancolombia</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                  </select>
                </div>

                <div>
                  <label className="ds-label">Banco / Cuenta:</label>
                  <input 
                    type="text" 
                    className="ds-input"
                    placeholder="Número de cuenta o celular Nequi"
                    value={employeeForm.bank_account_number}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, bank_account_number: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Fecha de Ingreso:</label>
                  <input 
                    type="date" 
                    className="ds-input" 
                    value={employeeForm.hire_date}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setIsEmployeeModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ds-btn ds-btn-primary" disabled={loading}>
                  Guardar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: NUEVO PERIODO DE NÓMINA
      ====================================================================== */}
      {isNewPeriodModalOpen && (
        <div className="ds-modal-overlay">
          <div className="ds-modal">
            <div className="ds-modal-header">
              <span className="ds-modal-title">Abrir Nuevo Periodo de Nómina</span>
              <button className="ds-modal-close" onClick={() => setIsNewPeriodModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod}>
              <div className="ds-modal-body" style={{ display: 'grid', gap: 'var(--ds-space-md)' }}>
                <div>
                  <label className="ds-label">Nombre del Periodo (Opcional):</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    placeholder="Ej. 1ra Quincena Octubre 2026 (se genera automático si se omite)"
                    value={newPeriodForm.name}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Tipo de Periodo:</label>
                  <select 
                    className="ds-input"
                    value={newPeriodForm.period_type}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, period_type: e.target.value })}
                  >
                    <option value="quincenal">Quincenal (Día 1-15 o 16-Fin de Mes)</option>
                    <option value="mensual">Mensual Completo</option>
                  </select>
                </div>

                <div>
                  <label className="ds-label">Fecha de Inicio *:</label>
                  <input 
                    type="date" 
                    className="ds-input" 
                    required
                    value={newPeriodForm.start_date}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Fecha de Fin *:</label>
                  <input 
                    type="date" 
                    className="ds-input" 
                    required
                    value={newPeriodForm.end_date}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, end_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Notas Adicionales:</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    placeholder="Observaciones de la quincena..."
                    value={newPeriodForm.notes}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setIsNewPeriodModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ds-btn ds-btn-primary" disabled={loading}>
                  Crear Periodo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: REGISTRAR PAGO CON IDEMPOTENCIA
      ====================================================================== */}
      {isPaymentModalOpen && paymentItemTarget && (
        <div className="ds-modal-overlay">
          <div className="ds-modal">
            <div className="ds-modal-header">
              <span className="ds-modal-title">Registrar Pago a Colaborador</span>
              <button className="ds-modal-close" onClick={() => setIsPaymentModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="ds-modal-body" style={{ display: 'grid', gap: 'var(--ds-space-md)' }}>
                <div style={{ backgroundColor: 'var(--ds-bg-elevated)', padding: '12px', borderRadius: 'var(--ds-radius-md)' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {paymentItemTarget.first_name} {paymentItemTarget.last_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ds-text-muted)', marginTop: '2px' }}>
                    Documento: {paymentItemTarget.document_number} · Neto Total: {formatCurrency(paymentItemTarget.net_payable)}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--ds-primary)', fontWeight: 700, marginTop: '6px' }}>
                    Saldo Pendiente de Pago: {formatCurrency(paymentItemTarget.pending_balance !== undefined ? paymentItemTarget.pending_balance : (paymentItemTarget.net_payable - (paymentItemTarget.total_paid || 0)))}
                  </div>
                </div>

                <div>
                  <label className="ds-label">Monto a Pagar (COP) *:</label>
                  <input 
                    type="number" 
                    className="ds-input" 
                    required
                    max={paymentItemTarget.pending_balance || paymentItemTarget.net_payable}
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                  />
                  <small style={{ color: 'var(--ds-text-muted)' }}>Admite desembolsos parciales o el saldo completo.</small>
                </div>

                <div>
                  <label className="ds-label">Medio de Pago:</label>
                  <select 
                    className="ds-input"
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Efectivo">Efectivo de Caja</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Bancolombia">Bancolombia</option>
                  </select>
                </div>

                <div>
                  <label className="ds-label">Comprobante / Referencia:</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    placeholder="Ej. Transacción Nequi o Nro. Recibo"
                    value={paymentForm.voucher_reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, voucher_reference: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Notas:</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    placeholder="Observaciones del desembolso..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--ds-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="var(--ds-success)" />
                  Clave de idempotencia única: <code>{paymentForm.idempotency_key}</code>
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ds-btn ds-btn-primary" disabled={submittingPayment}>
                  {submittingPayment ? 'Registrando Pago...' : 'Confirmar y Pagar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: REGISTRAR CONSUMO INTERNO DE COMIDA
      ====================================================================== */}
      {isMealModalOpen && (
        <div className="ds-modal-overlay">
          <div className="ds-modal">
            <div className="ds-modal-header">
              <span className="ds-modal-title">Registrar Entrega de Comida / Suministro</span>
              <button className="ds-modal-close" onClick={() => setIsMealModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMealDelivery}>
              <div className="ds-modal-body" style={{ display: 'grid', gap: 'var(--ds-space-md)' }}>
                <div>
                  <label className="ds-label">Colaborador Receptor *:</label>
                  <select 
                    className="ds-input"
                    value={mealForm.employee_id}
                    onChange={(e) => setMealForm({ ...mealForm, employee_id: e.target.value })}
                  >
                    {employees.filter(e => e.status === 'Activo').map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.position})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ds-label">Tipo de Ítem Entregado:</label>
                  <select 
                    className="ds-input"
                    value={mealForm.item_type}
                    onChange={(e) => setMealForm({ ...mealForm, item_type: e.target.value })}
                  >
                    <option value="Menu">Plato / Combo de la Carta (Receta Técnica)</option>
                    <option value="Insumo">Insumo Crudo de Almacén</option>
                  </select>
                </div>

                {mealForm.item_type === 'Menu' ? (
                  <div>
                    <label className="ds-label">Producto de la Carta *:</label>
                    <select 
                      className="ds-input"
                      value={mealForm.product_id}
                      onChange={(e) => setMealForm({ ...mealForm, product_id: e.target.value })}
                    >
                      <option value="">-- Seleccionar Plato / Producto --</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title || p.name} {p.recipe_items_count > 0 ? '(Receta OK)' : '(Sin receta)'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="ds-label">Insumo de Bodega *:</label>
                    <select 
                      className="ds-input"
                      value={mealForm.inventory_id}
                      onChange={(e) => setMealForm({ ...mealForm, inventory_id: e.target.value })}
                    >
                      <option value="">-- Seleccionar Insumo --</option>
                      {availableInventory.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.unit}) - Stock: {i.stock}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="ds-label">Cantidad:</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.1"
                    className="ds-input"
                    value={mealForm.quantity}
                    onChange={(e) => setMealForm({ ...mealForm, quantity: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Notas / Observaciones:</label>
                  <input 
                    type="text" 
                    className="ds-input"
                    placeholder="Ej. Almuerzo de turno..."
                    value={mealForm.notes}
                    onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setIsMealModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ds-btn ds-btn-primary" disabled={loading}>
                  Registrar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: NUEVO PRÉSTAMO / DEDUCCIÓN
      ====================================================================== */}
      {isDeductionModalOpen && (
        <div className="ds-modal-overlay">
          <div className="ds-modal">
            <div className="ds-modal-header">
              <span className="ds-modal-title">Programar Nuevo Préstamo / Anticipo</span>
              <button className="ds-modal-close" onClick={() => setIsDeductionModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDeduction}>
              <div className="ds-modal-body" style={{ display: 'grid', gap: 'var(--ds-space-md)' }}>
                <div>
                  <label className="ds-label">Colaborador Beneficiario *:</label>
                  <select 
                    className="ds-input"
                    value={deductionForm.employee_id}
                    onChange={(e) => setDeductionForm({ ...deductionForm, employee_id: e.target.value })}
                  >
                    {employees.filter(e => e.status === 'Activo').map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ds-label">Tipo de Deducción:</label>
                  <select 
                    className="ds-input"
                    value={deductionForm.type}
                    onChange={(e) => setDeductionForm({ ...deductionForm, type: e.target.value })}
                  >
                    <option value="Préstamo">Préstamo</option>
                    <option value="Anticipo">Anticipo</option>
                    <option value="Descuento">Descuento Dotación / Otros</option>
                  </select>
                </div>

                <div>
                  <label className="ds-label">Motivo / Razón *:</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    required
                    placeholder="Ej. Préstamo personal para educación / Anticipo quincena"
                    value={deductionForm.reason}
                    onChange={(e) => setDeductionForm({ ...deductionForm, reason: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Monto Total (COP) *:</label>
                  <input 
                    type="number" 
                    className="ds-input" 
                    required
                    placeholder="Ej. 200000"
                    value={deductionForm.amount}
                    onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Total de Cuotas Quincenales:</label>
                  <input 
                    type="number" 
                    min="1"
                    className="ds-input" 
                    value={deductionForm.installments_total}
                    onChange={(e) => setDeductionForm({ ...deductionForm, installments_total: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Valor de Cuota Quincenal (COP):</label>
                  <input 
                    type="number" 
                    className="ds-input" 
                    placeholder="Ej. 50000 (calculado automático si se omite)"
                    value={deductionForm.installment_amount}
                    onChange={(e) => setDeductionForm({ ...deductionForm, installment_amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setIsDeductionModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ds-btn ds-btn-primary" disabled={loading}>
                  Programar Préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: REGISTRAR SOPORTE HISTÓRICO DE PRESTACIONES
      ====================================================================== */}
      {isBenefitRecordModalOpen && (
        <div className="ds-modal-overlay">
          <div className="ds-modal">
            <div className="ds-modal-header">
              <span className="ds-modal-title">Registrar Soporte Legal de Prestación</span>
              <button className="ds-modal-close" onClick={() => setIsBenefitRecordModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBenefitRecord}>
              <div className="ds-modal-body" style={{ display: 'grid', gap: 'var(--ds-space-md)' }}>
                <div>
                  <label className="ds-label">Tipo de Prestación *:</label>
                  <select 
                    className="ds-input"
                    value={benefitRecordForm.benefit_type}
                    onChange={(e) => {
                      const bType = e.target.value;
                      setBenefitRecordForm({
                        ...benefitRecordForm,
                        benefit_type: bType,
                        status: bType === 'CESANTIAS' ? 'Consignado' : bType === 'VACACIONES' ? 'Disfrutado' : 'Pagado'
                      });
                    }}
                  >
                    <option value="CESANTIAS">Cesantías Consignadas al Fondo</option>
                    <option value="INTERESES_CESANTIAS">Intereses a las Cesantías</option>
                    <option value="PRIMA">Prima de Servicios</option>
                    <option value="VACACIONES">Vacaciones</option>
                  </select>
                </div>

                <div>
                  <label className="ds-label">Año del Periodo *:</label>
                  <input 
                    type="number" 
                    className="ds-input" 
                    required
                    value={benefitRecordForm.period_year}
                    onChange={(e) => setBenefitRecordForm({ ...benefitRecordForm, period_year: e.target.value })}
                  />
                </div>

                {benefitRecordForm.benefit_type === 'PRIMA' && (
                  <div>
                    <label className="ds-label">Semestre:</label>
                    <select 
                      className="ds-input"
                      value={benefitRecordForm.period_semester}
                      onChange={(e) => setBenefitRecordForm({ ...benefitRecordForm, period_semester: e.target.value })}
                    >
                      <option value="1">Semestre 1 (Enero - Junio)</option>
                      <option value="2">Semestre 2 (Julio - Diciembre)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="ds-label">Estado de Cobertura *:</label>
                  <select 
                    className="ds-input"
                    value={benefitRecordForm.status}
                    onChange={(e) => setBenefitRecordForm({ ...benefitRecordForm, status: e.target.value })}
                  >
                    {benefitRecordForm.benefit_type === 'CESANTIAS' && (
                      <>
                        <option value="Consignado">Consignado al Fondo</option>
                        <option value="Pagado">Pagado Directo</option>
                        <option value="Pendiente">Pendiente Documentado</option>
                      </>
                    )}
                    {benefitRecordForm.benefit_type === 'INTERESES_CESANTIAS' && (
                      <>
                        <option value="Pagado">Pagado al Trabajador</option>
                        <option value="Pendiente">Pendiente Documentado</option>
                      </>
                    )}
                    {benefitRecordForm.benefit_type === 'PRIMA' && (
                      <>
                        <option value="Pagado">Pagada al Trabajador</option>
                        <option value="Pendiente">Pendiente Documentado</option>
                      </>
                    )}
                    {benefitRecordForm.benefit_type === 'VACACIONES' && (
                      <>
                        <option value="Disfrutado">Disfrutadas en Tiempo</option>
                        <option value="Compensado">Compensadas en Dinero</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="ds-label">Monto (COP):</label>
                  <input 
                    type="number" 
                    className="ds-input" 
                    value={benefitRecordForm.amount}
                    onChange={(e) => setBenefitRecordForm({ ...benefitRecordForm, amount: e.target.value })}
                  />
                </div>

                {benefitRecordForm.benefit_type === 'VACACIONES' && (
                  <div>
                    <label className="ds-label">Días de Vacaciones:</label>
                    <input 
                      type="number" 
                      step="0.5"
                      className="ds-input" 
                      value={benefitRecordForm.days}
                      onChange={(e) => setBenefitRecordForm({ ...benefitRecordForm, days: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className="ds-label">Referencia del Soporte / Comprobante *:</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    required
                    placeholder="Ej. Planilla PILA Porvenir Nro 123456 / Recibo firmado"
                    value={benefitRecordForm.evidence_reference}
                    onChange={(e) => setBenefitRecordForm({ ...benefitRecordForm, evidence_reference: e.target.value })}
                  />
                </div>

                <div>
                  <label className="ds-label">Notas Adicionales:</label>
                  <input 
                    type="text" 
                    className="ds-input" 
                    placeholder="Observaciones legales..."
                    value={benefitRecordForm.notes}
                    onChange={(e) => setBenefitRecordForm({ ...benefitRecordForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="ds-modal-footer">
                <button type="button" className="ds-btn ds-btn-secondary" onClick={() => setIsBenefitRecordModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ds-btn ds-btn-primary" disabled={loading}>
                  Guardar Certificación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente de fila de asistencia editable en línea (con estados homologados con backend)
function AttendanceRow({ employee, record, saving, onSave }) {
  const [status, setStatus] = useState(record.status || 'Trabajó');
  const [shiftType, setShiftType] = useState(record.shift_type || 'Completo');
  const [hoursWorked, setHoursWorked] = useState(record.hours_worked ?? 8);
  const [nightHours, setNightHours] = useState(record.night_hours || 0);
  const [holidayHours, setHolidayHours] = useState(record.holiday_hours || 0);
  const [hadMeal, setHadMeal] = useState(record.had_meal ?? false);

  // Sincronizar si cambia el registro externo
  useEffect(() => {
    setStatus(record.status || 'Trabajó');
    setShiftType(record.shift_type || 'Completo');
    setHoursWorked(record.hours_worked ?? 8);
    setNightHours(record.night_hours || 0);
    setHolidayHours(record.holiday_hours || 0);
    setHadMeal(record.had_meal ?? false);
  }, [record]);

  const handleSave = () => {
    onSave({
      status,
      shift_type: shiftType,
      hours_worked: Number(hoursWorked),
      night_hours: Number(nightHours),
      holiday_hours: Number(holidayHours),
      had_meal: hadMeal
    });
  };

  return (
    <tr>
      <td>
        <strong>{employee.first_name} {employee.last_name}</strong>
        <small>{employee.document_number} · {employee.position}</small>
      </td>
      <td>
        <select 
          className="ds-input" 
          style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Trabajó">Trabajó</option>
          <option value="Descanso">Descanso</option>
          <option value="Permiso remunerado">Permiso remunerado</option>
          <option value="Permiso no remunerado">Permiso no remunerado</option>
          <option value="Incapacidad">Incapacidad</option>
          <option value="Vacaciones">Vacaciones</option>
          <option value="Media jornada">Media jornada</option>
          <option value="Festivo">Festivo</option>
        </select>
      </td>
      <td>
        <select 
          className="ds-input" 
          style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
          value={shiftType}
          disabled={status !== 'Trabajó' && status !== 'Media jornada'}
          onChange={(e) => setShiftType(e.target.value)}
        >
          <option value="Completo">Completo (8h)</option>
          <option value="Medio">Medio Turno (4h)</option>
        </select>
      </td>
      <td>
        <input 
          type="number" 
          step="0.5"
          className="ds-input" 
          style={{ width: '70px', padding: '4px 8px', fontSize: '0.85rem' }}
          disabled={status !== 'Trabajó' && status !== 'Media jornada'}
          value={hoursWorked}
          onChange={(e) => setHoursWorked(e.target.value)}
        />
      </td>
      <td>
        <input 
          type="number" 
          step="0.5"
          className="ds-input" 
          style={{ width: '65px', padding: '4px 8px', fontSize: '0.85rem' }}
          disabled={status !== 'Trabajó' && status !== 'Media jornada'}
          value={nightHours}
          onChange={(e) => setNightHours(e.target.value)}
        />
      </td>
      <td>
        <input 
          type="number" 
          step="0.5"
          className="ds-input" 
          style={{ width: '65px', padding: '4px 8px', fontSize: '0.85rem' }}
          disabled={status !== 'Trabajó' && status !== 'Media jornada'}
          value={holidayHours}
          onChange={(e) => setHolidayHours(e.target.value)}
        />
      </td>
      <td>
        <input 
          type="checkbox"
          checked={hadMeal}
          onChange={(e) => setHadMeal(e.target.checked)}
        />
      </td>
      <td>
        <button 
          className="ds-btn ds-btn-primary ds-btn-sm" 
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '4px 10px' }}
        >
          {saving ? '...' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}
